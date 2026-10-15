import { useEffect, useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import type { Place } from "../../shared/types";
import { sectionById } from "../data";
import { IconBookmark, IconClose, IconExternal, IconPin, IconShare, IconShuffle } from "./Icons";
import { PlaceMedia } from "./PlaceMedia";
import { VegBadge } from "./VegBadge";
import { hasRealZomato, swiggyLink, zomatoLink } from "../lib/links";
import { burstAt, reducedMotion } from "../lib/fx";
import { pushRecent, toggleSaved, useSaved } from "../lib/storage";
import { toast } from "../lib/toast";
import { Comments, SocialBar } from "./Social";
import { setLike, useSocial } from "../lib/social";

const FOCUSABLE = 'a[href],button:not([disabled]),input,[tabindex]:not([tabindex="-1"])';

/** Bottom sheet: scrim, focus trap, Esc, swipe down to close. The page behind is made inert. */
export function SheetShell({ onClose, labelledBy, children }: { onClose: () => void; labelledBy: string; children: ComponentChildren }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const closing = useRef(false);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    setShown(false);
    setTimeout(onClose, reducedMotion() ? 0 : 260);
  };

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const main = document.getElementById("main-root");
    main?.setAttribute("inert", "");
    document.body.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    const focus = setTimeout(() => ref.current?.querySelector<HTMLElement>(".sclose")?.focus({ preventScroll: true }), 60);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(focus);
      main?.removeAttribute("inert");
      document.body.style.overflow = "";
      if (before && document.contains(before)) before.focus({ preventScroll: true });
    };
  }, []);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") return close();
    if (e.key !== "Tab") return;
    const items = [...(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter((el) => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0]!, last = items[items.length - 1]!;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  // Swipe down from the top of the sheet to close.
  const drag = useRef<{ y: number; dy: number } | null>(null);
  const onTouchStart = (e: TouchEvent) => {
    const sheet = ref.current;
    if (!sheet || sheet.scrollTop > 0 || (e.target as HTMLElement).closest("a,button,input")) return;
    drag.current = { y: e.touches[0]!.clientY, dy: 0 };
    sheet.style.transition = "none";
  };
  const onTouchMove = (e: TouchEvent) => {
    if (!drag.current || !ref.current) return;
    drag.current.dy = Math.max(0, e.touches[0]!.clientY - drag.current.y);
    ref.current.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const onTouchEnd = () => {
    if (!drag.current || !ref.current) return;
    const { dy } = drag.current;
    drag.current = null;
    ref.current.style.transition = "";
    ref.current.style.transform = "";
    if (dy > 110) close();
  };

  return (
    <>
      <div class={`scrim ${shown ? "on" : ""}`} onClick={close} />
      <div
        ref={ref}
        class={`sheet ${shown ? "on" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onKeyDown={onKey}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div class="grab" aria-hidden="true" />
        <button class="sclose" type="button" onClick={close} aria-label="Close"><IconClose /></button>
        {children}
      </div>
    </>
  );
}

export function shareUrl(place: Place) {
  return `${location.origin}/?p=${place.id}`;
}

async function share(place: Place) {
  const url = shareUrl(place);
  const data = { title: place.name, text: `${place.name}: Shivang's pick near Manikonda`, url };
  try {
    if (navigator.share) return void (await navigator.share(data));
    await navigator.clipboard.writeText(url);
    toast("Link copied");
  } catch (e) {
    if ((e as DOMException)?.name !== "AbortError") toast("Couldn't share that. Copy the page link instead.");
  }
}

export function PlaceDetail({ place, label, onAgain }: { place: Place; label?: string | null; onAgain?: () => void }) {
  const saved = useSaved().includes(place.id);
  const social = useSocial();
  const section = sectionById[place.section];
  const lastTap = useRef(0);
  const tapLike = (e: TouchEvent) => {
    if ((e.target as HTMLElement).closest("a,button,.slides")) return;
    const t = Date.now();
    if (t - lastTap.current < 320) {
      e.preventDefault();
      doubleTapLike(place.id, social.status === "ready");
      lastTap.current = 0;
    } else lastTap.current = t;
  };
  useEffect(() => pushRecent(place.id), [place.id]);

  return (
    <div class="detail" style={{ "--c": `var(--c-${place.section})`, "--s": `var(--s-${place.section})` } as Record<string, string>}>
      <div class="likezone" onDblClick={() => doubleTapLike(place.id, social.status === "ready")} onTouchEnd={tapLike}>
        <PlaceMedia place={place} wide artOnly gallery />
        <div class="burst" id="burst" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" /></svg></div>
      </div>
      {label && <div class="slabel">{label}</div>}
      <h2 class="sname" id="sheet-title">{place.name}</h2>
      <div class="sline">
        <VegBadge veg={place.veg} />
        {place.cuisine && <span>{place.cuisine}</span>}
        <span class="secpill">{section.title}</span>
      </div>

      <SocialBar place={place} />

      {place.closed && <div class="sflag closed"><b>Check the app first</b>{place.flag}</div>}

      {(place.rating || place.price) && (
        <div class="facts">
          {place.rating && (
            <div class="fact"><span>Rating · {place.rating.source}</span><b>{place.rating.value.toFixed(1)} ★</b> <small>({place.rating.count})</small></div>
          )}
          {place.price && <div class="fact"><span>Price</span><b>{place.price}</b></div>}
        </div>
      )}
      {place.note && <p class="snote">{place.note}</p>}
      {place.flag && !place.closed && <div class="sflag"><b>Good to know</b>{place.flag}</div>}

      <div class="actions">
        <a class="cta sw" href={swiggyLink(place)} target="_blank" rel="noopener">Order on Swiggy</a>
        <a class="cta zo" href={zomatoLink(place)} target="_blank" rel="noopener">Order on Zomato</a>
        {!hasRealZomato(place) && <p class="linknote">Zomato opens a search for this place.</p>}
        {onAgain && <button class="cta again" type="button" onClick={onAgain}><IconShuffle />Pick another</button>}
        <div class="subactions">
          <button
            class="subbtn"
            type="button"
            aria-pressed={saved}
            onClick={(e) => {
              const on = toggleSaved(place.id);
              toast(on ? "Saved to your list" : "Removed from your list");
              if (on) burstAt(e.currentTarget, { n: 18, spread: 0.8 });
            }}
          >
            <IconBookmark filled={saved} />{saved ? "Saved" : "Save for later"}
          </button>
          <button class="subbtn" type="button" onClick={() => share(place)}><IconShare />Share</button>
          {place.googleMapsUrl && <a class="subbtn" href={place.googleMapsUrl} target="_blank" rel="noopener"><IconPin />Map<IconExternal /></a>}
        </div>
      </div>
      <Comments place={place} />
    </div>
  );
}

/** Double-tap the picture: heart burst, and a like (never an un-like, like Instagram). */
function doubleTapLike(id: string, enabled: boolean) {
  if (!enabled) return;
  const b = document.getElementById("burst");
  if (b && !reducedMotion()) {
    b.classList.remove("go");
    void b.offsetWidth;
    b.classList.add("go");
  }
  burstAt(document.querySelector(".likezone"), { n: 22, hearts: true, spread: 1.6, up: 0.7 });
  void setLike(id, true);
}

/** What the sheet shows while the pick shuffles. */
export function RollingView({ current }: { current: Place }) {
  return (
    <div class="detail rolling">
      <PlaceMedia place={current} wide />
      <div class="slabel">Picking for you…</div>
      <h2 class="sname" id="sheet-title">{current.name}</h2>
    </div>
  );
}
