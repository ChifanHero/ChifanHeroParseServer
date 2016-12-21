var Promotion = Parse.Object.extend('Promotion');
var Restaurant = Parse.Object.extend('Restaurant');
var _ = require('underscore');
var promotion_assembler = require('../assemblers/promotion');
var error_handler = require('../error_handler');
var image_assembler = require('../assemblers/image');
var restaurant_assembler = require('../assemblers/restaurant');


// get promotions from promotions table.
// if less than 10, then get nearby restaurants
exports.listAll = function(req, res) {
	// var userLocation = req.body['user_location'];
	var userLocation = req.body['user_location'];
	var skip = req.body["skip"];
	var limit = req.body["limit"];
	if (limit == undefined) {
		limit = 10;
	}
	var userGeoPoint;
	if (userLocation != undefined && userLocation.lat != undefined && userLocation.lon != undefined) {
		userGeoPoint = new Parse.GeoPoint(userLocation.lat, userLocation.lon);
	}
	var query = new Parse.Query(Promotion);
	query.include('restaurant.image');
	query.include('dish.from_restaurant');
	query.include('dish.image');
	query.include('coupon.restaurant.picture');
	// query.limit(limit);
	if (userGeoPoint != undefined) {
		query.withinMiles("coordinates", userGeoPoint, 50); 
	}
	query.find().then(function(results) {
		var promotions = [];
		if (results != undefined && results.length > 0) {
			var lat;
			var lon;
			if (userLocation != undefined) {
				lat = userLocation["lat"];
				lon = userLocation["lon"];
			}
			_.each(results, function(result){
				if (result.get('restaurant') != undefined) {
					if (result.get('restaurant').get('image') != undefined) {
						var promotion = promotion_assembler.assemble(result, lat, lon);
						promotions.push(promotion);
					}
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
			restaurantQuery.find().then(function(restaurants){
				if (restaurants != undefined && restaurants.length > 0) {
					for (var i = 0; i < restaurants.length; i++) { 
						var restaurant = restaurants[i];
						if (_.contains(existingIds, restaurant.id) == false) {
							console.log("existingIds contains ".concat(restaurant.id).concat("is considered false"));
							var promotion = {};
							var lat;
							var lon;
							if (userLocation != undefined) {
								lat = userLocation["lat"];
								lon = userLocation["lon"];
							}
							var rest = restaurant_assembler.assemble(restaurant, lat, lon);
							promotion["restaurant"] = rest;
							promotions.push(promotion);
							if (promotions.length == 10) {
								break;
							}
						}
					}
				}

				var sortedPromotions = _.sortBy(promotions, function(promotion) {
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
				res.json(200, response);
			}, function(error){
				error_handler.handle(error, {}, res);
			});

		} else {
			var response = {};
			var sortedPromotions = _.sortBy(promotions, function(promotion) {
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
			res.json(200, response);
		}
		
	}, function(error) {
		console.log(error);
		error_handler.handle(error, {}, res);
	})
}