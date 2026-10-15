import { useEffect, useState } from "preact/hooks";

/** Lists of place slugs kept in localStorage, with an in-memory copy for when storage is blocked. */
const memory = new Map<string, string[]>();
const listeners = new Set<() => void>();

function read(key: string): string[] {
  const cached = memory.get(key);
  if (cached) return cached;
  let list: string[] = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (Array.isArray(parsed)) list = parsed.filter((x): x is string => typeof x === "string");
  } catch {
    /* storage unavailable: start empty */
  }
  memory.set(key, list);
  return list;
}

function write(key: string, list: string[]) {
  memory.set(key, list);
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* private mode: keep it for this visit only */
  }
  listeners.forEach((l) => l());
}

export function useStoredList(key: string): string[] {
  const [, tick] = useState(0);
  useEffect(() => {
    const l = () => tick((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return read(key);
}

const SAVED = "mp.saved";
const RECENT = "mp.recent";

export const useSaved = () => useStoredList(SAVED);
export const useRecent = () => useStoredList(RECENT);

export function toggleSaved(id: string): boolean {
  const cur = read(SAVED);
  const on = !cur.includes(id);
  write(SAVED, on ? [id, ...cur] : cur.filter((x) => x !== id));
  return on;
}

export function pushRecent(id: string) {
  const cur = read(RECENT);
  if (cur[0] === id) return;
  write(RECENT, [id, ...cur.filter((x) => x !== id)].slice(0, 12));
}

export const clearRecent = () => write(RECENT, []);
