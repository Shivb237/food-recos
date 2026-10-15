/**
 * A tiny Redis client.
 *
 * Redis commands are just lists of words, like ["SADD", "mine:abc", "salt"]. A "pipeline" sends several of them in
 * ONE web request and returns one answer per command, in order. That matters because every web request costs time,
 * and (on Upstash's free plan) every command is counted.
 *
 * Two implementations:
 *  - upstashRedis: the real thing, over HTTPS (serverless functions can't keep a long-lived connection open).
 *  - memoryRedis: a pretend Redis that lives in this process. Same commands, same answers. Used for local dev and tests.
 */
export type Command = (string | number)[];

export interface Redis {
  /** Run commands in order; returns one result per command. Throws if any command errors. */
  pipeline(commands: Command[]): Promise<unknown[]>;
}

export async function run(redis: Redis, ...command: Command): Promise<unknown> {
  return (await redis.pipeline([command]))[0];
}

/** HGETALL gives back a flat list [field, value, field, value...]. Turn it into an object. */
export function toObject(flat: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  const list = Array.isArray(flat) ? flat : [];
  for (let i = 0; i + 1 < list.length; i += 2) out[String(list[i])] = String(list[i + 1]);
  return out;
}

// ---------- real Redis (Upstash, over HTTPS) ----------

export function upstashRedis(url: string, token: string, fetchImpl: typeof fetch = fetch): Redis {
  return {
    async pipeline(commands) {
      if (!commands.length) return [];
      const res = await fetchImpl(`${url.replace(/\/$/, "")}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(commands),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) throw new Error(`Upstash ${res.status}`);
      const answers = (await res.json()) as { result?: unknown; error?: string }[];
      return answers.map((a) => {
        if (a.error) throw new Error(a.error);
        return a.result ?? null;
      });
    },
  };
}

export function upstashFromEnv(env: Record<string, string | undefined>): Redis | null {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? upstashRedis(url, token) : null;
}

// ---------- pretend Redis (memory) ----------

type Value = { type: "string"; v: string } | { type: "hash"; v: Map<string, string> } | { type: "set"; v: Set<string> } | { type: "list"; v: string[] };

/** Supports exactly the commands this project uses: INCR INCRBY EXPIRE SADD SREM SMEMBERS HINCRBY HGETALL LPUSH LTRIM LRANGE LREM DEL. */
export function memoryRedis(now: () => number = Date.now): Redis {
  const data = new Map<string, Value>();
  const expires = new Map<string, number>();

  const live = (key: string) => {
    const exp = expires.get(key);
    if (exp !== undefined && exp <= now()) {
      data.delete(key);
      expires.delete(key);
    }
    return data.get(key);
  };
  const need = <T extends Value["type"]>(key: string, type: T, make: () => Extract<Value, { type: T }>["v"]) => {
    const cur = live(key);
    if (cur && cur.type !== type) throw new Error("WRONGTYPE Operation against a key holding the wrong kind of value");
    if (cur) return cur.v as Extract<Value, { type: T }>["v"];
    const v = make();
    data.set(key, { type, v } as Value);
    return v;
  };
  const peek = <T extends Value["type"]>(key: string, type: T) => {
    const cur = live(key);
    if (cur && cur.type !== type) throw new Error("WRONGTYPE Operation against a key holding the wrong kind of value");
    return cur?.v as Extract<Value, { type: T }>["v"] | undefined;
  };
  const int = (x: string | number) => {
    const n = Number(x);
    if (!Number.isInteger(n)) throw new Error("ERR value is not an integer or out of range");
    return n;
  };
  const slice = (len: number, start: number, stop: number): [number, number] => {
    const s = start < 0 ? Math.max(0, len + start) : start;
    const e = stop < 0 ? len + stop : Math.min(stop, len - 1);
    return [s, e];
  };

  function exec([name, key, ...a]: Command): unknown {
    const k = String(key);
    switch (String(name).toUpperCase()) {
      case "INCR":
      case "INCRBY": {
        const by = String(name).toUpperCase() === "INCR" ? 1 : int(a[0]!);
        const cur = peek(k, "string");
        const next = (cur === undefined ? 0 : int(cur)) + by;
        const ttl = expires.get(k);
        data.set(k, { type: "string", v: String(next) });
        if (ttl !== undefined) expires.set(k, ttl);
        return next;
      }
      case "EXPIRE":
        if (!live(k)) return 0;
        expires.set(k, now() + int(a[0]!) * 1000);
        return 1;
      case "DEL":
        return data.delete(k) ? 1 : 0;
      case "SADD": {
        const s = need(k, "set", () => new Set<string>());
        let added = 0;
        for (const m of a) if (!s.has(String(m))) (s.add(String(m)), added++);
        return added;
      }
      case "SREM": {
        const s = peek(k, "set");
        let removed = 0;
        for (const m of a) if (s?.delete(String(m))) removed++;
        if (s && !s.size) data.delete(k);
        return removed;
      }
      case "SMEMBERS":
        return [...(peek(k, "set") ?? [])];
      case "HINCRBY": {
        const h = need(k, "hash", () => new Map<string, string>());
        const next = int(h.get(String(a[0])) ?? 0) + int(a[1]!);
        h.set(String(a[0]), String(next));
        return next;
      }
      case "HGETALL":
        return [...(peek(k, "hash") ?? new Map()).entries()].flat();
      case "LPUSH": {
        const l = need(k, "list", () => [] as string[]);
        for (const v of a) l.unshift(String(v));
        return l.length;
      }
      case "LTRIM": {
        const l = peek(k, "list");
        if (!l) return "OK";
        const [s, e] = slice(l.length, int(a[0]!), int(a[1]!));
        data.set(k, { type: "list", v: l.slice(s, e + 1) });
        return "OK";
      }
      case "LRANGE": {
        const l = peek(k, "list") ?? [];
        const [s, e] = slice(l.length, int(a[0]!), int(a[1]!));
        return l.slice(s, e + 1);
      }
      case "LREM": {
        // count > 0: remove that many matches, scanning from the head. (We only use count 1.)
        const l = peek(k, "list");
        if (!l) return 0;
        let left = int(a[0]!) || l.length;
        let removed = 0;
        for (let i = 0; i < l.length && left > 0; ) {
          if (l[i] === String(a[1])) (l.splice(i, 1), left--, removed++);
          else i++;
        }
        return removed;
      }
      default:
        throw new Error(`ERR unknown command '${name}' (memoryRedis only supports what this project uses)`);
    }
  }

  return { async pipeline(commands) { return commands.map(exec); } };
}
