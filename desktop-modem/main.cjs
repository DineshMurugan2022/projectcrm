const { app, BrowserWindow, ipcMain, dialog, session, Menu, safeStorage, Notification } = require('electron');
const { fork, spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const defaultOrigin = 'https://bnycrm1.vercel.app';
const trustedOrigins = ['https://bnycrm1.vercel.app', 'http://localhost:3000', 'http://127.0.0.1:3000'];

function isTrustedOrigin(urlStr) {
  try {
    const u = new URL(urlStr);
    return trustedOrigins.includes(u.origin);
  } catch {
    return false;
  }
}

async function resolveStartUrl() {
  if (process.env.CRM_URL) return process.env.CRM_URL;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 600);
    const res = await fetch('http://localhost:3000', { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok || res.status === 200 || res.status === 304) {
      logDebug('⚡ [Desktop] Using active local dev server at http://localhost:3000');
      return 'http://localhost:3000';
    }
  } catch {}
  return defaultOrigin;
}

let window, worker, pbxEngine, quitting = false, pbxStopping = false;
let pbxSnapshot = {};
const pending = new Map();

function assertPbxFrame(event) {
  const frameOrigin = new URL(event.senderFrame.url).origin;
  const isCrm = window && event.senderFrame === window.webContents.mainFrame &&
      isTrustedOrigin(frameOrigin);
  if (!isCrm) throw new Error('Untrusted PBX caller.');
}

function pbxAccountPath() {
  return path.join(app.getPath('userData'), 'pbx-account.json');
}

async function readPbxAccount() {
  try {
    const stored = JSON.parse(await fs.readFile(pbxAccountPath(), 'utf8'));
    if (typeof stored.encrypted !== 'string' || !safeStorage.isEncryptionAvailable()) return null;
    const value = JSON.parse(safeStorage.decryptString(Buffer.from(stored.encrypted, 'base64')));
    return value && typeof value === 'object' ? value : null;
  } catch { return null; }
}

function cleanSipField(value, label, required = true) {
  if (typeof value !== 'string') value = '';
  value = value.trim();
  if (required && !value) throw new Error(`Enter the ${label}.`);
  if (value.length > 512 || /[\r\n\0]/.test(value)) throw new Error(`The ${label} is invalid.`);
  return value;
}

async function savePbxAccount(input) {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('Windows credential protection is unavailable. Restart the app and try again.');
  if (!input || typeof input !== 'object') throw new Error('Enter the SIP account details.');
  const current = await readPbxAccount();
  const submittedPassword = typeof input.password === 'string' ? input.password : '';
  if (submittedPassword.length > 256 || /[\r\n\0]/.test(submittedPassword)) throw new Error('The SIP password is invalid.');
  const config = {
    server: cleanSipField(input.server, 'SIP server'),
    domain: cleanSipField(input.domain, 'SIP domain'),
    username: cleanSipField(input.username, 'SIP username'),
    login: cleanSipField(input.login, 'SIP login'),
    password: submittedPassword || current?.password || ''
  };
  if (config.password.length > 256) throw new Error('The SIP password is too long.');
  if (!config.password) throw new Error('Enter the SIP password once, then save the account.');
  if (!/^[A-Za-z0-9.-]+(?::\d{1,5})?$/.test(config.server.replace(/^sips?:/i, ''))) throw new Error('Use a server host such as sip2.cloud-connect.in:7065.');
  if (!/^[A-Za-z0-9.-]+(?::\d{1,5})?$/.test(config.domain.replace(/^sips?:/i, ''))) throw new Error('Use a SIP domain such as sip2.cloud-connect.in.');
  const encrypted = safeStorage.encryptString(JSON.stringify(config)).toString('base64');
  await fs.mkdir(path.dirname(pbxAccountPath()), { recursive: true });
  await fs.writeFile(pbxAccountPath(), JSON.stringify({ encrypted }), { encoding: 'utf8', mode: 0o600 });
  config.password = '';
  return { server: config.server, domain: config.domain, username: config.username, login: config.login, hasPassword: true };
}

function logDebug(msg) {
  try {
    const text = `[${new Date().toISOString()}] ${msg}\n`;
    fs.appendFile(path.join(app.getPath('userData'), 'pbx-debug.log'), text).catch(() => {});
  } catch {}
}

