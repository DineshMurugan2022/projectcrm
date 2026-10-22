const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const dgram = require('node:dgram');
const path = require('node:path');

const enginePath = process.argv[2] || path.join(__dirname, '..', 'native', 'bny-pbx-engine.exe');
const sip = dgram.createSocket('udp4');
const packets = [];
const events = [];
let engine;
let remote;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function packetText(message) { return message.toString('utf8'); }
function splitMessage(text) {
  const index = text.indexOf('\r\n\r\n');
  const head = index < 0 ? text : text.slice(0, index);
  const body = index < 0 ? '' : text.slice(index + 4);
  const lines = head.split('\r\n');
  const start = lines.shift() || '';
  const headers = new Map();
  for (const line of lines) {
    const colon = line.indexOf(':');
    if (colon > 0) headers.set(line.slice(0, colon).toLowerCase(), line.slice(colon + 1).trim());
  }
  return { start, headers, body };
}
function header(packet, name) { return packet.headers.get(name.toLowerCase()) || ''; }
function send(text, address, port) { return new Promise((resolve, reject) => sip.send(Buffer.from(text), port, address, error => error ? reject(error) : resolve())); }
function response(request, code, reason, body = '', toTag = '') {
  const to = header(request, 'to');
  const taggedTo = toTag && !/;tag=/i.test(to) ? `${to};tag=${toTag}` : to;
  const headers = [
    `SIP/2.0 ${code} ${reason}`,
    `Via: ${header(request, 'via')}`,
    `From: ${header(request, 'from')}`,
    `To: ${taggedTo}`,
    `Call-ID: ${header(request, 'call-id')}`,
    `CSeq: ${header(request, 'cseq')}`,
    'Server: BNY-Local-PBX-Smoke',
    ...(body ? ['Content-Type: application/sdp'] : []),
    `Content-Length: ${Buffer.byteLength(body)}`,
    '', body
  ].join('\r\n');
  return send(headers, remote.address, remote.port);
}
function sipRequest(method, uri, from, to, callId, cseq, body = '') {
  const branch = `z9hG4bK-smoke-${Math.random().toString(16).slice(2)}`;
  return [
    `${method} ${uri} SIP/2.0`,
    `Via: SIP/2.0/UDP 127.0.0.1:${sip.address().port};branch=${branch};rport`,
    'Max-Forwards: 70',
    `From: ${from}`,
    `To: ${to}`,
    `Call-ID: ${callId}`,
    `CSeq: ${cseq} ${method}`,
    'Contact: <sip:local-pbx@127.0.0.1>',
    ...(body ? ['Content-Type: application/sdp'] : []),
    `Content-Length: ${Buffer.byteLength(body)}`,
    '', body
  ].join('\r\n');
}
function waitFor(items, predicate, description, timeout = 8000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const found = items.find(predicate);
      if (found) return resolve(found);
      if (Date.now() - started > timeout) return reject(new Error(`Timed out waiting for ${description}.`));
      setTimeout(check, 25);
    };
    check();
  });
}
function command(action, values = {}) {
  assert.ok(engine && engine.stdin.writable, 'PBX engine is not running');
  engine.stdin.write(JSON.stringify({ action, ...values }) + '\n');
}

const answerSdp = [
  'v=0',
  'o=local 1 1 IN IP4 127.0.0.1',
  's=Local PBX smoke',
  'c=IN IP4 127.0.0.1',
  't=0 0',
  'm=audio 40000 RTP/AVP 0 8',
  'a=rtpmap:0 PCMU/8000',
  'a=rtpmap:8 PCMA/8000',
  'a=sendrecv',
  ''
].join('\r\n');

