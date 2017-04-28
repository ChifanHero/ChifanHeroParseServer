var _ = require('underscore');
var Restaurant = Parse.Object.extend('Restaurant');
var restaurantAssembler = require('../assemblers/restaurant');
var errorHandler = require('../errorHandler');

exports.getHomePages = function (req, res) {
  var longitude = parseFloat(req.query.lon);
  var latitude = parseFloat(req.query.lat);
  var p1 = findNearestRestaurants(10, latitude, longitude);
  var p2 = findRecomendedRestaurants(5, latitude, longitude);
  var p3 = findHotestRestaurants(15, latitude, longitude);
  var response = {};
  Parse.Promise.when(p1, p2, p3).then(function (nearest, recommended, hottest) {
    var recommendations = [];
    var placement = 0;
    if (recommended.length >= 3) {
      recommendations.push(assembleRecommendation(recommended, "英雄推荐", placement, latitude, longitude));
      nearest = dedupe(nearest, recommended);
      hottest = dedupe(hottest, recommended.concat(nearest));
      placement++;
    }
    recommendations.push(assembleRecommendation(hottest, "热门餐厅", placement, latitude, longitude));
    placement++;
    recommendations.push(assembleRecommendation(nearest, "离您最近", placement, latitude, longitude));
    response['homepagesections'] = recommendations;
    res.status(200).json(response);
  }, function (error) {
    errorHandler.handle(error, res);
  });
}

// nearest
function findNearestRestaurants(limit, latitude, longitude) {
  var promise = new Parse.Promise();
  var query = new Parse.Query(Restaurant);
  query.include('image');
  if (limit != undefined) {
    query.limit(limit);
  }
  if (latitude != undefined && longitude != undefined) {
    userGeoPoint = new Parse.GeoPoint(latitude, longitude);
    query.near("coordinates", userGeoPoint);
  }
  query.find().then(function (results) {
    promise.resolve(results);
  }, function (error) {
    var empty = [];
    promise.resolve(empty);
  });
  return promise;
}

// within 5 miles, best restaurants
function findRecomendedRestaurants(limit, latitude, longitude) {
  var promise = new Parse.Promise();
  var query = new Parse.Query(Restaurant);
  query.include('image');
  if (limit != undefined) {
    query.limit(limit);
  }
  if (latitude != undefined && longitude != undefined) {
    userGeoPoint = new Parse.GeoPoint(latitude, longitude);
    query.withinMiles("coordinates", userGeoPoint, 5);
  }
  query.notEqualTo("permanantly_closed", true);
  query.descending("like_count");
  query.greaterThanOrEqualTo("score", 3.5);
  query.find().then(function (results) {
    promise.resolve(results);
  }, function (error) {
    var empty = [];
    promise.resolve(empty);
  });
  return promise;
}

// within  30 miles, best restaurants
function findHotestRestaurants(limit, latitude, longitude) {
  var promise = new Parse.Promise();
  var query = new Parse.Query(Restaurant);
  query.include('image');
  if (limit != undefined) {
    query.limit(limit);
  }
  if (latitude != undefined && longitude != undefined) {
    userGeoPoint = new Parse.GeoPoint(latitude, longitude);
    query.withinMiles("coordinates", userGeoPoint, 30);
  }
  query.descending("like_count");
  query.find().then(function (results) {
    promise.resolve(results);
  }, function (error) {
    var empty = [];
    promise.resolve(empty);
  });
  return promise;
}

function assembleRecommendation(restaurants, title, placement, latitude, longitude) {
  var recommendation = {};
  var results = [];
  console.log(latitude);
  console.log(longitude);
  _.each(restaurants, function (restaurant) {
    var result = restaurantAssembler.assemble(restaurant, latitude, longitude);
    results.push(result);
  });
  recommendation['results'] = results;
  recommendation['title'] = title;
  recommendation['placement'] = placement;
  return recommendation;
}

function dedupe(restaurants, blacklist) {
  if (restaurants == undefined || blacklist == undefined) {
    return restaurants;
  }
  var keySet = {};
  _.each(blacklist, function (element) {
    keySet[element.id] = true;
  });
  var deduped = [];
  _.each(restaurants, function (restaurant) {
    if (keySet[restaurant.id] != true) {
      deduped.push(restaurant);
    }
  });
  return deduped;
}