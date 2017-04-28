var Restaurant = Parse.Object.extend('Restaurant');
var Image = Parse.Object.extend('Image');
var Review = Parse.Object.extend('Review');
var RestaurantCandidate = Parse.Object.extend('RestaurantCandidate');
var Dish = Parse.Object.extend('Dish');
var _ = require('underscore');
var restaurantAssembler = require('../assemblers/restaurant');
var dishAssembler = require('../assemblers/dish');
var errorHandler = require('../errorHandler');
var imageAssembler = require('../assemblers/image');
var reviewAssembler = require('../assemblers/review');

/**
 * Find all restaurants satisfying requirements
 * @param req
 * @param res
 */
exports.findAll = function (req, res) {
  var latitude = req.query['lat'];
  var longitude = req.query['lon'];
  var skip = req.query['skip'];
  var limit = req.query['limit'];
  if (limit === undefined) {
    limit = 10;
  }
  var sortBy = req.query['sort_by'];
  var sortOrder = req.query['sort_order'];
  var userGeoPoint = undefined;
  if (latitude != undefined && longitude != undefined) {
    userGeoPoint = new Parse.GeoPoint(latitude, longitude);
  }
  var query = new Parse.Query(Restaurant);
  query.include('image');
  if (userGeoPoint != undefined) {
    query.withinMiles("coordinates", userGeoPoint, 100);
  }
  if (skip != undefined) {
    query.skip(skip);
  }
  if (limit != undefined) {
    query.limit(limit);
  }
  if (sortBy == 'hotness') {
    if (sortOrder == 'ascend') {
      query.ascending('like_count');
    } else {
      query.descending('like_count');
    }
  } else if (sortBy == 'distance' && userGeoPoint != undefined) {
    query.near('coordinates', userGeoPoint);
  }
  query.find().then(function (results) {
    var response = {};
    var restaurants = [];
    _.each(results, function (result) {
      var restaurant = restaurantAssembler.assemble(result, latitude, longitude);
      restaurants.push(restaurant);
    });
    response['results'] = restaurants;
    res.status(200).json(response);
  }, function (error) {
    errorHandler.handle(error, res);
  })
}

/**
 * Find restaurant by Id including dishes, reviews and photos
 * @param req
 * @param res
 */
exports.findById = function (req, res) {
  var id = req.params.id;
  var longitude = undefined;
  var latitude = undefined;
  if (req.query.lon != undefined) {
    longitude = parseFloat(req.query.lon);  
  }
  if (req.query.lat != undefined) {
    latitude = parseFloat(req.query.lat);
  }
  var p1 = findRestaurantById(id);
  var p2 = findHotDishesByRestaurantId(id);
  var p3 = findHotReviewsByRestaurantId(id);
  var p4 = findPhotosByRestaurantId(id);
  Parse.Promise.when(p1, p2, p3, p4).then(function (_restaurant, _dishes, _review, _photo) {
    var restaurant = restaurantAssembler.assemble(_restaurant, latitude, longitude);
    var dishes = [];
    if (_dishes != undefined && _dishes.length > 0) {
      _.each(_dishes, function (_dish) {
        var dish = dishAssembler.assemble(_dish);
        dishes.push(dish);
      });
    }
    if (_review != undefined) {
      var reviewsContainer = {};
      reviewsContainer['total_count'] = _review['total_count'];
      var reviews = [];
      if (_review['reviews'] != undefined && _review['reviews'].length > 0) {
        _.each(_review['reviews'], function (item) {
          var review = reviewAssembler.assemble(item);
          reviews.push(review);
        });
      }
      reviewsContainer['reviews'] = reviews;
      restaurant['review_info'] = reviewsContainer;
    }
    if (_photo != undefined) {
      var photosContainer = {};
      photosContainer['total_count'] = _photo['total_count'];
      var photos = [];
      if (_photo['photos'] != undefined && _photo['photos'].length > 0) {
        _.each(_photo['photos'], function (item) {
          var photo = imageAssembler.assemble(item);
          photos.push(photo);
        });
      }
      photosContainer['photos'] = photos;
      restaurant['photo_info'] = photosContainer;
    }
    var response = {};
    response['result'] = restaurant;
    res.status(200).json(response);

  }, function (error) {
    errorHandler.handle(error, res);
  });
}

/**
 * Rate restaurant with like, neutral and dislike
 * @param req
 * @param res
 */
