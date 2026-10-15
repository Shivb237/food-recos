import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Mood, Place } from "../shared/types";
import { moods, places, placeById, sectionById, sections } from "./data";
import { StickerDefs } from "./cards/stickers";
import { Hero, PickCard } from "./components/Hero";
import { ListView, type ListProps } from "./components/ListView";
import { MoodTiles } from "./components/MoodTiles";
import { PersonalRow, SectionBlock } from "./components/Blocks";
import { PlaceDetail, RollingView, SheetShell } from "./components/Sheet";
import { burstAt, reducedMotion } from "./lib/fx";
import { pickRandom } from "./lib/pick";
import { type HistoryState, type Route, useLocationState } from "./lib/router";
import { buildIndex, searchPlaces } from "./lib/search";
import { clearRecent, useRecent, useSaved } from "./lib/storage";
import { toast, useToast } from "./lib/toast";
import { startSocial, useSocial } from "./lib/social";
import { SayingFeed } from "./components/Social";
import { MOOD_CREDITS, pexelsPage } from "./moodCredits";
import "./styles/app.css";

const SITE = "Shivang's Manikonda Picks";

interface PickState {
  /** The place currently flashing by while shuffling; null once landed. */
  rolling: Place | null;
  landed: boolean;
}

export function App() {
  const { loc, go, closeSheet } = useLocationState();
  const saved = useSaved();
  const recent = useRecent();
  const social = useSocial();
  useEffect(() => startSocial(), []);
  const toastMsg = useToast();
  const index = useMemo(() => buildIndex(places, moods, sections), []);
  const moodCounts = useMemo(
    () => Object.fromEntries(moods.map((m) => [m.id, places.filter((p) => p.moods.includes(m.id)).length])),
    [],
  );

  const locRef = useRef(loc);
  locRef.current = loc;
  const homeScroll = useRef(0);
  const lastPick = useRef<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [pick, setPick] = useState<PickState | null>(null);

  const place = loc.place ? placeById.get(loc.place) ?? null : null;
  const sheetOpen = !!place || !!pick?.rolling;

  // ---- navigation ----
  const navigate = (route: Route) => {
    if (locRef.current.route.view === "home") homeScroll.current = scrollY;
    go({ route, place: null }, "push", { nav: true });
  };
  const goHome = () => go({ route: { view: "home" }, place: null }, "replace", {});
  const back = () => ((history.state as HistoryState | null)?.nav ? history.back() : goHome());
  const openPlace = (p: Place) => go({ route: locRef.current.route, place: p.id }, "push", { sheet: true });

  const routeKey = JSON.stringify(loc.route.view === "search" ? { view: "search" } : loc.route);
  useLayoutEffect(() => {
    scrollTo(0, loc.route.view === "home" ? homeScroll.current : 0);
  }, [routeKey]);

  // Unknown ?p= slug: drop it.
  useEffect(() => {
    if (loc.place && !placeById.has(loc.place)) go({ route: loc.route, place: null }, "replace", {});
  }, [loc.place]);

  // ---- pick for me ----
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  useEffect(() => clearTimers, []);

  // The Back button during the shuffle, or after closing a landed pick, ends the pick.
  useEffect(() => {
    if (!loc.place && pick && !(history.state as HistoryState | null)?.sheet) {
      clearTimers();
      setPick(null);
    }
  }, [loc.place]);

  const runPick = (pool: Place[], fresh: boolean) => {
    const winner = pickRandom(pool, lastPick.current);
    if (!winner) return toast("Nothing open to pick from here");
    lastPick.current = winner.id;
    clearTimers();
    const route = locRef.current.route;
    go({ route, place: null }, fresh ? "push" : "replace", { sheet: true });

    const land = () => {
      setPick({ rolling: null, landed: true });
      go({ route: locRef.current.route, place: winner.id }, "replace", { sheet: true });
      setTimeout(() => {
        const m = document.querySelector(".sheet .media");
        burstAt(m, { n: 110, spread: 1.3 });
        setTimeout(() => burstAt(m, { n: 40, spread: 0.7 }), 160);
      }, 120);
    };
    if (reducedMotion()) return land();
    let k = 0;
    const tick = () => {
      if (k >= 16) return land();
      setPick({ rolling: pool[Math.floor(Math.random() * pool.length)]!, landed: false });
      k++;
      timers.current.push(setTimeout(tick, 40 + k * 12));
    };
    tick();
  };

  const onSheetClose = () => {
    clearTimers();
    setPick(null);
    closeSheet();
  };

  // ---- list view props ----
  const route = loc.route;
  let list: ListProps | null = null;
  let docTitle = SITE;
  if (route.view === "mood") {
    const m = moods.find((x) => x.id === route.id);
    const items = places.filter((p) => p.moods.includes(route.id));
    docTitle = `${m?.label ?? "Mood"} · ${SITE}`;
    list = {
      title: m?.label ?? "Not found", places: items, sections, grouped: true,
      chips: { moods, active: route.id, onSelect: (id) => go({ route: { view: "mood", id }, place: null }, "replace", { nav: true }) },
      onBack: back, onOpen: openPlace, onPick: (pool) => runPick(pool, true),
    };
  } else if (route.view === "section") {
    const s = sectionById[route.id as keyof typeof sectionById];
    const items = places.filter((p) => p.section === route.id);
    docTitle = `${s?.title ?? "Section"} · ${SITE}`;
    list = { title: s?.title ?? "Not found", sub: s?.sub, places: items, sections, grouped: false, onBack: back, onOpen: openPlace, onPick: (pool) => runPick(pool, true) };
  } else if (route.view === "search") {
    const items = searchPlaces(index, route.q);
    docTitle = `Search · ${SITE}`;
    list = {
      title: "Search", places: items, sections, grouped: !route.q.trim(),
      search: {
        q: route.q,
        onChange: (q) => go({ route: { view: "search", q }, place: null }, "replace", (history.state as HistoryState | null) ?? {}),
        suggestions: moods,
        onSuggest: (m) => go({ route: { view: "search", q: m.short }, place: null }, "replace", (history.state as HistoryState | null) ?? {}),
      },
      onBack: back, onOpen: openPlace, onPick: (pool) => runPick(pool, true),
    };
  }
  useEffect(() => { document.title = place ? `${place.name} · ${SITE}` : docTitle; }, [docTitle, place]);

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(scrollY > 8);
    addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, []);

  const lovedPlaces = Object.entries(social.likes).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([id]) => placeById.get(id)).filter((p): p is Place => !!p);
  const savedPlaces = saved.map((id) => placeById.get(id)).filter((p): p is Place => !!p);
  const recentPlaces = recent.map((id) => placeById.get(id)).filter((p): p is Place => !!p && !saved.includes(p.id)).slice(0, 8);

  return (
    <>
      <StickerDefs />
      <div id="main-root">
        <header class={`topbar ${scrolled ? "scrolled" : ""}`}>
          <div class={`wrap ${route.view === "home" ? "" : "wide"}`}>
            <button class="brand" type="button" onClick={() => { if (route.view !== "home") goHome(); else scrollTo({ top: 0, behavior: reducedMotion() ? "auto" : "smooth" }); }} title="Back to home">
              <i aria-hidden="true">S</i>Shivang's picks
            </button>
          </div>
        </header>

        <div class={`wrap ${route.view === "home" ? "" : "wide"}`}>
          <main>
            {list ? (
              <ListView {...list} />
            ) : (
              <>
                <Hero count={places.length} onSearch={() => navigate({ view: "search", q: "" })} />
                <section class="block" aria-labelledby="moods-h">
                  <header class="phead"><div><h2 id="moods-h">What are you craving?</h2></div></header>
                  <MoodTiles moods={moods} counts={moodCounts} onPick={(m: Mood) => navigate({ view: "mood", id: m.id })} />
                  <PickCard onPick={() => runPick(places, true)} />
                </section>
                {social.status === "ready" && lovedPlaces.length > 0 && <PersonalRow title="Most loved" sub="What people here are liking." places={lovedPlaces} onOpen={openPlace} />}
                {social.status === "ready" && <SayingFeed items={social.recent} onOpen={openPlace} />}
                {savedPlaces.length > 0 && <PersonalRow title="Saved by you" sub="Your shortlist, on this device." places={savedPlaces} onOpen={openPlace} />}
                {recentPlaces.length > 0 && <PersonalRow title="Recently viewed" places={recentPlaces} onOpen={openPlace} action={{ label: "Clear", run: clearRecent }} />}
                {sections.map((s) => {
                  const items = places.filter((p) => p.section === s.id);
                  return <SectionBlock key={s.id} section={s} places={items} onOpen={openPlace} onSeeAll={() => navigate({ view: "section", id: s.id })} />;
                })}
              </>
            )}
          </main>
          <footer class="footer">
            <b>Curated by Shivang · Manikonda, Hyderabad</b>
            <span>Ratings are from Google Maps unless marked Swiggy. Prices from Google, Swiggy or EazyDiner, October 2026. They change, so check the app.</span>
            <span>Photos are from Google Maps contributors, shown with their credit, or are generated for places without one.</span>
            <span>Green mark: pure veg. Green and brown: serves veg and non-veg. "Veg options": veg dishes available, not confirmed pure veg.</span>
            <span class="credits">
              Mood photos from Pexels: {MOOD_CREDITS.map((c, i) => (
                <span key={c.mood}>{i > 0 && ", "}<a href={pexelsPage(c.id)} target="_blank" rel="noopener">{c.by}</a></span>
              ))}.
            </span>
          </footer>
        </div>
      </div>

      {sheetOpen && (
        <SheetShell onClose={onSheetClose} labelledBy="sheet-title">
          {pick?.rolling ? (
            <RollingView current={pick.rolling} />
          ) : place ? (
            <PlaceDetail
              place={place}
              label={pick?.landed && lastPick.current === place.id ? "Tonight, try" : null}
              onAgain={pick?.landed && lastPick.current === place.id ? () => runPick(places, false) : undefined}
            />
          ) : null}
        </SheetShell>
      )}

      {toastMsg && <div class="toast" role="status">{toastMsg}</div>}
    </>
  );
}
