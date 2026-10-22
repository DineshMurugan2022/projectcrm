const { app, BrowserWindow, ipcMain, dialog, session, Menu, safeStorage, Notification, screen, Tray } = require('electron');
const { fork, spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
let autoUpdater = null;
try {
  autoUpdater = require('electron-updater').autoUpdater;
} catch {}
const defaultOrigin = 'https://bnycrm1.vercel.app';
const trustedOrigins = [
  'https://bnycrm1.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];
if (process.env.CRM_URL) {
  try {
    const customOrigin = new URL(process.env.CRM_URL).origin;
    if (!trustedOrigins.includes(customOrigin)) trustedOrigins.push(customOrigin);
  } catch {}
}

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

let window, pbxWindow, tray, worker, pbxEngine, quitting = false, pbxStopping = false;
let pbxSnapshot = {};
const pending = new Map();

function openPbxWindow() {
  if (pbxWindow && !pbxWindow.isDestroyed()) {
    if (pbxWindow.isMinimized()) pbxWindow.restore();
    pbxWindow.show();
    pbxWindow.focus();
    return;
  }
  const display = screen.getPrimaryDisplay();
  const workArea = display.workAreaSize;
  const pbxWidth = 420;
  const pbxHeight = Math.min(720, Math.max(560, Math.round(workArea.height * 0.85)));
  pbxWindow = new BrowserWindow({
    width: pbxWidth,
    height: pbxHeight,
    minWidth: 360,
    minHeight: 520,
    title: 'BNY PBX Phone',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });
  pbxWindow.loadFile(path.join(__dirname, 'pbx.html'));
  pbxWindow.webContents.on('did-finish-load', () => {
    for (const item of ['ready', 'registration', 'incoming', 'outgoing', 'call', 'audio']) {
      if (pbxSnapshot[item]) pbxWindow?.webContents.send('pbx:event', pbxSnapshot[item]);
    }
  });
  pbxWindow.on('closed', () => { pbxWindow = null; });
}

function setupAutoUpdater() {
  if (!autoUpdater || !app.isPackaged) {
    logDebug('[UPDATER] In development mode or unpackaged; skipping background update check.');
    return;
  }
  try {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on('checking-for-update', () => logDebug('[UPDATER] Checking GitHub releases for updates...'));
    autoUpdater.on('update-available', info => {
      logDebug(`[UPDATER] New update available: v${info.version}`);
      if (Notification.isSupported()) {
        new Notification({
          title: 'BNY CRM Update Available',
          body: `Version ${info.version} is downloading in the background.`
        }).show();
      }
    });

    autoUpdater.on('update-downloaded', info => {
      logDebug(`[UPDATER] Update downloaded: v${info.version}`);
      dialog.showMessageBox(window || null, {
        type: 'info',
        buttons: ['Restart & Install Now', 'Install on Exit'],
        defaultId: 0,
        cancelId: 1,
        title: 'BNY CRM Update Ready',
        message: `Version ${info.version} has been downloaded. Restart now to apply updates?`
      }).then(choice => {
        if (choice.response === 0) {
          quitting = true;
          autoUpdater.quitAndInstall();
        }
      });
    });

    autoUpdater.on('error', err => logDebug(`[UPDATER ERROR] ${err?.message || err}`));

    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify().catch(e => logDebug(`[UPDATER CHECK FAILED] ${e.message}`));
    }, 6000);

    setInterval(() => {
      autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    }, 3 * 60 * 60 * 1000);
  } catch (err) {
    logDebug(`[UPDATER SETUP ERROR] ${err?.message}`);
  }
}

function setupTray() {
  try {
    const iconPath = path.join(__dirname, 'assets', 'icon.png');
    tray = new Tray(iconPath);
    const trayMenu = Menu.buildFromTemplate([
      { label: 'Open BNY CRM', click: () => { window?.show(); window?.focus(); } },
      { label: 'Open PBX Phone (Mini Dialer)', click: openPbxWindow },
      { type: 'separator' },
      { label: 'Check for Updates', click: () => {
        if (autoUpdater && app.isPackaged) {
          autoUpdater.checkForUpdates().catch(e => dialog.showErrorBox('Update Check', e.message));
        } else {
          dialog.showMessageBox(window || null, { type: 'info', message: 'Auto-updater is active in packaged builds.' });
        }
      }},
      { type: 'separator' },
      { label: 'Quit BNY CRM', click: () => { quitting = true; app.quit(); } }
    ]);
    tray.setToolTip('BNY CRM Telecaller Suite');
    tray.setContextMenu(trayMenu);
    tray.on('click', () => {
      if (window?.isVisible()) {
        if (window.isFocused()) window.hide();
        else window.focus();
      } else {
        window?.show();
        window?.focus();
      }
    });
  } catch (err) {
    logDebug(`[TRAY SETUP ERROR] ${err?.message}`);
  }
}

