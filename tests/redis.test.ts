import { describe, expect, it } from "vitest";
import { memoryRedis, run, toObject, upstashRedis } from "../server/redis";

describe("memoryRedis (the pretend whiteboard)", () => {
  it("SADD says 1 for a new member and 0 for a repeat, so a double-tap cannot count twice", async () => {
    const r = memoryRedis();
    expect(await run(r, "SADD", "mine:a", "salt")).toBe(1);
    expect(await run(r, "SADD", "mine:a", "salt")).toBe(0);
    expect(await run(r, "SMEMBERS", "mine:a")).toEqual(["salt"]);
    expect(await run(r, "SREM", "mine:a", "salt")).toBe(1);
    expect(await run(r, "SREM", "mine:a", "salt")).toBe(0);
  });

  it("keeps counts in a hash and reads them all back", async () => {
    const r = memoryRedis();
    await run(r, "HINCRBY", "likes:count", "salt", 1);
    await run(r, "HINCRBY", "likes:count", "salt", 1);
    await run(r, "HINCRBY", "likes:count", "box8", 1);
    expect(toObject(await run(r, "HGETALL", "likes:count"))).toEqual({ salt: "2", box8: "1" });
  });

  it("puts new list items on top, trims the tail, and removes one exact item", async () => {
    const r = memoryRedis();
    for (const t of ["a", "b", "c", "d"]) await run(r, "LPUSH", "l", t);
    expect(await run(r, "LRANGE", "l", 0, -1)).toEqual(["d", "c", "b", "a"]);
    await run(r, "LTRIM", "l", 0, 2);
    expect(await run(r, "LRANGE", "l", 0, -1)).toEqual(["d", "c", "b"]);
    expect(await run(r, "LREM", "l", 1, "c")).toBe(1);
    expect(await run(r, "LRANGE", "l", 0, 1)).toEqual(["d", "b"]);
  });

  it("forgets keys after their time is up", async () => {
    let t = 0;
    const r = memoryRedis(() => t);
    await run(r, "INCRBY", "rl", 1);
    await run(r, "EXPIRE", "rl", 60);
    expect(await run(r, "INCR", "rl")).toBe(2);
    t = 61_000;
    expect(await run(r, "INCR", "rl")).toBe(1);
  });

  it("refuses to treat one kind of box as another", async () => {
    const r = memoryRedis();
    await run(r, "SADD", "x", "1");
    await expect(run(r, "LPUSH", "x", "1")).rejects.toThrow(/WRONGTYPE/);
  });
});

describe("upstashRedis", () => {
  it("sends all commands in one request and throws when one fails", async () => {
    let calls = 0;
    const ok = upstashRedis("https://x.upstash.io", "t", (async () => (calls++, Response.json([{ result: 1 }, { result: ["a"] }]))) as unknown as typeof fetch);
    expect(await ok.pipeline([["SADD", "a", "b"], ["SMEMBERS", "a"]])).toEqual([1, ["a"]]);
    expect(calls).toBe(1);
    const bad = upstashRedis("https://x.upstash.io", "t", (async () => Response.json([{ error: "ERR nope" }])) as unknown as typeof fetch);
    await expect(bad.pipeline([["BOOM"]])).rejects.toThrow("ERR nope");
  });
});
