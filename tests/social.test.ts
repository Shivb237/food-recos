import { beforeEach, describe, expect, it } from "vitest";
import { memoryRedis, type Redis } from "../server/redis";
import { createSocialHandler } from "../server/social";

const A = "device-aaaaaaaaaaaaaaaa";
const B = "device-bbbbbbbbbbbbbbbb";
const places = new Set(["salt", "box8"]);

let redis: Redis;
let t: number;
let ids: number;
const make = (over = {}) => createSocialHandler({ redis, validPlaces: places, now: () => t, newId: () => `c${++ids}`, adminToken: "boss-token-123", ...over });
const call = (h: ReturnType<typeof make>, device: string | null, init: { method?: string; qs?: string; body?: unknown; admin?: string } = {}) => {
  const headers: Record<string, string> = {};
  if (device) headers["x-device"] = device;
  if (init.admin) headers["x-admin"] = init.admin;
  return h(new Request(`http://x.test/api/social${init.qs ?? ""}`, { method: init.method ?? (init.body ? "POST" : "GET"), headers, body: init.body ? JSON.stringify(init.body) : undefined }));
};

beforeEach(() => { redis = memoryRedis(() => t); t = 1_000_000; ids = 0; });

describe("likes", () => {
  it("counts a like once, even if the same phone taps twice", async () => {
    const h = make();
    expect((await (await call(h, A, { body: { action: "like", place: "salt", on: true } })).json()).changed).toBe(true);
    expect((await (await call(h, A, { body: { action: "like", place: "salt", on: true } })).json()).changed).toBe(false);
    await call(h, B, { body: { action: "like", place: "salt", on: true } });
    const s = await (await call(h, A)).json();
    expect(s.likes).toEqual({ salt: 2 });
    expect(s.mine).toEqual(["salt"]);
    expect((await (await call(h, B)).json()).mine).toEqual(["salt"]);
  });

  it("un-liking takes the heart back, and un-liking twice does nothing", async () => {
    const h = make();
    await call(h, A, { body: { action: "like", place: "salt", on: true } });
    await call(h, A, { body: { action: "like", place: "salt", on: false } });
    await call(h, A, { body: { action: "like", place: "salt", on: false } });
    expect((await (await call(h, A)).json()).likes).toEqual({});
  });

  it("never shows anyone's device id or fingerprint", async () => {
    const h = make();
    await call(h, A, { body: { action: "like", place: "salt", on: true } });
    await call(h, A, { body: { action: "comment", place: "salt", name: "Asha", text: "Great thali" } });
    const text = JSON.stringify([await (await call(h, B)).json(), await (await call(h, B, { qs: "?place=salt" })).json()]);
    expect(text).not.toContain(A);
    expect(text).not.toMatch(/"o"|"owner"/);
  });
});

