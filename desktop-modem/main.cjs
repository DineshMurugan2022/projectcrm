const { app, BrowserWindow, ipcMain, dialog, session } = require('electron');
const { fork } = require('node:child_process');
const path = require('node:path');
const crypto = require('node:crypto');
const origin = 'https://bnycrm1.vercel.app';
let window, worker, quitting = false;
const pending = new Map();
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
    ipcMain.handle('modem:connect', async (event, ticket) => {
      if (event.senderFrame !== window.webContents.mainFrame || new URL(event.senderFrame.url).origin !== origin) throw new Error('Untrusted page.');
      if (typeof ticket !== 'string' || ticket.length > 8192 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(ticket)) throw new Error('Invalid connection ticket.');
      if (!worker.connected) throw new Error('Modem engine is unavailable.');
      const id = crypto.randomUUID();
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); reject(new Error('Modem connection timed out.')); }, 25000);
        pending.set(id, { resolve, reject, timer }); worker.send({ type: 'connect', id, ticket });
      });
    });
    session.defaultSession.setPermissionRequestHandler((contents, permission, callback) => {
      const trusted = contents === window?.webContents && contents.getURL().startsWith(origin + '/');
      if (!trusted || !['media', 'notifications'].includes(permission)) return callback(false);
      dialog.showMessageBox(window, { type: 'question', buttons: ['Allow', 'Cancel'], defaultId: 1,
        message: `Allow the CRM to use ${permission === 'media' ? 'your microphone/camera' : 'notifications'}?` }).then(result => callback(result.response === 0));
    });
    window = new BrowserWindow({ width: 1300, height: 900, title: 'BNY CRM Modem',
      webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true } });
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    window.webContents.on('will-navigate', (event, url) => { if (new URL(url).origin !== origin) event.preventDefault(); });
    window.loadURL(origin);
    window.webContents.on('did-fail-load', (_event, code) => { if (code !== -3) dialog.showErrorBox('CRM unavailable', 'Check your internet connection, then reopen BNY CRM Modem.'); });
  });
  app.on('before-quit', event => {
    if (quitting) return;
    event.preventDefault(); quitting = true;
    if (worker?.connected) {
      worker.once('exit', () => app.quit()); worker.send({ type: 'stop' });
      setTimeout(() => { worker.kill(); app.quit(); }, 12000).unref();
    } else app.quit();
  });
  app.on('window-all-closed', () => app.quit());
}
