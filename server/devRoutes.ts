/**
 * Routes that exist only inside `npm run dev` (mounted by server/devPlugin.ts, never by api/*.ts, so never deployed).
 * They back the /dev/photos picker: reading and writing the data/*.json files, and calling Google on your behalf.
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import type { PlaceIdEntry, PlaceIdsFile } from "../shared/placeIds";
import { memoryKV } from "./kv";
import { createRoutes } from "./routes";
import { placeSchema, crossCheck, placesFileSchema } from "../shared/schema";
import { BAND_TIER, bandFor } from "../shared/price";
import { slugify } from "../shared/slug";
import type { Place, PlacesFile } from "../shared/types";

type Route = (req: Request) => Promise<Response>;

const FILES = {
  places: "data/places.json",
  ids: "data/place-ids.json",
  picks: "data/photo-picks.json",
  overrides: "data/place-id-overrides.json",
  review: "data/place-id-review.json",
};
const MAX_PICKS = 4;
const CENTER = { latitude: 17.4049, longitude: 78.3866 };
const KEY = () => process.env.GOOGLE_MAPS_API_KEY;

const readJson = <T>(file: string, fallback: T): T => (existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : fallback);
function writeJson(file: string, value: unknown) {
  writeFileSync(`${file}.tmp`, JSON.stringify(value, null, 2) + "\n");
  renameSync(`${file}.tmp`, file); // atomic: a crash can't leave half a file
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

const knownSlugs = () => new Set((readJson<{ places: { id: string }[] }>(FILES.places, { places: [] })).places.map((p) => p.id));
const km = (lat: number, lng: number) => {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(lat - CENTER.latitude) / 2) ** 2 + Math.cos(r(CENTER.latitude)) * Math.cos(r(lat)) * Math.sin(r(lng - CENTER.longitude) / 2) ** 2;
  return Math.round(12742 * Math.asin(Math.sqrt(h)) * 10) / 10;
};

/** Photos from Google's list for one place, with their positions. Each one is a billed request, so it has its own daily cap. */
const devKv = memoryKV();
const PLACE_ID = /^[A-Za-z0-9_-]{10,200}$/;
const PHOTO_NAME = /^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/;
const IMAGE_HOST = /(^|\.)(googleusercontent\.com|ggpht\.com)$/;

