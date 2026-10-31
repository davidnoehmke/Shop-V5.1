export type Kind = 'planter' | 'light' | 'system' | 'plant';
export type Item = {
  id: string; kind: Kind; x: number; y: number; rotation: number;
  width: number; depth: number; productId?: string; plantProfileId?: string;
  mount?: 'pendant' | 'clamp' | 'wall' | 'floor' | 'existing' | 'none';
  mountVerified?: boolean;
};
export type Plan = {width: number; depth: number; height: number; items: Item[]};

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const dimension = (value: unknown): value is number =>
  finite(value) && value > 0.5 && value <= 30;
const kinds: readonly unknown[] = ['planter', 'light', 'system', 'plant'];
const mounts: readonly unknown[] = ['pendant', 'clamp', 'wall', 'floor', 'existing', 'none'];

/** Validate the untrusted file before allowing it into the editable scene. */
export function parseRoomPlan(value: unknown): Plan | null {
  if (!record(value) || value.version !== 1 || !record(value.plan)) return null;
  const p = value.plan;
  if (!dimension(p.width) || !dimension(p.depth) || !dimension(p.height) ||
      !Array.isArray(p.items) || p.items.length > 200) return null;
  const ids = new Set<string>();
  const items: Item[] = [];
  for (const item of p.items) {
    if (!record(item) || typeof item.id !== 'string' || !item.id ||
        item.id.length > 200 || ids.has(item.id) || !kinds.includes(item.kind) ||
        !finite(item.x) || !finite(item.y) || !finite(item.rotation) ||
        !finite(item.width) || !finite(item.depth) || item.width <= 0 ||
        item.depth <= 0 || item.width > 30 || item.depth > 30 ||
        Math.abs(item.x) > 60 || Math.abs(item.y) > 60) return null;
    ids.add(item.id);
    const mount = mounts.includes(item.mount) ? item.mount as Item['mount'] : undefined;
    items.push({id: item.id, kind: item.kind as Kind, x: item.x, y: item.y,
      width: item.width, depth: item.depth, rotation: item.rotation,
      productId: typeof item.productId === 'string' ? item.productId : undefined,
      plantProfileId: typeof item.plantProfileId === 'string' ? item.plantProfileId : undefined,
      mount, mountVerified: !!mount && mount !== 'none' && item.mountVerified === true});
  }
  return {width: p.width, depth: p.depth, height: p.height, items};
}
