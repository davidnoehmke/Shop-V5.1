export type MixPart = {id: string; handle: string; title: string; share: number};
export type VoiceShareCommand =
  | {kind: 'none' | 'invalid' | 'ambiguous' | 'single'}
  | {kind: 'valid'; partId: string; requested: number};

export function equalShares(parts: Array<Omit<MixPart, 'share'>>): MixPart[] {
  if (!parts.length) return [];
  const base = Math.floor(100 / parts.length);
  let remaining = 100 - base * parts.length;
  return parts.map((part) => ({...part, share: base + (remaining-- > 0 ? 1 : 0)}));
}

export function rebalance(parts: MixPart[], index: number, requested: number): MixPart[] {
  if (!parts.length || index < 0 || index >= parts.length || !Number.isFinite(requested)) return parts;
  if (parts.length === 1) return [{...parts[0], share: 100}];

  const value = Math.max(0, Math.min(100, Math.round(requested)));
  const available = 100 - value;
  const others = parts
    .map((part, i) => ({index: i, weight: Number.isFinite(part.share) ? Math.max(0, part.share) : 0}))
    .filter((part) => part.index !== index);
  const totalWeight = others.reduce((sum, part) => sum + part.weight, 0);
  const allocations = others.map((part) => {
    const exact = totalWeight > 0 ? part.weight * available / totalWeight : available / others.length;
    return {index: part.index, exact, share: Math.floor(exact)};
  });
  const missing = available - allocations.reduce((sum, part) => sum + part.share, 0);
  const largestRemainders = [...allocations].sort(
    (a, b) => (b.exact - b.share) - (a.exact - a.share) || a.index - b.index,
  );
  for (let i = 0; i < missing; i++) largestRemainders[i % largestRemainders.length].share++;
  const shares = new Map(allocations.map((part) => [part.index, part.share]));
  return parts.map((part, i) => ({...part, share: i === index ? value : shares.get(i) ?? 0}));
}

function normalizeWords(value: string, locale: 'de' | 'en'): string {
  return value.toLocaleLowerCase(locale).replace(/\u00df/g, 'ss')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

const GENERIC_COMPONENT_WORDS = new Set([
  'leaferservice', 'substrat', 'substrate', 'substratzusatz', 'substratmix',
  'zusatz', 'pflanzen', 'pflanzsubstrat', 'mischung', 'premium', 'liter', 'gramm',
  'beutel', 'pflanzenerde', 'grow', 'mix', 'component',
]);

export function parseVoiceShareCommand(
  transcript: string,
  selected: MixPart[],
  locale: 'de' | 'en',
): VoiceShareCommand {
  const match = /(?:^|[\s,;:])(?:auf|to|bei|at)\s*([+-]?\d+(?:[.,]\d+)?)\s*(?:%|prozent\b|percent\b)/i.exec(transcript);
  if (!match) return {kind: 'none'};
  const requested = Number(match[1].replace(',', '.'));
  if (!Number.isInteger(requested) || requested < 0 || requested > 100) return {kind: 'invalid'};

  const spoken = ` ${normalizeWords(transcript, locale)} `;
  const matching = selected.filter((part) => {
    const fullTitle = normalizeWords(part.title, locale);
    if (fullTitle && spoken.includes(` ${fullTitle} `)) return true;
    return [part.title, part.handle]
      .flatMap((name) => normalizeWords(name, locale).split(' '))
      .filter((token) => token.length >= 4 && !GENERIC_COMPONENT_WORDS.has(token) && !/^\d/.test(token))
      .some((token) => spoken.includes(` ${token} `));
  });
  if (matching.length !== 1) return {kind: 'ambiguous'};
  if (selected.length === 1 && requested !== 100) return {kind: 'single'};
  return {kind: 'valid', partId: matching[0].id, requested};
}
