(() => {
  'use strict';
  const manualKey = 'leaferservice.language.manual.v1';
  const autoKey = 'leaferservice.language.auto.v1';

  const readStorage = (name, key) => {
    try { return window[name].getItem(key); } catch { return null; }
  };
  const writeStorage = (name, key, value) => {
    try { window[name].setItem(key, value); return true; } catch { return false; }
  };

  const init = () => {
    const forms = [...document.querySelectorAll('form.site-header__locale-form')];
    for (const form of forms) {
      if (form.dataset.leafLanguageReady === 'true') continue;
      const select = form.querySelector('select[name="language_code"]');
      if (!select) continue;
      form.dataset.leafLanguageReady = 'true';
      select.addEventListener('change', () => {
        writeStorage('localStorage', manualKey, select.value);
        form.requestSubmit();
      });
    }

    if (!forms.length || document.documentElement.lang.toLowerCase() !== 'de') return;
    if (window.location.pathname !== '/' || window.location.search || window.location.hash) return;
    if (!/^en(?:-|$)/i.test(navigator.language || '')) return;
    if (navigator.webdriver || /bot|crawler|spider|lighthouse|headless/i.test(navigator.userAgent || '')) return;
    if (window.Shopify && window.Shopify.designMode) return;
    if (readStorage('localStorage', manualKey) || readStorage('sessionStorage', autoKey)) return;

    const form = forms.find((item) =>
      window.getComputedStyle(item).display !== 'none' &&
      item.querySelector('option[value="en"]')
    );
    if (!form || !writeStorage('sessionStorage', autoKey, 'en')) return;
    const select = form.querySelector('select[name="language_code"]');
    select.value = 'en';
    form.requestSubmit();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
  document.addEventListener('shopify:section:load', init);
})();
