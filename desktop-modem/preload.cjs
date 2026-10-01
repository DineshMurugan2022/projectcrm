const { contextBridge, ipcRenderer } = require('electron');
// No filesystem, shell, raw serial port or arbitrary IPC API is exposed to the page.
if (location.origin === 'https://bnycrm1.vercel.app') {
  contextBridge.exposeInMainWorld('bnyModem', { connect: ticket => ipcRenderer.invoke('modem:connect', ticket) });
}
