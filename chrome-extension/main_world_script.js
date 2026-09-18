// B&Y CRM Click-to-Call Main World Script
// Intercepts JavaScript window.open and anchor clicks in the main webpage context
(function () {
  const handleTel = (url) => {
    if (typeof url === 'string' && url.toLowerCase().includes('tel:')) {
      console.log('📞 [CRM Extension Main World] Intercepted tel navigation:', url);
      window.dispatchEvent(new CustomEvent('CRM_CLICK_TO_CALL', { detail: url }));
      return true;
    }
    return false;
  };

  // Intercept HTMLAnchorElement.prototype.click
  try {
    const origClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      const href = this.getAttribute('href') || '';
      if (handleTel(href)) return;
      return origClick.apply(this, arguments);
    };
  } catch (e) {}

  // Intercept window.open
  try {
    const origOpen = window.open;
    window.open = function (url) {
      if (handleTel(url)) return null;
      return origOpen.apply(this, arguments);
    };
  } catch (e) {}
})();
