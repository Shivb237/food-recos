import { run, toObject, type Redis } from "./redis";

/**
 * Likes and comments, stored on the Redis "whiteboard".
 *
 * Boxes we use:
 *   likes:count      HASH  place -> how many hearts           ("Salt: 7")
 *   mine:<device>    SET   places this phone has hearted      (a SET can't hold a place twice)
 *   comments:count   HASH  place -> how many comments
 *   comments:<place> LIST  the comments, newest on top, at most 200
 *   recent           LIST  the latest comments across all places, at most 20
 *   rl:<device>:<m>  a number: writes this device made in minute m (the turnstile)
 *
 * No accounts: a phone invents a random id, keeps it in localStorage, and sends it as the X-Device header.
 * We store only a short fingerprint (SHA-256) of it, never the id itself, and never send any fingerprint back.
 */

export interface SocialDeps {
  /** null = no Redis configured: every call answers 501 and the app hides likes and comments. */
  redis: Redis | null;
  validPlaces: Set<string>;
  adminToken?: string;
  now?: () => number;
  newId?: () => string;
}

const MAX_COMMENTS_PER_PLACE = 200;
const MAX_RECENT = 20;
const WRITES_PER_MINUTE = 30;
const NAME_MAX = 40;
const TEXT_MAX = 280;
const DEVICE = /^[A-Za-z0-9_-]{16,64}$/;

interface StoredComment { id: string; n: string; x: string; t: number; o: string }
interface RecentComment extends StoredComment { p: string }

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

async function fingerprint(device: string): Promise<string> {
  const bytes = new TextEncoder().encode(device);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].slice(0, 10).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sameSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Collapse odd whitespace, drop control characters, trim. */
const cleanLine = (s: unknown) => String(s ?? "").replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
const cleanText = (s: unknown) =>
  String(s ?? "").replace(/\r/g, "").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

const parse = <T>(raw: unknown): T | null => {
  try {
    return JSON.parse(String(raw)) as T;
  } catch {
    return null;
  }
};

export function createSocialHandler(deps: SocialDeps) {
  const now = deps.now ?? Date.now;
  const newId = deps.newId ?? (() => now().toString(36) + Math.random().toString(36).slice(2, 8));

  return async function handleSocial(req: Request): Promise<Response> {
    const redis = deps.redis;
    if (!redis) return json({ error: "likes and comments are not set up" }, 501);

    const device = req.headers.get("x-device") ?? "";
    const me = DEVICE.test(device) ? await fingerprint(device) : null;
    const url = new URL(req.url);

    try {
      if (req.method === "GET") {
        const place = url.searchParams.get("place");
        if (place) {
          if (!deps.validPlaces.has(place)) return json({ error: "unknown place" }, 404);
          const raw = (await run(redis, "LRANGE", `comments:${place}`, 0, 99)) as string[];
          const comments = raw.map((r) => parse<StoredComment>(r)).filter((c): c is StoredComment => !!c)
            .map((c) => ({ id: c.id, name: c.n, text: c.x, t: c.t, mine: !!me && c.o === me }));
          return json({ comments });
        }
        // The home page summary: four commands, one round trip.
        const [likes, counts, mine, recent] = await redis.pipeline([
          ["HGETALL", "likes:count"],
          ["HGETALL", "comments:count"],
          me ? ["SMEMBERS", `mine:${me}`] : ["SMEMBERS", "mine:nobody"],
          ["LRANGE", "recent", 0, 4],
        ]);
        const positive = (o: Record<string, string>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Number(v)]).filter(([, v]) => (v as number) > 0));
        return json({
          likes: positive(toObject(likes)),
          commentCounts: positive(toObject(counts)),
          mine: me ? (mine as string[]) : [],
          recent: (recent as string[]).map((r) => parse<RecentComment>(r)).filter((c): c is RecentComment => !!c)
            .map((c) => ({ id: c.id, place: c.p, name: c.n, text: c.x, t: c.t, mine: !!me && c.o === me })),
        });
      }

      if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
      if (!me) return json({ error: "missing or bad X-Device header" }, 400);
      const bodyText = await req.text();
      if (bodyText.length > 4000) return json({ error: "too big" }, 413);
      const body = parse<{ action?: string; place?: string; on?: boolean; name?: string; text?: string; id?: string }>(bodyText);
      if (!body || !body.place || !deps.validPlaces.has(body.place)) return json({ error: "unknown place" }, 400);
      const place = body.place;

      // The turnstile: at most 30 writes a minute per phone.
      const minute = Math.floor(now() / 60000);
      const [used] = await redis.pipeline([["INCR", `rl:${me}:${minute}`], ["EXPIRE", `rl:${me}:${minute}`, 90]]);
      if (Number(used) > WRITES_PER_MINUTE) return json({ error: "slow down a little" }, 429);

      if (body.action === "like") {
        if (typeof body.on !== "boolean") return json({ error: "bad request" }, 400);
        // SADD/SREM answer 1 only if something really changed. Only then do we touch the counter.
        const changed = Number(await run(redis, body.on ? "SADD" : "SREM", `mine:${me}`, place));
        if (changed) await run(redis, "HINCRBY", "likes:count", place, body.on ? 1 : -1);
        return json({ ok: true, changed: !!changed });
      }

      if (body.action === "comment") {
        const name = cleanLine(body.name).slice(0, NAME_MAX);
        const text = cleanText(body.text).slice(0, TEXT_MAX);
        if (!name || !text) return json({ error: "a name and a comment are needed" }, 400);
        const item: StoredComment = { id: newId(), n: name, x: text, t: now(), o: me };
        const recent: RecentComment = { ...item, p: place };
        await redis.pipeline([
          ["LPUSH", `comments:${place}`, JSON.stringify(item)],
          ["LTRIM", `comments:${place}`, 0, MAX_COMMENTS_PER_PLACE - 1],
          ["HINCRBY", "comments:count", place, 1],
          ["LPUSH", "recent", JSON.stringify(recent)],
          ["LTRIM", "recent", 0, MAX_RECENT - 1],
        ]);
        return json({ ok: true, comment: { id: item.id, name, text, t: item.t, mine: true } });
      }

      if (body.action === "delete") {
        const [all, recentAll] = (await redis.pipeline([["LRANGE", `comments:${place}`, 0, -1], ["LRANGE", "recent", 0, -1]])) as [string[], string[]];
        const raw = all.find((r) => parse<StoredComment>(r)?.id === body.id);
        if (!raw) return json({ error: "no such comment" }, 404);
        const owner = parse<StoredComment>(raw)!.o;
        const admin = !!deps.adminToken && sameSecret(req.headers.get("x-admin") ?? "", deps.adminToken);
        if (owner !== me && !admin) return json({ error: "not yours to delete" }, 403);
        const rawRecent = recentAll.find((r) => parse<RecentComment>(r)?.id === body.id);
        await redis.pipeline([
          ["LREM", `comments:${place}`, 1, raw],
          ["HINCRBY", "comments:count", place, -1],
          ...(rawRecent ? ([["LREM", "recent", 1, rawRecent]] as (string | number)[][]) : []),
        ]);
        return json({ ok: true });
      }

      return json({ error: "unknown action" }, 400);
    } catch {
      return json({ error: "the whiteboard is unavailable right now" }, 503);
    }
  };
}
