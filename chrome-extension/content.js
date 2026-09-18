// B&Y CRM Click-to-Call Content Script
(function () {
  function extractPhoneNumber(str) {
    if (!str) return null;
    const clean = String(str).replace(/^tel:/i, '').trim();
    const digitsOnly = clean.replace(/\D/g, '');
    if (digitsOnly.length >= 7 && digitsOnly.length <= 13) {
      return clean.replace(/[^\d+]/g, '');
    }
    return null;
  }

  function handleDial(number) {
    if (!number) return;
    console.log('📞 [CRM Extension] Sending dial request to CRM:', number);
    chrome.runtime.sendMessage({ action: 'dial', number: number });
  }

  // 1. Listen for main world intercepted events
  window.addEventListener('CRM_CLICK_TO_CALL', (e) => {
    const num = extractPhoneNumber(e.detail);
    if (num) handleDial(num);
  });

  // 2. Intercept capture-phase clicks on any tel: link or phone number element
  document.addEventListener('click', (e) => {
    let el = e.target;
    while (el && el !== document.body) {
      // Check href attribute
      const href = el.getAttribute ? (el.getAttribute('href') || '') : '';
      if (href.toLowerCase().includes('tel:')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const num = extractPhoneNumber(href);
        if (num) handleDial(num);
        return false;
      }

      // Check data attributes
      const dataPhone = el.getAttribute ? (el.getAttribute('data-phone-number') || el.getAttribute('data-number') || el.getAttribute('data-value') || '') : '';
      if (dataPhone) {
        const num = extractPhoneNumber(dataPhone);
        if (num) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          handleDial(num);
          return false;
        }
      }

      // Check text content matching phone formats (e.g. 099410 70555)
      const text = (el.innerText || el.textContent || '').trim();
      if (text && text.length <= 25 && /^(?:\+?91|0)?[6-9]\d{9}$|^(?:\+?\d{1,3})?[\s.-]?\(?\d{2,5}\)?[\s.-]?\d{3,5}[\s.-]?\d{3,5}$/.test(text)) {
        const num = extractPhoneNumber(text);
        if (num && num.replace(/\D/g, '').length >= 10) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          handleDial(num);
          return false;
        }
      }

      el = el.parentElement;
    }
  }, true);
})();
