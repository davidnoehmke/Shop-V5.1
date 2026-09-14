(() => {
  const body = document.body;
  if (!body || !body.classList.contains('template-index')) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sectionWrappers = document.querySelectorAll('#MainContent > .shopify-section');

  sectionWrappers.forEach((wrapper) => {
    if (!wrapper.querySelector('[data-leaf-reveal]')) {
      wrapper.setAttribute('data-leaf-reveal', '');
    }
  });

  const revealItems = [...document.querySelectorAll('[data-leaf-reveal]')];

  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
    return;
  }

  document.documentElement.classList.add('leaf-motion-ready');

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, {
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.08
  });

  requestAnimationFrame(() => {
    revealItems.forEach((item) => revealObserver.observe(item));
  });

  // Keep all homepage content accessible if a browser skips observer callbacks
  // during restored scroll positions or very fast programmatic navigation.
  window.setTimeout(() => {
    revealItems.forEach((item) => item.classList.add('is-visible'));
    revealObserver.disconnect();
  }, 3500);
})();
