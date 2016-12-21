var _ = require('underscore');
var restaurant_assembler = require('../assemblers/restaurant');
var Restaurant = Parse.Object.extend('Restaurant');
var error_handler = require('../error_handler');

exports.getHomePage = function(req, res) {
	var longitude = parseFloat(req.query.lon);
	var latitude = parseFloat(req.query.lat);

	var requestOptions = [
		{
			method: 'POST',
			url: 'http://internal.service.lightningorder.com/restaurants',
			headers: {
				'Content-Type': 'application/json;charset=utf-8'
			},
			body: {
				request_title: "热门餐厅",
				placement: 0,
				user_location: {
			        lat: latitude,
        			lon: longitude
			    },
			    limit: 8,
			    skip: 0,
			    sort_by: "hotness",
			    sort_order: "descend"
			}
		},
		{
			method: 'POST',
			url: 'http://internal.service.lightningorder.com/restaurants',
			headers: {
				'Content-Type': 'application/json;charset=utf-8'
			},
			body: {
				request_title: "离您最近",
				placement: 1,
				user_location: {
			        lat: latitude,
        			lon: longitude
			    },
			    limit: 8,
			    skip: 0,
			    sort_by: "distance",
			    sort_order: "descend"
			}
		}
	];

	var homepageSections = [];
	var responseIndicator = 0;

	for(var index = 0; index < requestOptions.length; index++){
		Parse.Cloud.httpRequest(requestOptions[index]).then(function(httpResponse) {
			// success
			responseIndicator++;
			homepageSections.push(httpResponse.data);
			if(isAllRequestCompleted(responseIndicator, requestOptions.length)){
				var response = {};
				response['homepagesections'] = homepageSections;
				res.json(200, response)
			}
		},function(httpResponse) {
			// error
			console.error('Request failed with response code ' + httpResponse.status);
		});
	}
}

var isAllRequestCompleted = function(currentCount, totalCount){
	if(currentCount < totalCount){
		return false;
	} else {
		return true;
	}
}

exports.getRecommendations = function(req, res) {
	var promises = [];
	var longitude = parseFloat(req.query.lon);
	var latitude = parseFloat(req.query.lat);
	promises.push(findNearestRestaurants(10, latitude, longitude));
	promises.push(findRecomendedRestaurants(5, latitude, longitude));
	promises.push(findHotestRestaurants(15, latitude, longitude));
	var response = {};
	Parse.Promise.when(promises).then(function(nearest, recommended, hottest){
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
		res.json(200, response);
	}, function(error) {
		error_handler.handle(error, {}, res); 
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
	query.find().then(function(results) {
		promise.resolve(results);
	}, function(error) {
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
	query.find().then(function(results) {
		promise.resolve(results);
	}, function(error) {
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
	query.find().then(function(results) {
		promise.resolve(results);
	}, function(error) {
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
	_.each(restaurants, function(restaurant){
		var result = restaurant_assembler.assemble(restaurant, latitude, longitude);
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
	_.each(blacklist, function(element){
		keySet[element.id] = true;
	});
	var deduped = [];
	_.each(restaurants, function(restaurant){
		if (keySet[restaurant.id] != true) {
			deduped.push(restaurant);
		}
	});
	return deduped;
}