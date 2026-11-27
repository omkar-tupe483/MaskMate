import { Entity, EntityType } from './types.js';

/**
 * Priority order for resolving overlaps:
 * CREDIT_CARD > AADHAAR > PAN > EMAIL > IP > PHONE
 * A 16-digit card or 12-digit Aadhaar shouldn't be matched as a phone.
 * If priority is equal, the longer match wins.
 */
export const TYPE_PRIORITY: Record<EntityType, number> = {
  CREDIT_CARD: 100,
  AADHAAR: 90,
  PAN: 80,
  EMAIL: 70,
  IP: 60,
  PHONE: 50,
};

/**
 * Deterministically resolves overlaps among candidate entities.
 * Sorts by priority DESC, length DESC, start ASC, then greedily accepts
 * non-overlapping entities and returns them sorted by start ASC.
 */
export function resolveOverlaps(candidates: Entity[]): Entity[] {
  if (candidates.length <= 1) return [...candidates];

  const ranked = [...candidates].sort((a, b) => {
    const pDiff = TYPE_PRIORITY[b.type] - TYPE_PRIORITY[a.type];
    if (pDiff !== 0) return pDiff;
    const lenDiff = (b.end - b.start) - (a.end - a.start);
    if (lenDiff !== 0) return lenDiff;
    return a.start - b.start;
  });

  const resolved: Entity[] = [];

  for (const current of ranked) {
    const overlapsExisting = resolved.some(
      (existing) => Math.max(current.start, existing.start) < Math.min(current.end, existing.end)
    );
    if (!overlapsExisting) {
      resolved.push(current);
    }
  }

  return resolved.sort((a, b) => a.start - b.start);
}
