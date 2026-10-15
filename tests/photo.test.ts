import { describe, expect, it, vi } from "vitest";
import type { PlaceIdEntry } from "../shared/placeIds";
import { memoryKV, upstashKV } from "../server/kv";
import { createPhotoHandler, orderByPicks } from "../server/photo";

const entry = (over: Partial<PlaceIdEntry> = {}): PlaceIdEntry => ({
  placeId: "ChIJabc", matchedName: "Test", address: "x", distanceKm: 1, status: "good", approved: true, closedOnGoogle: false, ...over,
});
const placeIds = { rajthali: entry(), weakone: entry({ approved: false, status: "weak" }) };

/** A fake Google: Place Details lists `count` photos, each media call returns a googleusercontent URL. */
function fakeGoogle(count = 3, opts: { mediaStatus?: number; photoUri?: string } = {}) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/media")) {
      if (opts.mediaStatus) return new Response("no", { status: opts.mediaStatus });
      return Response.json({ photoUri: opts.photoUri ?? `https://lh3.googleusercontent.com/${encodeURIComponent(url.split("/photos/")[1]?.split("/")[0] ?? "x")}` });
    }
    return Response.json({ photos: Array.from({ length: count }, (_, i) => ({ name: `places/ChIJabc/photos/ref${i}`, authorAttributions: [{ displayName: `Author ${i}`, uri: `https://maps.google.com/contrib/${i}` }] })) });
  });
}
const get = (h: ReturnType<typeof createPhotoHandler>, qs: string) => h(new Request(`http://x.test/api/photo?${qs}`));
const make = (over: Partial<Parameters<typeof createPhotoHandler>[0]> = {}) =>
  createPhotoHandler({ placeIds, apiKey: "k", dailyCap: 10, kv: memoryKV(), fetchImpl: fakeGoogle() as unknown as typeof fetch, ...over });

