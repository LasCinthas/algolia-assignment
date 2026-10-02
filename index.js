// Algolia frontend configuration

// imports
import { liteClient as algoliasearch } from "algoliasearch/dist/lite/builds/browser.js";
import instantsearch from "instantsearch.js";
import searchBox from "instantsearch.js/es/widgets/search-box/search-box.js";
import infiniteHits from "instantsearch.js/es/widgets/infinite-hits/infinite-hits.js";
import refinementList from "instantsearch.js/es/widgets/refinement-list/refinement-list.js";
import ratingMenu from "instantsearch.js/es/widgets/rating-menu/rating-menu.js";
import currentRefinements from "instantsearch.js/es/widgets/current-refinements/current-refinements.js";
import clearRefinements from "instantsearch.js/es/widgets/clear-refinements/clear-refinements.js";
import { startPlaceholderAnimation } from "./placeholder-animation.js";
import { setupGeolocation } from "./geolocation.js";


// Algolia configuration info with search API key
const appID = "HEXO1NDC48";
const apiKey = "96bcca129ac58bee73a782b3251c2b51";
const indexName = "restaurants";

// symbols for price ranges visualized in the hits 
const priceSymbols = {
  "$30 and under": "$",
  "$31 to $50": "$$",
  "$50 and over": "$$$",
};

// initialize the search client
const searchClient = algoliasearch(appID, apiKey);

// checking "Popular Cuisines" to order by popularity
let cuisineCount = {};
searchClient
  .search({ requests: [{ indexName, hitsPerPage: 0, facets: ["food_type"] }] })
  .then(({ results }) => {
    cuisineCount = results[0].facets.food_type;
  });

const byPopularity = (a, b) =>
  (cuisineCount[b.name] ?? 0) - (cuisineCount[a.name] ?? 0);

// initialize the instantsearch instance
const search = instantsearch({
  indexName,
  searchClient,
  insights: true,
});

// add widgets to the instantsearch instance
search.addWidgets([
  searchBox({
    container: "#searchbox",
    showLoadingIndicator: true,
  }),

    infiniteHits({
        container: "#hits",
        templates: {
            item: document.querySelector("#result-template").innerHTML,
            empty: document.querySelector("#no-results-template").innerHTML,
            showMoreText: "Show more restaurants"
        },
        transformItems: (items) =>
            items.map((item) => {
                const stars = Math.round(Number(item.stars_count));
                return {
                    ...item,
                    ratingStars: "★".repeat(stars) + "☆".repeat(5 - stars),
                    priceSymbols: priceSymbols[item.price_range] ?? item.price_range,
                };
            }),
    }),

    refinementList({
        container: "#refinement-list",
        attribute: "food_type",
        searchable: true,
        searchablePlaceholder: "Search for others",
        limit: 5,
        showMore: true,
        showMoreLimit: 30,
        sortBy: byPopularity,
    }),

    refinementList({
        container: "#dining-style",
        attribute: "dining_style",
        limit: 10,
        sortBy: ["name:asc"],
    }),

     refinementList({
        container: "#pricing-menu",
        attribute: "price_range",
        sortBy: ["name:asc"]
    }),

    ratingMenu({
        container: "#rating-menu",
        attribute: "stars_count",
    }),

    currentRefinements({
        container: "#current-refinements",
    }),

    clearRefinements({
        container: "#clear-refinements",
    })
]);

// back to the top of the results when query or filters change
search.on("render", () => {
  if (search.helper?.state.page === 0) {
    document.querySelector("#hits").scrollTop = 0;
  }
});

// set up geolocation, start the search and initialize the searchbox placeholder animation
setupGeolocation(search).then(() => {
  search.start();
  startPlaceholderAnimation(document.querySelector("#searchbox .ais-SearchBox-input"));
});


/*
Some technical problems enountered:
-The css had some spelling errors in result__text-container.
-The Parcel version was too old and it had some issues when importing the current version of the modules.
-The widgets needed to be imported as ES modules in the index.html and be resolved by Parcel.
-The Parcel configuration needed to include Node modules for proper bundling.
-The imports needed to use specific paths for proper bundling with Parcel.
*/
