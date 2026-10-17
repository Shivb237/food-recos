import placeIdsFile from "../data/place-ids.json";
import placesFile from "../data/places.json";
import picksFile from "../data/photo-picks.json";
import type { PlaceIdsFile } from "../shared/placeIds";
import { kvFromEnv, type KV } from "./kv";
import { memoryRedis, upstashFromEnv, type Redis } from "./redis";
import { createSocialHandler } from "./social";
import { createPhotoHandler, type PhotoDeps } from "./photo";

type Env = Record<string, string | undefined>;
type Route = (req: Request) => Promise<Response>;

export interface ServerData {
  placeIds: PhotoDeps["placeIds"];
  picks: PhotoDeps["picks"];
}

/** Data baked into the build. The dev server swaps in versions read from disk so edits show up without a restart. */
const bundledData: ServerData = {
  placeIds: () => (placeIdsFile as PlaceIdsFile).places,
  picks: () => picksFile as Record<string, number[]>,
};

/**
 * Upstash if its two env vars are set. Otherwise: a pretend in-memory Redis when running locally (so the UI works with no
 * accounts), and nothing at all on Vercel, where the social routes then answer 501 and the app hides likes and comments.
 */
function defaultRedis(env: Env): Redis | null {
  return upstashFromEnv(env) ?? (env.VERCEL ? null : memoryRedis());
}

/** Every public API route, keyed by path. api/*.ts (Vercel) and the Vite dev plugin both read from here. */
export function createRoutes(data: ServerData, env: Env = process.env, kv: KV = kvFromEnv(env), redis: Redis | null = defaultRedis(env)): Record<string, Route> {
  const photo = createPhotoHandler({
    placeIds: data.placeIds,
    picks: data.picks,
    apiKey: env.GOOGLE_MAPS_API_KEY || undefined,
    dailyCap: Number(env.PHOTO_DAILY_CAP) > 0 ? Number(env.PHOTO_DAILY_CAP) : 150,
    cacheSeconds: env.PHOTO_CACHE_SECONDS !== undefined && env.PHOTO_CACHE_SECONDS !== "" ? Number(env.PHOTO_CACHE_SECONDS) : 43200,
    kv,
  });
  const social = createSocialHandler({
    redis,
    validPlaces: new Set((placesFile as { places: { id: string }[] }).places.map((p) => p.id)),
    adminToken: env.ADMIN_TOKEN || undefined,
  });
  return { "/api/photo": photo, "/api/social": social };
}

const routes = createRoutes(bundledData);
export const photoHandler = routes["/api/photo"]!;
export const socialHandler = routes["/api/social"]!;
