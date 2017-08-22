'use strict';

const Restaurant = Parse.Object.extend('Restaurant');
const Image = Parse.Object.extend('Image');
const Review = Parse.Object.extend('Review');
const RecommendedDish = Parse.Object.extend('RecommendedDish');
const Favorite = Parse.Object.extend('Favorite');
const _ = require('underscore');
const restaurantAssembler = require('../assemblers/restaurant');
const errorHandler = require('../errorHandler');
const imageAssembler = require('../assemblers/image');
const googlePhotoAssembler = require('../assemblers/googlePhoto');
const reviewAssembler = require('../assemblers/review');
const recommendedDishAssembler = require('../assemblers/recommendedDish');

const google = require('../util/googlePlace.js');

/**
 * Find restaurant by Id including dishes, reviews and photos
 * @param req
 * @param res
 */
exports.findRestaurantById = function (req, res) {
  const id = req.params.id;
  const currentUser = req.user;
  let longitude = undefined;
  let latitude = undefined;
  if (req.query.lon !== undefined) {
    longitude = parseFloat(req.query.lon);
  }
  if (req.query.lat !== undefined) {
    latitude = parseFloat(req.query.lat);
  }
  const p1 = findRestaurantById(id);
  const p2 = findRecommendedDishesByRestaurantId(id);
  const p3 = findReviewsByRestaurantId(id);
  const p4 = findPhotosByRestaurantId(id);
  const p5 = findGoogleRestaurantById(id);
  const p6 = checkIfCurrentUserFavorite(id, currentUser);
  Parse.Promise.when(p1, p2, p3, p4, p5, p6).then(function (restaurant, recommendedDishes, reviews, photos, restaurantFromGoogle, isCurrentUserFavorite) {
    const restaurantRes = restaurantAssembler.assemble(restaurant);
    restaurantRes['review_info'] = {
      "total_count": 0,
      "reviews": []
    };
    restaurantRes['photo_info'] = {
      "total_count": 0,
      "photos": []
    };
    
    restaurantRes['recommended_dishes'] = [];
    if (recommendedDishes !== undefined) {
      _.each(recommendedDishes, item => {
        restaurantRes['recommended_dishes'].push(recommendedDishAssembler.assemble(item));
      });
    }
    
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
      
      // AWS is using UTC time, convert UTC to PST
      // TODO: only works in PST time, need user local time
      let day = new Date().getDay();
      if (new Date().getHours() - 8 < 0) {
        day += 6;
      }
      restaurantRes['open_time_today'] = restaurantFromGoogle.result.opening_hours.weekday_text[(day + 6) % 7];
      restaurantRes['english_name'] = restaurantFromGoogle.result.name;
      restaurantRes['address'] = restaurantFromGoogle.result.formatted_address;
      restaurantRes['phone'] = restaurantFromGoogle.result.formatted_phone_number;
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
    if (isCurrentUserFavorite !== undefined) {
      restaurantRes['current_user_favorite'] = isCurrentUserFavorite;
    }
    const response = {
      'result': restaurantRes
    };
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
    google.client().placeDetail(restaurant.get('google_place_id')).then(restaurantFromGoogle => {
      promise.resolve(restaurantFromGoogle);
    });
  });
  return promise;
}

function findRecommendedDishesByRestaurantId(id) {
  const restaurant = new Restaurant();
  restaurant.id = id;
  const query = new Parse.Query(RecommendedDish);
  query.equalTo('restaurant', restaurant);
  query.include('image');
  query.descending("recommendation_count");
  return query.find();
}

function findReviewsByRestaurantId(id) {
  const promise = new Parse.Promise();
  const reviewQuery = new Parse.Query(Review);
  reviewQuery.descending('updatedAt');
  reviewQuery.include('user');
  reviewQuery.include('user.picture');
  reviewQuery.exists('content');
  const restaurant = new Restaurant();
  restaurant.id = id;
  reviewQuery.equalTo('restaurant', restaurant);

  reviewQuery.find().then(reviews => {
    const result = {
      'reviews': reviews,
      'total_count': reviews.length
    };
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
  query.descending('updatedAt');

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

function checkIfCurrentUserFavorite(id, user) {
  const promise = new Parse.Promise();
  if (user === undefined) {
    promise.resolve();
    return promise;
  }
  const query = new Parse.Query(Favorite);
  const restaurant = new Restaurant();
  restaurant.id = id;
  query.equalTo('restaurant', restaurant);
  query.equalTo('user', user);
  query.first().then(first => {
    if (first !== undefined) {
      promise.resolve(true);
    } else {
      promise.resolve(false);
    }
  });
  return promise;
}

/**
 * Update restaurant by Id. We only update restaurant name for now.
 * @param req
 * @param res
 */
exports.updateRestaurantById = function (req, res) {
  const id = req.params.id;
  const restaurant = new Restaurant();
  restaurant.id = id;
  const name = req.body["name"];
  restaurant.set('name', name);
  
  restaurant.save().then(restaurant => {
    const response = {
      'result': restaurantAssembler.assemble(restaurant)
    };
    res.status(200).json(response);
  }, error => {
    errorHandler.handle(error, res);
  });
};
