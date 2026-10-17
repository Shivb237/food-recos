import { afterEach, describe, expect, it, vi } from "vitest";
import { loadPhotos } from "../src/lib/photos";

const photo = { uri: "https://lh3.googleusercontent.com/a", author: "A", authorUri: null };
const reply = (body: unknown) => vi.fn(async () => Response.json(body));
afterEach(() => vi.unstubAllGlobals());

describe("photo loader", () => {
  it("asks once per place and size, remembering only successes", async () => {
    const f = reply({ photos: [photo] });
    vi.stubGlobal("fetch", f);
    await loadPhotos("a-place", 1, 480);
    await loadPhotos("a-place", 1, 480);
    expect(f).toHaveBeenCalledOnce();

    const none = reply({ photos: [], reason: "rate-limited" });
    vi.stubGlobal("fetch", none);
    expect(await loadPhotos("b-place", 1, 480)).toEqual([]);
    await loadPhotos("b-place", 1, 480);
    expect(none).toHaveBeenCalledTimes(2); // a failure is asked again later, but only when something asks again: no loop of its own
  });

  it("stops asking once Google's daily quota is used up", async () => {
    vi.stubGlobal("fetch", reply({ photos: [], reason: "quota-exhausted" }));
    expect(await loadPhotos("c-place", 1, 480)).toEqual([]);
    const later = reply({ photos: [photo] });
    vi.stubGlobal("fetch", later);
    expect(await loadPhotos("d-place", 1, 480)).toEqual([]);
    expect(later).not.toHaveBeenCalled();
  });
});