exports.rate = function (req, res) {
  var id = req.params.id;
  var like = 0;
  var dislike = 0;
  var neutral = 0;

  if (req.body['like'] === true) {
    like = 1;
  } else if (req.body['dislike'] === true) {
    dislike = 1;
  } else if (req.body['neutral'] === true) {
    neutral = 1;
  }

  var query = new Parse.Query(Restaurant);
  query.get(id).then(function (_restaurant) {
    var likeCount = _restaurant.get('like_count');
    var dislikeCount = _restaurant.get('dislike_count');
    var neutralCount = _restaurant.get('neutral_count');
    _restaurant.increment('like_count', like);
    _restaurant.increment('dislike_count', dislike);
    _restaurant.increment('neutral_count', neutral);
    _restaurant.increment('rating_total', like + dislike + neutral);
    _restaurant.save().then(function (_restaurant) {
      var restaurantRes = restaurantAssembler.assemble(_restaurant);
      var response = {};
      response['result'] = restaurantRes;
      res.status(200).json(response);
    }, function (error) {
      errorHandler.handle(error, res);
    });
  }, function (error) {
    errorHandler.handle(error, res);
  });
}

function findRestaurantById(id) {
  var query = new Parse.Query(Restaurant);
  query.include('image');
  return query.get(id);
}

function findHotDishesByRestaurantId(id) {
  var rest = new Restaurant();
  rest.id = id;
  var query = new Parse.Query(Dish);
  query.equalTo('from_restaurant', rest);
  query.include('image');
  query.descending("like_count");
  query.limit(10);
  return query.find();
}

function findHotReviewsByRestaurantId(id) {
  var promise = new Parse.Promise();
  var reviewQuery = new Parse.Query(Review);
  reviewQuery.descending('review_quality');
  reviewQuery.limit(5);
  reviewQuery.include('user');
  reviewQuery.include('user.picture');
  reviewQuery.exists('content');
  var restaurant = new Restaurant();
  restaurant.id = id;
  reviewQuery.equalTo('restaurant', restaurant);

  var p1 = reviewQuery.find();
  var p2 = reviewQuery.count();
  Parse.Promise.when(p1, p2).then(function (_reviews, _count) {
    var result = {};
    result['reviews'] = _reviews;
    result['total_count'] = _count;
    promise.resolve(result);
  });
  return promise;
}

function findPhotosByRestaurantId(id) {
  var promise = new Parse.Promise();
  var query = new Parse.Query(Image);
  var restaurant = new Restaurant();
  restaurant.id = id;
  query.equalTo('restaurant', restaurant);

  var p1 = query.find();
  var p2 = query.count();
  Parse.Promise.when(p1, p2).then(function (_photos, _count) {
    var result = {};
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
  var id = req.params.id;
  var restaurant = new Restaurant();
  restaurant.id = id;
  var imageId = req.body["image_id"];
  if (imageId != undefined) {
    var picture = {
      __type: "Pointer",
      className: "Image",
      objectId: imageId
    };
    restaurant.set('image', picture)
  }
  restaurant.save().then(function (_restaurant) {
    var restaurant = restaurantAssembler.assemble(_restaurant);
    var image = _restaurant.get('image');
    if (image != undefined) {
      image.fetch().then(function (_image) {
        var imageRes = imageAssembler.assemble(_image);
        var response = {};
        restaurant['picture'] = imageRes;
        response['result'] = restaurant;
        res.status(200).json(response);
      }, function (error) {
        errorHandler.handle(error, res);
      });
    } else {
      var response = {};
      response['result'] = restaurant;
      res.status(200).json(response);
    }
  }, function (error) {
    errorHandler.handle(error, res);
  });
}

/*
 exports.vote = function (req, res) {
 var id = req.body['restaurant_id'];
 if (id === undefined) {
 var error = {};
 error['message'] = 'Please provide restaurant id';
 res.status(401).json(error);
 return;
 } else {
 var checkQuery = new Parse.Query(Restaurant);
 checkQuery.get(id).then(function (rest) {

 var candidateQuery = new Parse.Query(RestaurantCandidate);
 candidateQuery.equalTo('restaurant', rest);
 candidateQuery.find(function (candidates) {
 if (candidates.length == 0) {
 var candidate = new RestaurantCandidate();
 candidate.set('restaurant', rest);
 candidate.set('votes', 1);
 candidate.save().then(function (outcome) {
 var response = {};
 var created = {};
 created['id'] = outcome.id;
 created['votes'] = outcome.get('votes');
 response['result'] = created;
 res.status(200).json(response);
 }, function (error) {
 errorHandler.handle(error, res);
 });
 } else {
 var existingCandidate = candidates[0];
 existingCandidate.increment("votes");
 existingCandidate.save().then(function (outcome) {
 var response = {};
 var created = {};
 created['id'] = outcome.id;
 created['votes'] = outcome.get('votes');
 response['result'] = created;
 res.status(200).json(response);
 }, function (error) {
 errorHandler.handle(error, res);
 });
 }
 }, function (error) {
 errorHandler.handle(error, res);
 });
 }, function () {
 var error = {};
 error['message'] = 'restaurant not found';
 res.status(404).json(error);
 });
 }
 }*/
