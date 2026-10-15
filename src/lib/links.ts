import type { Place } from "../../shared/types";

export const swiggyLink = (p: Place) =>
  p.swiggyUrl ?? `https://www.swiggy.com/search?query=${encodeURIComponent(p.searchName)}`;

// Zomato blocks automated lookups, so until a real URL is stored this is a search scoped to zomato.com.
export const zomatoLink = (p: Place) =>
  p.zomatoUrl ?? `https://www.google.com/search?q=${encodeURIComponent(`${p.searchName} Hyderabad site:zomato.com`)}`;

export const hasRealZomato = (p: Place) => !!p.zomatoUrl;
