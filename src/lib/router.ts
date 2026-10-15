import { useCallback, useEffect, useState } from "preact/hooks";

export type Route =
  | { view: "home" }
  | { view: "mood"; id: string }
  | { view: "section"; id: string }
  | { view: "search"; q: string };

export interface Loc {
  route: Route;
  /** Slug of the place whose sheet is open (deep link: ?p=slug). */
  place: string | null;
}

export function parseLocation(pathname: string, search: string): Loc {
  const params = new URLSearchParams(search);
  const place = params.get("p");
  const parts = pathname.split("/").filter(Boolean);
  let route: Route = { view: "home" };
  if (parts[0] === "mood" && parts[1]) route = { view: "mood", id: decodeURIComponent(parts[1]) };
  else if (parts[0] === "section" && parts[1]) route = { view: "section", id: decodeURIComponent(parts[1]) };
  else if (parts[0] === "search") route = { view: "search", q: params.get("q") ?? "" };
  return { route, place: place && /^[a-z0-9-]+$/.test(place) ? place : null };
}

export function buildUrl({ route, place }: Loc): string {
  const params = new URLSearchParams();
  let path = "/";
  if (route.view === "mood") path = `/mood/${encodeURIComponent(route.id)}`;
  else if (route.view === "section") path = `/section/${encodeURIComponent(route.id)}`;
  else if (route.view === "search") {
    path = "/search";
    if (route.q) params.set("q", route.q);
  }
  if (place) params.set("p", place);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export const sameRoute = (a: Route, b: Route) => JSON.stringify(a) === JSON.stringify(b);

export interface HistoryState {
  /** True when the sheet was opened by a push, so closing it can simply go back. */
  sheet?: boolean;
  /** True when the app pushed this entry, so its Back button can simply go back. */
  nav?: boolean;
}

/** Location state backed by the History API: the sheet and list views each get a back-button step. */
export function useLocationState() {
  const read = () => parseLocation(location.pathname, location.search);
  const [loc, setLoc] = useState<Loc>(read);

  useEffect(() => {
    const onPop = () => setLoc(read());
    addEventListener("popstate", onPop);
    return () => removeEventListener("popstate", onPop);
  }, []);

  const go = useCallback((next: Loc, mode: "push" | "replace" = "push", state: HistoryState = {}) => {
    const url = buildUrl(next);
    const same = url === location.pathname + location.search;
    if (mode === "push" && (!same || state.sheet)) history.pushState(state, "", url);
    else if (mode === "replace") history.replaceState(state, "", url);
    setLoc(next);
  }, []);

  const closeSheet = useCallback(() => {
    if ((history.state as HistoryState | null)?.sheet) history.back();
    else go({ route: parseLocation(location.pathname, location.search).route, place: null }, "replace");
  }, [go]);

  return { loc, go, closeSheet };
}
