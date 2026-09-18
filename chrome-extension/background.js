// B&Y CRM Click-to-Call Background Service Worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'dial' && message.number) {
    const cleanNum = String(message.number).replace(/^tel:/i, '').replace(/[^\d+]/g, '');
    const targetUrl = `http://localhost:3000/call?number=${encodeURIComponent(cleanNum)}`;
    console.log('🚀 [CRM Extension] Initiating dial for number:', cleanNum, 'Target URL:', targetUrl);

    chrome.tabs.query({}, (tabs) => {
      const crmTab = tabs.find(t => t.url && (t.url.includes('localhost:3000/call') || t.url.includes('/call')));

      if (crmTab) {
        // Update existing CRM tab with new number and bring window to front
        chrome.tabs.update(crmTab.id, { url: targetUrl, active: true }, () => {
          if (crmTab.windowId) {
            chrome.windows.update(crmTab.windowId, { focused: true });
          }
        });
      } else {
        // Open new CRM tab if not already open
        chrome.tabs.create({ url: targetUrl, active: true });
      }
    });
  }
});
