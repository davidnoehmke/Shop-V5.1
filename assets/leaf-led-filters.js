(() => {
  const initialize = (root) => {
    if (root.dataset.ledFiltersReady) return;
    root.dataset.ledFiltersReady = 'true';
    const buttons = [...root.querySelectorAll('[data-led-filter]')];
    const formatButtons = [...root.querySelectorAll('[data-led-format-filter]')];
    const cards = [...root.querySelectorAll('[data-led-card]')];
    const jumps = [...root.querySelectorAll('[data-led-jump]')];
    const empty = root.querySelector('[data-led-empty]');
    const count = root.querySelector('[data-led-count]');
    let usage = 'all';
    let format = 'all';
    const matches = (card) => {
      if (format !== 'all' && card.dataset.ledFormat !== format) return false;
      const text = (card.dataset.search || '').toLowerCase();
      const watts = Number(card.dataset.watts || 0);
      if (usage === 'single') return /einzel|topfpflanze|zimmerpflanze|solitär|sunlite/.test(text);
      if (usage === 'e27') return text.includes('e27');
      if (usage === 'shelf') return /regal|t8|röhre|leiste|linear|60cm|120cm/.test(text);
      if (usage === 'large') return watts >= 25 || /große|gross|wall|floris|150w|pflanzenwand/.test(text);
      if (usage === 'winter') return /überwinter|winter|mediterran|zitrus/.test(text);
      return true;
    };
    const apply = () => {
      let visible = 0;
      cards.forEach((card) => {
        card.hidden = !matches(card);
        if (!card.hidden) visible += 1;
      });
      jumps.forEach((link) => {
        const card = cards.find((item) => item.id === link.dataset.ledJump);
        link.hidden = !card || card.hidden;
      });
      [...buttons, ...formatButtons].forEach((button) => {
        const active = button.dataset.ledFormatFilter !== undefined
          ? button.dataset.ledFormatFilter === format : button.dataset.ledFilter === usage;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      if (empty) empty.hidden = visible !== 0;
      if (count) count.textContent = (count.dataset.template || '[count]').replace('[count]', String(visible));
    };
    formatButtons.forEach((button) => {
      if (button.dataset.ledFormatFilter !== 'all') {
        button.hidden = !cards.some((card) => card.dataset.ledFormat === button.dataset.ledFormatFilter);
      }
      button.addEventListener('click', () => { format = button.dataset.ledFormatFilter; apply(); });
    });
    buttons.forEach((button) => button.addEventListener('click', () => { usage = button.dataset.ledFilter; apply(); }));
    root.querySelectorAll('[data-led-delivery]').forEach((link) => link.addEventListener('click', () => {
      const details = document.getElementById(link.hash.slice(1));
      if (details) details.open = true;
    }));
    const revealHash = () => {
      const target = document.getElementById(window.location.hash.slice(1));
      const card = target?.closest('[data-led-card]');
      if (!card || !root.contains(card)) return;
      if (card.hidden) { usage = 'all'; format = 'all'; apply(); }
      if (target.matches('details')) target.open = true;
    };
    const params = new URLSearchParams(window.location.search);
    if (buttons.some((button) => button.dataset.ledFilter === params.get('led_use'))) usage = params.get('led_use');
    if (formatButtons.some((button) => !button.hidden && button.dataset.ledFormatFilter === params.get('led_format'))) format = params.get('led_format');
    apply();
    revealHash();
    window.addEventListener('hashchange', revealHash);
    const formats = root.querySelector('[data-led-formats]');
    if (formats) formats.hidden = false;
  };
  document.querySelectorAll('[data-led-hub]').forEach(initialize);
  document.addEventListener('shopify:section:load', (event) => {
    event.target.querySelectorAll('[data-led-hub]').forEach(initialize);
  });
})();
