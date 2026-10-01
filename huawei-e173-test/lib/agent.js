const crypto = require('node:crypto');
const { SerialPort } = require('serialport');

const { selectPorts } = require('./ports');

function startAgent(modem, { backendUrl = process.env.BACKEND_URL || 'https://backend-4jwl.onrender.com',
  io = require('socket.io-client').io, listPorts = () => SerialPort.list(),
  audioDevices = () => require('naudiodon').getDevices(), scanInterval = 3000, onCode = console.log, ticket = null } = {}) {
  const url = new URL(backendUrl);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) {
    throw new Error('BACKEND_URL must use HTTPS (HTTP is allowed for localhost development).');
  }
  const socket = io(`${url.origin}/${ticket ? 'gsm-desktop' : 'gsm-agent'}`, { transports: ['websocket'], reconnection: false, autoConnect: false });
  let paired = false, stopped = false, busy = false, reconnectTimer, code = '', autoConnect = true;
  let devices = { ports: [], audio: [], audioError: '' }, lastError = '', settings = {};
  let queue = Promise.resolve();
  const serial = task => {
    const result = queue.then(task);
    queue = result.catch(() => {});
    return result;
  };
  const report = () => { if (socket.connected) socket.emit('gsm:report', { state: modem.snapshot(), devices }); };
  const clearSession = async () => {
    try { await modem.disconnect(); } catch (error) { lastError = error.message; }
    // No call details from a previous owner may survive re-pairing.
    modem.history = []; modem.logs = []; modem.settings = null;
    modem.update({ connected: false, call: 'idle', number: '', since: null, direction: undefined,
      lastResult: '', error: '', diagnostics: {}, stats: {}, audio: 'off' });
    settings = {}; autoConnect = true;
  };
  const reconnect = () => {
    if (stopped) return;
    if (ticket) { socket.auth = { ticket }; socket.connect(); return; }
    code = crypto.randomBytes(12).toString('hex').toUpperCase();
    socket.auth = { pairingCode: code };
    onCode(`CRM pairing code: ${code.match(/.{1,4}/g).join('-')}`);
    socket.connect();
  };
  socket.on('connect', () => { lastError = ''; report(); });
  socket.on('connect_error', error => {
    lastError = `Cannot reach CRM backend: ${error.message}`;
    clearTimeout(reconnectTimer);
    if (!stopped && !ticket) reconnectTimer = setTimeout(reconnect, 5000);
  });
  socket.on('disconnect', () => {
    paired = false;
    serial(clearSession).finally(() => {
      if (!stopped && !ticket) reconnectTimer = setTimeout(reconnect, 2000);
    });
  });
  socket.on('gsm:paired', () => { paired = true; autoConnect = true; report(); });
  socket.on('gsm:release', () => {
    paired = false;
    serial(async () => {
      await modem.disconnect().catch(error => { lastError = error.message; });
      report(); // Deliver the final call history before retiring this ownership.
      socket.disconnect();
    });
  });
  socket.on('gsm:execute', ({ action, payload = {} } = {}, callback) => {
    const reply = result => { if (typeof callback === 'function') callback(result); };
    if (!paired) return reply({ error: 'This modem is not paired.' });
    serial(async () => {
      if (!paired) throw new Error('Pairing ended.');
      const actions = {
        connect: async () => { settings = selectPorts(await listPorts(), payload); autoConnect = true; await modem.connect(settings); },
        disconnect: async () => { autoConnect = false; await modem.disconnect(); },
        dial: () => modem.dial(payload.number), answer: () => modem.answer(), hangup: () => modem.hangup(),
        mute: () => modem.mute(payload.muted), diagnostics: () => modem.diagnose(),
        dtmf: () => {
          if (modem.state.call !== 'active' || !/^[0-9*#]$/.test(payload.digit || '')) throw new Error('DTMF needs an active call and one keypad digit.');
          return modem.command(`AT+VTS=${payload.digit}`);
        },
        'speaker-test': () => {
          if (modem.state.call !== 'idle') throw new Error('End the call before testing audio.');
          return require('./voice').testSpeaker(payload.output, payload.playback);
        }
      };
      if (!Object.hasOwn(actions, action)) throw new Error('Unknown action.');
      await actions[action](); report(); return modem.snapshot();
    }).then(state => reply({ state }), error => reply({ error: error.message }));
  });
  const tick = async () => {
    if (busy || stopped) return;
    busy = true;
    try {
      const ports = await listPorts();
      let audio = [], audioError = '';
      try { audio = audioDevices(); } catch (error) { audioError = error.message; }
      devices = { ports, audio, audioError };
      if (paired) await serial(async () => {
        if (!paired) return;
        if (modem.state.connected && (!ports.some(p => p.path === modem.settings?.control) || !ports.some(p => p.path === modem.settings?.voice))) {
          await modem.disconnect();
        }
        if (autoConnect && !modem.state.connected) {
          try {
            // Infer again after replugging: Windows may assign new COM numbers.
            const next = selectPorts(ports, { input: settings.input || '-1', output: settings.output || '-1', playback: settings.playback || 'low-latency' });
            await modem.connect(next);
          } catch (error) { modem.update({ error: error.message }); }
        }
      });
      report();
    } catch (error) { lastError = error.message; }
    finally { busy = false; }
  };
  modem.on('state', report);
  const timer = setInterval(tick, scanInterval);
  reconnect(); tick();
  return {
    status: () => ({ code: paired ? '' : code.match(/.{1,4}/g)?.join('-'), paired, online: socket.connected, backend: url.origin, error: lastError, ports: devices.ports.map(p => p.friendlyName || p.path), modemConnected: modem.state.connected }),
    stop: async () => {
      stopped = true; paired = false; clearInterval(timer); clearTimeout(reconnectTimer);
      await serial(() => modem.disconnect()); report(); socket.disconnect(); modem.off('state', report);
    }
  };
}
module.exports = { startAgent, selectPorts };
