// Quality score used as custom ranking: combines the rating and the number of reviews in one value from 0 to 1000
// shared by import-data.js and analyze-dataset.js

// reviews above this percentile all count the same, so a few very popular restaurants do not dominate
const REVIEW_COUNT_PERCENTILE = 0.9;

// review count at the 90th percentile of the dataset
const getReviewCountCap = (details) => {
  // extract the review counts from the details array
  const reviewCounts = details.map(({ reviews_count }) => Number(reviews_count));
  // ensure all review counts are valid numbers
  if (
    reviewCounts.length === 0 ||
    reviewCounts.some((count) => !Number.isFinite(count) || count < 0)
  ) {
    throw new Error("Cannot calculate review-count percentile from invalid data.");
  }

  // sort numerically
  reviewCounts.sort((a, b) => a - b);
  // calculate the index for the 90th percentile
  const percentileIndex = Math.ceil(REVIEW_COUNT_PERCENTILE * reviewCounts.length) - 1;
  // return the review count at the 90th percentile
  return reviewCounts[percentileIndex];
};

// 70% rating (0-5 stars) and 30% reviews (capped), rounded to an integer so it can be used in customRanking
const calculateQualityScore = (starsCount, reviewsCount, reviewCountCap) => { // here reviewCountCap is the 90th percentile cap for the review count
  // normalize the rating to a 0-1 scale
  const ratingScore = starsCount / 5;
  // normalize the review count to a 0-1 scale, capped at the 90th percentile
  const reviewScore = reviewCountCap > 0 // the reviewCountCap might be zero when there are no reviews in the dataset. In that case, the review score should be 0
    ? Math.min(reviewsCount / reviewCountCap, 1) // normalized review count, capped at 1
    : 0;
  // combine the rating and review scores with the specified weights
  return Math.round((0.7 * ratingScore + 0.3 * reviewScore) * 1000);
};

module.exports = { calculateQualityScore, getReviewCountCap };