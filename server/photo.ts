import type { PlaceIdEntry } from "../shared/placeIds";
import type { KV } from "./kv";

type Maybe<T> = T | (() => T);
const read = <T>(v: Maybe<T>): T => (typeof v === "function" ? (v as () => T)() : v);

export interface PhotoDeps {
  /** slug -> resolved Google place (from data/place-ids.json). Only approved entries are served. A function is re-read on every request (dev). */
  placeIds: Maybe<Record<string, PlaceIdEntry>>;
  /** slug -> positions (in Google's photo list) that Shivang picked as the food shots, best first. */
  picks?: Maybe<Record<string, number[]>>;
  /** Missing key = mock mode: every request answers "no photos" and the app shows its generated cards. */
  apiKey?: string;
  /** Hard ceiling on billed photo requests per UTC day. */
  dailyCap: number;
  kv: KV;
  /**
   * How long Vercel's shared cache may keep a successful answer (seconds). 0 turns the shared cache off.
   * Without it every card on every visit costs Google lookups. NOTE: this caches Google's temporary image link
   * (photoUri), not the photo name or the image itself. Set PHOTO_CACHE_SECONDS=0 to disable.
   */
  cacheSeconds?: number;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

interface PhotoResult {
  uri: string;
  author: string;
  authorUri: string | null;
}

export const PHOTO_NAME = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;
const IMAGE_HOST = /(^|\.)(googleusercontent\.com|ggpht\.com)$/;

const json = (body: unknown, status = 200, cache = "private, max-age=300") =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": cache } });

/** Keep only https links to Google's image hosts, so this endpoint can never be used to point a browser elsewhere. */
function safeImageUrl(raw: unknown): string | null {
  try {
    const u = new URL(String(raw));
    return u.protocol === "https:" && IMAGE_HOST.test(u.hostname) ? u.toString() : null;
  } catch {
    return null;
  }
}

function safeLink(raw: unknown): string | null {
  try {
    const u = new URL(String(raw));
    return u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Picked positions first (in the order picked), then the rest as Google lists them. Positions that don't exist are ignored. */
export function orderByPicks<T>(list: T[], picks: number[]): T[] {
  const first = [...new Set(picks)].filter((i) => Number.isInteger(i) && i >= 0 && i < list.length);
  const rest = list.map((_, i) => i).filter((i) => !first.includes(i));
  return [...first, ...rest].map((i) => list[i]!);
}

// ---- The only code that talks to Google for photos (the site's /api/photo and the local photo picker both use it) ----

export interface PhotoRef { name?: string; authorAttributions?: { displayName?: string; uri?: string }[] }
/** status 0 = never reached Google. `daily` = Google's "per day" quota (won't clear in a minute, so don't retry). */
export interface Refused { ok: false; status: number; daily: boolean }

async function refused(res: Response): Promise<Refused> {
  const text = res.status === 429 ? await res.text().catch(() => "") : "";
  return { ok: false, status: res.status, daily: /per.?day/i.test(text) };
}

/** Place Details with the free `photos` field only: the list of photo references for one place. */
export async function fetchPhotoRefs(doFetch: typeof fetch, key: string, placeId: string): Promise<{ ok: true; photos: PhotoRef[] } | Refused> {
  try {
    const res = await doFetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: { "X-Goog-Api-Key": key, "X-Goog-FieldMask": "photos" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return await refused(res);
    return { ok: true, photos: ((await res.json()) as { photos?: PhotoRef[] }).photos ?? [] };
  } catch {
    return { ok: false, status: 0, daily: false };
  }
}

/** One billed photo download: Google's short-lived image link, checked to be on Google's image hosts. */
export async function fetchPhotoUri(doFetch: typeof fetch, key: string, name: string, width: number): Promise<{ ok: true; uri: string } | Refused> {
  if (!PHOTO_NAME.test(name)) return { ok: false, status: 0, daily: false };
  try {
    const res = await doFetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=${width}&skipHttpRedirect=true`, {
      headers: { "X-Goog-Api-Key": key },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return await refused(res);
    const uri = safeImageUrl(((await res.json()) as { photoUri?: string }).photoUri);
    return uri ? { ok: true, uri } : { ok: false, status: 0, daily: false };
  } catch {
    return { ok: false, status: 0, daily: false };
  }
}

/** The only two shapes the app ever asks for: one photo for a card, four for the gallery. Anything else is refused outright. */
const SHAPES: Record<string, { n: 1 | 4; w: number }> = { "1": { n: 1, w: 480 }, "4": { n: 4, w: 960 } };
const ALLOWED_PARAMS = new Set(["id", "n", "w", "fresh"]);
/** A "fresh" link request skips the shared cache, so each place gets only a few per hour. */
const FRESH_PER_HOUR = 3;

/**
 * GET /api/photo?id=<slug>&n=1&w=480   (card)   or   &n=4&w=960   (gallery)
 *
 * 1. Only known slugs and exactly those two shapes are accepted. Every distinct web address is its own cache entry,
 *    so allowing free-form sizes would let anyone bypass the cache and use up the daily Google budget.
 * 2. Reserve n from the daily counter first (atomic INCRBY); over the cap -> "no photos", the UI falls back.
 * 3. Place Details with field mask `photos` only (free "IDs only" tier), then one billed media request per photo.
 * 4. Refund the counter for anything that didn't end up being billed.
 * 5. Only a complete answer goes into the shared cache; a partial one (Google refused some photos) is not kept.
 * shortcut: one sweep over all 94 legitimate addresses can still use up a day's cap; the cap is the bill's ceiling, not a lock.
 */
export function createPhotoHandler(deps: PhotoDeps) {
  const doFetch = deps.fetchImpl ?? fetch;
  const now = deps.now ?? (() => new Date());
  const ttl = Math.max(0, deps.cacheSeconds ?? 43200);

  return async function handlePhoto(req: Request): Promise<Response> {
    if (req.method !== "GET") return json({ error: "method not allowed" }, 405, "no-store");
    const q = new URL(req.url).searchParams;
    const slug = q.get("id") ?? "";
    const entry = read(deps.placeIds)[slug];
    if (!entry || !entry.approved) return json({ error: "unknown place" }, 404, "no-store");

    const nParam = q.get("n") ?? "1";
    const shape = SHAPES[nParam];
    const wParam = q.get("w") ?? String(shape?.w);
    if (!shape || wParam !== String(shape.w) || [...q.keys()].some((k) => !ALLOWED_PARAMS.has(k)))
      return json({ error: "unsupported request" }, 400, "no-store");
    const { n, w } = shape;
    const fresh = q.get("fresh") === "1"; // the app asks for this when a cached image link has gone stale
    if (!deps.apiKey) return json({ photos: [], reason: "not-configured" }, 200, "no-store");

    if (fresh) {
      const hour = now().toISOString().slice(0, 13);
      const asked = await deps.kv.incrBy(`photo-fresh:${slug}:${hour}`, 1, 7200).catch(() => Infinity);
      if (asked > FRESH_PER_HOUR) return json({ photos: [], reason: "try-later" }, 200, "no-store");
    }

    const capKey = `photo-cap:${now().toISOString().slice(0, 10)}`;
    let used: number;
    try {
      used = await deps.kv.incrBy(capKey, n, 172800);
    } catch {
      return json({ photos: [], reason: "counter-unavailable" }, 200, "no-store"); // never spend without a working counter
    }
    const refund = (k: number) => (k > 0 ? deps.kv.incrBy(capKey, -k, 172800).catch(() => undefined) : undefined);
    if (used > deps.dailyCap) {
      await refund(n);
      return json({ photos: [], reason: "daily-cap" }, 200, "public, max-age=60");
    }

    const refs = await fetchPhotoRefs(doFetch, deps.apiKey, entry.placeId);
    if (!refs.ok) {
      await refund(n);
      // 429 = Google's quota on place lookups. A per-minute one clears soon (the app retries); a per-day one does not (it stops).
      if (refs.status === 429) return json({ photos: [], reason: refs.daily ? "quota-exhausted" : "rate-limited", step: "place-details" }, 200, "no-store");
      return json({ photos: [], reason: "upstream", status: refs.status }, 502, "no-store");
    }
    const chosen = orderByPicks(refs.photos, read(deps.picks ?? {})[slug] ?? [])
      .filter((p) => p.name && PHOTO_NAME.test(p.name))
      .slice(0, n);

    const results = await Promise.all(chosen.map((p) => fetchPhotoUri(doFetch, deps.apiKey!, p.name!, w)));
    const photos: PhotoResult[] = [];
    const failures: Record<string, number> = {};
    results.forEach((r, i) => {
      if (r.ok) {
        const a = chosen[i]!.authorAttributions?.[0];
        photos.push({ uri: r.uri, author: (a?.displayName ?? "").slice(0, 80), authorUri: safeLink(a?.uri) });
      } else failures[r.status ? String(r.status) : "error"] = (failures[r.status ? String(r.status) : "error"] ?? 0) + 1;
    });
    await refund(n - photos.length);

    if (!photos.length) {
      const refusals = results.filter((r): r is Refused => !r.ok);
      if (refusals.some((r) => r.status === 429)) return json({ photos: [], reason: refusals.some((r) => r.daily) ? "quota-exhausted" : "rate-limited" }, 200, "no-store");
      // Nothing came back and it wasn't a rate limit: say what happened (counts only), so it can be diagnosed from outside.
      return json({ photos: [], reason: chosen.length ? "photo-requests-failed" : "no-photos-listed", listed: refs.photos.length, failures }, 200, "no-store");
    }
    const complete = photos.length === chosen.length;
    const shared = complete && !fresh && ttl > 0 ? `public, max-age=300, s-maxage=${ttl}, stale-while-revalidate=${ttl}` : complete ? "private, max-age=300" : "no-store";
    return json({ photos }, 200, shared);
  };
}
