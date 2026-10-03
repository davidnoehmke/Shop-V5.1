(() => {
  const main = document.getElementById('MainContent');
  if (!main) return;

  if (document.body?.classList.contains('template-index')) {
    main.querySelectorAll('video[autoplay]').forEach((video) => {
      video.removeAttribute('autoplay');
      video.autoplay = false;
      video.pause();
    });
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const observed = new WeakSet();
  let revealObserver;

  const revealNow = (element) => {
    element.classList.add('is-visible');
  };

  const register = (element) => {
    if (!(element instanceof HTMLElement) || observed.has(element)) return;
    observed.add(element);

    if (reduceMotion || !revealObserver) {
      revealNow(element);
      return;
    }

    const rect = element.getBoundingClientRect();
    const visibleThreshold = window.innerHeight * 0.9;

    if (rect.top <= visibleThreshold || rect.bottom <= 0) {
      revealNow(element);
      return;
    }

    revealObserver.observe(element);
  };

  const discover = (root = main) => {
    if (root === main || root instanceof HTMLElement) {
      main.querySelectorAll(':scope > .shopify-section').forEach((section) => {
        if (!section.querySelector('[data-leaf-reveal]')) {
          section.setAttribute('data-leaf-reveal', '');
        }
      });
    }

    if (root instanceof HTMLElement && root.matches('[data-leaf-reveal]')) {
      register(root);
    }

    if (root.querySelectorAll) {
      root.querySelectorAll('[data-leaf-reveal]').forEach(register);
    }
  };

  if (reduceMotion || !('IntersectionObserver' in window)) {
    discover();
    new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) discover(node);
        });
      });
    }).observe(main, { childList: true, subtree: true });
    return;
  }

  document.documentElement.classList.add('leaf-motion-ready');

  revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      revealNow(entry.target);
      observer.unobserve(entry.target);
    });
  }, {
    rootMargin: '0px 0px -6% 0px',
    threshold: 0.05
  });

  discover();

  const dynamicObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof HTMLElement)) return;
        discover(node);
      });
    });
  });

  dynamicObserver.observe(main, { childList: true, subtree: true });

  document.addEventListener('shopify:section:load', (event) => {
    if (event.target instanceof HTMLElement && main.contains(event.target)) {
      discover(event.target);
    }
  });
})();