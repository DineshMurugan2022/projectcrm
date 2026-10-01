const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { Modem } = require('../lib/modem');

class Port extends EventEmitter {
  constructor() { super(); this.writes = []; }
  open(callback) { this.isOpen = true; callback(); }
  close(callback) { this.isOpen = false; this.emit('close'); callback?.(); }
  write(value, callback) {
    this.writes.push(value); callback?.();
    if (!this.silent) setImmediate(() => this.emit('data', Buffer.from('\r\nOK\r\n')));
  }
}
const tick = () => new Promise(resolve => setImmediate(resolve));
function fixture() {
  const voices = [];
  const modem = new Modem({ Port, audioFactory: () => {
    const voice = { start: async () => {}, stop: async () => { voice.stopped = true; }, mute: value => { voice.muted = value; } };
    voices.push(voice); return voice;
  } });
  return { modem, voices };
}
test('fragmented incoming call, explicit answer, audio, mute, remote hangup and second call', async () => {
  const { modem, voices } = fixture();
  await modem.connect({ control: 'COM4', voice: 'COM5' });
  const port = modem.port;
  port.emit('data', Buffer.from('\r\nRI'));
  assert.equal(modem.state.call, 'idle');
  port.emit('data', Buffer.from('NG\r\n+CLIP: "123456789",129\r\n'));
  assert.equal(modem.state.call, 'ringing');
  assert.equal(modem.state.number, '123456789');
  assert.ok(!port.writes.includes('ATA\r'));
  await modem.answer();
  assert.equal(voices.length, 0, 'ATA OK must not start audio');
  port.emit('data', Buffer.from('\r\n^CONN:2,0\r\n'));
  await modem.audioTask;
  assert.equal(modem.state.audio, 'streaming');
  modem.mute(true); assert.equal(voices[0].muted, true);
  port.emit('data', Buffer.from('\r\n^CEND:2,5,0,16\r\n'));
  assert.equal(modem.state.call, 'idle'); assert.equal(voices[0].stopped, true);
  await modem.dial('123456789');
  port.emit('data', Buffer.from('\r\n^CONN:3,0\r\n'));
  await modem.audioTask;
  assert.equal(voices.length, 2);
  await modem.hangup(); assert.equal(modem.history.length, 2);
  await modem.disconnect();
});
test('invalid numbers cannot inject AT commands; busy and disconnect clear call', async () => {
  const { modem } = fixture();
  await modem.connect({ control: 'COM4', voice: 'COM5' });
  await assert.rejects(modem.dial('123\rATH'), /phone number/);
  await modem.dial('+123456789');
  modem.receive(Buffer.from('\r\nBUSY\r\n'));
  assert.equal(modem.state.call, 'idle');
  modem.port.close();
  assert.equal(modem.state.connected, false);
  await modem.disconnect();
});
test('commands serialize and timeout closes port to reject late responses', async () => {
  const { modem } = fixture();
  await modem.connect({ control: 'COM4', voice: 'COM5' });
  const port = modem.port; port.silent = true;
  const a = modem.command('AT+FIRST', 30);
  const b = modem.command('AT+SECOND', 30);
  const rejected = Promise.allSettled([a, b]);
  await tick(); assert.equal(port.writes.at(-1), 'AT+FIRST\r');
  const results = await rejected;
  assert.ok(results.every(r => r.status === 'rejected'));
  assert.ok(!port.writes.includes('AT+SECOND\r'));
  await modem.disconnect();
});
test('call ending during voice selection does not open audio', async () => {
  const { modem, voices } = fixture();
  await modem.connect({ control: 'COM4', voice: 'COM5' });
  modem.activate(); modem.endCall('Remote ended');
  await modem.audioTask;
  assert.equal(voices.length, 0);
  await modem.disconnect();
});


test('disconnect releases the port and audio even if hangup fails', async () => {
  const { modem, voices } = fixture();
  await modem.connect({ control: 'COM4', voice: 'COM5' });
  const port = modem.port;
  modem.activate(); await modem.audioTask;
  modem.hangup = async () => { throw new Error('Hangup rejected'); };
  await modem.disconnect();
  assert.equal(port.isOpen, false);
  assert.equal(voices[0].stopped, true);
  assert.equal(modem.state.connected, false);
  assert.equal(modem.state.call, 'idle');
  assert.equal(modem.history.length, 1);
  assert.ok(modem.history[0].id);
});
