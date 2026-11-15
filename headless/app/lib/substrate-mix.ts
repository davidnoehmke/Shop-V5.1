export type MixPart = {id: string; handle: string; title: string; share: number};

export function equalShares(parts: Array<Omit<MixPart, 'share'>>): MixPart[] {
  if (!parts.length) return [];
  const base = Math.floor(100 / parts.length);
  let remaining = 100 - base * parts.length;
  return parts.map((part) => ({
    ...part,
    share: base + (remaining-- > 0 ? 1 : 0),
  }));
}

export function rebalance(parts: MixPart[], index: number, requested: number): MixPart[] {
  if (parts.length <= 1) return parts.map((part, i) => ({...part, share: i === index ? 100 : 0}));
  const value = Math.max(0, Math.min(100, Math.round(requested)));
  const otherIndexes = parts.map((_, i) => i).filter((i) => i !== index);
  const otherTotal = 100 - value;
  const currentOtherTotal = otherIndexes.reduce((sum, i) => sum + parts[i].share, 0);

  const next = parts.map((part) => ({...part}));
  next[index].share = value;

  if (currentOtherTotal <= 0) {
    const base = Math.floor(otherTotal / otherIndexes.length);
    let remaining = otherTotal - base * otherIndexes.length;
    otherIndexes.forEach((i) => {
      next[i].share = base + (remaining-- > 0 ? 1 : 0);
    });
    return next;
  }

  let assigned = 0;
  otherIndexes.forEach((i, position) => {
    if (position === otherIndexes.length - 1) {
      next[i].share = otherTotal - assigned;
      return;
    }
    const proportional = Math.min(otherTotal - assigned, Math.round((parts[i].share / currentOtherTotal) * otherTotal));
    next[i].share = proportional;
    assigned += proportional;
  });
  return next;
}

