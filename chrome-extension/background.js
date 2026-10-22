// B&Y CRM Click-to-Call Background Service Worker
const CRM_ORIGIN = 'https://bnycrm1.vercel.app';
const CRM_CALL_PATH = '/call';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'dial' && message.number) {
    const cleanNum = String(message.number).replace(/^tel:/i, '').replace(/[^\d+]/g, '');
    const targetUrl = `${CRM_ORIGIN}${CRM_CALL_PATH}?number=${encodeURIComponent(cleanNum)}`;
    console.log('🚀 [CRM Extension] Initiating dial for number:', cleanNum, 'Target URL:', targetUrl);

    chrome.tabs.query({}, (tabs) => {
      const crmTab = tabs.find((tab) => {
        if (!tab.url) return false;
        try {
          const url = new URL(tab.url);
          return url.origin === CRM_ORIGIN && url.pathname.replace(/\/$/, '') === CRM_CALL_PATH;
        } catch {
          return false;
        }
      });

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
