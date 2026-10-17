import { useEffect, useRef, useState } from "preact/hooks";
import type { Place } from "../../shared/types";
import { hasGoogleListing } from "./coverage";

export interface PlacePhoto {
  uri: string;
  author: string;
  authorUri: string | null;
}

/** At most 6 photo requests in flight; the first cards on screen go first. */
const cache = new Map<string, Promise<PlacePhoto[]>>();
let active = 0;
const waiting: (() => void)[] = [];
const MAX_PARALLEL = 6;

function limited<T>(job: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      active++;
      job().then(resolve, reject).finally(() => {
        active--;
        waiting.shift()?.();
      });
    };
    active < MAX_PARALLEL ? run() : waiting.push(run);
  });
}

/** Set when Google says its daily quota is used up: no point asking again for a while, so cards go straight to their generated look. */
let pausedUntil = 0;
const PAUSE_MS = 10 * 60_000;

/**
 * One request per (place, size) per visit; only successes are remembered, so a failure can be retried later.
 * There is no retry here: the hook below owns retrying, so one card can never turn into a burst of requests.
 * `fresh` skips the shared cache (used when an image link has gone stale).
 */
export function loadPhotos(id: string, n: number, w: number, fresh = false): Promise<PlacePhoto[]> {
  const key = `${id}:${n}:${w}`;
  const hit = !fresh && cache.get(key);
  if (hit) return hit;
  const p = limited(async () => {
    if (Date.now() < pausedUntil) return [];
    try {
      const res = await fetch(`/api/photo?id=${encodeURIComponent(id)}&n=${n}&w=${w}${fresh ? "&fresh=1" : ""}`);
      if (!res.ok) return [];
      const body = (await res.json()) as { photos?: PlacePhoto[]; reason?: string };
      if (body.reason === "quota-exhausted") pausedUntil = Date.now() + PAUSE_MS;
      return Array.isArray(body.photos) ? body.photos : [];
    } catch {
      return [];
    }
  });
  cache.set(key, p);
  p.then((photos) => { if (!photos.length && cache.get(key) === p) cache.delete(key); }); // don't remember failures
  return p;
}

type PhotoState = { status: "none" } | { status: "loading" } | { status: "ready"; photos: PlacePhoto[] };

/** Retry delays for a place whose photo could not be loaded (the generated card is shown meanwhile). */
const RETRY_MS = [5000, 20000, 60000];
/** After this long without an answer, stop showing the skeleton and show the generated card (the photo still swaps in when it arrives). */
const SKELETON_MS = 4500;

export interface PhotoResult { state: PhotoState; /** Ask again, skipping caches: the current image link stopped working. */ refresh: () => void }

/** Owner photo if the place has one, else Google's (when it has a checked listing and `enabled`), else nothing. */
export function usePlacePhotos(place: Place, n: number, w: number, enabled: boolean): PhotoResult {
  const initial = (): PhotoState =>
    place.photo ? { status: "ready", photos: [{ uri: place.photo, author: "", authorUri: null }] } : hasGoogleListing(place.id) ? { status: "loading" } : { status: "none" };
  const [state, setState] = useState<PhotoState>(initial);
  const [bump, setBump] = useState(0);
  const freshNext = useRef(false);

  useEffect(() => {
    setState(initial());
    if (place.photo || !hasGoogleListing(place.id) || !enabled) return;
    let live = true;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const slow = setTimeout(() => live && setState((s) => (s.status === "loading" ? { status: "none" } : s)), SKELETON_MS);
    const attempt = (i: number) => {
      const fresh = freshNext.current;
      freshNext.current = false;
      loadPhotos(place.id, n, w, fresh).then((photos) => {
        if (!live) return;
        if (photos.length) return setState({ status: "ready", photos });
        setState({ status: "none" });
        if (i < RETRY_MS.length) retry = setTimeout(() => live && attempt(i + 1), RETRY_MS[i]);
      });
    };
    attempt(0);
    return () => {
      live = false;
      clearTimeout(slow);
      clearTimeout(retry);
    };
  }, [place.id, place.photo, n, w, enabled, bump]);

  return { state, refresh: () => { freshNext.current = true; setBump((b) => b + 1); } };
}

/** True once the element is near the viewport (and stays true), so off-screen cards never trigger a photo request. */
export function useNearViewport<T extends Element>(): [preact.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const el = ref.current;
    if (near || !el) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && (setNear(true), io.disconnect()), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  return [ref, near];
}
