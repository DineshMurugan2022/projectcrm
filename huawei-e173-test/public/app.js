const $ = id => document.getElementById(id);
let token, state = {}, pending = false, online = true;
function error(message) { $('error').textContent = message; $('error').hidden = !message; }
async function api(action, data = {}) {
  pending = true; render(state); error('');
  try {
    const response = await fetch(`/api/${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-App-Token': token }, body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    state = result;
  } catch (e) { error(e.message); }
  finally { pending = false; render(state); }
}
function options(id, list, fallback) {
  const previous = $(id).value;
  $(id).replaceChildren(...list.map(item => new Option(item.label, item.value)));
  if (list.some(item => item.value === previous)) $(id).value = previous;
  else $(id).value = fallback;
}
async function devices() {
  try {
    const result = await (await fetch('/api/devices')).json();
    const ports = result.ports.map(p => ({ value: p.path, label: p.friendlyName || p.path }));
    options('control', ports, result.ports.find(p => /PC UI/.test(p.friendlyName))?.path || ports[0]?.value);
    options('voice', ports, result.ports.find(p => /Application/.test(p.friendlyName))?.path || ports[1]?.value);
    for (const [id, key] of [['input', 'maxInputChannels'], ['output', 'maxOutputChannels']]) {
      const audio = result.audio.filter(d => d[key] > 0 && d.hostAPIName === 'MME');
      options(id, [{ value: '-1', label: 'Windows default device' }, ...audio.map(d => ({ value: String(d.id), label: d.name }))], String(audio.find(d => /Logi/.test(d.name))?.id ?? -1));
    }
    if (result.audioError) error(result.audioError);
  } catch (e) { error(`Cannot list devices: ${e.message}`); }
}
function render(s) {
  state = s;
  const connected = s.connected && online, idle = !s.call || s.call === 'idle';
  if (connected && s.settings) {
    for (const id of ['control', 'voice', 'input', 'output', 'playback']) $(id).value = String(s.settings[id] ?? (id === 'playback' ? 'low-latency' : '-1'));
  }
  $('connection').textContent = !online ? '● Server unavailable' : connected ? '● Modem connected' : '● Disconnected';
  $('connection').classList.toggle('online', !!connected);
  $('connect').textContent = connected ? 'Disconnect modem' : 'Connect modem';
  $('connect').disabled = pending || !online || !idle;
  for (const id of ['control', 'voice', 'input', 'output', 'playback', 'refresh']) $(id).disabled = connected || pending;
  $('dial').disabled = !connected || !idle || pending || !/^\+?\d{3,20}$/.test($('number').value);
  $('answer').hidden = s.call !== 'ringing'; $('dial').hidden = s.call === 'ringing';
  $('answer').disabled = pending || !connected;
  $('hangup').disabled = !connected || idle;
  $('mute').disabled = s.call !== 'active' || !online;
  $('mute').textContent = s.muted ? 'Unmute microphone' : 'Mute microphone';
  $('mute').setAttribute('aria-pressed', String(!!s.muted));
  $('diagnostics').disabled = !connected || !idle || pending;
  $('speakerTest').disabled = !idle || pending || !online;
  $('number').disabled = !idle;
  for (const key of $('keypad').children) key.disabled = !idle;
  $('backspace').disabled = !idle;
  const labels = { idle: connected ? 'Ready to call' : 'Ready when you are', dialing: 'Calling…', ringing: 'Incoming call', answering: 'Answering…', active: 'Call connected' };
  $('callState').textContent = labels[s.call || 'idle'];
  $('caller').textContent = idle ? (connected ? 'Let’s talk.' : 'Connect your modem') : s.number || 'Voice call';
  $('duration').textContent = s.since ? duration(Math.floor((Date.now() - s.since) / 1000)) : idle ? (s.lastResult || 'Enter a number to start a call') : s.call === 'ringing' ? 'Press Answer to pick up' : 'Waiting for the modem';
  $('audio').textContent = s.muted ? 'Microphone muted' : `Audio ${s.audio || 'off'}`;
  $('micLevel').value = s.stats?.micLevel || 0;
  $('rxLevel').value = s.stats?.rxLevel || 0;
  $('stats').textContent = s.stats?.txBytes != null ? `Sent ${(s.stats.txBytes / 1024).toFixed(1)} KB · Received ${(s.stats.rxBytes / 1024).toFixed(1)} KB · Dropped ${s.stats.dropped} frames` : 'Audio starts when the call connects.';
  if (s.error) error(s.error);
  renderHealth(s.diagnostics || {});
  $('callCount').textContent = s.history?.length || 0;
  if (s.history?.length) $('history').replaceChildren(...s.history.map(h => {
    const div = document.createElement('div'); div.className = 'history-item';
    div.textContent = `${h.direction === 'incoming' ? '↙' : '↗'} ${h.number}`;
    const small = document.createElement('small'); small.textContent = `${new Date(h.time).toLocaleTimeString()} · ${duration(h.duration)} · ${h.result}`; div.append(small); return div;
  }));
  const log = $('log'); const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 40;
  log.textContent = (s.logs || []).map(l => `${new Date(l.time).toLocaleTimeString()}  ${l.message}`).join('\n');
  if (atBottom) log.scrollTop = log.scrollHeight;
}
function duration(seconds) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
function renderHealth(d) {
  if (!Object.keys(d).length) return;
  const raw = key => d[key]?.response || '';
  const sim = raw('sim').match(/\+CPIN:\s*([^\n]+)/)?.[1] || 'Unknown';
  const signal = Number(raw('signal').match(/\+CSQ:\s*(\d+)/)?.[1] ?? 99);
  const registration = Number(raw('network').match(/\+CREG:\s*\d+,\s*(\d+)/)?.[1] ?? -1);
  const network = { 0: 'Not registered', 1: 'Registered', 2: 'Searching', 3: 'Denied', 4: 'Unknown', 5: 'Roaming' }[registration] || 'Unknown';
  const voice = raw('voice').match(/\^CVOICE:\s*(\d+),\s*(\d+),\s*(\d+)/);
  const rows = [['SIM card', sim], ['Network', network], ['Signal', signal === 99 ? 'Unknown' : `${-113 + 2 * signal} dBm`], ['Operator', raw('operator').match(/"([^"]+)"/)?.[1] || 'Unknown'], ['Voice', voice ? `${voice[1] === '0' ? 'Enabled' : 'Disabled'} · ${voice[2]} Hz` : 'Not confirmed']];
  $('health').replaceChildren(...rows.map(([label, value]) => {
    const div = document.createElement('div'); div.className = 'health-row';
    const span = document.createElement('span'); span.textContent = label;
    const b = document.createElement('b'); b.textContent = value; div.append(span, b); return div;
  }));
}
for (const [digit, letters] of [['1',''],['2','ABC'],['3','DEF'],['4','GHI'],['5','JKL'],['6','MNO'],['7','PQRS'],['8','TUV'],['9','WXYZ'],['+',''],['0',''],['⌫','']]) {
  const key = document.createElement('button'); key.textContent = digit;
  const small = document.createElement('small'); small.textContent = letters || '\u00a0'; key.append(small);
  key.setAttribute('aria-label', digit === '⌫' ? 'Backspace' : digit);
  key.onclick = () => { $('number').value = digit === '⌫' ? $('number').value.slice(0, -1) : ($('number').value + digit).slice(0, 21); render(state); };
  $('keypad').append(key);
}
$('number').oninput = () => render(state);
$('number').onkeydown = e => { if (e.key === 'Enter' && !$('dial').disabled) $('dial').click(); };
$('backspace').onclick = () => { $('number').value = $('number').value.slice(0, -1); render(state); };
$('refresh').onclick = devices;
$('speakerTest').onclick = () => api('speaker-test', { output: $('output').value, playback: $('playback').value });
$('connect').onclick = () => api(state.connected ? 'disconnect' : 'connect', Object.fromEntries(['control','voice','input','output','playback'].map(id => [id, $(id).value])));
$('dial').onclick = () => api('dial', { number: $('number').value });
$('answer').onclick = () => api('answer'); $('hangup').onclick = () => api('hangup');
$('mute').onclick = () => api('mute', { muted: !state.muted }); $('diagnostics').onclick = () => api('diagnostics');
(async () => {
  await devices();
  try {
    const initial = await (await fetch('/api/state')).json(); token = initial.token; render(initial);
    const events = new EventSource('/api/events');
    events.onmessage = e => { online = true; render(JSON.parse(e.data)); };
    events.onerror = () => { online = false; render(state); };
  } catch (e) { online = false; render(state); error(e.message); }
})();
setInterval(() => { if (state.since) $('duration').textContent = duration(Math.floor((Date.now() - state.since) / 1000)); }, 1000);
