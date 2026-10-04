// This script is used to analyze the integrity of the provided datasets and their relationships
// Usage: node .\scripts\analyze-dataset.js

// import required modules
const fs = require("node:fs");
const path = require("node:path");
const { parse } = require("csv-parse/sync");
const { calculateQualityScore, getReviewCountCap } = require("./quality-score");

// load dataset files
const restaurants = require("../dataset/restaurants_list.json");
const details = parse(
  fs.readFileSync(
    path.join(__dirname, "../dataset/restaurants_info.csv"),
    "utf8"
  ),
  { columns: true, delimiter: ";", bom: true, skip_empty_lines: true }
);
// ratings between 0 and 5 and review counts of 0 or more are needed to calculate the quality score
const hasValidScoringInputs =
  details.length > 0 &&
  // get the stars count and review count for each detail and validate them
  details.every((detail) => {
    const starsCount = Number(detail.stars_count);
    const reviewsCount = Number(detail.reviews_count);
    return (
      Number.isFinite(starsCount) &&
      starsCount >= 0 &&
      starsCount <= 5 &&
      Number.isFinite(reviewsCount) &&
      reviewsCount >= 0
    );
  });
// calculate the 90th percentile review count cap if the scoring inputs are valid
const reviewCountCap = hasValidScoringInputs ? getReviewCountCap(details) : null;
// quality score of every restaurant, only to report its range
const qualityScores = hasValidScoringInputs
  ? details.map((detail) =>
      calculateQualityScore(
        Number(detail.stars_count),
        Number(detail.reviews_count),
        reviewCountCap
      )
    )
  : [];

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
const passed =
  !hasMissingIds &&
  !hasDuplicates &&
  joinIsComplete &&
  hasValidScoringInputs;

// report dataset analysis results
console.log(`JSON records: ${restaurants.length}`);
console.log(`CSV records: ${details.length}`);
console.log(`Matched IDs: ${matchedIds.length}`);
console.log(`IDs present: ${!hasMissingIds}`);
console.log(`IDs unique: ${!hasDuplicates}`);
console.log(`Join complete: ${joinIsComplete}`);
console.log(`Rating and review values valid: ${hasValidScoringInputs}`);
console.log(`Review-count cap (90th percentile): ${reviewCountCap ?? "unavailable"}`);
console.log(
  `Quality score range: ${
    qualityScores.length > 0
      ? `${Math.min(...qualityScores)}-${Math.max(...qualityScores)}`
      : "unavailable"
  }`
);
console.log(`Result: ${passed ? "PASS" : "FAIL"}`);