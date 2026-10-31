/** Versioned, untrusted Room Studio JSON. Never cast imported JSON to a Plan. */
export type Kind = 'planter' | 'light' | 'system' | 'plant';
export type Mount = 'pendant' | 'clamp' | 'wall' | 'floor' | 'existing' | 'none';
export type Item = {
  id: string;
  kind: Kind;
  x: number;
  y: number;
  rotation: number;
  width: number;
  depth: number;
  productId?: string;
  plantProfileId?: string;
  mount?: Mount;
  mountVerified?: boolean;
};
export type Plan = {width: number; depth: number; height: number; items: Item[]};
export type Point = {x: number; y: number};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const roomDimension = (value: unknown): value is number =>
  finite(value) && value > 0.5 && value <= 30;
const itemDimension = (value: unknown): value is number =>
  finite(value) && value > 0 && value <= 30;
const isKind = (value: unknown): value is Kind =>
  value === 'planter' || value === 'light' || value === 'system' || value === 'plant';
const isMount = (value: unknown): value is Mount =>
  value === 'pendant' || value === 'clamp' || value === 'wall' ||
  value === 'floor' || value === 'existing' || value === 'none';
const optionalId = (value: unknown): value is string | undefined =>
  value === undefined || (typeof value === 'string' && value.trim().length > 0 && value.length <= 256);

/** Accept only our version-1 shape. Return a fresh, explicitly whitelisted Plan. */
export function parseRoomPlanDocument(value: unknown): Plan | null {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.plan)) return null;
  const rawPlan = value.plan;
  if (!roomDimension(rawPlan.width) || !roomDimension(rawPlan.depth) || !roomDimension(rawPlan.height) ||
      !Array.isArray(rawPlan.items) || rawPlan.items.length > 200) return null;
  const {width, depth, height} = rawPlan;
  const ids = new Set<string>();
  const items: Item[] = [];
  for (const raw of rawPlan.items) {
    if (!isRecord(raw) || typeof raw.id !== 'string' || !raw.id.trim() || raw.id.length > 128 ||
        ids.has(raw.id) || !isKind(raw.kind) || !finite(raw.x) || !finite(raw.y) ||
        raw.x < 0 || raw.x > width || raw.y < 0 || raw.y > depth ||
        !itemDimension(raw.width) || !itemDimension(raw.depth) ||
        !finite(raw.rotation) || Math.abs(raw.rotation) > 360 ||
        !optionalId(raw.productId) || !optionalId(raw.plantProfileId) ||
        (raw.mount !== undefined && !isMount(raw.mount)) ||
        (raw.mountVerified !== undefined && typeof raw.mountVerified !== 'boolean')) return null;
    ids.add(raw.id);
    const item: Item = {
      id: raw.id, kind: raw.kind, x: raw.x, y: raw.y,
      width: raw.width, depth: raw.depth, rotation: raw.rotation,
    };
    if (typeof raw.productId === 'string') item.productId = raw.productId;
    if (typeof raw.plantProfileId === 'string') item.plantProfileId = raw.plantProfileId;
    if (raw.mount !== undefined && isMount(raw.mount)) item.mount = raw.mount;
    if (typeof raw.mountVerified === 'boolean') item.mountVerified = raw.mountVerified;
    items.push(item);
  }
  return {width, depth, height, items};
}

const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));

/** Preserve the grab offset: dragging an edge must not snap the object's center to the pointer. */
export function placeDraggedItem(plan: Plan, id: string, pointer: Point, grabOffset: Point, snap: boolean): Plan {
  const target = plan.items.find(item => item.id === id);
  if (!target) return plan;
  const coordinate = (value: number, upper: number) => {
    const candidate = clamp(value, 0, upper);
    return clamp(snap ? Math.round(candidate * 20) / 20 : candidate, 0, upper);
  };
  const x = coordinate(pointer.x - grabOffset.x, plan.width);
  const y = coordinate(pointer.y - grabOffset.y, plan.depth);
  if (x === target.x && y === target.y) return plan;
  return {...plan, items: plan.items.map(item => item.id === id ? {...item, x, y} : item)};
}