const routes: Record<string, Route> = {
  "/api/dev/state": async () =>
    json({
      ids: readJson<PlaceIdsFile>(FILES.ids, { resolvedAt: "", places: {} }).places,
      review: readJson(FILES.review, {}),
      picks: readJson<Record<string, number[]>>(FILES.picks, {}),
      overrides: readJson(FILES.overrides, {}),
      hasKey: !!KEY(),
      pickerUsed: await devKv.incrBy(`picker-cap:${new Date().toISOString().slice(0, 10)}`, 0, 172800),
      pickerCap: Number(process.env.PICKER_DAILY_CAP) > 0 ? Number(process.env.PICKER_DAILY_CAP) : 600,
    }),

  "/api/dev/search": async (req) => {
    const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 120);
    if (!q || !KEY()) return json({ results: [], error: KEY() ? "empty query" : "no API key" }, q ? 503 : 400);
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": KEY()!,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.businessStatus,places.googleMapsUri",
      },
      body: JSON.stringify({ textQuery: q, maxResultCount: 6, locationBias: { circle: { center: CENTER, radius: 25000 } } }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return json({ results: [], error: `Google ${res.status}` }, 502);
    const body = (await res.json()) as { places?: { id: string; displayName?: { text: string }; formattedAddress?: string; location?: { latitude: number; longitude: number }; businessStatus?: string; googleMapsUri?: string }[] };
    return json({
      results: (body.places ?? []).map((p) => ({
        placeId: p.id,
        name: p.displayName?.text ?? "",
        address: p.formattedAddress ?? "",
        lat: p.location?.latitude ?? null,
        lng: p.location?.longitude ?? null,
        distanceKm: p.location ? km(p.location.latitude, p.location.longitude) : null,
        closed: p.businessStatus === "CLOSED_PERMANENTLY",
        maps: p.googleMapsUri ?? null,
      })),
    });
  },

  "/api/dev/photos": async (req) => {
    const q = new URL(req.url).searchParams;
    const slug = q.get("id") ?? "";
    const direct = q.get("placeId");
    // Either a place already on the site (by slug), or a Google place id for one about to be added.
    const entry = direct
      ? PLACE_ID.test(direct) ? { placeId: direct } : null
      : readJson<PlaceIdsFile>(FILES.ids, { resolvedAt: "", places: {} }).places[slug];
    if (!entry || ("approved" in entry && !entry.approved)) return json({ error: "no approved match for this place" }, 404);
    if (!KEY()) return json({ error: "no API key" }, 503);
    const w = Math.min(640, Math.max(160, Math.round(Number(q.get("w")) || 360)));
    const headers = { "X-Goog-Api-Key": KEY()! };

    const details = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(entry.placeId)}`, { headers: { ...headers, "X-Goog-FieldMask": "photos" }, signal: AbortSignal.timeout(8000) });
    if (!details.ok) return json({ error: `Google ${details.status}` }, 502);
    const list = ((await details.json()) as { photos?: { name?: string; authorAttributions?: { displayName?: string; uri?: string }[] }[] }).photos ?? [];

    const only = (q.get("only") ?? "").split(",").filter(Boolean).map(Number);
    const wanted = list.map((p, index) => ({ p, index })).filter((x) => !only.length || only.includes(x.index));

    const cap = Number(process.env.PICKER_DAILY_CAP) > 0 ? Number(process.env.PICKER_DAILY_CAP) : 600;
    const capKey = `picker-cap:${new Date().toISOString().slice(0, 10)}`;
    const used = await devKv.incrBy(capKey, wanted.length, 172800);
    if (used > cap) {
      await devKv.incrBy(capKey, -wanted.length, 172800);
      return json({ error: `Picker daily cap of ${cap} photo requests reached (raise PICKER_DAILY_CAP in .env.local)`, used: used - wanted.length, cap }, 429);
    }

    // Google limits photo requests per minute, so go three at a time and wait out a 429 before giving up on a photo.
    const failed: { index: number; status: number; reason: string }[] = [];
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    async function fetchOne(index: number, name: string | undefined) {
      if (!name || !PHOTO_NAME.test(name)) return void failed.push({ index, status: 0, reason: "Google gave no usable photo reference" });
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const m = await fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=${w}&skipHttpRedirect=true`, { headers, signal: AbortSignal.timeout(8000) });
          if (!m.ok) {
            const msg = ((await m.json().catch(() => ({}))) as { error?: { message?: string } }).error?.message ?? "";
            const quota = msg.match(/limit '([^']+)'/)?.[1];
            const daily = /day/i.test(quota ?? msg);
            // A per-minute limit clears in seconds, so wait and retry; a daily one will not, so don't waste time.
            if (m.status === 429 && !daily && attempt < 2) {
              await sleep(attempt === 0 ? 2500 : 6000);
              continue;
            }
            return void failed.push({
              index,
              status: m.status,
              reason: m.status === 429 ? (daily ? `Google DAILY photo quota reached${quota ? ` (${quota})` : ""}` : `Google per-minute limit hit${quota ? ` (${quota})` : ""}`) : `Google error ${m.status}`,
            });
          }
          const uri = ((await m.json()) as { photoUri?: string }).photoUri;
          if (!uri || !IMAGE_HOST.test(new URL(uri).hostname)) return void failed.push({ index, status: 0, reason: "Google returned an unexpected image link" });
          const a = list[index]?.authorAttributions?.[0];
          return { index, uri, author: a?.displayName ?? "", authorUri: a?.uri ?? null };
        } catch {
          if (attempt === 2) return void failed.push({ index, status: 0, reason: "timed out reaching Google" });
        }
      }
    }
    const photos: { index: number; uri: string; author: string; authorUri: string | null }[] = [];
    for (let i = 0; i < wanted.length; i += 3) {
      const batch = await Promise.all(wanted.slice(i, i + 3).map((x) => fetchOne(x.index, x.p.name)));
      for (const r of batch) if (r) photos.push(r);
    }
    await devKv.incrBy(capKey, -failed.length, 172800); // failed ones were not billed
    photos.sort((x, y) => x.index - y.index);
    return json({ photos, failed, total: list.length, used: used - failed.length, cap });
  },

  // What Google knows about a place, to pre-fill the add form. One call per added place: negligible cost.
  "/api/dev/add/details": async (req) => {
    const placeId = new URL(req.url).searchParams.get("placeId") ?? "";
    if (!PLACE_ID.test(placeId)) return json({ error: "bad placeId" }, 400);
    if (!KEY()) return json({ error: "no API key" }, 503);
    const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
      headers: { "X-Goog-Api-Key": KEY()!, "X-Goog-FieldMask": "displayName,formattedAddress,location,businessStatus,googleMapsUri,rating,userRatingCount,priceLevel,primaryTypeDisplayName,servesVegetarianFood" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return json({ error: `Google ${res.status}` }, 502);
    const g = (await res.json()) as {
      displayName?: { text: string }; formattedAddress?: string; location?: { latitude: number; longitude: number }; businessStatus?: string;
      googleMapsUri?: string; rating?: number; userRatingCount?: number; priceLevel?: string; primaryTypeDisplayName?: { text: string }; servesVegetarianFood?: boolean;
    };
    const cid = g.googleMapsUri?.match(/cid=(\d+)/)?.[1];
    return json({
      name: g.displayName?.text ?? "",
      address: g.formattedAddress ?? "",
      distanceKm: g.location ? km(g.location.latitude, g.location.longitude) : null,
      closed: g.businessStatus === "CLOSED_PERMANENTLY",
      googleMapsUrl: cid ? `https://maps.google.com/maps?cid=${cid}` : null,
      rating: typeof g.rating === "number" ? { value: g.rating, count: new Intl.NumberFormat("en-IN").format(g.userRatingCount ?? 0), source: "Google Maps" } : null,
      priceLevel: g.priceLevel ?? null,
      type: g.primaryTypeDisplayName?.text ?? null,
      servesVeg: g.servesVegetarianFood ?? null,
    });
  },

  // Add a restaurant: validated against the same rules as the rest of the data, then written to all the data files.
  "/api/dev/add/save": async (req) => {
    if (req.method !== "POST") return json({ error: "POST only" }, 405);
    const b = (await req.json().catch(() => null)) as null | { placeId?: string; googleName?: string; address?: string; lat?: number | null; lng?: number | null; closedOnGoogle?: boolean; picks?: number[]; place?: Partial<Place> };
    if (!b?.place || !b.placeId || !PLACE_ID.test(b.placeId)) return json({ errors: ["missing place or Google place id"] }, 400);

    const ids = readJson<PlaceIdsFile>(FILES.ids, { resolvedAt: "", places: {} });
    if (Object.values(ids.places).some((e) => e.placeId === b.placeId)) return json({ errors: ["this Google place is already on the site"] }, 409);
    const file = readJson<PlacesFile>(FILES.places, null as unknown as PlacesFile);

    const p = b.place;
    const base = slugify(String(p.searchName || p.name || ""));
    if (!base) return json({ errors: ["a name is required"] }, 400);
    let id = base;
    for (let n = 2; file.places.some((x) => x.id === id); n++) id = `${base}-${n}`;

    const mealPrice = typeof p.mealPrice === "number" && p.mealPrice > 0 ? Math.round(p.mealPrice) : null;
    const priceBand = bandFor(mealPrice);
    const candidate = {
      id, name: String(p.name ?? "").trim(), searchName: String(p.searchName || p.name || "").trim(), placesQuery: null,
      section: p.section, cuisine: p.cuisine?.trim() || null, moods: Array.isArray(p.moods) ? p.moods : [], veg: p.veg,
      rating: p.rating ?? null, price: p.price?.trim() || null,
      priceTier: priceBand ? BAND_TIER[priceBand] : null, mealPrice, priceBand,
      priceSource: mealPrice ? p.priceSource?.trim() || null : null, priceConfidence: mealPrice ? p.priceConfidence ?? null : null,
      note: p.note?.trim() || null, flag: p.flag?.trim() || null, closed: !!p.closed,
      googleMapsUrl: p.googleMapsUrl || null, swiggyUrl: p.swiggyUrl?.trim() || null, zomatoUrl: p.zomatoUrl?.trim() || null,
      photo: null, triedByShivang: !!p.triedByShivang,
    };
    const parsed = placeSchema.safeParse(candidate);
    if (!parsed.success) return json({ errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, 400);

    const next = { ...file, updated: new Date().toISOString().slice(0, 10), places: [...file.places, parsed.data] };
    const whole = placesFileSchema.safeParse(next);
    const problems = whole.success ? crossCheck(whole.data).errors : whole.error.issues.map((i) => i.message);
    if (problems.length) return json({ errors: problems }, 400);

    const picks = [...new Set((b.picks ?? []).filter((n) => Number.isInteger(n) && n >= 0 && n < 10))].slice(0, MAX_PICKS);
    const overrides = readJson<Record<string, string | null>>(FILES.overrides, {});
    const allPicks = readJson<Record<string, number[]>>(FILES.picks, {});
    overrides[id] = b.placeId;
    ids.places[id] = {
      placeId: b.placeId, matchedName: String(b.googleName ?? "").slice(0, 120), address: String(b.address ?? "").slice(0, 200),
      distanceKm: typeof b.lat === "number" && typeof b.lng === "number" ? km(b.lat, b.lng) : -1,
      status: "manual", approved: true, closedOnGoogle: !!b.closedOnGoogle,
    };
    if (picks.length) allPicks[id] = picks;
    writeJson(FILES.ids, ids);
    writeJson(FILES.overrides, overrides);
    writeJson(FILES.picks, allPicks);
    writeJson(FILES.places, next); // last, so a failure above never leaves a place without its photo links
    return json({ ok: true, id });
  },

  "/api/dev/picks": async (req) => {
    if (req.method !== "POST") return json({ error: "POST only" }, 405);
    const { id, picks } = (await req.json().catch(() => ({}))) as { id?: string; picks?: unknown };
    if (!id || !knownSlugs().has(id) || !Array.isArray(picks)) return json({ error: "bad request" }, 400);
    const clean = [...new Set(picks.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < 10))].slice(0, MAX_PICKS);
    const all = readJson<Record<string, number[]>>(FILES.picks, {});
    if (clean.length) all[id] = clean;
    else delete all[id];
    writeJson(FILES.picks, all);
    return json({ ok: true, picks: clean });
  },

  "/api/dev/match": async (req) => {
    if (req.method !== "POST") return json({ error: "POST only" }, 405);
    const b = (await req.json().catch(() => ({}))) as { id?: string; placeId?: string | null; name?: string; address?: string; lat?: number | null; lng?: number | null; closed?: boolean };
    if (!b.id || !knownSlugs().has(b.id)) return json({ error: "unknown place" }, 400);
    const ids = readJson<PlaceIdsFile>(FILES.ids, { resolvedAt: "", places: {} });
    const overrides = readJson<Record<string, string | null>>(FILES.overrides, {});
    const picks = readJson<Record<string, number[]>>(FILES.picks, {});
    delete picks[b.id]; // photos belong to the old match

    if (b.placeId === null) {
      overrides[b.id] = null; // "no Google listing": the resolver will not bring it back
      delete ids.places[b.id];
    } else if (typeof b.placeId === "string" && /^[A-Za-z0-9_-]{10,200}$/.test(b.placeId)) {
      overrides[b.id] = b.placeId;
      const entry: PlaceIdEntry = {
        placeId: b.placeId,
        matchedName: String(b.name ?? "").slice(0, 120),
        address: String(b.address ?? "").slice(0, 200),
        distanceKm: typeof b.lat === "number" && typeof b.lng === "number" ? km(b.lat, b.lng) : -1,
        status: "manual",
        approved: true,
        closedOnGoogle: !!b.closed,
      };
      ids.places[b.id] = entry;
    } else return json({ error: "bad placeId" }, 400);

    writeJson(FILES.overrides, overrides);
    writeJson(FILES.ids, ids);
    writeJson(FILES.picks, picks);
    return json({ ok: true, entry: ids.places[b.id] ?? null });
  },
};

/** Public routes (re-reading data from disk each request) plus the dev-only ones. */
const publicRoutes = createRoutes({
  placeIds: () => readJson<PlaceIdsFile>(FILES.ids, { resolvedAt: "", places: {} }).places,
  picks: () => readJson<Record<string, number[]>>(FILES.picks, {}),
});

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

export function devRoutes(): Record<string, Route> {
  const guard = (route: Route): Route => async (req) =>
    LOCAL_HOST.test(new URL(req.url).host) ? route(req) : json({ error: "dev routes are local only" }, 403);
  return {
    ...publicRoutes,
    ...Object.fromEntries(Object.entries(routes).map(([path, r]) => [path, guard(r)])),
  };
}
