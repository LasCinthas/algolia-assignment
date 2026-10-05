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
import { getDistance } from "geolib";


// Algolia configuration info with search API key
const appID = "HEXO1NDC48";
const apiKey = "96bcca129ac58bee73a782b3251c2b51";
const indexName = "restaurants";

// Distance: 1 m steps; Popularity: 0-2, 2-5, 5-10, 10-25, 25-100, 100-500, 500-2000 km and one group beyond 2000 km
const precisionBySort = {
  distance: 1,
  popularity: [
    { from: 0, value: 2000 },
    { from: 2000, value: 3000 },
    { from: 5000, value: 5000 },
    { from: 10000, value: 15000 },
    { from: 25000, value: 75000 },
    { from: 100000, value: 400000 },
    { from: 500000, value: 1500000 },
    { from: 2000000, value: 20000000 },
  ],
};

// initialise the sort selector element used to determine the sorting of search results
const sortSelect = document.querySelector("#sort-by");

// symbols for price ranges visualized in the hits 
const priceSymbols = {
  "$30 and under": "$",
  "$31 to $50": "$$",
  "$50 and over": "$$$",
};

// user position, filled by setupGeolocation
let userCoordinates;

// distance in km between the user and a restaurant, null if one of the positions is missing or invalid
const getDistanceInKm = (restaurantCoordinates) => {
  if (!userCoordinates || !restaurantCoordinates) return null;

  // geolib expects numeric latitude/longitude
  const restaurantPoint = {
    latitude: Number(restaurantCoordinates.lat),
    longitude: Number(restaurantCoordinates.lng),
  };
  // check if the restaurant coordinates are valid numbers
  if (!Number.isFinite(restaurantPoint.latitude) || !Number.isFinite(restaurantPoint.longitude)) return null;

  // calling getDistance from geolib to compute the distance in meters between the user and the restaurant
  const distanceInMeters = getDistance(userCoordinates, restaurantPoint);
  // convert the distance from meters to kilometers and round to one decimal place
  return (distanceInMeters / 1000).toFixed(1);
};

// initialize the search client
const searchClient = algoliasearch(appID, apiKey);

/*
Workaround for an Algolia pagination defect.
When aroundPrecision is a list (the Popularity sort), paginated requests return a repeated hit at the end of each page and skip another one.
The defect does not appear when all hits are requested at once, so this wrapper changes how the pages are requested:
1. it intercepts every search sent by InstantSearch through the search client
2. for the affected requests only, it replaces page/hitsPerPage with offset/length and asks for one extra hit
3. when the response arrives (below), it drops the extra hit and restores the pagination fields that InstantSearch needs
The other requests are sent unchanged.
*/
// 20 is the Algolia default
const defaultPageSize = 20;
// the original search is saved here because searchClient.search is replaced just below, and the wrapper still needs to call the original
const searchWithPrecisionList = searchClient.search.bind(searchClient);
// override the default search method. requests and options are passed from InstantSearch. Requests is expected to be an array of search requests
searchClient.search = async (requests, options) => {
  // if the requests parameter is not an array, fall back to the default search function
  if (!Array.isArray(requests)) return searchWithPrecisionList(requests, options);

  // a request is affected when it is not a facet search, aroundPrecision is a list and it asks for hits (hitsPerPage 0 only asks for counts)
  const isAffected = ({ type, params }) => type !== "facet" && Array.isArray(params?.aroundPrecision) && params.hitsPerPage !== 0;
  // the original search is called with the rewritten requests: one map call goes through every request of the batch
  const response = await searchWithPrecisionList(
    requests.map((request) => {
      // unaffected requests are sent as they are
      if (!isAffected(request)) return request;
      // page N becomes an offset, with one extra hit to throw away
      // page and hitsPerPage are taken out of the params (page defaults to 0 and hitsPerPage to 20); the other params are kept in ...params
      const { page = 0, hitsPerPage = defaultPageSize, ...params } = request.params;
      // offset is the position of the first hit to return, length is how many hits: e.g. page 2 with 20 hits gives offset 40 and length 21
      return { ...request, params: { ...params, offset: page * hitsPerPage, length: hitsPerPage + 1 } };
    }),
    // the options are forwarded unchanged
    options
  );

  // drop the extra hit and restore the pagination fields InstantSearch reads (1000 = default paginationLimitedTo)
  response.results.forEach((result, i) => {
    if (!isAffected(requests[i])) return;
    const { page = 0, hitsPerPage = defaultPageSize } = requests[i].params;
    result.hits = result.hits.slice(0, hitsPerPage);
    Object.assign(result, { page, hitsPerPage, nbPages: Math.ceil(Math.min(result.nbHits, 1000) / hitsPerPage) });
  });
  return response;
};

