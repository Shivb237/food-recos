# Research notes (checked 15 Oct 2026)

Ratings, prices and notes per place are in `data/places.json`. This file covers the findings Shivang should know about.

## How ratings were gathered

- Google Maps (via Places search) for places with a findable branch near Manikonda/Gachibowli/Kondapur.
- Swiggy listing pages where Google had no branch (some figures come from the same brand's outlet in another city).
- EazyDiner for Punjabi Affair.
- Delivery-only brands with no listing found have no rating: Bihari Bowl, Chai Chakhna Company, Pikadili, Tadka Treats, Mealful Rolls, Greens & More, ATH, California Burrito, Great Indian Khichdi, Home Plate, Sai Bihari Dhaba, Bihari Dhaba, Punjabi Paratha Junction, Balle Balle Punjabi, Box8, Rolls Mania, Manakamana Kitchen.

## Segment conflicts (superseded Oct 2026 by the price bands in `docs/price-research.md`)

- **Rajthali** (Best offers): priced like premium, ₹400–600 per person on Google.
- **ITC Aashirvaad Soul Creations** (Premium): Swiggy lists ₹500 for two, so mid-range.
- **Biryani By Kilo** (Best offers): ₹700 for two, pricier than its section.
- **Harvest Salad Co** (Healthy): ₹700 for two, salads ₹329–399.
- **Millet Express** (Best offers): ₹200 for two and millet-based, so it fits Budget/Healthy too; has some egg/chicken items.
- **California Burrito** (Healthy): only bowls/salads are really healthy.
- **Punjabi Affair** (Premium): ₹800 for two fits, but only 4 EazyDiner reviews (avg 2.8).
- **Raju Gari Biryani:** Google 3.5 (611 reviews); reviews mention inconsistent quality.
- **Norfest – The Dhaba:** Google marks the Manikonda dine-in outlet permanently closed.

## New veg-friendly suggestions added (Google ratings)

Amrutham Pure Vegetarian 4.7 (1,195), Suruchi Tiffin Room 4.8 (111), Sai Deeksha Tiffins 4.8 (282), Taara Kitchen 4.3 (2,161), Vaishnavi Tiffin Centre 4.2 (2,869), Varalakshmi Tiffins 4.1 (1,298), Vedham Pure Vegetarian 4.5 (2,445), Oye Punjabi 4.3 (224), Protein Ka Tadka 4.8 (60), MOJO Pizza 4.8 (400).

## Link formats

- Swiggy: `https://www.swiggy.com/search?query=<name>`.
- Zomato blocks automated access, so the artifact used a Google search scoped to zomato.com. On a self-hosted site, consider storing each place's real Zomato/Swiggy URL in places.json once Shivang confirms them.
- Google Maps: `https://maps.google.com/maps?cid=<cid>` where known; the Places API returns `googleMapsUri` for the rest.

## Sources

- Google Maps Platform pricing: https://developers.google.com/maps/billing-and-pricing/pricing
- Place Photos (New): https://developers.google.com/maps/documentation/places/web-service/place-photos
- Swiggy listings: ITC Aashirvaad Soul Creations, 1881 Dum House, Biryani By Kilo, Harvest Salad Co, Lo! Foods, Millet Express
- EazyDiner: Punjabi Affair (Kondapur)