function forwardPbxEvent(message) {
  if (!message || typeof message !== 'object' || typeof message.type !== 'string') return;
  logDebug(`[FORWARD] type=${message.type} state=${message.state || ''} number=${message.number || ''} status=${message.lastStatus || ''} reason=${message.reason || ''}`);
  if (['ready', 'registration', 'incoming', 'outgoing', 'call', 'audio'].includes(message.type)) pbxSnapshot[message.type] = message;
  if (message.type === 'closed') pbxSnapshot = { closed: message };
  if (message.type === 'incoming') {
    if (window && !window.isDestroyed()) {
      if (window.isMinimized()) window.restore();
      window.show();
      window.focus();
    }
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: 'Incoming PBX call',
        body: message.number || 'Caller number unavailable',
        actions: [{ type: 'button', text: '📞 Answer' }, { type: 'button', text: '❌ Reject' }]
      });
      notification.on('action', (_e, index) => {
        logDebug(`[NOTIF ACTION] index=${index}`);
        if (index === 0) {
          try { sendPbxCommand({ action: 'answer' }); } catch (err) { logDebug(`[NOTIF ANSWER ERR] ${err.message}`); }
        } else {
          try { sendPbxCommand({ action: 'reject' }); } catch (err) { logDebug(`[NOTIF REJECT ERR] ${err.message}`); }
        }
      });
      notification.on('click', () => {
        if (window && !window.isDestroyed()) {
          if (window.isMinimized()) window.restore();
          window.show();
          window.focus();
        }
      });
      notification.show();
    }
  }
  if (window && !window.isDestroyed()) {
    logDebug(`[DISPATCH TO CRM] Sending pbx:event ${message.type}`);
    window.webContents.send('pbx:event', message);
  }
}

function sendPbxCommand(command) {
  if (!pbxEngine || pbxEngine.killed || !pbxEngine.stdin.writable) throw new Error('Connect the PBX account first.');
  logDebug(`[SEND COMMAND] ${JSON.stringify(command)}`);
  pbxEngine.stdin.write(JSON.stringify(command) + '\n');
  return { ok: true };
}

async function startPbxEngine() {
  if (pbxEngine && !pbxEngine.killed) return { started: true };
  const config = await readPbxAccount();
  if (!config?.password) throw new Error('Save the SIP account and password first.');
  const enginePath = app.isPackaged
    ? path.join(process.resourcesPath, 'pbx', 'bny-pbx-engine.exe')
    : path.join(__dirname, 'native', 'bny-pbx-engine.exe');
  try { await fs.access(enginePath); } catch { throw new Error('The PBX engine is missing. Rebuild the app with npm run build:pbx.'); }
  logDebug(`[ENGINE START] Spawning ${enginePath}`);
  const child = spawn(enginePath, [], { cwd: path.dirname(enginePath), windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
  pbxEngine = child;
  pbxStopping = false;
  pbxSnapshot = {};
  let buffer = '';
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', chunk => {
    buffer += chunk;
    if (buffer.length > 65536) buffer = buffer.slice(-8192);
    let end;
    while ((end = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, end).trim();
      buffer = buffer.slice(end + 1);
      if (!line) continue;
      logDebug(`[ENGINE OUT] ${line}`);
      try { forwardPbxEvent(JSON.parse(line)); } catch { /* Ignore malformed engine output. */ }
    }
  });
  child.once('error', error => forwardPbxEvent({ type: 'error', message: `Could not start the PBX engine: ${error.message}` }));
  child.once('close', code => {
    if (pbxEngine === child) pbxEngine = null;
    pbxStopping = false;
    if (code !== 0 && !quitting) forwardPbxEvent({ type: 'error', message: 'PBX engine stopped unexpectedly. Check the account and network, then reconnect.' });
    forwardPbxEvent({ type: 'closed' });
  });
  child.stdin.on('error', () => {});
  const initial = Buffer.from(JSON.stringify({ server: config.server, domain: config.domain, username: config.username, login: config.login, password: config.password }) + '\n', 'utf8');
  config.password = '';
  child.stdin.write(initial, () => initial.fill(0));
  return { started: true };
}

