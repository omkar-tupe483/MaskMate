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
 * Ensures no overlapping entities are returned.
 */
export function resolveOverlaps(candidates: Entity[]): Entity[] {
  if (candidates.length <= 1) return [...candidates];

  // Sort candidates primarily by start index, then priority descending, then length descending
  const sorted = [...candidates].sort((a, b) => {
    if (a.start !== b.start) {
      return a.start - b.start;
    }
    const pDiff = TYPE_PRIORITY[b.type] - TYPE_PRIORITY[a.type];
    if (pDiff !== 0) return pDiff;
    return (b.end - b.start) - (a.end - a.start);
  });

  const resolved: Entity[] = [];

  for (const current of sorted) {
    let hasOverlap = false;

    for (let i = 0; i < resolved.length; i++) {
      const existing = resolved[i];
      // Check for overlap: max(start) < min(end)
      if (Math.max(current.start, existing.start) < Math.min(current.end, existing.end)) {
        hasOverlap = true;
        // Determine which one wins
        const existingPriority = TYPE_PRIORITY[existing.type];
        const currentPriority = TYPE_PRIORITY[current.type];

        let currentWins = false;
        if (currentPriority > existingPriority) {
          currentWins = true;
        } else if (currentPriority === existingPriority) {
          const currentLen = current.end - current.start;
          const existingLen = existing.end - existing.start;
          if (currentLen > existingLen) {
            currentWins = true;
          }
        }

        if (currentWins) {
          // Replace existing with current
          resolved[i] = current;
        }
        break;
      }
    }

    if (!hasOverlap) {
      resolved.push(current);
    }
  }

  // Final sort by start index
  return resolved.sort((a, b) => a.start - b.start);
}

