# Eugenio Menniti submission - Notes

A restaurant search and discovery POC for the OpenTable scenario, built with Algolia InstantSearch.js.

- **Live demo:** https://algolia-assignment-em.netlify.app/
- **Algolia Application ID:** `HEXO1NDC48`
- **Index:** `restaurants` (single index, geo-ranked; the Popularity/Distance selector only changes the distance grouping of each query)
- **Dashboard access:** provided to Algolia employees.

[![Netlify Status](https://api.netlify.com/api/v1/badges/c97171d9-ec9d-4816-9e27-36e81a27c84f/deploy-status)](https://app.netlify.com/projects/algolia-assignment-em/deploys)

## Contents

1. [Approach](#1-approach)
2. [Features](#2-features)
3. [Data and scripts](#3-data-and-scripts)
4. [Algolia configuration](#4-algolia-configuration)
5. [Settings decisions](#5-settings-decisions)
6. [Relevance test matrices](#6-relevance-test-matrices)
7. [Findings and trade-offs](#7-findings-and-trade-offs)
8. [Limitations and next steps](#8-limitations-and-next-steps)
9. [Notes and disclosures](#9-notes-and-disclosures)

---

## 1. Approach

The POC stays very close to the look and feel of the original mock-up. This is intentional: the goal is an enhanced experience rather than a revolution, so users feel comfortable and familiar immediately. The implemented features are meant to showcase Algolia core capabilities, and other changes can be added gradually.

The project extends the starting project. Some changes were made to support small improvements or to resolve technical issues (the initial technical challenges are listed at the end of `index.js`).

## 2. Features

### Search and results

- Search box with a typing placeholder animation.
- Searchable by cuisine, city, neighborhood and name.
- Infinite hits with a "Show more" button instead of pagination: users compare options and jump quickly from one to another.
- Cards show name, cuisine, price,, rating with review count, neighborhood, and the city only when it is not already part of the neighborhood (very common in the dataset).
- Empty-state message when there are no results.
- All image URLs in the dataset are invalid. The UI shows a default plate icon; valid URLs would be displayed automatically if the dataset is fixed.

### Filters

| Filter | Notes |
| --- | --- |
| Cuisine | Searchable facet. The frontend orders values by popularity, so the most common cuisines come first while the full list stays searchable. |
| Price | Same values as the dataset, which are consistent. |
| Rating | Menu filter, to find restaurants approved by other users. |
| Dining style | Shown last, to combine with the other filters. |

Selected filters are shown as refinements and the user can mix and match them while using queries or as standalone search method.

### Sort selector

A `Sort by` control in the filters bar changes the distance grouping using `aroundPrecision` sent with each search to the same index, `restaurants`. The two options use the same ranking configuration.

| Label | `aroundPrecision` | Behavior |
| --- | --- | --- |
| Popularity (default) | Ranges: 0-2, 2-5, 5-10, 10-25, 25-100, 100-500, 500-2000 km, and one beyond 2000 km | Closest range first; inside each range the best `quality_score` ranks first. |
| Distance | 1 m precision | Nearest-first at meter precision; `quality_score` only breaks ties within that precision. |

The values live in `index.js` (`precisionBySort`, applied through `searchFunction`). In a first version a replica of the index was used without `geo` for Popularity: it showed the best restaurants overall, ignoring the user area. It was removed because the results were probably not relevant and the answer "best nearby, then best farther" with one index worked much better. Ranges list trigger an Algolia pagination defect that `index.js` works around on the client, documented in [limitations](#8-limitations-and-next-steps).

### Geolocation and distance

- The user location is first determined from the IP address and used as primary and fallback source. The user can then click a button to use the precise browser location.
- Distance to each restaurant is shown in km on the card (computed with the `geolib` library), and hidden if no location is available.
- Distance only affects ranking, in groups chosen by the sort selector (see above). It is not used to filter results from the UI. See [limitations](#8-limitations-and-next-steps) for the automatic radius applied by Algolia.
- Privacy trade-off: `ipwho.is` receives the user IP for the approximate location, and BigDataCloud receives the coordinates for the place name after GPS permission. If a service or the permission is unavailable, search keeps working.
- The dataset has no restaurants near my location, so four records were edited on purpose to validate geo-ranking and the ranges.

  | Record | Cuisine | `quality_score` | Placed |
  | --- | --- | --- | --- |
  | Barolo Grill (modified geoloc) | Italian | 958 | about 1.5 km from my location |
  | Bistecca Restaurant & Bar (modified geoloc) | Italian | 282 | about 0.3 km from my location |
  | Game Seven Grill (modified geoloc) | Barbecue | 142 | about 5 km from my location |
  | Roma Ristorante (modified geoloc) | Italian | 715 | about 294 km from my location |

  An excellent and a poor restaurant in the same band are ordered by quality, and a very good restaurant in a farther range comes after both.

### Insights

Basic Insights events are enabled: hit views, load more, clicks, and filter interactions. This data can later show which filters are used (and which could be replaced), whether queries return meaningful results, and whether users find what they look for. A reservation would be the natural conversion event in a fuller version.

### Omitted data from the index

Phone, precise address, payment options, reservation URL and postal code are not indexed. They may be useful in a restaurant detail view but are not essential search criteria for this POC.

## 3. Data and scripts

Scripts are stored in `scripts/` and run from the project folder:

| Script | Command | Purpose |
| --- | --- | --- |
| `analyze-dataset.js` | `node .\scripts\analyze-dataset.js` | Checks IDs, duplicates, join completeness and the inputs used by the quality score. Reports the review details and the score range. |
| `import-data.js` | `node .\scripts\import-data.js` | Joins `restaurants_list.json` and `restaurants_info.csv` on `objectID`, selects attributes, adds `quality_score`, and writes to the live index. |
| `quality-score.js` | (module) | Shared scoring formula used by both scripts. |

Admin credentials are read from the local `.env`. The browser only uses a Search-Only key.

The checks could be extended (numeric bounds, format checks, etc.). For now the assumption is that the data respects them, including that the same restaurant does not appear under two `objectID` values.

### `quality_score`

A single number per restaurant, used as the custom ranking:

```text
quality_score = round(1000 * (0.7 * (stars / 5) + 0.3 * min(reviews / cap, 1)))
```

- 70% weight to the star rating, 30% to the number of reviews.
- `cap` is the 90th percentile of `reviews_count` in the dataset, so a few very reviewed restaurants do not dominate.
- Purpose: a 5-star restaurant with 8 reviews should not beat a 4.7-star one with 1,500 reviews.

## 4. Algolia configuration

All settings were changed on the dashboard for fast experimentation. This POC does not follow configuration as code principles.

Settings of the `restaurants` index:

| Setting | Value |
| --- | --- |
| Searchable attributes (in order) | `food_type`, `city`, `neighborhood`, `name` |
| Attributes for faceting | `dining_style`, `searchable(food_type)`, `price_range`, `stars_count` |
| Ranking | typo, geo, words, filters, proximity, attribute, exact, custom |
| Custom ranking | `desc(quality_score)` |
| Typo thresholds | 1 typo from 3 chars, 2 typos from 8 chars |
| Search parameters (frontend) | `aroundLatLng` from the location widget; `aroundPrecision` from the sort selector |

Query rule: when the query contains `in` or `near`, remove those words from the query (this is used for natural language search).

## 5. Settings decisions

Screenshots of the tests (including A/B tests) are not included; decisions and examples are reported below.

- **Address removed from searchable attributes.** In the first iteration the address was searchable, and a query like "New York" matched the address text. Removing it gave more relevant results.
- **Searchable facet only on cuisine.** Price and rating are more likely used as filters. Dining style is not shown on the card, so there would be no highlighting and it would be confusing. If it is added to the card, it should become searchable.
- **Natural language rule.** Queries like "Italian in New York" or "Italian near New York" returned nothing by default. The rule removes `in`/`near`, so cuisine matches `food_type` and the location matches `city`. The rule list could grow from real queries.
- **Typo tolerance.** Queries like "ner york" returned nothing, so the minimum word size for one typo was set to 3. Synonyms could be added later from analytics.
- **Searchable attribute order.** `name` is last to favor users searching for a cuisine in a place, while still matching users who know the name. `city` was moved before `neighborhood` after a test showed that neighborhoods containing a city name (for example "New York New York Hotel & Casino" in Las Vegas) outranked real New York restaurants, see [findings](#7-findings-and-trade-offs).
- **Ranking.** `quality_score` replaces the earlier use of `stars_count` and `reviews_count` as custom ranking. Algolia applies custom ranking only after the textual (and geo) criteria, so it breaks ties, it is not blended with them. `geo` comes second, so distance dominates, and the score only separates restaurants in the same distance group. The group size is therefore the main lever on how much quality matters: it is a search parameter (`aroundPrecision`), not an index setting.
- **One index, two groupings.** An earlier version used a replica without `geo` for Popularity. With `geo` enabled and wide ranges, the same index covers both needs, so the replica was deleted from the dashboard.
- **Geo as the dominant factor.** For a restaurant search it is meaningful. With authentication and an upgraded plan, ranking could be personalized from interactions and bookings.

## 6. Relevance test matrices

The following results were measured with live queries. Distance uses the current `aroundPrecision: 1`; Popularity uses the current range list. Two fixed locations are used:

- **Test location** `43.92,4.8`: the point around which the four test records were placed (see [Geolocation and distance](#geolocation-and-distance)). My location was roughly 160 km away.
- **New York** `40.7128,-74.0060`: a place where the dataset is dense, to show the effect of the ranges.

For Popularity the 5th position was read from a 6-result request, because with a plain `hitsPerPage: 5` request the last slot can hold a repeated record (see [limitations](#8-limitations-and-next-steps)). The frontend avoids this with the workaround described there.

### 6.1 Distance (`aroundPrecision: 1`)

| Test | Query | Top results | Observation |
| --- | --- | --- | --- |
| Exact name | `Tosca Cafe` | Tosca Cafe | Only hit. |
| Partial name | `Tosca` | Il Toscano - Douglaston; Tosca Cafe; Dolcino Trattoria Toscana; Scottadito Osteria Toscana; Via Toscana | 24 hits; the intended restaurant is at rank 2. From New York: Dolcino Trattoria Toscana; Scottadito Osteria Toscana; Tosca Cafe; Il Toscano - Douglaston; Via Toscana. |
| Rule and geo | `ner york` | Somers 202 Restaurant and Grill; Tosca Cafe; New Leaf Restaurant & Bar; Red Rooster Harlem; Corner Social | 717 hits. The explanation is below the table. From New York: Woolworth Tower Kitchen; Dark Horse; Benares - Tribeca; Ecco; Sazon. |
| Typo | `rom risorante` | Roma Ristorante (modified geoloc); A'Roma Ristorante | Both variants recovered. From New York, A'Roma Ristorante leads. |
| Typo | `Tosca Cafee` | Tosca Cafe | One-character insertion recovered. |
| Cuisine | `Italian` | Bistecca Restaurant & Bar (modified geoloc); Barolo Grill (modified geoloc); Roma Ristorante (modified geoloc); Al Dente - Foxwoods Resort Casino; Alta Strada Foxwoods | 854 hits (874 from New York, the aroundRadius has a default limit that I haven't modified). Bistecca (0.3 km, score 282) is closer than Barolo Grill (1.5 km, score 958), so it ranks first. From New York: Ecco; Gigino Trattoria; Roc Restaurant; Max - Tribeca; Giardino D'Oro. |
| City | `New York` | Tosca Cafe; New Leaf Restaurant & Bar; Red Rooster Harlem; Corner Social; Chez Lucienne | 697 hits; all top results are in New York. From New York: Woolworth Tower Kitchen; Dark Horse; Benares - Tribeca; Ecco; Sazon. |
| Natural language | `Italian in New York` | Tosca Cafe; Bettolona; Lido; Isola on Columbus; Cavatappo Grill | 151 hits; Italian restaurants in New York. From New York: Ecco; Gigino Trattoria; Roc Restaurant; Max - Tribeca; Giardino D'Oro. |
| Empty query | *(empty)* | Bistecca Restaurant & Bar (modified geoloc); Barolo Grill (modified geoloc); Game Seven Grill (modified geoloc); Roma Ristorante (modified geoloc); Kanu @ The Whiteface Lodge | 4,812 hits (see the radius limitation). Nearest first. From New York: Woolworth Tower Kitchen; Dark Horse; Benares - Tribeca; Ecco; Sazon. |
| No results | `1234-no-such-restaurant-1234` | none | The empty state is displayed. |

**`ner york` explanation.** The rule removes `near` and also fires on the typo `ner`, so Algolia only searches `york`. `york` matches the prefix of `Yorktown Heights` and `Yorkville`. With a European location, geo places Somers (Yorktown Heights) first; with a New York location, New York restaurants lead. This is the effect of the rule, not of typo correction.

### 6.2 Popularity (bands: 0-2, 2-5, 5-10, 10-25, 25-100, 100-500, 500-2000 km, beyond 2000 km)

From the test location every New York restaurant (about 6,200 km away) falls in the last band, so quality and textual criteria decide among them. The hit counts are the same as in 6.1.

| Test | Query | Top results | Observation |
| --- | --- | --- | --- |
| Exact name | `Tosca Cafe` | Tosca Cafe | Same as Distance. |
| Partial name | `Tosca` | Toscanini; Tosca Cafe; Via Toscana; Il Toscano - Douglaston; Scottadito Osteria Toscana | 24 hits. All in the farthest band, so textual criteria come first: `Toscanini` and `Tosca Cafe` start with the word in `name`; the others have it later. |
| Rule | `ner york` | Somers 202 Restaurant and Grill; Le Bernardin; Marea; Marc Forgione; The NoMad | Same rule effect (`york` only). `york` is the first word of the city `Yorktown Heights`, but the second word of `New York`, so Somers leads; the New York restaurants follow by `quality_score` (scores 930-958). |
| Typo | `rom risorante` | Roma Ristorante (modified geoloc); A'Roma Ristorante | Both recovered; the test record is closer. From New York, Distance puts A'Roma first (closer) while Popularity keeps the quality order (715 vs 712). |
| Typo | `Tosca Cafee` | Tosca Cafe | Same as Distance. |
| Cuisine | `Italian` | Barolo Grill (modified geoloc); Bistecca Restaurant & Bar (modified geoloc); Roma Ristorante (modified geoloc); Vivace Restaurant; Iozzo's Garden of Italy | 854 hits. The two test records in the first band (Bistecca has score 282) precede Roma (100-500 km band, 715), which precedes the best Italian restaurants of the farthest band (958). |
| City | `New York` | Le Bernardin; Marea; Marc Forgione; The NoMad; Beauty and Essex | 697 hits; all in New York, ordered by quality (scores 930-958). Before moving `city` ahead of `neighborhood`, two non-New York records led (see the findings). |
| Natural language | `Italian in New York` | Marea; Peasant; Crispo; Lattanzi; Lincoln Ristorante | 151 hits, all in New York, ordered by quality (scores 916-944). |
| Empty query | *(empty)* | Barolo Grill (modified geoloc); Bistecca Restaurant & Bar (modified geoloc); Game Seven Grill (modified geoloc); Roma Ristorante (modified geoloc); Russell's Steaks, Chops, and More | 4,812 hits (see the radius limitation). One test record per band (0-2, 0-2, 5-10 and 100-500 km), then the best restaurants of the farthest band (scores 972-986). |
| No results | `1234-no-such-restaurant-1234` | none | The empty state is displayed. |

From New York, the two options now differ even in this dense area: Distance favors the nearest results, while Popularity orders by quality inside its first 0-2 km band. For `Italian`, Distance returns Ecco; Gigino Trattoria; Roc Restaurant, while Popularity returns Peasant; Osteria Morini; Il Buco Alimentari & Vineria.

### 6.3 Same query, two sort options (test location)

| Query | Distance | Popularity |
| --- | --- | --- |
| `Italian` | Bistecca, Barolo Grill, Roma Ristorante, then Foxwoods restaurants | Barolo Grill, Bistecca, Roma Ristorante, then Vivace and Iozzo's Garden of Italy |
| `Italian in New York` | Tosca Cafe, Bettolona, Lido | Marea, Peasant, Crispo |
| `New York` | Tosca Cafe, New Leaf, Red Rooster Harlem | Le Bernardin, Marea, Marc Forgione |
| *(empty)* | Bistecca, Barolo Grill, Game Seven Grill, Roma Ristorante, Kanu | Barolo Grill, Bistecca, Game Seven Grill, Roma Ristorante, Russell's Steaks |

The options differ in both dense and sparse areas: Distance prioritizes proximity at meter precision; Popularity prioritizes quality within progressively wider distance bands.

## 7. Findings and trade-offs

- **Custom ranking is a tie-breaker.** Ties on textual and geo criteria are resolved by `quality_score`. The current Distance option uses 1 m precision, so geo distance dominates except for ties at that precision; Popularity uses wider bands, so quality orders restaurants within each band.
- **Attribute order (before and after).** This was measured when Popularity was still a replica without `geo`, where the order is purely textual and by quality. With `neighborhood` before `city`, the query `New York` returned `Gallagher's Steakhouse` (Las Vegas, neighborhood "New York New York Hotel & Casino") and `Son Cubano - New Jersey` (West New York) first: ranking info showed the match in `neighborhood` at position 1000 and in `city` at 2000. After putting `city` first, the same query returns only New York restaurants (Le Bernardin, Marea, Marc Forgione), and `Italian in New York` is unchanged. The side effect appears on `ner york`: it now starts with `Somers 202 Restaurant and Grill` instead of `Delizia 92`, because `york` is the first word of `Yorktown Heights`. With the former 2 km Distance setting, results did not change for any query of the matrix at that point.
- **Distance precision.** Earlier tests from Manhattan showed that wider groups let `quality_score` reorder restaurants several kilometers apart. With `aroundPrecision: 1`, the test location's `Italian` results put Bistecca (0.3 km, score 282) ahead of Barolo Grill (1.5 km, score 958); from New York, Distance returns Ecco, Gigino Trattoria and Roc Restaurant, while Popularity returns Peasant, Osteria Morini and Il Buco.
- **Distance vs popularity trade-off.** Distance suits "restaurants near me" intent; Popularity suits "the best around here" and exploring. Distance ranks by proximity at meter precision; Popularity ranks by quality within its distance bands. Popularity is the default because it keeps quality visible when exploring a sparse area (6.3). The bands (2/5/10/25/100/500/2000 km) are a judgment call, not measured optima.
- **Rule trade-off.** The `in`/`near` rule makes natural queries work but also fires on typos like `ner`. Disabling alternatives on the condition would avoid this, at the cost of no longer catching typos of `near`.
- **Typo tolerance.** Queries like `rom risorante` and `Tosca Cafee` recover the intended names, even with out-of-order words, because matching works on all searchable attributes. The card shows neighborhood and city so the user can identify the restaurant easily.
- **Score design.** The review cap makes the score robust to outliers, but the weights (70/30) and the 90th-percentile cap are choices, not measured optima. They should be validated with click and conversion data from Insights.

## 8. Limitations and next steps

- **Hidden radius.** No `aroundRadius` is set, so Algolia uses an automatic radius. From the test location the empty query returns 4,812 of 5,000 records (automatic radius of about 10,800 km); from New York it returns 5,000; with `aroundRadius: "all"` it would return 5,000 everywhere. The filter applies to both sort options. Distance is therefore not strictly "ranking only"; setting `aroundRadius: "all"` in the `configure` widget would remove the effect.
- **Test records.** The four records listed in [Geolocation and distance](#geolocation-and-distance) still have edited coordinates and lead many results near the test location.
- **Settings are not versioned.** Dashboard changes are not in code. A configuration script would make them reproducible.
- **No personalization.** Requires an Algolia upgraded plan and authentication for the users.
- **Repeated hit with band lists (worked around, cause not understood).** When `aroundPrecision` is a list of two or more ranges, one record is repeated at the end of every page and one record per page is skipped. Measured with the same query and parameters on the live index, 4 pages of 20 hits, only `aroundPrecision` changed:

  | `aroundPrecision` | Unique hits in 80 | Repeated |
  | --- | --- | --- |
  | `2000` or `2000000` (single number) | 80 | none |
  | list of 1 range | 80 | none |
  | list of 2 or more ranges (also 2 simple ranges) | 77 | one record x4 |

  Examples: `Curry Kitchen` for `New York` from the test location or the IP location, `Bistecca Restaurant & Bar (modified geoloc)` for `Italian` from Los Angeles. With 5 hits per page the last slot is the repeated record (`Le Bernardin; Marea; Marc Forgione; The NoMad; Curry Kitchen`, then `Riverpark; Cookshop; Tamarind; Print; Curry Kitchen`), so Beauty and Essex, which a 6-hit request returns right after The NoMad, is skipped. The repeated record is not the nearest or the farthest of the result set (Curry Kitchen is 436th of 697 by distance). 

  What was established: the defect reproduces with raw HTTP requests, so it is not caused by the frontend or InstantSearch; it does not depend on `aroundRadius`, `distinct`, typo tolerance, or on using `page` or `offset`/`length`; it disappears when all hits are requested at once (`hitsPerPage: 1000`), so it only affects paginated requests; it does not depend on the ranking or `customRanking` settings (checked on a temporary copy of the index). The repeated record is usually the one with the lowest `quality_score` and stars of the result set, but not in every case (from New York it did not appear).

  Workaround, in `index.js`: for requests whose `aroundPrecision` is a list, the search client asks for `offset = page * 20` and `length = 21` instead of `page` and `hitsPerPage`, then drops the last hit and sets `page`, `hitsPerPage` and `nbPages` in the response so "Show more restaurants" keeps working. Checked on 80 page checks against the unpaginated result (`hitsPerPage: 1000`): 0 mismatches, against 38 with plain paging. Checked in the UI: `New York` with Popularity and three clicks on "Show more restaurants" gave 80 distinct cards in exactly the unpaginated order; `Tosca` (24 hits) disabled the button on the second page; Distance, refinements and cuisine search still work. Limits: the code assumes the default page size of 20 when `hitsPerPage` is not sent, and it adds one hit to each request. It is a mitigation for an unexplained behavior.

## 9. Additional notes and disclosures

- AI assistance was used to quickly edit CSS, support troubleshooting, syntax review and suggestions while typing, and to help with analysis and documentation. All decisions, components, structures and architecture were chosen independently and peer-reviewed with the AI only to speed up development.
- Parcel-related problems could be investigated further to use the import syntax of the official Algolia documentation. For this POC an adapted importing mechanism was used instead.
