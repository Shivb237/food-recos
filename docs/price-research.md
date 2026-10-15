# Price research (October 2026)

Method: for each place, the price of a typical **veg main meal for one person on the delivery menu** (Swiggy/Zomato), because ordering prices differ from dining-out prices. Bands: **Budget** under ₹200, **Mid-range** ₹200–349, **Premium** ₹350 and up.

- `menu` = found on a Swiggy/Zomato menu (sometimes another outlet of the same brand).
- `estimate` = inferred from average-cost figures, dine-in prices or other cities. **Please check these.** Edit `mealPrice`, `priceSource` and `priceConfidence` in `data/places.json`, then set `priceBand`, `priceTier` and, for Budget/Mid-range/Premium places, `section` to match; `npm run validate` tells you what disagrees.
- Prices are menu prices before tax, packaging and delivery. The site shows only the price, never the dish.

| Place | Section | Meal price | Band | Confidence | Source |
|---|---|---|---|---|---|
| Salt | Premium | ₹450 | premium | estimate | Dine-in about ₹1,400–1,600 for two; delivery menu prices not found |
| Pikadili | Best offers & taste | ₹400 | premium | estimate | No delivery menu found; dine-in about ₹1,500 for two points to premium |
| ITC Aashirvaad Soul Creations | Premium | ₹400 | premium | estimate | Hyderabad prices not found; same-brand veg thalis ₹297–447 in other cities, and about ₹400–500 by Shivang's orders |
| Punjabi Affair | Premium | ₹350 | premium | menu | Veg thali about ₹350; Zomato delivery menu (Kondapur) veg mains ₹359–469 |
| Vedham Pure Vegetarian | New to try | ₹350 | premium | estimate | No delivery menu found; dine-in ₹800–1,100 for two points to premium |
| Haldiram's | Best offers & taste | ₹349 | mid | menu | Zomato delivery menu, another Hyderabad outlet: veg thali ₹349 |
| 1881 Dum House: Lucknow's Legacy | Best offers & taste | ₹330 | mid | estimate | No veg menu prices found; typical premium-biryani pricing |
| Biryani By Kilo | Best offers & taste | ₹319 | mid | estimate | No Hyderabad menu found; single paneer biryani is ₹319 at other outlets |
| The Punjabis Swag | Mid-range | ₹300 | mid | estimate | No menu prices found; about ₹500–550 for two dining in |
| Norfest – The Dhaba | Mid-range | ₹299 | mid | estimate | Gachibowli outlet delivery menu: veg thali ₹299; the Manikonda outlet lists larger thalis from ₹709 |
| Harvest Salad Co | Healthy | ₹299 | mid | menu | Zomato delivery menu: veg bowls ₹299 |
| Lo! Low Carb and Keto Foods | Healthy | ₹299 | mid | estimate | No Hyderabad menu found; keto meals ₹289–339 at other cities' outlets |
| Greens & More | Healthy | ₹290 | mid | menu | Zomato delivery menu, Hitech City outlet: salads and bowls ₹290–320 |
| The Kulcha Kulture | Best offers & taste | ₹280 | mid | estimate | Mini kulcha thali exists but price not found; about ₹450 for two dining in |
| Protein Ka Tadka | New to try | ₹280 | mid | estimate | No menu prices found; ₹200–400 per person on Google |
| California Burrito | Healthy | ₹279 | mid | menu | Zomato delivery menu, nearby outlets: veg rice bowl ₹249–279 |
| Bihari Bowl | Best offers & taste | ₹270 | mid | estimate | No Hyderabad menu found; Bihari Bowl bowls in Chennai/Pune are ₹259–271 |
| Home Plate by EatFit | Healthy | ₹262 | mid | menu | Zomato delivery menu, another Hyderabad outlet: veg thali ₹262 |
| Rajthali | Best offers & taste | ₹260 | mid | menu | Zomato delivery menu (Jubilee Hills): meal boxes ₹180–340, middle of the range |
| Box8 | Mid-range | ₹259 | mid | menu | Zomato delivery menu, other Hyderabad outlets: paneer mini meal ₹259, thali ₹279–329 |
| Millet Express | Best offers & taste | ₹229 | mid | menu | Zomato delivery menu (Manikonda): veg khichdi ₹229, paneer ₹249 |
| Amritsari Aangan | Mid-range | ₹219 | mid | menu | Zomato delivery menu (Narsingi/Gandipet outlet): veg rice thali ₹219 |
| Great Indian Khichdi by EatFit | Healthy | ₹209 | mid | menu | Zomato delivery menu (Gachibowli): dal makhani chawal ₹209 |
| MOJO Pizza – 2X Toppings | New to try | ₹199 | budget | estimate | Items from ₹99; no pizza menu prices found; about ₹150 per order |
| Mealful Rolls | Best offers & taste | ₹198 | budget | menu | Zomato delivery menu: pack of 2 big rolls ₹198 |
| ATH – All Things Healthy | Healthy | ₹190 | budget | estimate | Zomato average about ₹150 per order; no full menu found |
| Taara Kitchen | New to try | ₹190 | budget | estimate | Under ₹200 per person; same-address Taram Kitchen is about ₹200 per order |
| Oye Punjabi | New to try | ₹190 | budget | estimate | About ₹200 for two; no delivery menu prices found |
| Punjabi Paratha Junction | Budget | ₹180 | budget | estimate | About ₹300 for two; no menu prices found |
| JDM Punjabi Dhaba | Budget | ₹170 | budget | menu | Zomato delivery menu (Gachibowli): veg thali ₹160, paneer meal ₹170 |
| Rolls Mania | Budget | ₹170 | budget | estimate | No Hyderabad menu found; average about ₹350 for two |
| Raju Gari Biryani | Best offers & taste | ₹165 | budget | menu | Zomato delivery menu, other Hyderabad outlets: paneer biryani ₹165, veg dum biryani ₹149 |
| Udupis Upahar | Budget | ₹160 | budget | estimate | No meal prices found; about ₹300 for two |
| Amrutham Pure Vegetarian | New to try | ₹160 | budget | estimate | Under ₹200 per person; no delivery menu found |
| Chai Chakhna Company | Best offers & taste | ₹150 | budget | estimate | Zomato average about ₹150 per order; no full menu found |
| Meal O Clock Pure Veg | Best offers & taste | ₹150 | budget | estimate | Zomato average about ₹100 per order; mini veg thali on menu, price not found |
| Sai Bihari Dhaba | Budget | ₹150 | budget | estimate | Zomato average about ₹150 per order; no menu found |
| Bihari Dhaba | Budget | ₹150 | budget | estimate | About ₹200 for two; no delivery menu prices found |
| Balle Balle Punjabi | Budget | ₹150 | budget | estimate | Zomato average about ₹100 per order; no menu prices found |
| Suruchi Tiffin Room (STR) | New to try | ₹150 | budget | estimate | Under ₹200 per person; no delivery menu found |
| Sai Deeksha Tiffins and Snacks | New to try | ₹150 | budget | estimate | Under ₹200 per person; no delivery menu found |
| Vaishnavi Tiffin Centre | New to try | ₹150 | budget | estimate | About ₹200 for two; no menu found |
| Varalakshmi Tiffins | New to try | ₹140 | budget | menu | Zomato delivery menu (Gachibowli): dosas ₹109–179, idly ₹115–149 |
| Manakamana Kitchen | Special mentions | ₹100 | budget | estimate | Sells rotis, not full meals; no menu found |
| Tadka Treats | Best offers & taste | n/a | - | - | No price data found |
| Vellanki Foods | Special mentions | n/a | - | - | No price data found |

## Moved between sections

- Amritsari Aangan: Premium to Mid-range
- The Punjabis Swag: Premium to Mid-range
- Norfest – The Dhaba: Premium to Mid-range (estimate; the Manikonda outlet lists much larger thalis from ₹709)
- Box8: Budget to Mid-range

Places in Best offers, Healthy, Special mentions and New to try keep their section and just show their band.
