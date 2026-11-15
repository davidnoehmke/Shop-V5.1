/* Progressive loader for the optional Earth Explorer. Keep core storefront HTML usable. */
(() => {
  const pending = new WeakSet();
  const loaded = new Set();
  const observers = new WeakMap();

  function mount(globe) {
    if (!globe || pending.has(globe)) return;
    const url = globe.dataset.moduleSrc;
    if (!url) return;
    pending.add(globe);
    if (loaded.has(url)) return;
    loaded.add(url);
    const script = document.createElement('script');
    script.src = url;
    script.async = true;
    script.dataset.leafModule = 'earth';
    script.onerror = () => {
      loaded.delete(url);
      pending.delete(globe);
      globe.dataset.moduleStatus = 'fallback';
      // The server-rendered heading, explanation and links remain accessible.
    };
    document.head.appendChild(script);
  }

  function prepare(root = document) {
    const targets = root.matches?.('leaf-soil-globe[data-module-src]')
      ? [root] : root.querySelectorAll?.('leaf-soil-globe[data-module-src]') || [];
    targets.forEach(globe => {
      if (pending.has(globe)) return;
      if (!('IntersectionObserver' in window)) { mount(globe); return; }
      const observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer.disconnect();
        observers.delete(globe);
        mount(globe);
      }, { rootMargin: '350px 0px', threshold: 0 });
      observers.set(globe, observer);
      observer.observe(globe);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => prepare(), { once: true });
  } else prepare();
  document.addEventListener('shopify:section:load', event => prepare(event.target));
})();