function stopPbxEngine() {
  const child = pbxEngine;
  if (!child || child.killed) return Promise.resolve();
  pbxStopping = true;
  return new Promise(resolve => {
    let settled = false;
    const finish = () => { if (settled) return; settled = true; clearTimeout(timer); resolve(); };
    child.once('close', finish);
    const timer = setTimeout(() => { if (!child.killed) child.kill(); finish(); }, 5000);
    try { if (child.stdin.writable) child.stdin.write('{"action":"shutdown"}\n'); else finish(); }
    catch { child.kill(); finish(); }
  });
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (window) { window.show(); window.focus(); } });
  app.whenReady().then(() => {
    const resources = app.isPackaged ? path.join(process.resourcesPath, 'worker') : path.join(__dirname, 'bundle');
    worker = fork(path.join(resources, 'worker.cjs'), [], { execPath: path.join(resources, 'node.exe'),
      cwd: resources, windowsHide: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
    worker.on('message', result => {
      const request = pending.get(result.id);
      if (!request) return;
      clearTimeout(request.timer); pending.delete(result.id);
      result.error ? request.reject(new Error(result.error)) : request.resolve({ ok: true });
    });
    const fail = () => { for (const request of pending.values()) { clearTimeout(request.timer); request.reject(new Error('Modem engine stopped. Reopen the app.')); } pending.clear(); };
    worker.on('error', fail); worker.on('exit', fail);
    ipcMain.handle('pbx:get-config', async event => {
      assertPbxFrame(event);
      const config = await readPbxAccount();
      if (!config) return { hasPassword: false };
      return { server: config.server, domain: config.domain, username: config.username, login: config.login, hasPassword: Boolean(config.password) };
    });
    ipcMain.handle('pbx:get-status', event => {
      assertPbxFrame(event);
      return { engineRunning: Boolean(pbxEngine && !pbxEngine.killed), ...pbxSnapshot };
    });
    ipcMain.handle('pbx:save-config', async (event, config) => { assertPbxFrame(event); return savePbxAccount(config); });
    ipcMain.handle('pbx:connect', async event => { assertPbxFrame(event); return startPbxEngine(); });
    ipcMain.handle('pbx:disconnect', async event => { assertPbxFrame(event); await stopPbxEngine(); return { ok: true }; });
    ipcMain.handle('pbx:dial', (event, number) => {
      assertPbxFrame(event);
      if (typeof number !== 'string' || number.trim().length > 48 || !/^\+?[0-9*#]+$/.test(number.trim())) throw new Error('Enter a phone number using digits, +, * or #.');
      return sendPbxCommand({ action: 'dial', number: number.trim() });
    });
    for (const action of ['answer', 'reject', 'hangup']) {
      ipcMain.handle(`pbx:${action}`, event => { assertPbxFrame(event); return sendPbxCommand({ action }); });
    }
    ipcMain.handle('log:debug', (_event, msg) => { logDebug(msg); return true; });
    ipcMain.handle('modem:connect', async (event, ticket) => {
      const frameOrigin = new URL(event.senderFrame.url).origin;
      if (event.senderFrame !== window.webContents.mainFrame || !isTrustedOrigin(frameOrigin)) throw new Error('Untrusted page.');
      if (typeof ticket !== 'string' || ticket.length > 8192 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(ticket)) throw new Error('Invalid connection ticket.');
      if (!worker.connected) throw new Error('Modem engine is unavailable.');
      const id = crypto.randomUUID();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('Modem connection timed out.')); }, 25000);
        pending.set(id, { resolve, reject, timer }); worker.send({ type: 'connect', id, ticket });
      });
    });
    session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => {
      const currentUrl = contents.getURL();
      const trusted = contents === window?.webContents && isTrustedOrigin(currentUrl);
      if (!trusted || !['media', 'notifications'].includes(permission)) return callback(false);
      dialog.showMessageBox(window, { type: 'question', buttons: ['Allow', 'Cancel'], defaultId: 1,
        message: `Allow the CRM to use ${permission === 'media' ? 'your microphone/camera' : 'notifications'}?` }).then(result => callback(result.response === 0));
    });
    window = new BrowserWindow({
      width: 1300,
      height: 900,
      title: 'BNY CRM',
      icon: path.join(__dirname, 'assets', 'icon.png'),
      webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true }
    });
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => { if (!isTrustedOrigin(url)) event.preventDefault(); });
    window.webContents.on('did-finish-load', () => {
      for (const item of ['ready', 'registration', 'incoming', 'outgoing', 'call', 'audio']) {
        if (pbxSnapshot[item]) window?.webContents.send('pbx:event', pbxSnapshot[item]);
      }
    });
    resolveStartUrl().then(targetUrl => {
      logDebug(`[CRM START URL] Loading ${targetUrl}`);
      window.loadURL(targetUrl);
    });
    window.webContents.on('did-fail-load', (_event, code) => { if (code !== -3) dialog.showErrorBox('CRM unavailable', 'Check your internet connection, then reopen BNY CRM.'); });
    const menu = Menu.buildFromTemplate([
      { label: 'File', submenu: [
        { label: 'Open CRM', click: () => { window?.show(); window?.focus(); } },
        { label: 'Reload Page', accelerator: 'Ctrl+R', click: () => { window?.webContents.reload(); } },
        { label: 'Toggle Developer Tools', accelerator: 'Ctrl+Shift+I', click: () => { window?.webContents.toggleDevTools(); } },
        { type: 'separator' },
        { label: 'Switch to Localhost (3000)', click: () => { window?.loadURL('http://localhost:3000'); } },
        { label: 'Switch to Live Vercel', click: () => { window?.loadURL('https://bnycrm1.vercel.app'); } },
        { type: 'separator' },
        { role: 'quit' }
      ] }
    ]);
    Menu.setApplicationMenu(menu);

    // Auto-connect PBX engine on launch if account credentials exist
    readPbxAccount().then(config => {
      if (config?.password) {
        startPbxEngine().catch(err => console.warn('Auto PBX start failed:', err?.message));
      }
    }).catch(() => {});
  });
  app.on('before-quit', () => {
    if (quitting) return;
    quitting = true;
    try { if (pbxEngine && !pbxEngine.killed) pbxEngine.kill(); } catch {}
    try { if (worker && !worker.killed) worker.kill(); } catch {}
  });
  app.on('activate', () => { if (!window) return; window.show(); window.focus(); });
  app.on('window-all-closed', () => app.quit());
}
