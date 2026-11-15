/**
 * Animate content, never section backgrounds or the scrolling viewport.
 * Everything remains visible without JavaScript, observers or animation support.
 */
export function installScrollReveal(root: HTMLElement): () => void {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!('IntersectionObserver' in window) || !('animate' in Element.prototype)) {
    return () => {};
  }

  const active = new Map<Element, Animation>();
  const seen = new WeakSet<Element>();
  let observer: IntersectionObserver | undefined;

  function stop() {
    observer?.disconnect();
    active.forEach((animation) => animation.cancel());
    active.clear();
  }

  function start() {
    stop();
    if (preference.matches) return;
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || seen.has(entry.target)) continue;
        const target = entry.target;
        seen.add(target);
        observer?.unobserve(target);
        if (target.contains(document.activeElement)) continue;
        const animation = target.animate(
          [
            {opacity: 0.65, transform: 'translateY(20px)'},
            {opacity: 1, transform: 'translateY(-1px)', offset: 0.8},
            {opacity: 1, transform: 'translateY(0)'},
          ],
          {duration: 900, easing: 'cubic-bezier(0.22, 1, 0.36, 1)'},
        );
        active.set(target, animation);
        void animation.finished.catch(() => {}).finally(() => {
          if (active.get(target) === animation) active.delete(target);
        });
      }
    }, {threshold: 0, rootMargin: '0px 0px -24px 0px'});

    // Leave the hero and restored/anchor scroll destinations immediately readable.
    for (const target of root.querySelectorAll<HTMLElement>(
      'section > div, section > header, section > h2, section > p, [data-leaf-reveal]',
    )) {
      // Only animate the outermost content group; no nested transforms.
      const parentGroup = target.parentElement?.closest(
        'section > div, section > header, [data-leaf-reveal]',
      );
      if (parentGroup && root.contains(parentGroup)) continue;
      if (target.getBoundingClientRect().top < window.innerHeight) {
        seen.add(target);
      } else if (!seen.has(target)) {
        observer.observe(target);
      }
    }
  }

  function revealFocused(event: FocusEvent) {
    for (const [target, animation] of active) {
      if (event.target instanceof Node && target.contains(event.target)) {
        animation.cancel();
        active.delete(target);
      }
    }
  }

  start();
  preference.addEventListener('change', start);
  root.addEventListener('focusin', revealFocused);
  return () => {
    stop();
    preference.removeEventListener('change', start);
    root.removeEventListener('focusin', revealFocused);
  };
}
