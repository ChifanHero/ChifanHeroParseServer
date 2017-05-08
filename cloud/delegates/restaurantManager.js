"use strict";

const Restaurant = Parse.Object.extend('Restaurant');
const Image = Parse.Object.extend('Image');
const Review = Parse.Object.extend('Review');
const RestaurantCandidate = Parse.Object.extend('RestaurantCandidate');
const Dish = Parse.Object.extend('Dish');
const _ = require('underscore');
const restaurantAssembler = require('../assemblers/restaurant');
const dishAssembler = require('../assemblers/dish');
const errorHandler = require('../errorHandler');
const imageAssembler = require('../assemblers/image');
const googlePhotoAssember = require('../assemblers/googlePhoto');
const reviewAssembler = require('../assemblers/review');

const google = require('../util/googlePlace.js');

/**
 * Find all restaurants satisfying requirements
 * @param req
 * @param res
 */
exports.findAll = function (req, res) {
  const latitude = req.query['lat'];
  const longitude = req.query['lon'];
  const skip = req.query['skip'];
  let limit = req.query['limit'];
  if (limit === undefined) {
    limit = 10;
  }
  const sortBy = req.query['sort_by'];
  const sortOrder = req.query['sort_order'];
  let userGeoPoint = undefined;
  if (latitude !== undefined && longitude !== undefined) {
    userGeoPoint = new Parse.GeoPoint(latitude, longitude);
  }
  const query = new Parse.Query(Restaurant);
  query.include('image');
  if (userGeoPoint !== undefined) {
    query.withinMiles("coordinates", userGeoPoint, 100);
  }
  if (skip !== undefined) {
    query.skip(skip);
  }
  if (limit !== undefined) {
    query.limit(limit);
  }
  if (sortBy === 'hotness') {
    if (sortOrder === 'ascend') {
      query.ascending('like_count');
    } else {
      query.descending('like_count');
    }
  } else if (sortBy === 'distance' && userGeoPoint !== undefined) {
    query.near('coordinates', userGeoPoint);
  }
  query.find().then(function (results) {
    let response = {};
    let restaurants = [];
    _.each(results, function (result) {
      const restaurant = restaurantAssembler.assemble(result, latitude, longitude);
      restaurants.push(restaurant);
    });
    response['results'] = restaurants;
    res.status(200).json(response);
  }, function (error) {
    errorHandler.handle(error, res);
  })
};

/**
 * Find restaurant by Id including dishes, reviews and photos
 * @param req
 * @param res
 */
exports.findById = function (req, res) {
  const id = req.params.id;
  let longitude = undefined;
  let latitude = undefined;
  if (req.query.lon !== undefined) {
    longitude = parseFloat(req.query.lon);  
  }
  if (req.query.lat !== undefined) {
    latitude = parseFloat(req.query.lat);
  }
  const p1 = findRestaurantById(id);
  const p2 = findHotDishesByRestaurantId(id);
  const p3 = findHotReviewsByRestaurantId(id);
  const p4 = findPhotosByRestaurantId(id);
  const p5 = findGoogleRestaurantById(id);
  Parse.Promise.when(p1, p2, p3, p4, p5).then(function (_restaurant, _dishes, _review, _photo, restaurantFromGoogle) {
    let restaurant = restaurantAssembler.assemble(_restaurant);
    let dishes = [];
    if (_dishes !== undefined && _dishes.length > 0) {
      _.each(_dishes, function (_dish) {
        let dish = dishAssembler.assemble(_dish);
        dishes.push(dish);
      });
    }
    if (_review !== undefined) {
      let reviewsContainer = {};
      reviewsContainer['total_count'] = _review['total_count'];
      let reviews = [];
      if (_review['reviews'] !== undefined && _review['reviews'].length > 0) {
        _.each(_review['reviews'], function (item) {
          let review = reviewAssembler.assemble(item);
          reviews.push(review);
        });
      }
      reviewsContainer['reviews'] = reviews;
      restaurant['review_info'] = reviewsContainer;
    }
    if (_photo !== undefined) {
      let photosContainer = {};
      photosContainer['total_count'] = _photo['total_count'];
      let photos = [];
      if (_photo['photos'] !== undefined && _photo['photos'].length > 0) {
        _.each(_photo['photos'], function (item) {
          let photo = imageAssembler.assemble(item);
          photos.push(photo);
        });
      }
      photosContainer['photos'] = photos;
      restaurant['photo_info'] = photosContainer;
    }
    if (restaurantFromGoogle !== undefined) {
      restaurant['open_now'] = restaurantFromGoogle.result.opening_hours.open_now;
      restaurant['open_time_today'] = restaurantFromGoogle.result.opening_hours.weekday_text[(new Date().getDay() - 1) % 7];
      restaurant['english_name'] = restaurantFromGoogle.result.name;
      restaurant['address'] = restaurantFromGoogle.result.formatted_address;
      restaurant['phone'] = restaurantFromGoogle.result.formatted_phone_number;
      restaurant['rating'] = restaurantFromGoogle.result.rating;
      if (restaurantFromGoogle.result.photos !== undefined && restaurantFromGoogle.result.photos.length > 0) {
        _.each(restaurantFromGoogle.result.photos, item => {
          restaurant['photo_info']['photos'].push(googlePhotoAssember.assemble(item));
        });
        restaurant['photo_info']['total_count'] += restaurantFromGoogle.result.photos.length;
      }

      if (latitude !== undefined && longitude !== undefined) {
        const startPoint = new Parse.GeoPoint(latitude, longitude);
        const destination = new Parse.GeoPoint(restaurantFromGoogle.result.geometry.location.lat, restaurantFromGoogle.result.geometry.location.lng);
        let distanceValue = startPoint.milesTo(destination);
        let distance = {};
        if (distanceValue !== undefined) {
          distanceValue = parseFloat(distanceValue.toFixed(2));
          distance["value"] = distanceValue;
          distance["unit"] = "mi";
          restaurant['distance'] = distance;
        }
      }
    }
    let response = {};
    response['result'] = restaurant;
    res.status(200).json(response);

  }, function (error) {
    errorHandler.handle(error, res);
  });
};

