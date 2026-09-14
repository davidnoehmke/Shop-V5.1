document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('[data-site-header]');
  if (!header) return;

  let lastScroll = window.scrollY;
  let ticking = false;

  const updateHeaderState = () => {
    const currentScroll = window.scrollY;
    header.classList.toggle('is-scrolled', currentScroll > 12);
    header.classList.toggle('is-quiet', currentScroll > lastScroll && currentScroll > 180);
    lastScroll = currentScroll;
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateHeaderState);
  }, { passive: true });
});