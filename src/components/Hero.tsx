import { useEffect } from "preact/hooks";
import { IconSearch, IconShuffle } from "./Icons";

const greeting = () => {
  const h = new Date().getHours();
  return h < 11 ? "Good morning" : h < 16 ? "Good afternoon" : h < 22 ? "Good evening" : "Late-night cravings?";
};

/** The hero Shivang loves: drifting colour blobs, greeting, big question. Unchanged in look. */
export function Hero({ onSearch, count }: { onSearch: () => void; count: number }) {
  useEffect(() => {
    document.documentElement.classList.add("intro");
    const t = setTimeout(() => document.documentElement.classList.remove("intro"), 2200);
    return () => clearTimeout(t);
  }, []);
  return (
    <>
      <section class="hero">
        <div class="glow" aria-hidden="true"><i /><i /><i /></div>
        <div class="stamp" aria-hidden="true">Est. Manikonda</div>
        <span class="hello" style={{ "--d": 0 } as Record<string, number>}>{greeting()}</span>
        <h1 style={{ "--d": 1 } as Record<string, number>}>What should you <span>order today?</span></h1>
        <p class="hero-sub" style={{ "--d": 2 } as Record<string, number>}>
          Shivang's go-to places around Manikonda, plus a few he wants to try. {count} spots with ratings, prices and one tap to order.
        </p>
      </section>
      <button class="searchbtn" type="button" onClick={onSearch}><IconSearch />Search a restaurant or cuisine</button>
    </>
  );
}

export function PickCard({ onPick, hint = "One random pick from the list" }: { onPick: () => void; hint?: string }) {
  return (
    <button class="surprise" type="button" onClick={onPick}>
      <span class="die" aria-hidden="true"><IconShuffle /></span>
      <span><strong>Can't decide?</strong><small>{hint}</small></span>
    </button>
  );
}
