var Promotion = Parse.Object.extend('Promotion');
var Restaurant = Parse.Object.extend('Restaurant');
var _ = require('underscore');
var promotionAssembler = require('../assemblers/promotion');
var errorHandler = require('../errorHandler');
var imageAssembler = require('../assemblers/image');
var restaurantAssembler = require('../assemblers/restaurant');


// get promotions from promotions table.
// if less than 10, then get nearby restaurants
exports.listAll = function (req, res) {

  var latitude = req.query['lat'];
  var longitude = req.query['lon'];
  var skip = req.query['skip'];
  var limit = req.query['limit'];
  if (limit == undefined) {
    limit = 10;
  }
  var userGeoPoint = undefined;
  if (latitude != undefined && longitude != undefined) {
    userGeoPoint = new Parse.GeoPoint(latitude, longitude);
  }
  var query = new Parse.Query(Promotion);
  query.include('restaurant.image');
  query.include('dish.from_restaurant');
  query.include('dish.image');
  query.include('coupon.restaurant.picture');
  if (userGeoPoint != undefined) {
    query.withinMiles("coordinates", userGeoPoint, 50);
  }
  query.find().then(function (results) {
    var promotions = [];
    if (results != undefined && results.length > 0) {
      _.each(results, function (result) {
        if (result.get('restaurant') != undefined && result.get('restaurant').get('image') != undefined) {
          var promotion = promotionAssembler.assemble(result, latitude, longitude);
          promotions.push(promotion);
        }
      });
    }
    if (promotions.length < limit) {
      console.log("promotions length is ".concat(promotions.length));
      var existingIds = [];
      for (var i = 0; i < promotions.length; i++) {
        if (promotions[i].restaurant != undefined) {
          existingIds.push(promotions[i].restaurant.id);
          console.log("existingIds adding ".concat(promotions[i].restaurant.id));
        }
      }
      console.log("existingIds length is ".concat(existingIds.length));
      var countShort = limit;
      var restaurantQuery = new Parse.Query(Restaurant);
      restaurantQuery.limit(countShort);
      if (userGeoPoint != undefined) {
        restaurantQuery.withinMiles("coordinates", userGeoPoint, 50);
      }
      restaurantQuery.descending("like_count");
      restaurantQuery.include("image");
      restaurantQuery.exists("image");
      restaurantQuery.find().then(function (restaurants) {
        if (restaurants != undefined && restaurants.length > 0) {
          for (var i = 0; i < restaurants.length; i++) {
            var restaurant = restaurants[i];
            if (_.contains(existingIds, restaurant.id) == false) {
              console.log("existingIds contains ".concat(restaurant.id).concat("is considered false"));
              var promotion = {};
              var rest = restaurantAssembler.assemble(restaurant, latitude, longitude);
              promotion["restaurant"] = rest;
              promotions.push(promotion);
              if (promotions.length == 10) {
                break;
              }
            }
          }
        }

        var sortedPromotions = _.sortBy(promotions, function (promotion) {
          if (promotion['restaurant'] != undefined) {
            var rest = promotion['restaurant'];
            if (rest.distance != undefined && rest.distance.value != undefined) {
              return 0 - rest.distance.value;
            } else {
              return 0;
            }
          } else {
            return 0;
          }
        }).reverse();
        var response = {};
        response['results'] = sortedPromotions;
        res.status(200).json(response);
      }, function (error) {
        errorHandler.handle(error, {}, res);
      });
    } else {
      var response = {};
      var sortedPromotions = _.sortBy(promotions, function (promotion) {
        if (promotion['restaurant'] != undefined) {
          var rest = promotion['restaurant'];
          if (rest.distance != undefined && rest.distance.value != undefined) {
            return 0 - rest.distance.value;
          } else {
            return 0;
          }
        } else {
          return 0;
        }
      }).reverse();
      response['results'] = sortedPromotions;
      res.status(200).json(response);
    }
  }, function (error) {
    console.log(error);
    errorHandler.handle(error, {}, res);
  })
}