describe("photo handler", () => {
  it("rejects unknown and unapproved places without calling Google", async () => {
    const f = fakeGoogle();
    const h = make({ fetchImpl: f as unknown as typeof fetch });
    expect((await get(h, "id=nope")).status).toBe(404);
    expect((await get(h, "id=weakone")).status).toBe(404);
    expect((await get(h, "id=")).status).toBe(404);
    expect(f).not.toHaveBeenCalled();
  });

  it("only allows GET", async () => {
    const res = await make()(new Request("http://x.test/api/photo?id=rajthali", { method: "POST" }));
    expect(res.status).toBe(405);
  });

  it("returns photos with author credit, limited to n", async () => {
    const res = await get(make(), "id=rajthali&n=2&w=640");
    const body = await res.json();
    expect(body.photos).toHaveLength(2);
    expect(body.photos[0]).toMatchObject({ author: "Author 0", authorUri: "https://maps.google.com/contrib/0" });
    expect(body.photos[0].uri).toMatch(/^https:\/\/lh3\.googleusercontent\.com\//);
    expect(res.headers.get("cache-control")).toContain("private");
  });

  it("asks Google for the free 'photos' field only, and clamps size and count", async () => {
    const f = fakeGoogle(10) as ReturnType<typeof vi.fn>;
    const h = make({ fetchImpl: f as unknown as typeof fetch });
    const body = await (await get(h, "id=rajthali&n=99&w=99999")).json();
    expect(body.photos).toHaveLength(4);
    const calls = f.mock.calls.map((c) => ({ url: String(c[0]), init: c[1] as RequestInit }));
    expect((calls[0]!.init.headers as Record<string, string>)["X-Goog-FieldMask"]).toBe("photos");
    expect(calls.filter((c) => c.url.includes("maxWidthPx=1200"))).toHaveLength(4);
  });

  it("answers 'no photos' in mock mode (no API key) without touching Google", async () => {
    const f = fakeGoogle();
    const body = await (await get(make({ apiKey: undefined, fetchImpl: f as unknown as typeof fetch }), "id=rajthali")).json();
    expect(body).toEqual({ photos: [], reason: "not-configured" });
    expect(f).not.toHaveBeenCalled();
  });

  it("stops at the daily cap and refunds the reservation", async () => {
    const kv = memoryKV();
    const f = fakeGoogle();
    const h = make({ dailyCap: 3, kv, fetchImpl: f as unknown as typeof fetch });
    expect((await (await get(h, "id=rajthali&n=2")).json()).photos).toHaveLength(2);
    const over = await (await get(h, "id=rajthali&n=2")).json();
    expect(over).toEqual({ photos: [], reason: "daily-cap" });
    // The refused request gave its 2 back, so one more photo still fits under the cap of 3.
    expect((await (await get(h, "id=rajthali&n=1")).json()).photos).toHaveLength(1);
  });

  it("refunds photos that Google could not deliver", async () => {
    const kv = memoryKV();
    const h = make({ kv, dailyCap: 10, fetchImpl: fakeGoogle(3, { mediaStatus: 500 }) as unknown as typeof fetch });
    expect((await (await get(h, "id=rajthali&n=3")).json()).photos).toEqual([]);
    expect(await kv.incrBy(`photo-cap:${new Date().toISOString().slice(0, 10)}`, 0, 60)).toBe(0);
  });

  it("drops image URLs that are not on Google's image hosts", async () => {
    const h = make({ fetchImpl: fakeGoogle(1, { photoUri: "https://evil.example/x.jpg" }) as unknown as typeof fetch });
    expect((await (await get(h, "id=rajthali")).json()).photos).toEqual([]);
  });

  it("does not spend anything when the counter is unavailable", async () => {
    const f = fakeGoogle();
    const h = make({ kv: { incrBy: async () => { throw new Error("down"); } }, fetchImpl: f as unknown as typeof fetch });
    expect((await (await get(h, "id=rajthali")).json()).reason).toBe("counter-unavailable");
    expect(f).not.toHaveBeenCalled();
  });

  it("reports an upstream failure as 502 and refunds", async () => {
    const kv = memoryKV();
    const f = vi.fn(async () => new Response("denied", { status: 403 }));
    const res = await get(make({ kv, fetchImpl: f as unknown as typeof fetch }), "id=rajthali");
    expect(res.status).toBe(502);
    expect((await res.json()).status).toBe(403);
    expect(await kv.incrBy(`photo-cap:${new Date().toISOString().slice(0, 10)}`, 0, 60)).toBe(0);
  });
});

describe("picks", () => {
  it("orders picked positions first, then the rest, ignoring positions that do not exist", () => {
    expect(orderByPicks(["a", "b", "c", "d"], [2, 0])).toEqual(["c", "a", "b", "d"]);
    expect(orderByPicks(["a", "b"], [7, -1, 1, 1])).toEqual(["b", "a"]);
    expect(orderByPicks(["a", "b"], [])).toEqual(["a", "b"]);
  });

  it("serves the picked photo first and only pays for the ones requested", async () => {
    const f = fakeGoogle(5) as ReturnType<typeof vi.fn>;
    const h = make({ picks: { rajthali: [3] }, fetchImpl: f as unknown as typeof fetch });
    const body = await (await get(h, "id=rajthali&n=1")).json();
    expect(body.photos).toHaveLength(1);
    const mediaCalls = f.mock.calls.map((c) => String(c[0])).filter((u) => u.includes("/media"));
    expect(mediaCalls).toHaveLength(1);
    expect(mediaCalls[0]).toContain("/photos/ref3/");
  });
});

describe("kv", () => {
  it("memoryKV counts up and down", async () => {
    const kv = memoryKV();
    expect(await kv.incrBy("a", 2, 60)).toBe(2);
    expect(await kv.incrBy("a", -1, 60)).toBe(1);
  });

  it("upstashKV sends INCRBY + EXPIRE in one pipeline request with the bearer token", async () => {
    const f = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => Response.json([{ result: 7 }, { result: 1 }]));
    const kv = upstashKV("https://example.upstash.io/", "secret", f as unknown as typeof fetch);
    expect(await kv.incrBy("photo-cap:2026-10-15", 3, 172800)).toBe(7);
    const [url, init] = f.mock.calls[0]!;
    expect(url).toBe("https://example.upstash.io/pipeline");
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer secret");
    expect(JSON.parse(init!.body as string)).toEqual([["INCRBY", "photo-cap:2026-10-15", 3], ["EXPIRE", "photo-cap:2026-10-15", 172800]]);
  });
});

describe("rate limiting by Google", () => {
  it("says 'rate-limited' (and refunds) when Google refuses every photo with 429", async () => {
    const kv = memoryKV();
    const h = make({ kv, fetchImpl: fakeGoogle(3, { mediaStatus: 429 }) as unknown as typeof fetch });
    const body = await (await get(h, "id=rajthali&n=3")).json();
    expect(body).toEqual({ photos: [], reason: "rate-limited" });
    expect(await kv.incrBy(`photo-cap:${new Date().toISOString().slice(0, 10)}`, 0, 60)).toBe(0);
  });
});

describe("place lookup quota", () => {
  it("treats a 429 on the place lookup as rate-limited so the app retries", async () => {
    const f = vi.fn(async () => new Response("slow down", { status: 429 }));
    const body = await (await get(make({ fetchImpl: f as unknown as typeof fetch }), "id=rajthali")).json();
    expect(body).toEqual({ photos: [], reason: "rate-limited", step: "place-details" });
  });
});
