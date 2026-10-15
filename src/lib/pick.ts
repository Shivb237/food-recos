import type { Place } from "../../shared/types";

/** One random place from the pool, never the previous pick, and never one reported closed. */
export function pickRandom(pool: Place[], previous: string | null, random: () => number = Math.random): Place | null {
  const open = pool.filter((p) => !p.closed);
  const candidates = open.length > 1 ? open.filter((p) => p.id !== previous) : open;
  if (!candidates.length) return null;
  return candidates[Math.floor(random() * candidates.length)]!;
}
