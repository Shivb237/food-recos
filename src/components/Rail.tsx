import { useEffect, useRef, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import { IconArrow } from "./Icons";
import { reducedMotion } from "../lib/fx";

/** Horizontal scroller with snap points; arrow buttons show only for mouse users. */
export function Rail({ children, label }: { children: ComponentChildren; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const sync = () => {
    const el = ref.current;
    if (el) setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  };
  useEffect(() => {
    sync();
    addEventListener("resize", sync);
    return () => removeEventListener("resize", sync);
  }, []);

  const scroll = (dir: 1 | -1) =>
    ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: reducedMotion() ? "auto" : "smooth" });

  return (
    <div class="railwrap">
      <button class="arrow prev" type="button" aria-label={`${label}: scroll left`} disabled={edge.start} onClick={() => scroll(-1)}><IconArrow dir="left" /></button>
      <div class="rail" ref={ref} onScroll={sync} role="list" aria-label={label}>{children}</div>
      <button class="arrow next" type="button" aria-label={`${label}: scroll right`} disabled={edge.end} onClick={() => scroll(1)}><IconArrow dir="right" /></button>
    </div>
  );
}
