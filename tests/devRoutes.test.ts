import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { devConfig, devRoutes } from "../server/devRoutes";

const rebuild = vi.fn(async () => {});
const dir = mkdtempSync(join(tmpdir(), "picks-dev-"));
const saved = { ...devConfig };
const routes = devRoutes();

beforeAll(() => {
  for (const f of ["places.json", "place-ids.json"]) cpSync(join("data", f), join(dir, f));
  devConfig.dir = dir;
  devConfig.rebuild = rebuild;
});
afterAll(() => {
  Object.assign(devConfig, saved);
  rmSync(dir, { recursive: true, force: true });
});

const call = (path: string, body?: unknown, headers: Record<string, string> = { "x-dev-tool": "1" }) =>
  routes[path]!(new Request(`http://localhost:5173${path}`, body === undefined ? { headers } : { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(body) }));
const readData = (f: string) => JSON.parse(readFileSync(join(dir, f), "utf8"));

describe("dev route guard", () => {
  it("refuses requests without the dev header or from another website", async () => {
    expect((await call("/api/dev/state", undefined, {})).status).toBe(403);
    expect((await call("/api/dev/state", undefined, { "x-dev-tool": "1", origin: "https://evil.example" })).status).toBe(403);
    expect((await call("/api/dev/state", undefined, { "x-dev-tool": "1", origin: "http://localhost:5173" })).status).toBe(200);
  });

  it("refuses a non-local host even with the header", async () => {
    const res = await routes["/api/dev/state"]!(new Request("http://food.example/api/dev/state", { headers: { "x-dev-tool": "1" } }));
    expect(res.status).toBe(403);
  });
});

describe("saving picks", () => {
  it("writes the file and re-bundles the functions", async () => {
    rebuild.mockClear();
    const slug = readData("places.json").places[0].id;
    expect((await call("/api/dev/picks", { id: slug, picks: [2, 0, 2] })).status).toBe(200);
    expect(readData("photo-picks.json")[slug]).toEqual([2, 0]);
    expect(rebuild).toHaveBeenCalledOnce();
  });
});

describe("adding a restaurant", () => {
  const place = { name: "Test Diner", searchName: "Test Diner", section: "budget", cuisine: "Test", moods: ["cheap"], veg: "options", mealPrice: 150, priceSource: "test", priceConfidence: "estimate" };
  const save = (placeId: string, extra: object = {}) => call("/api/dev/add/save", { placeId, googleName: "Test Diner", address: "x", lat: 17.4, lng: 78.38, place, ...extra });

  it("adds a valid place to every data file and re-bundles", async () => {
    rebuild.mockClear();
    const res = await save("ChIJtestdiner0001");
    expect(res.status, JSON.stringify(await res.clone().json())).toBe(200);
    expect(readData("places.json").places.at(-1).id).toBe("test-diner");
    expect(readData("place-ids.json").places["test-diner"].placeId).toBe("ChIJtestdiner0001");
    expect(rebuild).toHaveBeenCalledOnce();
  });

  it("rejects the same Google place twice, but not an id left over from a deleted place", async () => {
    expect((await save("ChIJtestdiner0001")).status).toBe(409);
    const ids = readData("place-ids.json");
    ids.places["long-gone"] = { ...ids.places["test-diner"], placeId: "ChIJleftover0001" };
    writeFileSync(join(dir, "place-ids.json"), JSON.stringify(ids));
    expect((await save("ChIJleftover0001")).status).toBe(200);
  });

  it("rejects a place that breaks the data rules, writing nothing", async () => {
    const before = readFileSync(join(dir, "places.json"), "utf8");
    const res = await call("/api/dev/add/save", { placeId: "ChIJbadplace0001", place: { ...place, name: "Bad One", searchName: "Bad One", section: "premium" } });
    expect(res.status).toBe(400);
    expect(readFileSync(join(dir, "places.json"), "utf8")).toBe(before);
  });
});