async function main() {
  await new Promise((resolve, reject) => { sip.once('error', reject); sip.bind(0, '127.0.0.1', resolve); });
  sip.on('message', (message, rinfo) => { remote = rinfo; packets.push(splitMessage(packetText(message))); });
  engine = spawn(enginePath, [], { stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true });
  let output = '';
  engine.stdout.setEncoding('utf8');
  engine.stdout.on('data', chunk => {
    output += chunk;
    let end;
    while ((end = output.indexOf('\n')) >= 0) {
      const line = output.slice(0, end).trim();
      output = output.slice(end + 1);
      if (line) { try { events.push(JSON.parse(line)); } catch { /* Invalid output fails on missing expected events below. */ } }
    }
  });
  const server = `127.0.0.1:${sip.address().port}`;
  engine.stdin.write(JSON.stringify({ server, domain: server, username: 'local-test', login: 'local-test', password: 'not-a-real-password' }) + '\n');
  const registration = await waitFor(packets, packet => packet.start.startsWith('REGISTER '), 'a REGISTER request');
  await response(registration, 200, 'OK', '', 'pbx-register');
  await waitFor(events, event => event.type === 'registration' && event.registered, 'successful local registration');

  command('dial', { number: '5550101' });
  const outgoingInvite = await waitFor(packets, packet => packet.start.startsWith('INVITE sip:5550101@'), 'an outgoing INVITE');
  await response(outgoingInvite, 100, 'Trying');
  await response(outgoingInvite, 180, 'Ringing', '', 'pbx-outgoing');
  await response(outgoingInvite, 200, 'OK', answerSdp, 'pbx-outgoing');
  await waitFor(events, event => event.type === 'call' && event.state === 'CONFIRMED', 'the outgoing call to reach CONFIRMED');
  await waitFor(packets, packet => packet.start.startsWith('ACK '), 'the outgoing ACK');
  command('hangup');
  const outgoingBye = await waitFor(packets, packet => packet.start.startsWith('BYE '), 'outgoing BYE');
  await response(outgoingBye, 200, 'OK');
  await waitFor(events, event => event.type === 'call' && event.state === 'DISCONNECTED', 'outgoing call teardown');

  const uri = `sip:local-test@${server}`;
  const remoteUri = `sip:2000@${server}`;
  const incomingCallId = `incoming-${Date.now()}@local-pbx`;
  const incomingInvite = sipRequest('INVITE', uri, `<${remoteUri}>;tag=remote-1`, `<${uri}>`, incomingCallId, 1, answerSdp);
  await send(incomingInvite, remote.address, remote.port);
  await waitFor(events, event => event.type === 'incoming' && event.number === '2000', 'an incoming INVITE event');
  command('answer');
  const incomingRequest = await waitFor(packets, packet => packet.headers.get('call-id') === incomingCallId && packet.start.startsWith('SIP/2.0 200'), '200 OK to the incoming call');
  const incoming = splitMessage(incomingInvite);
  const answer = sipRequest('ACK', uri, header(incoming, 'from'), header(incomingRequest, 'to'), incomingCallId, 1);
  await send(answer, remote.address, remote.port);
  await waitFor(events, event => event.type === 'call' && event.state === 'CONFIRMED' && event.number === '2000', 'the answered incoming call');
  const bye = sipRequest('BYE', uri, header(incoming, 'from'), header(incomingRequest, 'to'), incomingCallId, 2);
  await send(bye, remote.address, remote.port);
  await waitFor(packets, packet => packet.headers.get('call-id') === incomingCallId && packet.start.startsWith('SIP/2.0 200'), '200 OK to the incoming BYE');
  await waitFor(events, event => event.type === 'call' && event.state === 'DISCONNECTED' && event.number === '2000', 'incoming call teardown');

  command('shutdown');
  console.log('Local SIP signaling smoke passed: UDP registration, outgoing INVITE/ACK/BYE, incoming INVITE/answer/BYE.');
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(async () => {
  try { if (engine && engine.exitCode === null) { engine.stdin.end(); engine.kill(); } } catch { /* Already stopped. */ }
  try { sip.close(); } catch { /* Already closed. */ }
  await sleep(100);
});
