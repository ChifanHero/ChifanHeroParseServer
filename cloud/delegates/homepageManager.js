'use strict';

const _ = require('underscore');
const Restaurant = Parse.Object.extend('Restaurant');
const restaurantAssembler = require('../assemblers/restaurant');
const errorHandler = require('../errorHandler');

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
  const p3 = findHotestRestaurants(15, latitude, longitude);
  const response = {};
  Parse.Promise.when(p1, p2, p3).then(function (nearest, recommended, hottest) {
    const homepageSections = [];
    let placement = 0;
    if (recommended.length >= 3) {
      homepageSections.push(assembleResults(recommended, "英雄推荐", placement, latitude, longitude));
      nearest = dedupe(nearest, recommended);
      hottest = dedupe(hottest, recommended.concat(nearest));
      placement++;
    }
    if (hottest.length >= 3) {
      homepageSections.push(assembleResults(hottest, "热门餐厅", placement, latitude, longitude));
      placement++;
    }
    homepageSections.push(assembleResults(nearest, "离您最近", placement, latitude, longitude));
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
  query.near("coordinates", userGeoPoint);
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
  query.withinMiles("coordinates", userGeoPoint, 5);
  query.equalTo('is_recommendation_candidate', true);
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
  if (limit !== undefined) {
    query.limit(limit);
  }
  const userGeoPoint = new Parse.GeoPoint(latitude, longitude);
  query.withinMiles("coordinates", userGeoPoint, 30);
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