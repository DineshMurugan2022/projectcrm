const { EventEmitter } = require('node:events');
const { SerialPort } = require('serialport');

class Modem extends EventEmitter {
  constructor({ Port = SerialPort, audioFactory } = {}) {
    super();
    this.Port = Port;
    this.audioFactory = audioFactory || ((settings, update) => new (require('./voice').Voice)(settings, update));
    this.state = { connected: false, call: 'idle', number: '', since: null, muted: false, audio: 'off', error: '', diagnostics: {}, stats: {} };
    this.queue = Promise.resolve();
    this.logs = [];
    this.history = [];
    this.generation = 0;
  }
  snapshot() { return { ...this.state, settings: this.settings, logs: this.logs, history: this.history }; }
  update(patch) { Object.assign(this.state, patch); this.emit('state', this.snapshot()); }
  log(message) {
    this.logs.push({ time: new Date().toISOString(), message });
    if (this.logs.length > 150) this.logs.shift();
    this.emit('state', this.snapshot());
  }
  async connect(settings) {
    if (this.port && this.state.connected) {
      return this.snapshot();
    }
    if (this.port) throw new Error('Disconnect before changing modem settings.');
    if (!/^COM\d+$/i.test(settings.control) || !/^COM\d+$/i.test(settings.voice) || settings.control === settings.voice) throw new Error('Select two different COM ports.');
    this.settings = settings;
    this.buffer = '';
    const port = this.port = new this.Port({ path: settings.control, baudRate: 115200, autoOpen: false });
    port.on('data', data => this.receive(data));
    port.on('error', error => { this.update({ error: error.message }); this.log(error.message); });
    port.on('close', () => {
      clearInterval(this.poll);
      this.pending?.finish(new Error('Control port closed.'));
      this.port = null;
      this.endCall('Modem disconnected');
      this.update({ connected: false });
    });
    try {
      await new Promise((resolve, reject) => port.open(error => error ? reject(error) : resolve()));
      await this.command('AT');
      await this.command('ATE0');
      await this.command('AT+CLIP=1').catch(error => this.log(error.message));
      this.update({ connected: true, error: '' });
      await this.diagnose();
      this.poll = setInterval(() => {
        if (this.state.call !== 'idle' && !this.pending) this.syncCalls().catch(error => this.log(error.message));
      }, 2000);
    } catch (error) { await this.disconnect(); throw error; }
  }
  command(command, timeout = 5000) {
    const port = this.port;
    const task = this.queue.then(() => new Promise((resolve, reject) => {
      if (!port?.isOpen || port !== this.port) return reject(new Error('Modem is disconnected.'));
      const lines = [];
      const finish = (error) => {
        if (this.pending !== pending) return;
        clearTimeout(timer);
        this.pending = null;
        error ? reject(error) : resolve(lines.join('\n'));
      };
      const pending = { command, lines, finish };
      const timer = setTimeout(() => {
        finish(new Error(`${command}: timed out; reconnect the modem.`));
        // A late OK must never be mistaken for the next command's response.
        if (port.isOpen) port.close(() => {});
      }, timeout);
      this.pending = pending;
      this.log(`> ${command}`);
      port.write(command + '\r', error => { if (error) finish(error); });
    }));
    this.queue = task.catch(() => {});
    return task;
  }
  receive(data) {
    this.buffer += data.toString('latin1');
    const lines = this.buffer.split(/[\r\n]+/);
    this.buffer = lines.pop().slice(-8192);
    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;
      this.log(`< ${line}`);
      if (line === 'RING' || line.startsWith('+CRING:')) {
        if (this.state.call === 'idle') this.update({ call: 'ringing', number: 'Unknown caller', direction: 'incoming', error: '' });
      }
      const clip = line.match(/^\+CLIP:\s*"([^"]*)"/);
      if (clip && this.state.call === 'ringing') this.update({ number: clip[1] });
      if (/^\^CONN:/.test(line)) this.activate();
      if (/^(\^CEND:|NO CARRIER$|BUSY$|NO ANSWER$|NO DIALTONE$)/.test(line)) this.endCall(line);
      const pending = this.pending;
      if (pending) {
        pending.lines.push(line);
        if (line === 'OK') pending.finish();
        else if (/^(ERROR|\+CM[ES] ERROR:|NO CARRIER$|BUSY$|NO ANSWER$|NO DIALTONE$)/.test(line)) pending.finish(new Error(`${pending.command}: ${line}`));
      }
    }
  }
  async diagnose() {
    const result = {};
    for (const [name, command] of Object.entries({ modem: 'ATI', sim: 'AT+CPIN?', signal: 'AT+CSQ', network: 'AT+CREG?', operator: 'AT+COPS?', voice: 'AT^CVOICE?' })) {
      try { result[name] = { ok: true, response: await this.command(command) }; }
      catch (error) { result[name] = { ok: false, response: error.message }; }
      this.update({ diagnostics: { ...result } });
    }
    return result;
  }
  async dial(number) {
    if (!this.state.connected || this.state.call !== 'idle') throw new Error('Connect the modem and finish the current call first.');
    if (typeof number !== 'string' || !/^\+?\d{3,20}$/.test(number)) throw new Error('Enter a phone number with 3–20 digits and an optional leading +.');
    this.update({ call: 'dialing', number, direction: 'outgoing', error: '', stats: {} });
    try { await this.command(`ATD${number};`, 15000); }
    catch (error) { this.endCall(error.message); throw error; }
  }
  async answer() {
    if (this.state.call !== 'ringing') throw new Error('There is no incoming call.');
    this.update({ call: 'answering', error: '', stats: {} });
    try { await this.command('ATA', 15000); }
    catch (error) { this.endCall(error.message); throw error; }
  }
  async hangup() {
    if (this.state.call === 'idle') return;
    await this.command('AT+CHUP');
    this.endCall('Ended');
  }
  async syncCalls() {
    const response = await this.command('AT+CLCC');
    if (/\+CLCC:\s*\d+,\d+,0,0,/.test(response)) this.activate();
    else if (!response.includes('+CLCC:') && this.state.call !== 'idle') this.endCall('Call ended');
  }
  activate() {
    if (this.state.call === 'active') return;
    const generation = ++this.generation;
    this.update({ call: 'active', since: Date.now(), audio: 'starting', stats: {}, muted: false });
    this.audioTask = (async () => {
      await this.audioStop;
      if (generation !== this.generation) return;
      const voice = this.audioFactory(this.settings, patch => {
        if (generation === this.generation) this.update(patch);
      });
      this.voice = voice;
      // Open the PCM endpoint before asking the modem to route voice to it.
      await voice.open?.();
      if (generation !== this.generation) { await voice.stop(); return; }
      await this.command('AT^DDSETEX=2');
      if (generation !== this.generation) { await voice.stop(); return; }
      await voice.start();
      if (generation !== this.generation) await voice.stop();
      else this.update({ audio: 'streaming' });
    })().catch(error => {
      if (generation === this.generation) {
        this.update({ audio: 'error', error: `Audio: ${error.message}` });
        this.voice?.stop();
      }
    });
  }
  endCall(reason) {
    ++this.generation;
    if (this.state.call !== 'idle') {
      this.history.unshift({ number: this.state.number, direction: this.state.direction, time: new Date().toISOString(), duration: this.state.since ? Math.floor((Date.now() - this.state.since) / 1000) : 0, result: reason });
      this.history = this.history.slice(0, 20);
    }
    const voice = this.voice;
    this.voice = null;
    this.audioStop = Promise.all([voice?.stop(), this.audioTask]);
    this.update({ call: 'idle', since: null, audio: 'off', muted: false, lastResult: reason });
  }
  mute(muted) {
    if (this.state.call !== 'active') throw new Error('No active call.');
    this.voice?.mute(Boolean(muted));
    this.update({ muted: Boolean(muted) });
  }
  async disconnect() {
    clearInterval(this.poll);
    if (this.port?.isOpen && this.state.call !== 'idle') await this.hangup();
    this.endCall('Disconnected');
    await this.audioTask;
    await this.audioStop;
    const port = this.port;
    if (port?.isOpen) await new Promise(resolve => port.close(resolve));
    this.port = null;
    this.update({ connected: false, diagnostics: {} });
  }
}
module.exports = { Modem };