function assertPbxFrame(event) {
  if (pbxWindow && !pbxWindow.isDestroyed() && event.senderFrame === pbxWindow.webContents.mainFrame) {
    return; // Authorized PBX mini dialer window
  }
  const frameOrigin = new URL(event.senderFrame.url).origin;
  const isCrm = window && !window.isDestroyed() && event.senderFrame === window.webContents.mainFrame &&
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
  if (pbxWindow && !pbxWindow.isDestroyed()) {
    logDebug(`[DISPATCH TO PBX WINDOW] Sending pbx:event ${message.type}`);
    pbxWindow.webContents.send('pbx:event', message);
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

try {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('tel', process.execPath, [path.resolve(process.argv[1])]);
      app.setAsDefaultProtocolClient('callto', process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient('tel');
    app.setAsDefaultProtocolClient('callto');
  }
} catch (err) {
  logDebug(`[PROTOCOL SETUP ERROR] ${err?.message}`);
}

function extractTelNumber(args) {
  if (!Array.isArray(args)) return null;
  for (const arg of args) {
    if (typeof arg === 'string') {
      const match = arg.match(/^(?:tel|callto):(?:\/\/)?([^?]+)/i);
      if (match && match[1]) {
        const decoded = decodeURIComponent(match[1]).trim();
        const clean = decoded.replace(/[^\d+*#]/g, '');
        if (clean) return clean;
      }
    }
  }
  return null;
}

function handleIncomingTel(cleanNumber) {
  if (!cleanNumber) return;
  logDebug(`[TEL PROTOCOL] Handling incoming dial request: ${cleanNumber}`);
  if (window && !window.isDestroyed()) {
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
    window.webContents.send('tel:dial', cleanNumber);
    window.webContents.executeJavaScript(`
      try {
        sessionStorage.setItem('pending_click_to_call', ${JSON.stringify(cleanNumber)});
        window.dispatchEvent(new CustomEvent('tel-dial', { detail: { number: ${JSON.stringify(cleanNumber)} } }));
        window.dispatchEvent(new CustomEvent('external-dial', { detail: { number: ${JSON.stringify(cleanNumber)} } }));
        const u = new URL(window.location.href);
        u.searchParams.set('number', ${JSON.stringify(cleanNumber)});
        window.history.replaceState({}, '', u.toString());
      } catch (e) {}
    `).catch(() => {});
  }
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', (_event, commandLine) => {
    if (window) {
      if (window.isMinimized()) window.restore();
      window.show();
      window.focus();
    }
    const telNumber = extractTelNumber(commandLine);
    if (telNumber) {
      handleIncomingTel(telNumber);
    }
  });
  function ensureWorker() {
    if (worker && worker.connected) return worker;
    const resources = app.isPackaged ? path.join(process.resourcesPath, 'worker') : path.join(__dirname, 'bundle');
    worker = fork(path.join(resources, 'worker.cjs'), [], { execPath: path.join(resources, 'node.exe'),
      cwd: resources, windowsHide: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
    worker.on('message', result => {
      const request = pending.get(result.id);
      if (!request) return;
      clearTimeout(request.timer); pending.delete(result.id);
      result.error ? request.reject(new Error(result.error)) : request.resolve({ ok: true });
    });
    const fail = () => {
      for (const request of pending.values()) {
        clearTimeout(request.timer);
        request.reject(new Error('Modem engine disconnected.'));
      }
      pending.clear();
      worker = null;
    };
    worker.on('error', fail);
    worker.on('exit', fail);
    return worker;
  }
  ensureWorker();

  app.whenReady().then(() => {
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
      const activeWorker = ensureWorker();
      if (!activeWorker || !activeWorker.connected) throw new Error('Modem engine is unavailable.');
      const id = crypto.randomUUID();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('Modem connection timed out.')); }, 25000);
        pending.set(id, { resolve, reject, timer }); activeWorker.send({ type: 'connect', id, ticket });
      });
    });
    // Silent auto-grant for microphone and desktop notifications on trusted CRM origins
    session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => {
      const currentUrl = contents.getURL();
      const isMain = contents === window?.webContents;
      const trusted = isMain || isTrustedOrigin(currentUrl);
      if (trusted && ['media', 'notifications'].includes(permission)) {
        logDebug(`[PERMISSIONS] Auto-granted ${permission} to trusted origin ${currentUrl}`);
        return callback(true);
      }
      callback(false);
    });

    if (typeof session.defaultSession.setPermissionCheckHandler === 'function') {
      session.defaultSession.setPermissionCheckHandler((contents, permission, requestingOrigin) => {
        if (isTrustedOrigin(requestingOrigin) && ['media', 'notifications'].includes(permission)) {
          return true;
        }
        return false;
      });
    }

    // Responsive screen size calculation adapting to any monitor (1366x768, 1080p, 2K/4K)
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    const initialWidth = Math.min(1440, Math.max(1024, Math.round(screenWidth * 0.92)));
    const initialHeight = Math.min(960, Math.max(660, Math.round(screenHeight * 0.90)));

    window = new BrowserWindow({
      width: initialWidth,
      height: initialHeight,
      minWidth: 980,
      minHeight: 620,
      center: true,
      autoHideMenuBar: true, // Clean modern window frame (press Alt to access menu)
      title: 'BNY CRM',
      icon: path.join(__dirname, 'assets', 'icon.png'),
      backgroundColor: '#f8fafc',
      show: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true
      }
    });

    window.once('ready-to-show', () => {
      window.show();
    });

    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => { if (!isTrustedOrigin(url)) event.preventDefault(); });
    window.webContents.on('did-finish-load', () => {
      for (const item of ['ready', 'registration', 'incoming', 'outgoing', 'call', 'audio']) {
        if (pbxSnapshot[item]) window?.webContents.send('pbx:event', pbxSnapshot[item]);
      }
      if (coldStartTel) {
        window?.webContents.send('tel:dial', coldStartTel);
      }
    });

    const coldStartTel = extractTelNumber(process.argv);
    resolveStartUrl().then(targetUrl => {
      let finalUrl = targetUrl;
      if (coldStartTel) {
        try {
          const u = new URL(targetUrl);
          u.searchParams.set('number', coldStartTel);
          finalUrl = u.toString();
        } catch {}
      }
      logDebug(`[CRM START URL] Loading ${finalUrl}`);
      window.loadURL(finalUrl);
    });

    window.webContents.on('did-fail-load', (_event, code) => {
      if (code !== -3) {
        dialog.showMessageBox(window, {
          type: 'warning',
          title: 'CRM Connection Notice',
          message: 'Unable to connect to BNY CRM. Please check your internet connection.',
          buttons: ['Retry', 'Quit'],
          defaultId: 0
        }).then(res => {
          if (res.response === 0) {
            resolveStartUrl().then(url => window.loadURL(url));
          } else {
            quitting = true;
            app.quit();
          }
        });
      }
    });

    // Minimize to System Tray when closing the main window so incoming calls are not missed
    let hasShownTrayNotification = false;
    window.on('close', event => {
      if (!quitting) {
        event.preventDefault();
        window.hide();
        if (Notification.isSupported() && !hasShownTrayNotification) {
          hasShownTrayNotification = true;
          new Notification({
            title: 'BNY CRM is running in the background',
            body: 'Incoming calls will continue to alert you. Right-click the system tray icon to exit.'
          }).show();
        }
      }
    });

    const menu = Menu.buildFromTemplate([
      {
        label: 'File',
        submenu: [
          { label: 'Open CRM', click: () => { window?.show(); window?.focus(); } },
          { label: 'Reload Page', accelerator: 'Ctrl+R', click: () => { window?.webContents.reload(); } },
          { label: 'Toggle Developer Tools', accelerator: 'Ctrl+Shift+I', click: () => { window?.webContents.toggleDevTools(); } },
          { type: 'separator' },
          { label: 'Check for Updates...', click: () => {
            if (autoUpdater && app.isPackaged) {
              autoUpdater.checkForUpdates().catch(e => dialog.showErrorBox('Update Check', e.message));
            } else {
              dialog.showMessageBox(window, { type: 'info', message: 'Auto-updater is active in packaged production builds.' });
            }
          }},
          { type: 'separator' },
          { label: 'Switch to Localhost (3000)', click: () => { window?.loadURL('http://localhost:3000'); } },
          { label: 'Switch to Live Vercel', click: () => { window?.loadURL('https://bnycrm1.vercel.app'); } },
          { type: 'separator' },
          { label: 'Exit BNY CRM', click: () => { quitting = true; app.quit(); } }
        ]
      },
      {
        label: 'Phone',
        submenu: [
          { label: 'Open PBX Phone (Mini Dialer)', accelerator: 'CmdOrCtrl+Shift+P', click: openPbxWindow },
          { label: 'Reconnect PBX Engine', click: () => startPbxEngine().catch(e => logDebug(e.message)) }
        ]
      },
      {
        label: 'View',
        submenu: [
          { role: 'resetZoom' },
          { role: 'zoomIn' },
          { role: 'zoomOut' },
          { type: 'separator' },
          { role: 'togglefullscreen' }
        ]
      }
    ]);
    Menu.setApplicationMenu(menu);

    setupTray();
    setupAutoUpdater();

    // Auto-connect PBX engine on launch if account credentials exist
    readPbxAccount().then(config => {
      if (config?.password) {
        startPbxEngine().catch(err => console.warn('Auto PBX start failed:', err?.message));
      }
    }).catch(() => {});
  });

  app.on('before-quit', () => {
    quitting = true;
    try { if (tray && !tray.isDestroyed()) tray.destroy(); } catch {}
    try { if (pbxEngine && !pbxEngine.killed) pbxEngine.kill(); } catch {}
    try { if (worker && !worker.killed) worker.kill(); } catch {}
  });

  app.on('activate', () => {
    if (window) {
      if (window.isMinimized()) window.restore();
      window.show();
      window.focus();
    }
  });

  app.on('window-all-closed', () => {
    // Keep app alive in tray unless explicitly quitting
    if (quitting) app.quit();
  });
}
