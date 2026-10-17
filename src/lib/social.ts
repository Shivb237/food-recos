import { useEffect, useState } from "preact/hooks";
import { toast } from "./toast";

/**
 * The phone's side of likes and comments.
 * - Identity: a random id made once and kept in localStorage. No accounts. Sent as the X-Device header.
 * - The home page asks for one small "summary" (all the counts, my hearts, the latest comments). It refreshes when you come
 *   back to the tab, after your own actions, and every 60 seconds while the tab is visible.
 * - Hearts are optimistic: the heart fills right away, the request goes in the background, and it un-fills if it fails.
 */

export interface RecentComment { id: string; place: string; name: string; text: string; t: number; mine: boolean }
export interface PlaceComment { id: string; name: string; text: string; t: number; mine: boolean }
export interface SocialState {
  /** loading: not asked yet. off: the server has no Redis (501) so the UI hides likes and comments. */
  status: "loading" | "off" | "ready";
  likes: Record<string, number>;
  commentCounts: Record<string, number>;
  mine: string[];
  recent: RecentComment[];
}

let state: SocialState = { status: "loading", likes: {}, commentCounts: {}, mine: [], recent: [] };
const listeners = new Set<() => void>();
const set = (next: Partial<SocialState>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};

export function useSocial(): SocialState {
  const [, tick] = useState(0);
  useEffect(() => {
    const l = () => tick((n) => n + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return state;
}

// ---- identity ----
const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private mode */ } },
};
let memoryDevice: string | null = null;

function deviceId(): string {
  let id = store.get("mp.device") ?? memoryDevice;
  if (!id || !/^[A-Za-z0-9_-]{16,64}$/.test(id)) {
    const bytes = crypto.getRandomValues(new Uint8Array(18));
    id = [...bytes].map((b) => b.toString(36).padStart(2, "0")).join("").slice(0, 28) + "-" + Date.now().toString(36);
    id = id.replace(/[^A-Za-z0-9_-]/g, "x");
    memoryDevice = id;
    store.set("mp.device", id);
  }
  return id;
}

export const savedName = () => store.get("mp.name") ?? "";
export const saveName = (n: string) => store.set("mp.name", n.slice(0, 40));

/**
 * Shivang visits /#admin=TOKEN once on his phone; the token is kept so he can delete any comment.
 * It sits after the "#" on purpose: browsers never send that part to the server, so it can't end up in server logs.
 */
function captureAdminToken() {
  const token = new URLSearchParams(location.hash.slice(1)).get("admin");
  if (!token) return;
  store.set("mp.admin", token);
  history.replaceState(history.state, "", location.pathname + location.search);
  toast("Admin mode on for this phone");
}

async function api<T>(path: string, body?: unknown): Promise<{ ok: boolean; status: number; data: T }> {
  const headers: Record<string, string> = { "X-Device": deviceId() };
  const admin = store.get("mp.admin");
  if (admin) headers["X-Admin"] = admin;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(path, { method: body === undefined ? "GET" : "POST", headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { ok: res.ok, status: res.status, data: (await res.json().catch(() => ({}))) as T };
}

// ---- the summary ----
/** Bumped whenever the screen changes ahead of the server (a tap on the heart) or a newer fetch starts, so an older answer can't overwrite it. */
let summarySeq = 0;
async function refreshSummary() {
  const seq = ++summarySeq;
  try {
    const r = await api<Omit<SocialState, "status">>("/api/social");
    if (seq !== summarySeq) return;
    if (r.status === 501 || r.status === 404) return set({ status: "off" });
    if (r.ok) set({ status: "ready", likes: r.data.likes ?? {}, commentCounts: r.data.commentCounts ?? {}, mine: r.data.mine ?? [], recent: r.data.recent ?? [] });
  } catch {
    /* offline: keep what we have */
  }
}

let started = false;
export function startSocial() {
  if (started) return;
  started = true;
  captureAdminToken();
  void refreshSummary();
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && refreshSummary());
  setInterval(() => document.visibilityState === "visible" && refreshSummary(), 60_000);
}

// ---- hearts ----
export async function setLike(place: string, on: boolean): Promise<void> {
  if (state.status !== "ready") return;
  const was = state.mine.includes(place);
  if (was === on) return;
  const before = state;
  summarySeq++; // any summary already on its way predates this tap
  set({
    mine: on ? [...state.mine, place] : state.mine.filter((p) => p !== place),
    likes: { ...state.likes, [place]: Math.max(0, (state.likes[place] ?? 0) + (on ? 1 : -1)) },
  });
  const r = await api("/api/social", { action: "like", place, on }).catch(() => null);
  if (!r || !r.ok) {
    set({ mine: before.mine, likes: before.likes });
    toast(r?.status === 429 ? "Slow down a little and try again." : "Couldn't save that. Check your connection.");
    return;
  }
  void refreshSummary();
}

// ---- comments ----
export async function fetchComments(place: string): Promise<PlaceComment[]> {
  const r = await api<{ comments?: PlaceComment[] }>(`/api/social?place=${encodeURIComponent(place)}`).catch(() => null);
  return r?.ok ? r.data.comments ?? [] : [];
}

export async function postComment(place: string, name: string, text: string): Promise<PlaceComment | null> {
  const r = await api<{ comment?: PlaceComment; error?: string }>("/api/social", { action: "comment", place, name, text }).catch(() => null);
  if (!r?.ok || !r.data.comment) {
    toast(r?.status === 429 ? "Slow down a little and try again." : r?.data?.error ?? "Couldn't post that. Try again.");
    return null;
  }
  void refreshSummary();
  return r.data.comment;
}

export async function deleteComment(place: string, id: string): Promise<boolean> {
  const r = await api("/api/social", { action: "delete", place, id }).catch(() => null);
  if (!r?.ok) {
    toast("Couldn't delete that.");
    return false;
  }
  void refreshSummary();
  return true;
}

export const isAdmin = () => !!store.get("mp.admin");

/** "just now", "5m", "3h", "2d", or a date. */
export function ago(t: number, now = Date.now()): string {
  const s = (now - t) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
