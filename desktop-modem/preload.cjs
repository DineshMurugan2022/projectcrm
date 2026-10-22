const { contextBridge, ipcRenderer } = require('electron');

const subscribeToPbx = callback => {
  if (typeof callback !== 'function') throw new TypeError('PBX event listener must be a function.');
  const listener = (_event, message) => callback(message);
  ipcRenderer.on('pbx:event', listener);
  return () => ipcRenderer.removeListener('pbx:event', listener);
};

const pbxControls = {
  available: true,
  getStatus: () => ipcRenderer.invoke('pbx:get-status'),
  connect: () => ipcRenderer.invoke('pbx:connect'),
  disconnect: () => ipcRenderer.invoke('pbx:disconnect'),
  dial: number => ipcRenderer.invoke('pbx:dial', number),
  answer: () => ipcRenderer.invoke('pbx:answer'),
  reject: () => ipcRenderer.invoke('pbx:reject'),
  hangup: () => ipcRenderer.invoke('pbx:hangup'),
  onEvent: subscribeToPbx
};

const isPbxWindow = location.protocol === 'file:' && location.pathname.toLowerCase().endsWith('pbx.html');

if (isPbxWindow) {
  // Dedicated PBX standalone window configuration access
  contextBridge.exposeInMainWorld('bnyPbx', {
    ...pbxControls,
    getConfig: () => ipcRenderer.invoke('pbx:get-config'),
    saveConfig: config => ipcRenderer.invoke('pbx:save-config', config)
  });
} else {
  // Expose safe APIs to the CRM web page
  contextBridge.exposeInMainWorld('isDesktopApp', true);
  contextBridge.exposeInMainWorld('bnyModem', { connect: ticket => ipcRenderer.invoke('modem:connect', ticket) });
  contextBridge.exposeInMainWorld('bnyPbx', {
    ...pbxControls,
    getConfig: () => ipcRenderer.invoke('pbx:get-config'),
    saveConfig: config => ipcRenderer.invoke('pbx:save-config', config)
  });

  // Suppress duplicate browser WebRTC WSS SIP connection so only native UDP engine registers
  try {
    const injectScript = document.createElement('script');
    injectScript.textContent = `
      (() => {
        const OrigWebSocket = window.WebSocket;
        window.WebSocket = function(url, protocols) {
          if (typeof url === 'string' && url.includes('cloud-connect.in') && (url.includes(':7443') || url.includes(':7065'))) {
            console.log('🛡️ [BNY Desktop] Suppressed duplicate browser WebRTC WSS SIP connection to', url, 'as native UDP engine is active.');
            return {
              addEventListener: () => {},
              removeEventListener: () => {},
              send: () => {},
              close: () => {},
              readyState: 3
            };
          }
          return new OrigWebSocket(url, protocols);
        };
        Object.assign(window.WebSocket, OrigWebSocket);
      })();
    `;
    (document.head || document.documentElement).appendChild(injectScript);
  } catch (e) { }
}
