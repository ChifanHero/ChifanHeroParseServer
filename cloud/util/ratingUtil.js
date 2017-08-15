/**
 * Created by xnzhang on 8/15/17.
 */
'use strict';

exports.mergeRating = function (chifanHeroRating, chifanHeroRatingCount, googleRating) {
  let googleRatingCount = 15; // Assume every restaurant has 15 ratings
  if (googleRating === undefined) {
    googleRating = 0;
    googleRatingCount = 0;
  }
  if (chifanHeroRating !== undefined && chifanHeroRatingCount !== undefined) {
    return parseFloat(((chifanHeroRating * chifanHeroRatingCount + googleRating * googleRatingCount) / (chifanHeroRatingCount + googleRatingCount)).toFixed(1));
  }
  return googleRating;
}