# Price research (October 2026)

Method: for each place, the price of a typical **veg main meal for one person on the delivery menu** (Swiggy/Zomato), because ordering prices differ from dining-out prices. Bands: **Budget** under ₹200, **Mid-range** ₹200–349, **Premium** ₹350 and up.

- `menu` = found on a Swiggy/Zomato menu (sometimes another outlet of the same brand).
- `estimate` = inferred from average-cost figures, dine-in prices or other cities. **Please check these.** Edit `mealPrice`, `priceSource` and `priceConfidence` in `data/places.json`, then set `priceBand`, `priceTier` and, for Budget/Mid-range/Premium places, `section` to match; `npm run validate` tells you what disagrees.
- Prices are menu prices before tax, packaging and delivery. The site shows only the price, never the dish.

The per-place table (price, band, confidence, source) is generated from `data/places.json`, so it can never disagree with the site. Print it with:

```bash
npm run docs:prices
```

## Moved between sections

- Amritsari Aangan: Premium to Mid-range
- The Punjabis Swag: Premium to Mid-range
- Norfest – The Dhaba: Premium to Mid-range (estimate; the Manikonda outlet lists much larger thalis from ₹709)
- Box8: Budget to Mid-range

Places in Best offers, Healthy, Special mentions and New to try keep their section and just show their band.
