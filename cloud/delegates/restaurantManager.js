"use strict";

const Restaurant = Parse.Object.extend('Restaurant');
const Image = Parse.Object.extend('Image');
const Review = Parse.Object.extend('Review');
const RestaurantCandidate = Parse.Object.extend('RestaurantCandidate');
const Dish = Parse.Object.extend('Dish');
const _ = require('underscore');
const restaurantAssembler = require('../assemblers/restaurant');
const errorHandler = require('../errorHandler');
const imageAssembler = require('../assemblers/image');
const googlePhotoAssembler = require('../assemblers/googlePhoto');
const reviewAssembler = require('../assemblers/review');

const google = require('../util/googlePlace.js');

/**
 * Find restaurant by Id including dishes, reviews and photos
 * @param req
 * @param res
 */
exports.findRestaurantById = function (req, res) {
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
  const p3 = findReviewsByRestaurantId(id);
  const p4 = findPhotosByRestaurantId(id);
  const p5 = findGoogleRestaurantById(id);
  Parse.Promise.when(p1, p2, p3, p4, p5).then(function (restaurant, dishes, reviews, photos, restaurantFromGoogle) {
    const restaurantRes = restaurantAssembler.assemble(restaurant);
    restaurantRes['review_info'] = {
      "total_count": 0,
      "reviews": []
    };
    restaurantRes['photo_info'] = {
      "total_count": 0,
      "photos": []
    };
    
    if (reviews !== undefined) {
      restaurantRes['review_info']['total_count'] = reviews['total_count'];
      if (reviews['reviews'] !== undefined && reviews['reviews'].length > 0) {
        _.each(reviews['reviews'],  item => {
          restaurantRes['review_info']['reviews'].push(reviewAssembler.assemble(item));
        });
      }
    }
    if (photos !== undefined) {
      restaurantRes['photo_info']['total_count'] = photos['total_count'];
      if (photos['photos'] !== undefined && photos['photos'].length > 0) {
        _.each(photos['photos'], item => {
          restaurantRes['photo_info']['photos'].push(imageAssembler.assemble(item));
        });
      }
      mergePhotosIntoReviews(restaurantRes['review_info']['reviews'], restaurantRes['photo_info']['photos']);
    }
    if (restaurantFromGoogle !== undefined) {
      restaurantRes['open_now'] = restaurantFromGoogle.result.opening_hours.open_now;
      restaurantRes['open_time_today'] = restaurantFromGoogle.result.opening_hours.weekday_text[(new Date().getDay() + 6) % 7];
      restaurantRes['english_name'] = restaurantFromGoogle.result.name;
      restaurantRes['address'] = restaurantFromGoogle.result.formatted_address;
      restaurantRes['phone'] = restaurantFromGoogle.result.formatted_phone_number;
      restaurantRes['rating'] = mergeRating(restaurantRes['rating'], restaurantRes['rating_count'], restaurantFromGoogle.result.rating);
      for (let i = 0; i < restaurantFromGoogle.result.address_components.length; i++) {
        if(restaurantFromGoogle.result.address_components[i].types[0] === 'locality') {
          restaurantRes['city'] = restaurantFromGoogle.result.address_components[i].long_name;
          break;
        }
      }
      if (restaurantFromGoogle.result.photos !== undefined && restaurantFromGoogle.result.photos.length > 0) {
        _.each(restaurantFromGoogle.result.photos, item => {
          restaurantRes['photo_info']['photos'].push(googlePhotoAssembler.assemble(item));
        });
        restaurantRes['photo_info']['total_count'] += restaurantFromGoogle.result.photos.length;
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
          restaurantRes['distance'] = distance;
        }
      }
    }
    let response = {};
    response['result'] = restaurantRes;
    res.status(200).json(response);
  }, function (error) {
    errorHandler.handle(error, res);
  });
};

function mergePhotosIntoReviews(reviews, photos) {
  if(reviews !== undefined) {
    _.each(reviews,  review => {
      review['photos'] = [];
      _.each(photos, photo => {
        if(photo['review'] !== undefined && photo['review']['id'] === review['id']){
          review['photos'].push(photo);
        }
      });
    });
  }
}


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

function findReviewsByRestaurantId(id) {
  const reviewLimit = 3;
  const promise = new Parse.Promise();
  const reviewQuery = new Parse.Query(Review);
  reviewQuery.descending('updatedAt');
  reviewQuery.limit(reviewLimit);
  reviewQuery.include('user');
  reviewQuery.include('user.picture');
  reviewQuery.exists('content');
  const restaurant = new Restaurant();
  restaurant.id = id;
  reviewQuery.equalTo('restaurant', restaurant);

  const p1 = reviewQuery.find();
  const p2 = reviewQuery.count();
  Parse.Promise.when(p1, p2).then(function (reviews, count) {
    const result = {};
    result['reviews'] = reviews;
    result['total_count'] = Math.min(count, reviewLimit);
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
  Parse.Promise.when(p1, p2).then(function (photos, count) {
    const result = {};
    result['photos'] = photos;
    result['total_count'] = count;
    promise.resolve(result);
  });
  return promise;
}

function mergeRating(chifanHeroRating, chifanHeroRatingCount, googleRating) {
  const googleRatingCount = 15; // Assume every restaurant has 15 ratings
  if (chifanHeroRating !== undefined && chifanHeroRatingCount !== undefined) {
    return parseFloat(((chifanHeroRating * chifanHeroRatingCount + googleRating * googleRatingCount) / (chifanHeroRatingCount + googleRatingCount)).toFixed(1));
  }
  return googleRating;
}

/**
 * Update restaurant by Id. We only update restaurant image for now.
 * @param req
 * @param res
 */
exports.updateRestaurantById = function (req, res) {
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
};
