const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { SerialPort } = require('serialport');
const { Modem } = require('./lib/modem');

function createServer(modem = new Modem()) {
  const token = crypto.randomBytes(24).toString('hex');
  const clients = new Set();
  modem.on('state', state => {
    for (const client of clients) {
      if (client.writableLength > 262144) { client.destroy(); clients.delete(client); }
      else client.write(`data: ${JSON.stringify(state)}\n\n`);
    }
  });
  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    const host = req.headers.host;

    // Check allowed origins for CORS
    const isAllowedOrigin = !origin ||
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1') ||
      origin.startsWith('https://localhost') ||
      origin.includes('vercel.app') ||
      origin.includes('netlify.app') ||
      origin.includes('cloud-connect.in') ||
      (host && origin === `http://${host}`);

    const corsHeaders = {
      'Access-Control-Allow-Origin': isAllowedOrigin && origin ? origin : '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-App-Token, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Cache-Control': 'no-store'
    };

    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders);
      res.end();
      return;
    }

    const json = (code, value) => {
      res.writeHead(code, { 'Content-Type': 'application/json', ...corsHeaders });
      res.end(JSON.stringify(value));
    };

    if (!/^(127\.0\.0\.1|localhost):\d+$/.test(host || '')) return json(403, { error: 'Local connections only.' });
    if (origin && !isAllowedOrigin) return json(403, { error: 'Origin rejected.' });

    const url = new URL(req.url, `http://${host}`);
    try {
      if (req.method === 'GET' && url.pathname === '/api/state') return json(200, { ...modem.snapshot(), token });
      if (req.method === 'GET' && url.pathname === '/api/devices') {
        const ports = await SerialPort.list();
        let audio = [], audioError = '';
        try { audio = require('naudiodon').getDevices(); } catch (error) { audioError = error.message; }
        return json(200, { ports, audio, audioError });
      }
      if (req.method === 'GET' && url.pathname === '/api/events') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Connection': 'keep-alive',
          ...corsHeaders
        });
        res.write(`data: ${JSON.stringify(modem.snapshot())}\n\n`);
        clients.add(res);
        const timer = setInterval(() => res.write(': heartbeat\n\n'), 15000);
        req.on('close', () => { clearInterval(timer); clients.delete(res); });
        return;
      }
      if (req.method === 'POST' && url.pathname.startsWith('/api/')) {
        if (req.headers['x-app-token'] !== token) {
          return json(403, { error: 'Reload this page before continuing.' });
        }
        let body = '';
        for await (const chunk of req) { body += chunk; if (body.length > 4096) return json(413, { error: 'Request too large.' }); }
        const data = JSON.parse(body || '{}');
        const actions = {
          connect: () => modem.connect(data), disconnect: () => modem.disconnect(),
          dial: () => modem.dial(data.number), answer: () => modem.answer(),
          hangup: () => modem.hangup(), mute: () => modem.mute(data.muted),
          diagnostics: () => modem.diagnose(),
          'speaker-test': () => {
            if (modem.state.call !== 'idle') throw new Error('End the call before testing the speaker.');
            return require('./lib/voice').testSpeaker(data.output, data.playback);
          },
        };
        const action = Object.hasOwn(actions, url.pathname.slice(5)) && actions[url.pathname.slice(5)];
        if (!action) return json(404, { error: 'Unknown action.' });
        await action();
        return json(200, modem.snapshot());
      }
      const files = { '/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css'] };
      const file = files[url.pathname];
      if (req.method !== 'GET' || !file) return json(404, { error: 'Not found' });
      res.writeHead(200, { 'Content-Type': file[1], 'X-Content-Type-Options': 'nosniff', ...corsHeaders });
      res.end(fs.readFileSync(path.join(__dirname, 'public', file[0])));
    } catch (error) { json(400, { error: error.message }); }
  });
  return { server, modem };
}
if (require.main === module) {
  const { server, modem } = createServer();
  const port = Number(process.argv.find(arg => arg.startsWith('--port='))?.slice(7) || process.env.PORT || 3174);
  server.listen(port, '127.0.0.1', () => console.log(`Huawei dialer: http://127.0.0.1:${port}`));
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  const shutdown = async () => { await modem.disconnect().catch(console.error); server.close(); process.exit(0); };
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
}
module.exports = { createServer };
