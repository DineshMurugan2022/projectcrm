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

  async function resolveHuaweiPorts(settings = {}) {
    let { control, voice, input = '-1', output = '-1', playback = 'low-latency' } = settings || {};
    if (!control || !voice) {
      const ports = await SerialPort.list();
      const findPort = (name) => ports.find(p => new RegExp(name, 'i').test(p.friendlyName || ''))?.path;
      const huaweiVendor = ports.filter(p => p.vendorId?.toLowerCase() === '12d1' || /huawei/i.test(p.friendlyName || ''));
      control = control || findPort('PC UI') || huaweiVendor[0]?.path || ports[0]?.path;
      voice = voice || findPort('Application') || huaweiVendor[1]?.path || ports[1]?.path || ports[0]?.path;
    }
    if (!control || !voice) {
      throw new Error('No Huawei COM ports detected. Please plug in your Huawei USB modem.');
    }
    return { control, voice, input, output, playback };
  }

  // Connect Socket.IO relay to central CRM backend
  try {
    let ioClientPkg;
    try { ioClientPkg = require('socket.io-client'); }
    catch { try { ioClientPkg = require('../backend/node_modules/socket.io-client'); } catch { ioClientPkg = null; } }

    if (ioClientPkg) {
      const backendUrl = process.env.BACKEND_URL || 'https://backend-4jwl.onrender.com';
      const ioClient = ioClientPkg(backendUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 2000,
      });

      ioClient.on('connect', () => {
        console.log(`🔌 [GSM Host] Connected to central CRM Relay at ${backendUrl}`);
        ioClient.emit('gsm:register_host', modem.snapshot());
      });

      ioClient.on('gsm:execute_action', async ({ action, payload }, callback) => {
        console.log(`📞 [GSM Host] Action requested: ${action}`);
        try {
          if (action === 'devices') {
            const ports = await SerialPort.list();
            let audio = [], audioError = '';
            try { audio = require('naudiodon').getDevices(); } catch (err) { audioError = err.message; }
            if (typeof callback === 'function') callback({ ports, audio, audioError });
            return;
          }
          const actions = {
            connect: async () => modem.connect(await resolveHuaweiPorts(payload)),
            disconnect: () => modem.disconnect(),
            dial: () => modem.dial(payload?.number),
            answer: () => modem.answer(),
            hangup: () => modem.hangup(),
            mute: () => modem.mute(payload?.muted),
            diagnostics: () => modem.diagnose(),
          };
          if (actions[action]) {
            await actions[action]();
            if (typeof callback === 'function') callback(modem.snapshot());
          } else {
            if (typeof callback === 'function') callback({ error: `Unknown action: ${action}` });
          }
        } catch (err) {
          if (typeof callback === 'function') callback({ error: err.message });
        }
      });

      modem.on('state', state => {
        if (ioClient && ioClient.connected) {
          ioClient.emit('gsm:host_state_update', state);
        }
      });
    }
  } catch (err) {
    console.warn('⚠️ [GSM Host] Relay connect notice:', err.message);
  }
  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    const host = req.headers.host;

    // Check allowed origins for CORS — allow localhost, LAN IPs, and known cloud deployments
    const isAllowedOrigin = !origin ||
      origin.startsWith('http://localhost') ||
      origin.startsWith('http://127.0.0.1') ||
      origin.startsWith('https://localhost') ||
      /^https?:\/\/192\.168\./.test(origin) ||
      /^https?:\/\/10\./.test(origin) ||
      /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./.test(origin) ||
      origin.includes('vercel.app') ||
      origin.includes('netlify.app') ||
      origin.includes('cloud-connect.in') ||
      (host && origin === `http://${host}`);

    const corsHeaders = {
      'Access-Control-Allow-Origin': isAllowedOrigin && origin ? origin : '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-App-Token, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Private-Network': 'true',
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

    // Allow any host — server is now accessible on LAN
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
          connect: async () => modem.connect(await resolveHuaweiPorts(data)), disconnect: () => modem.disconnect(),
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
  const os = require('node:os');
  const { server, modem } = createServer();
  const port = Number(process.argv.find(arg => arg.startsWith('--port='))?.slice(7) || process.env.PORT || 3174);

  // Listen on all interfaces so LAN machines can connect
  server.listen(port, '0.0.0.0', () => {
    const nets = os.networkInterfaces();
    const lanIPs = [];
    for (const iface of Object.values(nets)) {
      for (const addr of iface) {
        if (addr.family === 'IPv4' && !addr.internal) lanIPs.push(addr.address);
      }
    }
    console.log('============================================================');
    console.log('  Huawei E173 GSM Modem Server Running');
    console.log('============================================================');
    console.log(`  Local:   http://127.0.0.1:${port}`);
    if (lanIPs.length > 0) {
      lanIPs.forEach(ip => console.log(`  Network: http://${ip}:${port}  <-- share this with other CRM users`));
    }
    console.log('============================================================');
    console.log('  On other computers: open GSM Modem Setup in the CRM and');
    console.log(`  enter the Network IP above in the "Modem Server IP" field.`);
    console.log('============================================================');
  });

  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  const shutdown = async () => { await modem.disconnect().catch(console.error); server.close(); process.exit(0); };
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
}
module.exports = { createServer };
