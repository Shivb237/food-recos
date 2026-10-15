const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": 2.4, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": true } as const;

export const IconSearch = () => <svg {...base}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>;
export const IconBack = () => <svg {...base}><path d="M15 5l-7 7 7 7" /></svg>;
export const IconChevron = () => <svg {...base}><path d="M9 5l7 7-7 7" /></svg>;
export const IconClose = () => <svg {...base}><path d="M6 6l12 12M18 6L6 18" /></svg>;
export const IconShuffle = () => <svg {...base}><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></svg>;
export const IconShare = () => <svg {...base} stroke-width="2.2"><path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 002 2h10a2 2 0 002-2v-5" /></svg>;
export const IconExternal = () => <svg {...base} stroke-width="2.2"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5" /></svg>;
export const IconPin = () => <svg {...base} stroke-width="2.2"><path d="M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>;
export const IconBookmark = ({ filled = false }: { filled?: boolean }) => (
  <svg {...base} stroke-width="2.2" fill={filled ? "currentColor" : "none"}><path d="M6 3h12v18l-6-4.5L6 21z" /></svg>
);
export const IconArrow = ({ dir }: { dir: "left" | "right" }) => <svg {...base} stroke-width="2.6"><path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} /></svg>;
export const IconHeart = ({ filled = false }: { filled?: boolean }) => (
  <svg {...base} stroke-width="2.2" fill={filled ? "currentColor" : "none"}><path d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" /></svg>
);
export const IconComment = () => <svg {...base} stroke-width="2.2"><path d="M20 12a8 8 0 01-11.6 7.1L4 20l1-4.2A8 8 0 1120 12z" /></svg>;
