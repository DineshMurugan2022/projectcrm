const { SerialPort } = require('serialport');
const pa = require('naudiodon');
const Speaker = require('speaker');

function createSpeaker(output, mode = 'low-latency') {
  if (mode === 'low-latency') {
    const stream = new pa.AudioIO({ outOptions: { channelCount: 1, sampleFormat: pa.SampleFormat16Bit,
      sampleRate: 8000, deviceId: Number(output ?? -1), framesPerBuffer: 160,
      highwaterMark: 320, maxQueue: 8, closeOnError: false } });
    // Prime 60 ms before starting the device, so its first callback has PCM.
    stream.write(Buffer.alloc(960));
    stream.start();
    return stream;
  }
  const selected = pa.getDevices().find(d => d.id === Number(output) && d.maxOutputChannels > 0);
  return new Speaker({ channels: 1, bitDepth: 16, sampleRate: 8000, samplesPerFrame: 160,
    device: selected && !/Sound Mapper/.test(selected.name) ? selected.name : undefined });
}

async function testSpeaker(output, mode) {
  const speaker = createSpeaker(output, mode);
  const tone = Buffer.alloc(16000);
  for (let i = 0; i < 8000; i++) tone.writeInt16LE(Math.round(Math.sin(2 * Math.PI * 440 * i / 8000) * 3000), i * 2);
  if (mode !== 'compatible') {
    await new Promise((resolve, reject) => { speaker.once('error', reject); speaker.write(tone, error => error ? reject(error) : resolve()); });
    await new Promise(resolve => setTimeout(resolve, 1100));
    await speaker.quit();
  } else {
    await new Promise((resolve, reject) => { speaker.once('close', resolve); speaker.once('error', reject); speaker.end(tone); });
  }
}

class Voice {
  constructor(settings, update) {
    this.settings = settings; this.update = update;
    this.queue = []; this.partial = Buffer.alloc(0);
    this.stats = { txBytes: 0, rxBytes: 0, micBytes: 0, dropped: 0, micLevel: 0 };
    this.fail = error => { if (!this.stopped) { this.update({ audio: 'error', error: error.message }); this.stop(); } };
  }
  async open() {
    this.port = new SerialPort({ path: this.settings.voice, baudRate: 115200, highWaterMark: 320, autoOpen: false });
    this.port.on('error', this.fail);
    await new Promise((resolve, reject) => this.port.open(error => error ? reject(error) : resolve()));
    if (this.stopped) { await this.closePort(); return; }
  }
  async start() {
    if (!this.port) await this.open();
    if (this.stopped) return;
    const fail = this.fail;
    // naudiodon uses lowercase highwaterMark for its Node stream read size.
    // framesPerBuffer alone does not change the default 16 KB (~1 s) reads.
    const options = deviceId => ({ channelCount: 1, sampleFormat: pa.SampleFormat16Bit, sampleRate: 8000, deviceId: Number(deviceId ?? -1), framesPerBuffer: 160, highwaterMark: 320, closeOnError: true });
    this.speaker = createSpeaker(this.settings.output, this.settings.playback || 'low-latency');
    this.speaker.on('error', fail);
    this.port.on('data', chunk => {
      if (this.stopped) return;
      this.stats.rxBytes += chunk.length;
      let peak = 0;
      for (let i = 0; i + 1 < chunk.length; i += 2) peak = Math.max(peak, Math.abs(chunk.readInt16LE(i)));
      this.stats.rxLevel = Math.round(peak / 32768 * 100);
      this.stats.rxPeak = peak;
      this.stats.rxMaxPeak = Math.max(this.stats.rxMaxPeak || 0, peak);
      this.rxWindowPeak = Math.max(this.rxWindowPeak || 0, peak);
      for (const byte of chunk) if (byte) this.stats.rxNonzeroBytes = (this.stats.rxNonzeroBytes || 0) + 1;
      // Bound playback backlog instead of accumulating seconds of stale speech.
      if (this.speaker.writableLength < 8000) this.speaker.write(chunk);
      else this.stats.rxDropped = (this.stats.rxDropped || 0) + chunk.length;
    });
    this.mic = new pa.AudioIO({ inOptions: options(this.settings.input) });
    this.mic.on('error', fail);
    this.mic.on('data', chunk => {
      if (this.stopped) return;
      this.stats.micBytes += chunk.length;
      this.partial = Buffer.concat([this.partial, chunk]);
      while (this.partial.length >= 320) {
        let frame = Buffer.from(this.partial.subarray(0, 320));
        this.partial = this.partial.subarray(320);
        let peak = 0;
        for (let i = 0; i < 320; i += 2) peak = Math.max(peak, Math.abs(frame.readInt16LE(i)));
        this.stats.micLevel = this.muted ? 0 : Math.round(peak / 32768 * 100);
        if (this.muted) frame = Buffer.alloc(320);
        if (this.queue.length >= 5) { this.queue.shift(); this.stats.dropped++; }
        this.queue.push(frame);
      }
    });
    this.mic.start();
    let deadline = performance.now() + 20;
    const transmit = () => {
      if (this.stopped) return;
      if (!this.busy && this.port.isOpen && this.queue.length) {
        this.busy = true;
        this.port.write(this.queue.shift(), error => {
          this.busy = false;
          if (error) fail(error); else this.stats.txBytes += 320;
        });
      }
      // Compensate for Windows timer drift without building an unbounded queue.
      deadline += 20;
      if (performance.now() - deadline > 100) deadline = performance.now() + 20;
      this.timer = setTimeout(transmit, Math.max(1, deadline - performance.now()));
    };
    this.timer = setTimeout(transmit, 20);
    this.report = setInterval(() => {
      this.stats.rxLevel = Math.round((this.rxWindowPeak || 0) / 32768 * 100);
      this.rxWindowPeak = 0;
      this.update({ stats: { ...this.stats } });
    }, 500);
  }
  mute(value) { this.muted = value; this.queue = []; this.partial = Buffer.alloc(0); }
  async closePort() { if (this.port?.isOpen) await new Promise(resolve => this.port.close(resolve)); }
  stop() {
    if (this.stopTask) return this.stopTask;
    this.stopped = true;
    clearTimeout(this.timer); clearInterval(this.report);
    this.queue = [];
    this.stopTask = (async () => {
      try { await this.mic?.quit(); } catch (error) { this.update({ error: `Microphone shutdown: ${error.message}` }); }
      if (this.speaker?.quit) {
        try { await this.speaker.quit(); } catch (error) { this.update({ error: `Playback shutdown: ${error.message}` }); }
      } else if (this.speaker && !this.speaker.destroyed) {
        await new Promise(resolve => {
          this.speaker.once('close', resolve); this.speaker.once('error', resolve); this.speaker.end();
        });
      }
      await this.closePort();
    })();
    return this.stopTask;
  }
}
module.exports = { Voice, testSpeaker };
