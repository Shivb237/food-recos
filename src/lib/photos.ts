import { useEffect, useRef, useState } from "preact/hooks";
import type { Place } from "../../shared/types";
import { hasGoogleListing } from "./coverage";

export interface PlacePhoto {
  uri: string;
  author: string;
  authorUri: string | null;
}

/** Fetching photos costs money per request, so: one request per (place, size) per visit, at most 4 in flight. */
const cache = new Map<string, Promise<PlacePhoto[]>>();
let active = 0;
const waiting: (() => void)[] = [];
const MAX_PARALLEL = 4;

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

export function loadPhotos(id: string, n: number, w: number): Promise<PlacePhoto[]> {
  const key = `${id}:${n}:${w}`;
  let p = cache.get(key);
  if (!p) {
    p = limited(async () => {
      try {
        const res = await fetch(`/api/photo?id=${encodeURIComponent(id)}&n=${n}&w=${w}`);
        if (!res.ok) return [];
        const body = (await res.json()) as { photos?: PlacePhoto[] };
        return Array.isArray(body.photos) ? body.photos : [];
      } catch {
        return [];
      }
    });
    cache.set(key, p);
  }
  return p;
}

export type PhotoState = { status: "none" } | { status: "loading" } | { status: "ready"; photos: PlacePhoto[] };

/** Owner photo if the place has one, else Google's (when it has a checked listing and `enabled`), else nothing. */
export function usePlacePhotos(place: Place, n: number, w: number, enabled: boolean): PhotoState {
  const initial = (): PhotoState =>
    place.photo ? { status: "ready", photos: [{ uri: place.photo, author: "", authorUri: null }] } : hasGoogleListing(place.id) ? { status: "loading" } : { status: "none" };
  const [state, setState] = useState<PhotoState>(initial);

  useEffect(() => {
    setState(initial());
    if (place.photo || !hasGoogleListing(place.id) || !enabled) return;
    let live = true;
    loadPhotos(place.id, n, w).then((photos) => live && setState(photos.length ? { status: "ready", photos } : { status: "none" }));
    return () => {
      live = false;
    };
  }, [place.id, place.photo, n, w, enabled]);

  return state;
}

/** True once the element is near the viewport (and stays true), so off-screen cards never trigger a photo request. */
export function useNearViewport<T extends Element>(): [preact.RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [near, setNear] = useState(typeof IntersectionObserver === "undefined");
  useEffect(() => {
    const el = ref.current;
    if (near || !el) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && (setNear(true), io.disconnect()), { rootMargin: "300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  return [ref, near];
}
