// This script is used to analyze the integrity of the provided datasets and their relationships
// Usage: node .\scripts\analyze-dataset.js

// import required modules
const fs = require("node:fs");
const path = require("node:path");
const { parse } = require("csv-parse/sync");

// load dataset files
const restaurants = require("../dataset/restaurants_list.json");
const details = parse(
  fs.readFileSync(
    path.join(__dirname, "../dataset/restaurants_info.csv"),
    "utf8"
  ),
  { columns: true, delimiter: ";", bom: true, skip_empty_lines: true }
);

// extract the unique IDs from both datasets
const restaurantIds = restaurants.map((restaurant) =>
  String(restaurant.objectID).trim()
);
const detailIds = details.map((detail) => String(detail.objectID).trim());

// create sets for quick lookup and find matched IDs
const restaurantIdSet = new Set(restaurantIds);
const detailIdSet = new Set(detailIds);

// find matched IDs
const matchedIds = restaurantIds.filter((id) => detailIdSet.has(id));

// check for missing IDs, duplicates and completeness of the join
const hasMissingIds = restaurantIds.includes("") || detailIds.includes("");
const hasDuplicates =
  restaurantIdSet.size !== restaurantIds.length ||
  detailIdSet.size !== detailIds.length;
const joinIsComplete =
  matchedIds.length === restaurantIds.length &&
  matchedIds.length === detailIds.length;

// determine overall dataset integrity
const passed = !hasMissingIds && !hasDuplicates && joinIsComplete;

// report dataset analysis results
console.log(`JSON records: ${restaurants.length}`);
console.log(`CSV records: ${details.length}`);
console.log(`Matched IDs: ${matchedIds.length}`);
console.log(`IDs present: ${!hasMissingIds}`);
console.log(`IDs unique: ${!hasDuplicates}`);
console.log(`Join complete: ${joinIsComplete}`);
console.log(`Result: ${passed ? "PASS" : "FAIL"}`);