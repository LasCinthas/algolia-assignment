// This script is used to combine the datasets and import them into the Algolia index
// Usage: node .\scripts\import-data.js

// import required modules
const fs = require("node:fs");
const path = require("node:path");
const { parse } = require("csv-parse/sync");
const { algoliasearch } = require("algoliasearch");
const dotenv = require("dotenv");
const { calculateQualityScore, getReviewCountCap } = require("./quality-score");

// load environment variables from the .env file
dotenv.config({ path: path.join(__dirname, "../.env") });

// load dataset files
const restaurants = require("../dataset/restaurants_list.json");
const details = parse(
  fs.readFileSync(
    path.join(__dirname, "../dataset/restaurants_info.csv"),
    "utf8"
  ),
  { columns: true, delimiter: ";", bom: true, skip_empty_lines: true }
);
// cap used to calculate the quality score of every restaurant
const reviewCountCap = getReviewCountCap(details);

// create a map of details by their objectID for quick lookup
const detailsById = new Map(
  details.map((detail) => [String(detail.objectID).trim(), detail])
);

// combine the datasets based on the objectID
const records = restaurants.map((restaurant) => {
  // get the objectID and corresponding detail for the current restaurant
  const objectID = String(restaurant.objectID).trim();
  const detail = detailsById.get(objectID);

  if (!detail) {
    throw new Error(`No CSV details found for restaurant ${objectID}.`);
  }

  // the CSV values are text: convert them and stop the import if they are not valid
  const starsCount = Number(detail.stars_count);
  const reviewsCount = Number(detail.reviews_count);
  if (
    !Number.isFinite(starsCount) ||
    starsCount < 0 ||
    starsCount > 5 ||
    !Number.isFinite(reviewsCount) ||
    reviewsCount < 0
  ) {
    throw new Error(`Invalid rating or review count for restaurant ${objectID}.`);
  }

  // merge the restaurant and detail information into a single record
  return {
    objectID,
    name: restaurant.name,
    city: restaurant.city,
    // images url seem to be broken in the dataset at the moment. Keeping it for future use
    image_url: restaurant.image_url,
    _geoloc: restaurant._geoloc,
    food_type: detail.food_type,
    neighborhood: detail.neighborhood,
    price_range: detail.price_range,
    stars_count: starsCount,
    reviews_count: reviewsCount,
    // calculated here, attribute not in the dataset: used as custom ranking
    quality_score: calculateQualityScore(starsCount, reviewsCount, reviewCountCap),
    dining_style: detail.dining_style,
  };
});

// set up Algolia client and index information
const indexName = process.env.ALGOLIA_INDEX_NAME;
const appId = process.env.ALGOLIA_APP_ID;
const apiKey = process.env.ALGOLIA_ADMIN_API_KEY;

if (!appId || !apiKey || !indexName) {
  throw new Error("Add Algolia information to the local .env file.");
}

// initialize Algolia client (v5 syntax, the module has been updated)
const client = algoliasearch(appId, apiKey);

// function to process and import records into Algolia
const processRecords = async () => {
  return await client.saveObjects({ indexName: indexName, objects: records});
};

// execute the import process
processRecords()
  .then(() => console.log('Successfully indexed objects!'))
  .catch((err) => console.error(err));