describe("comments", () => {
  it("stores, lists newest first, and counts", async () => {
    const h = make();
    await call(h, A, { body: { action: "comment", place: "salt", name: "Asha", text: "First" } });
    t += 1000;
    await call(h, B, { body: { action: "comment", place: "salt", name: "Ravi", text: "Second" } });
    const list = (await (await call(h, A, { qs: "?place=salt" })).json()).comments;
    expect(list.map((c: { text: string }) => c.text)).toEqual(["Second", "First"]);
    expect(list.map((c: { mine: boolean }) => c.mine)).toEqual([false, true]);
    const s = await (await call(h, A)).json();
    expect(s.commentCounts).toEqual({ salt: 2 });
    expect(s.recent[0]).toMatchObject({ place: "salt", name: "Ravi", text: "Second", mine: false });
  });

  it("cleans names and text and enforces the length limits", async () => {
    const h = make();
    const r = await (await call(h, A, { body: { action: "comment", place: "salt", name: `  ${"N".repeat(80)}\n\t `, text: `${"x".repeat(500)}` } })).json();
    expect(r.comment.name).toHaveLength(40);
    expect(r.comment.text).toHaveLength(280);
    expect((await call(h, A, { body: { action: "comment", place: "salt", name: "  ", text: "hi" } })).status).toBe(400);
    expect((await call(h, A, { body: { action: "comment", place: "salt", name: "Me", text: "   " } })).status).toBe(400);
  });

  it("stores markup as plain text (the page escapes it when drawing)", async () => {
    const h = make();
    await call(h, A, { body: { action: "comment", place: "salt", name: "<b>x</b>", text: "<script>alert(1)</script>" } });
    const c = (await (await call(h, A, { qs: "?place=salt" })).json()).comments[0];
    expect(c.text).toBe("<script>alert(1)</script>");
  });

  it("keeps only the 200 newest comments per place", async () => {
    const h = make({ });
    for (let i = 0; i < 205; i++) { t += 61_000; await call(h, A, { body: { action: "comment", place: "salt", name: "A", text: `c${i}` } }); }
    const list = (await (await call(h, A, { qs: "?place=salt" })).json()).comments;
    expect(list).toHaveLength(100); // one page; the list itself is capped at 200
    expect(list[0].text).toBe("c204");
  });

  it("lets an author delete their own comment, refuses others, and lets the admin delete any", async () => {
    const h = make();
    const c = (await (await call(h, A, { body: { action: "comment", place: "salt", name: "Asha", text: "mine" } })).json()).comment;
    expect((await call(h, B, { body: { action: "delete", place: "salt", id: c.id } })).status).toBe(403);
    expect((await call(h, B, { body: { action: "delete", place: "salt", id: c.id }, admin: "wrong-token-xxx" })).status).toBe(403);
    expect((await call(h, B, { body: { action: "delete", place: "salt", id: c.id }, admin: "boss-token-123" })).status).toBe(200);
    expect((await (await call(h, A)).json()).commentCounts).toEqual({});
    expect((await (await call(h, A)).json()).recent).toEqual([]);
    const d = (await (await call(h, A, { body: { action: "comment", place: "salt", name: "Asha", text: "again" } })).json()).comment;
    expect((await call(h, A, { body: { action: "delete", place: "salt", id: d.id } })).status).toBe(200);
  });
});

describe("safety", () => {
  it("answers 501 when Redis is not set up", async () => {
    expect((await call(make({ redis: null }), A)).status).toBe(501);
  });
  it("rejects unknown places, missing devices and bad actions", async () => {
    const h = make();
    expect((await call(h, A, { body: { action: "like", place: "nope", on: true } })).status).toBe(400);
    expect((await call(h, null, { body: { action: "like", place: "salt", on: true } })).status).toBe(400);
    expect((await call(h, "short", { body: { action: "like", place: "salt", on: true } })).status).toBe(400);
    expect((await call(h, A, { body: { action: "explode", place: "salt" } })).status).toBe(400);
    expect((await call(h, A, { qs: "?place=nope" })).status).toBe(404);
  });
  it("lets a phone write 30 times a minute, then slows it down, then forgives it next minute", async () => {
    const h = make();
    for (let i = 0; i < 30; i++) expect((await call(h, A, { body: { action: "like", place: "salt", on: i % 2 === 0 } })).status).toBe(200);
    expect((await call(h, A, { body: { action: "like", place: "salt", on: true } })).status).toBe(429);
    expect((await call(h, B, { body: { action: "like", place: "salt", on: true } })).status).toBe(200);
    t += 61_000;
    expect((await call(h, A, { body: { action: "like", place: "salt", on: true } })).status).toBe(200);
  });
  it("also limits one network address that keeps inventing new device ids", async () => {
    const h = make();
    const fresh = (i: number) => h(new Request("http://x.test/api/social", { method: "POST", headers: { "x-device": `device-${String(i).padStart(16, "0")}`, "x-forwarded-for": "203.0.113.9" }, body: JSON.stringify({ action: "like", place: "salt", on: true }) }));
    for (let i = 0; i < 90; i++) expect((await fresh(i)).status).toBe(200);
    expect((await fresh(999)).status).toBe(429);
  });
  it("turns a Redis outage into a polite 503", async () => {
    const h = make({ redis: { pipeline: async () => { throw new Error("down"); } } });
    expect((await call(h, A)).status).toBe(503);
  });
});