function findRestaurantById(id) {
  const query = new Parse.Query(Restaurant);
  query.include('image');
  return query.get(id);
}

function findGoogleRestaurantById(id) {
  const promise = new Parse.Promise();
  const query = new Parse.Query(Restaurant);
  query.get(id).then(restaurant => {
    google.client().placeDetail('ChIJl41rEWC1j4AR9m5ndL7k-Js').then(restaurantFromGoogle => {
      promise.resolve(restaurantFromGoogle);
    });
  });
  return promise;
}

function findHotDishesByRestaurantId(id) {
  const rest = new Restaurant();
  rest.id = id;
  const query = new Parse.Query(Dish);
  query.equalTo('from_restaurant', rest);
  query.include('image');
  query.descending("like_count");
  query.limit(10);
  return query.find();
}

function findHotReviewsByRestaurantId(id) {
  const promise = new Parse.Promise();
  const reviewQuery = new Parse.Query(Review);
  reviewQuery.descending('review_quality');
  reviewQuery.limit(5);
  reviewQuery.include('user');
  reviewQuery.include('user.picture');
  reviewQuery.exists('content');
  const restaurant = new Restaurant();
  restaurant.id = id;
  reviewQuery.equalTo('restaurant', restaurant);

  const p1 = reviewQuery.find();
  const p2 = reviewQuery.count();
  Parse.Promise.when(p1, p2).then(function (_reviews, _count) {
    const result = {};
    result['reviews'] = _reviews;
    result['total_count'] = _count;
    promise.resolve(result);
  });
  return promise;
}

function findPhotosByRestaurantId(id) {
  const promise = new Parse.Promise();
  const query = new Parse.Query(Image);
  const restaurant = new Restaurant();
  restaurant.id = id;
  query.equalTo('restaurant', restaurant);

  const p1 = query.find();
  const p2 = query.count();
  Parse.Promise.when(p1, p2).then(function (_photos, _count) {
    const result = {};
    result['photos'] = _photos;
    result['total_count'] = _count;
    promise.resolve(result);
  });
  return promise;
}

/**
 * Update restaurant by Id. We only update restaurant image for now.
 * @param req
 * @param res
 */
exports.update = function (req, res) {
  const id = req.params.id;
  const restaurant = new Restaurant();
  restaurant.id = id;
  const imageId = req.body["image_id"];
  if (imageId !== undefined) {
    const picture = {
      __type: "Pointer",
      className: "Image",
      objectId: imageId
    };
    restaurant.set('image', picture)
  }
  restaurant.save().then(function (_restaurant) {
    const restaurant = restaurantAssembler.assemble(_restaurant);
    const image = _restaurant.get('image');
    if (image !== undefined) {
      image.fetch().then(function (_image) {
        const imageRes = imageAssembler.assemble(_image);
        const response = {};
        restaurant['picture'] = imageRes;
        response['result'] = restaurant;
        res.status(200).json(response);
      }, function (error) {
        errorHandler.handle(error, res);
      });
    } else {
      const response = {};
      response['result'] = restaurant;
      res.status(200).json(response);
    }
  }, function (error) {
    errorHandler.handle(error, res);
  });
}
