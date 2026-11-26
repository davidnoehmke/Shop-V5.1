function initializeGrowCalendar(root) {
  if (root.dataset.growMounted === 'true') return;

  const controls = root.querySelector('[data-controls]');
  const month = root.querySelector('[data-month]');
  const search = root.querySelector('[data-search]');
  const category = root.querySelector('[data-category]');
  const counter = root.querySelector('[data-count]');
  const cards = Array.from(root.querySelectorAll('[data-plant]'));
  if (!controls || !month || !search || !category || !counter || !cards.length) return;

  const language = document.documentElement.lang || 'de';
  const format = new Intl.DateTimeFormat(language, { month: 'long' });
  for (const option of Array.from(month.options)) {
    const value = Number(option.value);
    if (value >= 1 && value <= 12) {
      option.textContent = format.format(new Date(2024, value - 1, 1));
    }
  }

  const fromUrl = Number(new URLSearchParams(window.location.search).get('month'));
  month.value = String(fromUrl >= 1 && fromUrl <= 12 ? fromUrl : new Date().getMonth() + 1);

  const update = () => {
    const currentMonth = month.value;
    const currentCategory = category.value;
    const term = search.value.trim().toLocaleLowerCase(language);
    let visible = 0;

    for (const card of cards) {
      const months = (card.dataset.months || '').split(',');
      const name = (card.querySelector('h3')?.textContent || '').toLocaleLowerCase(language);
      const matches = (currentMonth === '0' || months.includes(currentMonth))
        && (!currentCategory || card.dataset.cat === currentCategory)
        && (!term || name.includes(term));
      card.hidden = !matches;
      if (matches) visible++;
    }

    const label = language.startsWith('de') ? 'Pflanzen' : 'plants';
    const empty = language.startsWith('de') ? 'Keine Pflanzen gefunden. Bitte Filter ändern.' : 'No plants found. Adjust your filters.';
    counter.textContent = visible ? `${visible} / ${cards.length} ${label}` : empty;
  };

  root.dataset.growMounted = 'true';
  controls.hidden = false;
  month.addEventListener('change', update);
  category.addEventListener('change', update);
  search.addEventListener('input', update);
  update();
}

function initializeAll(scope) {
  scope.querySelectorAll('[data-grow-calendar]').forEach(initializeGrowCalendar);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initializeAll(document), { once: true });
} else {
  initializeAll(document);
}

document.addEventListener('shopify:section:load', (event) => {
  if (event.target instanceof HTMLElement) initializeAll(event.target);
});