// checking "Popular Cuisines" to order the filters
let cuisineCount = {};
searchClient
  // hitsPerPage is set to 0 because we only need the facet counts, not the actual hits 
  .search({ requests: [{ indexName, hitsPerPage: 0, facets: ["food_type"] }] })
  .then(({ results }) => {
    // store the facet counts for the filter
    cuisineCount = results[0].facets.food_type;
    /*
    {
      Italian: 1200,
      American: 800,
      ...
    }
    */
  });

// sort by popularity based on the stored facet counts and resolve to 0 if there is no value
const byPopularity = (a, b) =>
  (cuisineCount[b.name] ?? 0) - (cuisineCount[a.name] ?? 0);

// initialize the instantsearch instance
const search = instantsearch({
  indexName,
  searchClient,
  insights: {
    // Insights filter-click events only support facet values, not numeric ranges. Temporary workaround for the 422 error
    onEvent(event, insightsClient) {
      // Ignore if the event is a rating menu filter-click
      if (event.widgetType === "ais.ratingMenu" && event.insightsMethod === "clickedFilters") return;
      // Forward other events to the insights client if available
      if (event.insightsMethod && insightsClient) insightsClient(event.insightsMethod, event.payload);
    },
  },
  // callback that runs at every search invoked by InstantSearch and adds the distance grouping of the selected sort
  // the helper is passed by InstantSearch
  searchFunction(helper) {
    // get the current helper state, update the aroundPrecisionParameter, set it and trigger the search
    helper.setState(helper.state.setQueryParameter("aroundPrecision", precisionBySort[sortSelect.value])).search();
  },
});

// add widgets to the instantsearch instance
search.addWidgets([
  // search box with the loading indicator
  searchBox({
    container: "#searchbox",
    showLoadingIndicator: true,
  }),

    // results as cards, loaded with the "Show more" button
    infiniteHits({
        container: "#hits",
        templates: {
            item: document.querySelector("#result-template").innerHTML,
            empty: document.querySelector("#no-results-template").innerHTML,
            showMoreText: "Show more restaurants"
        },
        // transform and add the values used by the result template: stars, price symbols, city and distance
        transformItems: (items) =>
            items.map((item) => {
                const stars = Math.round(Number(item.stars_count));
                const city = String(item.city ?? "").trim();
                const neighborhood = String(item.neighborhood ?? "").trim();
                const distanceKm = getDistanceInKm(item._geoloc);
                return {
                    ...item,
                    ratingStars: "★".repeat(stars) + "☆".repeat(5 - stars),
                    priceSymbols: priceSymbols[item.price_range] ?? item.price_range,
                    // the city is hidden when the neighborhood name already contains it
                    showCity: city && !neighborhood.toLowerCase().includes(city.toLowerCase()),
                  distanceKm,
                  hasDistance: distanceKm !== null,
                };
            }),
    }),

    // cuisine filter: searchable, most common cuisines first
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

    // dining style filter
    refinementList({
        container: "#dining-style",
        attribute: "dining_style",
        limit: 10,
        sortBy: ["name:asc"],
    }),

    // price range filter
     refinementList({
        container: "#pricing-menu",
        attribute: "price_range",
        sortBy: ["name:asc"]
    }),

    // minimum rating filter
    ratingMenu({
        container: "#rating-menu",
        attribute: "stars_count",
    }),

    // selected filters shown as removable tags
    currentRefinements({
        container: "#current-refinements",
    }),

    // button to remove all filters
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
setupGeolocation(search, (coordinates) => { // coordinates are passed by the geolocation setup function (callback)
  userCoordinates = coordinates;
}).then(() => {
  search.start();
  // reset to the first page when the sort option changes
  sortSelect.addEventListener("change", () => search.helper.setPage(0).search());
  startPlaceholderAnimation(document.querySelector("#searchbox .ais-SearchBox-input"));
});


/*
Some initial technical problems enountered:
-The css had some spelling errors in result__text-container.
-The Parcel version was too old and it had some issues when importing the current version of the modules.
-The widgets needed to be imported as ES modules in the index.html and be resolved by Parcel.
-The Parcel configuration needed to include Node modules for proper bundling.
-The imports needed to use specific paths for proper bundling with Parcel.
*/
