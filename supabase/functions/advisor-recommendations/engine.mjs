const groups = ['world', 'need', 'context', 'preference'];
const weights = { world: 8, need: 5, context: 3, preference: 2 };
const key = value => String(value || '').trim().toLocaleLowerCase();
const text = (value, max = 160) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const values = value => [...new Set(text(value, 4096).split('||').map(v => v.trim()).filter(Boolean))];

function productPath(value) {
  const path = text(value, 300);
  return /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?products\/[a-z0-9-]+(?:\?variant=\d+)?$/i.test(path) ? path : '';
}

function imageUrl(value) {
  const url = text(value, 1500);
  try {
    const parsed = new URL(url.startsWith('//') ? 'https:' + url : url);
    return parsed.protocol === 'https:' && ['cdn.shopify.com', 'leaferservice.com', 'www.leaferservice.com'].includes(parsed.hostname) ? parsed.href : '';
  } catch { return ''; }
}

export function recommend(input) {
  if (!input || !Array.isArray(input.rows) || input.rows.length > 400) throw new Error('invalid_candidates');
  const rows = input.rows.filter(row => row && typeof row === 'object').map(row => ({
    title: text(row.title, 300), url: productPath(row.url), price: text(row.price, 80),
    priceSort: Number.isFinite(Number(row.priceSort)) && Number(row.priceSort) >= 0 ? Number(row.priceSort) : 0,
    image: imageUrl(row.image), imageAlt: text(row.imageAlt, 300),
    world: values(row.world), worldLabel: text(row.worldLabel, 300),
    need: values(row.need), context: values(row.context), preference: values(row.preference)
  })).filter(row => row.url);
  const homeMode = input.homeMode === true;
  const collection = text(input.collection, 100);
  const selected = Object.fromEntries(groups.map(group => [group, text(input.selected?.[group])]));
  if (!homeMode) selected.world = collection;
  const options = {};
  function optionList(group, candidates) {
    const counts = new Map();
    for (const row of candidates) for (const value of row[group]) {
      const normalized = key(value);
      const current = counts.get(normalized) || { value, label: group === 'world' ? row.worldLabel || value : value, count: 0 };
      current.count += 1;
      counts.set(normalized, current);
    }
    return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, group === 'world' ? 8 : 10).map(({ value, label }) => ({ value, label }));
  }
  if (homeMode) {
    options.world = optionList('world', rows);
    const world = options.world.find(option => key(option.value) === key(selected.world));
    selected.world = world?.value || '';
  }
  const candidates = rows.filter(row => !selected.world || row.world.some(world => key(world) === key(selected.world)));
  for (const group of ['need', 'context', 'preference']) {
    options[group] = optionList(group, candidates);
    selected[group] = options[group].find(option => key(option.value) === key(selected[group]))?.value || '';
  }
  const groupOrder = homeMode ? groups : groups.slice(1);
  const selections = groupOrder.filter(group => selected[group]);
  const ranked = candidates.map(row => {
    let score = 0, matched = 0;
    for (const group of selections) if (row[group].some(value => key(value) === key(selected[group]))) {
      score += weights[group];
      matched += 1;
    }
    return { row, score, matched };
  }).sort((a, b) => b.score - a.score || a.row.priceSort - b.row.priceSort);
  const results = [], seen = new Set();
  for (const item of ranked) {
    if (seen.has(item.row.url) || (selections.length && item.matched === 0)) continue;
    seen.add(item.row.url);
    const { title, url, price, image, imageAlt } = item.row;
    results.push({ row: { title, url, price, image, imageAlt }, matched: item.matched });
    if (results.length === 3) break;
  }
  return { selected, options, groupOrder, steps: groupOrder.filter(group => options[group]?.length).concat('result'), results, selectionCount: selections.length };
}
