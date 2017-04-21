var _ = require('underscore');
var Review = Parse.Object.extend('Review');
var UserActivity = Parse.Object.extend('UserActivity');
var error_handler = require('../error_handler');
var Image = Parse.Object.extend('Image');
var Restaurant = Parse.Object.extend('Restaurant');
var review_assembler = require('../assemblers/review');
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('cloud/config.js'));


// request:
// {
// 	"rating" : 5,
// 	"content" : "this is a good restaurant",
// 	"photos" : ["s8gh3ksg2d", "s8gi4hsgs7"],
// 	"id" : "9wigjh2d8u",
//	"restaurant_id" : "7u6y5t4r"
// }
// response:
// {
// 	"id" : "8i7u6y5t4r"
// }
// expected: 1. create a review record; 2. set review id to linked images to create
// a connection; 3. if user_id not undefined, also create a user activity record
// review quality = 不重复字数 * 1 + 图片数 * 10
exports.createReview = function (req, res) {
  var user = req.user;
  var rating = req.body['rating'];
  var content = req.body['content'];
  var id = req.body['id'];
  var photos = req.body['photos'];
  console.log("photos count = " + photos.length);
  var restaurantId = req.body['restaurant_id'];
  var review = new Review();
  if (id !== undefined) {
    review.id = id;
  }
  review.set('content', content);
  review.set('rating', rating);
  var isGoodReview = false;
  var reviewQuality = calculateQuality(content, photos);
  if (reviewQuality >= config['review']['good_review_threshold']) {
    isGoodReview = true;
  }
  review.set('good_review', isGoodReview);
  review.set('review_quality', reviewQuality);
  var restaurant = new Restaurant();
  restaurant.id = restaurantId;
  review.set('restaurant', restaurant);
  var acl = new Parse.ACL();
  acl.setPublicReadAccess(true);
  if (user != undefined) {
    review.set('user', user);
    acl.setWriteAccess(user.id, true);
    var userPoints = config['review']['user_points'];
    if (reviewQuality >= config['review']['good_review_threshold']) {
      userPoints = config['review']['good_review_user_points'];
    }
    user.increment('points', userPoints);
  }
  // var objectsToSave = [];
  // objectsToSave.push(review);
  review.setACL(acl);
  review.save().then(function (savedReview) {
    var objectsToSave = [];
    if (photos != undefined && _.isArray(photos) && photos.length > 0) {
      console.log("images ".concat(photos));
      _.each(photos, function (photoId) {
        var image = new Image();
        image.id = photoId;
        image.set('owner_type', "Review");
        image.set('review', savedReview);
        objectsToSave.push(image);
      });
    }
    if (id == undefined) { // New review, also create a new user activity if necessary
      if (user != undefined) {
        var userActivity = new UserActivity();
        userActivity.set('user', user);
        userActivity.set('type', 'review');
        userActivity.set('review', savedReview);
        objectsToSave.push(userActivity);
      }
    }
    Parse.Object.saveAll(objectsToSave);
    var response = {};
    response['result'] = review_assembler.assemble(savedReview);
    res.status(201).json(response);
  }, function (error) {
    error_handler.handle(error, {}, res);
  });

}

function calculateQuality(content, photos) {
  var quality = 0;
  var pictureValue = config['review']['picture_value'];
  var wordValue = config['review']['word_value'];
  console.log(wordValue);
  if (content != undefined) {
    var splitter = ' ';
    if (content.match(/[\u3400-\u9FBF]/)) {
      splitter = '';
    }
    var uniqueList = content.split(splitter).filter(function (allItems, i, a) {
      return i == a.indexOf(allItems);
    });
    quality += uniqueList.length * wordValue;
  }
  if (photos != undefined) {
    quality += photos.length * pictureValue;
  }
  return quality;
}

exports.listReviews = function (req, res) {
  var restaurantId = req.query['restaurant_id'];
  console.log(restaurantId);
  console.log(req.params);
  var sort = req.query['sort'];
  var skip = req.query["skip"];
  var limit = req.query["limit"];
  var reviewQuery = new Parse.Query(Review);
  var restaurant = new Restaurant();
  restaurant.id = restaurantId;
  console.log(restaurant.id);
  reviewQuery.equalTo('restaurant', restaurant);
  if (sort == 'latest') {
    reviewQuery.descending('updatedAt');
  } else {
    reviewQuery.descending('review_quality');
  }
  reviewQuery.skip(skip);
  reviewQuery.limit(limit);
  reviewQuery.include('user');
  reviewQuery.include('user.picture');
  reviewQuery.find().then(function (_reviews) {
    var response = {};
    var results = [];
    _.each(_reviews, function (_review) {
      var review = review_assembler.assemble(_review);
      results.push(review);
    });

    response['results'] = results;
    res.status(200).json(response);
  }, function (error) {
    error_handler.handle(error, {}, res);
  });
}

exports.fetchReview = function (req, res) {
  var id = req.params.id;
  var reviewQuery = new Parse.Query(Review);
  reviewQuery.equalTo('objectId', id);
  reviewQuery.include('user');
  reviewQuery.include('user.picture');
  reviewQuery.include('restaurant');
  var imageQuery = new Parse.Query(Image);
  imageQuery.equalTo('owner_type', 'Review');
  var review = new Review();
  review.id = id;
  imageQuery.equalTo('review', review);
  var p1 = reviewQuery.find();
  var p2 = imageQuery.find();
  Parse.Promise.when(p1, p2).then(function (_reviews, _photos) {
    if (_reviews != undefined && _reviews.length > 0) {
      console.log(_photos.length);
      var review = review_assembler.assemble(_reviews[0], _photos);
      var response = {};
      response['result'] = review;
      res.status(200).json(response);
    } else {
      res.status(404).json({});
    }

  }, function (error) {
    error_handler.handle(error, {}, res);
  });
}