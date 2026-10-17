import { memoryRedis, upstashFromEnv, upstashRedis, type Redis } from "./redis";

/**
 * A daily-counter helper on top of Redis, used by the photo cap.
 * INCRBY is atomic: two requests arriving at the same instant can never both read "5" and both write "6".
 */
export interface KV {
  /** Add n to a counter (creating it at 0), keep it alive for ttlSec, return the new value. */
  incrBy(key: string, n: number, ttlSec: number): Promise<number>;
}

function kvOver(redis: Redis): KV {
  return {
    async incrBy(key, n, ttlSec) {
      const [value] = await redis.pipeline([["INCRBY", key, n], ["EXPIRE", key, ttlSec]]);
      return Number(value);
    },
  };
}

export const memoryKV = (): KV => kvOver(memoryRedis());
export const upstashKV = (url: string, token: string, fetchImpl: typeof fetch = fetch): KV => kvOver(upstashRedis(url, token, fetchImpl));

export function kvFromEnv(env: Record<string, string | undefined>): KV {
  const redis = upstashFromEnv(env);
  return redis ? kvOver(redis) : memoryKV();
}
