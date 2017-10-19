'use strict';

const _ = require('underscore');
const Restaurant = Parse.Object.extend('Restaurant');
const restaurantAssembler = require('../assemblers/restaurant');
const errorHandler = require('../errorHandler');
const ratingUtil = require('../util/ratingUtil.js');

exports.getHomePages = function (req, res) {
  console.log('CFH_GetHomePage');
  if (req.query.lat === undefined || req.query.lon === undefined) {
    const error = new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, "Parameters lat and lon are required");
    errorHandler.handle(error, res);
  }
  const latitude = parseFloat(req.query.lat);
  const longitude = parseFloat(req.query.lon);
  const p1 = findNearestRestaurants(10, latitude, longitude);
  const p2 = findRecomendedRestaurants(5, latitude, longitude);
  const response = {};
  Parse.Promise.when(p1, p2).then(function (nearest, recommended) {
    const homepageSections = [];
    
    let placement = 0;
    if (recommended !== undefined && recommended.length >= 3) {
      homepageSections.push(assembleResults(recommended, "英雄推荐", placement, latitude, longitude));
      nearest = dedupe(nearest, recommended);
      placement++;
    }
    if (nearest !== undefined && nearest.length > 0) {
      homepageSections.push(assembleResults(nearest, "离您最近", placement, latitude, longitude));
    }
    response['homepagesections'] = homepageSections;
    res.status(200).json(response);
  }, function (error) {
    console.error('Error_GetHomePage');
    errorHandler.handle(error, res);
  });
};

// nearest
function findNearestRestaurants(limit, latitude, longitude) {
  const promise = new Parse.Promise();
  const query = new Parse.Query(Restaurant);
  query.include('image');
  if (limit !== undefined) {
    query.limit(limit);
  }
  const userGeoPoint = new Parse.GeoPoint(latitude, longitude);
  query.near('coordinates', userGeoPoint);
  query.exists('name');
  query.notEqualTo('blacklisted', true);
  query.notEqualTo('on_hold', true);

  query.find().then(function (results) {
    promise.resolve(results);
  }, function (error) {
    const empty = [];
    promise.resolve(empty);
  });
  return promise;
}

// within 5 miles, best restaurants
function findRecomendedRestaurants(limit, latitude, longitude) {
  const promise = new Parse.Promise();
  const query = new Parse.Query(Restaurant);
  query.include('image');
  if (limit !== undefined) {
    query.limit(limit);
  }
  const userGeoPoint = new Parse.GeoPoint(latitude, longitude);
  query.withinMiles('coordinates', userGeoPoint, 50);
  query.equalTo('is_officially_recommended', true);
  query.notEqualTo('blacklisted', true);
  query.notEqualTo('on_hold', true);
  
  query.find().then(function (results) {
    promise.resolve(results);
  }, function (error) {
    const empty = [];
    promise.resolve(empty);
  });
  return promise;
}

// within  30 miles, best restaurants
function findHotestRestaurants(limit, latitude, longitude) {
  const promise = new Parse.Promise();
  const query = new Parse.Query(Restaurant);
  query.include('image');
  query.descending('google_rating'); // This is a hack. some restaurants doesn't have "rating" but we still want to show them.
  query.limit(limit * 2); // limit = limit * 2 because we will do local sorting
  const userGeoPoint = new Parse.GeoPoint(latitude, longitude);
  query.withinMiles('coordinates', userGeoPoint, 30);
  query.notEqualTo('blacklisted', true);
  query.notEqualTo('on_hold', true);
  
  query.find().then(function (results) {
    const sorted = sortByRating(results);
    if (sorted !== undefined && sorted.length >= limit) {
      promise.resolve(sorted.slice(0, limit));
    } else {
      promise.resolve(sorted);
    }
  }, function (error) {
    const empty = [];
    promise.resolve(empty);
  });
  return promise;
}

function sortByRating(restaurants) {
  if (restaurants !== undefined && restaurants.length > 0) {
    return _.sortBy(restaurants, function (restaurant) {
      return calculateRatingForParseObject(restaurant);
    }).reverse();
  } else {
    return [];
  }
}

function calculateRatingForParseObject(restaurant) {
  if (restaurant !== undefined) {
      let score1 = 0;
      let score2 = 0;
      let score3 = 0;
      let score4 = 0;
      let score5 = 0;
      if (restaurant.get('score_1') !== undefined) {
        score1 = restaurant.get('score_1');
      }
      if (restaurant.get('score_2') !== undefined) {
        score2 = restaurant.get('score_2');
      }
      if (restaurant.get('score_3') !== undefined) {
        score3 = restaurant.get('score_3');
      }
      if (restaurant.get('score_4') !== undefined) {
        score4 = restaurant.get('score_4');
      }
      if (restaurant.get('score_5') !== undefined) {
        score5 = restaurant.get('score_5');
      }
      const userRatingCount = score1 + score2 + score3 + score4 + score5;
      let userRating = 0;
      if (userRatingCount !== 0) {
        userRating = (score1 + score2 * 2 + score3 * 3 + score4 * 4 + score5 * 5) / userRatingCount;  
      }
      let totalRating = ratingUtil.mergeRating(userRating, userRatingCount, restaurant.get('google_rating'));
      return parseFloat(totalRating.toFixed(1));
  } else {
    return -1.0; // return a negative number so that it will be demoted.
  }
}

function assembleResults(restaurants, title, placement, latitude, longitude) {
  const homepageSection = {};
  const results = [];
  _.each(restaurants, function (restaurant) {
    const result = restaurantAssembler.assemble(restaurant, latitude, longitude);
    results.push(result);
  });
  homepageSection['results'] = results;
  homepageSection['title'] = title;
  homepageSection['placement'] = placement;
  return homepageSection;
}

function dedupe(restaurants, blacklist) {
  if (restaurants === undefined || blacklist === undefined) {
    return restaurants;
  }
  const keySet = {};
  _.each(blacklist, function (element) {
    keySet[element.id] = true;
  });
  const deduped = [];
  _.each(restaurants, function (restaurant) {
    if (keySet[restaurant.id] !== true) {
      deduped.push(restaurant);
    }
  });
  return deduped;
}