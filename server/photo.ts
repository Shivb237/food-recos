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
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

export interface PhotoResult {
  uri: string;
  author: string;
  authorUri: string | null;
}

const PHOTO_NAME = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;
const IMAGE_HOST = /(^|\.)(googleusercontent\.com|ggpht\.com)$/;

const json = (body: unknown, status = 200, cache = "private, max-age=300") =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": cache } });

const clamp = (v: number, lo: number, hi: number, fallback: number) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : fallback);

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

/**
 * GET /api/photo?id=<slug>&n=1..4&w=160..1200
 *
 * 1. Only slugs we resolved and approved are accepted, so nobody can spend the quota on arbitrary places.
 * 2. Reserve n from the daily counter first (atomic INCRBY); over the cap -> "no photos", the UI falls back.
 * 3. Place Details with field mask `photos` only (free "IDs only" tier), then one billed media request per photo.
 * 4. Refund the counter for anything that didn't end up being billed.
 */
export function createPhotoHandler(deps: PhotoDeps) {
  const doFetch = deps.fetchImpl ?? fetch;
  const now = deps.now ?? (() => new Date());

  return async function handlePhoto(req: Request): Promise<Response> {
    if (req.method !== "GET") return json({ error: "method not allowed" }, 405, "no-store");
    const q = new URL(req.url).searchParams;
    const slug = q.get("id") ?? "";
    const entry = read(deps.placeIds)[slug];
    if (!entry || !entry.approved) return json({ error: "unknown place" }, 404, "no-store");

    const n = clamp(Number(q.get("n") ?? 1), 1, 4, 1);
    const w = clamp(Number(q.get("w") ?? 480), 160, 1200, 480);
    if (!deps.apiKey) return json({ photos: [], reason: "not-configured" }, 200, "no-store");

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

    const headers = { "X-Goog-Api-Key": deps.apiKey };
    try {
      const details = await doFetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(entry.placeId)}`, {
        headers: { ...headers, "X-Goog-FieldMask": "photos" },
        signal: AbortSignal.timeout(6000),
      });
      if (!details.ok) {
        await refund(n);
        return json({ photos: [], reason: "upstream" }, 502, "no-store");
      }
      const body = (await details.json()) as { photos?: { name?: string; authorAttributions?: { displayName?: string; uri?: string }[] }[] };
      const chosen = orderByPicks(body.photos ?? [], read(deps.picks ?? {})[slug] ?? [])
        .filter((p) => p.name && PHOTO_NAME.test(p.name))
        .slice(0, n);

      let limited = false;
      const failures: Record<string, number> = {};
      const settled = await Promise.all(
        chosen.map(async (p): Promise<PhotoResult | null> => {
          try {
            const media = await doFetch(`https://places.googleapis.com/v1/${p.name}/media?maxWidthPx=${w}&skipHttpRedirect=true`, {
              headers,
              signal: AbortSignal.timeout(6000),
            });
            if (media.status === 429) limited = true;
            if (!media.ok) {
              failures[String(media.status)] = (failures[String(media.status)] ?? 0) + 1;
              return null;
            }
            const uri = safeImageUrl(((await media.json()) as { photoUri?: string }).photoUri);
            if (!uri) return null;
            const a = p.authorAttributions?.[0];
            return { uri, author: (a?.displayName ?? "").slice(0, 80), authorUri: safeLink(a?.uri) };
          } catch {
            failures.error = (failures.error ?? 0) + 1;
            return null;
          }
        }),
      );
      const photos = settled.filter((x): x is PhotoResult => !!x);
      await refund(n - photos.length);
      // Google's own per-minute limit said no to every photo: tell the app to try again shortly rather than give up.
      if (!photos.length && limited) return json({ photos: [], reason: "rate-limited" }, 200, "no-store");
      // Nothing came back and it wasn't a rate limit: say what happened (counts only), so it can be diagnosed from outside.
      if (!photos.length) return json({ photos: [], reason: chosen.length ? "photo-requests-failed" : "no-photos-listed", listed: (body.photos ?? []).length, failures }, 200, "no-store");
      return json({ photos });
    } catch {
      await refund(n);
      return json({ photos: [], reason: "upstream" }, 502, "no-store");
    }
  };
}
