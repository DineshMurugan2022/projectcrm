const api = window.bnyPbx;
const byId = (id) => document.getElementById(id);
let connected = false;
let engineReady = false;
let activeCall = false;
let ringing = false;

function setConnection(label, state = '') {
  byId('connectionText').textContent = label;
  byId('connection').className = `connection ${state}`.trim();
  byId('connectBtn').disabled = engineReady;
  byId('disconnectBtn').disabled = !engineReady;
  byId('callBtn').disabled = !connected || activeCall;
  byId('hangupBtn').disabled = !activeCall;
}

function showError(target, text) {
  byId(target).textContent = text || '';
}

function readForm() {
  return {
    server: byId('server').value.trim(),
    domain: byId('domain').value.trim(),
    username: byId('username').value.trim(),
    login: byId('login').value.trim(),
    password: byId('password').value
  };
}

function renderSaved(config) {
  if (!config) return;
  for (const field of ['server', 'domain', 'username', 'login']) {
    if (config[field]) byId(field).value = config[field];
  }
  if (config.hasPassword) {
    byId('password').placeholder = 'Password saved on this PC; leave blank to keep it';
    byId('saved').textContent = 'Account saved on this PC.';
  }
}

function setCallState(text, isActive = activeCall) {
  byId('callState').textContent = text;
  activeCall = isActive;
  byId('callBtn').disabled = !connected || activeCall;
  byId('hangupBtn').disabled = !activeCall;
}

function handleEvent(event) {
  if (!event || typeof event !== 'object') return;
  if (event.type === 'ready') {
    engineReady = true;
    setConnection('Registering…', 'busy');
    setCallState('Waiting for PBX registration.', false);
  } else if (event.type === 'registration') {
    connected = event.registered === true;
    const label = connected ? 'Online · Registered' : event.code ? `Registration failed · ${event.code}` : 'Connecting…';
    setConnection(label, connected ? 'online' : 'busy');
    if (!activeCall && !ringing) setCallState(connected ? 'Ready to make and receive calls.' : (event.message || 'Registering with the PBX.'), false);
    if (!connected && event.code && event.code !== 100) showError('accountMessage', event.message || `PBX registration failed (${event.code}).`);
    else if (connected) showError('accountMessage', '');
  } else if (event.type === 'incoming') {
    ringing = true;
    activeCall = true;
    byId('incomingNumber').textContent = event.number || 'Unknown caller';
    byId('incoming').classList.add('show');
    setCallState(`Incoming call from ${event.number || 'Unknown caller'}`, true);
    setConnection(connected ? 'Incoming call' : 'Call ringing', 'busy');
  } else if (event.type === 'outgoing') {
    ringing = false;
    activeCall = true;
    byId('incoming').classList.remove('show');
    setCallState(`Calling ${event.number || ''}…`, true);
  } else if (event.type === 'call') {
    const state = String(event.state || '').toUpperCase();
    if (state === 'DISCONNECTED') {
      activeCall = false;
      ringing = false;
      byId('incoming').classList.remove('show');
      const reason = event.reason ? ` · ${event.reason}` : '';
      setCallState(`Call ended${event.lastStatus ? ` (${event.lastStatus})` : ''}${reason}`, false);
      setConnection(connected ? 'Online · Registered' : 'Disconnected', connected ? 'online' : '');
    } else if (state === 'CONFIRMED') {
      ringing = false;
      byId('incoming').classList.remove('show');
      setCallState(`Call connected · ${event.number || ''}`, true);
      setConnection('Online · Registered', 'online');
    } else if (state === 'EARLY') {
      setCallState(`Ringing ${event.number || ''}…`, true);
    }
  } else if (event.type === 'audio' && event.active) {
    if (activeCall) setCallState('Call connected · Audio active', true);
  } else if (event.type === 'error') {
    showError('callMessage', event.message || 'PBX call failed.');
  } else if (event.type === 'shutdown') {
    engineReady = false;
    connected = false;
    activeCall = false;
    ringing = false;
    byId('incoming').classList.remove('show');
    setConnection('Disconnected');
    setCallState('PBX phone disconnected.', false);
  } else if (event.type === 'closed') {
    engineReady = false;
    connected = false;
    activeCall = false;
    ringing = false;
    byId('incoming').classList.remove('show');
    setConnection('Disconnected');
    setCallState('PBX engine stopped.', false);
  }
}

byId('accountForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  showError('accountMessage', '');
  try {
    const result = await api.saveConfig(readForm());
    byId('password').value = '';
    renderSaved(result);
    showError('accountMessage', 'Account saved securely for this Windows user.');
  } catch (error) {
    showError('accountMessage', error.message || 'Could not save the SIP account.');
  }
});

byId('connectBtn').addEventListener('click', async () => {
  showError('accountMessage', '');
  showError('callMessage', '');
  try {
    const config = await api.saveConfig(readForm());
    byId('password').value = '';
    renderSaved(config);
    await api.connect();
    engineReady = true;
    setConnection('Starting SIP…', 'busy');
  } catch (error) {
    engineReady = false;
    setConnection('Not connected');
    showError('accountMessage', error.message || 'Could not connect to the PBX.');
  }
});

byId('disconnectBtn').addEventListener('click', async () => {
  try { await api.disconnect(); } catch (error) { showError('callMessage', error.message); }
});

byId('keypad').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-digit]');
  if (button) {
    byId('number').value += button.dataset.digit;
    byId('number').focus();
  }
});

byId('callBtn').addEventListener('click', async () => {
  showError('callMessage', '');
  try {
    await api.dial(byId('number').value);
    setCallState('Starting call…', true);
  } catch (error) { showError('callMessage', error.message || 'Could not start the call.'); }
});

byId('answerBtn').addEventListener('click', async () => {
  showError('callMessage', '');
  try { await api.answer(); ringing = false; byId('incoming').classList.remove('show'); setCallState('Answering call…', true); }
  catch (error) { showError('callMessage', error.message || 'Could not answer the call.'); }
});

byId('rejectBtn').addEventListener('click', async () => {
  try { await api.reject(); } catch (error) { showError('callMessage', error.message || 'Could not decline the call.'); }
});

byId('hangupBtn').addEventListener('click', async () => {
  try { await api.hangup(); } catch (error) { showError('callMessage', error.message || 'Could not end the call.'); }
});

byId('number').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') { event.preventDefault(); byId('callBtn').click(); }
});

api.onEvent(handleEvent);
api.getConfig().then(renderSaved).catch((error) => showError('accountMessage', error.message));
