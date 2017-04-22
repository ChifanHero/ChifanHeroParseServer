var _ = require('underscore');
var imageAssembler = require('../assemblers/image');
var errorHandler = require('../errorHandler');
var UserActivity = Parse.Object.extend('UserActivity');
var Image = Parse.Object.extend('Image');
var sharp = require('sharp');

'use strict'

const ORIGINAL_SIZE = 800;
const THUMBNAIL_SIZE = 100;

exports.uploadImage = function (req, res) {
  var restaurantId = req.body["restaurant_id"];
  var type = req.body["type"];
  var base64Code = req.body["base64_code"];
  var clientEventId = req.body["event_id"];
  var user = req.user;

  var p1 = createResizedImage(base64Code, ORIGINAL_SIZE);
  var p2 = createResizedImage(base64Code, THUMBNAIL_SIZE);

  Parse.Promise.when(p1, p2).then(function (originalBase64Code, thumbnailBase64Code) {
    var originalImage = new Parse.File(type + ".jpeg", {base64: originalBase64Code});
    var thumbnailImage = new Parse.File(type + ".jpeg", {base64: thumbnailBase64Code});
    var newImage = new Image();
    newImage.set("original", originalImage);
    newImage.set("thumbnail", thumbnailImage);
    newImage.set("type", type);
    if (restaurantId != undefined) {
      var restaurant = {
        __type: "Pointer",
        className: "Restaurant",
        objectId: restaurantId
      };
      newImage.set("restaurant", restaurant);
    }

    newImage.save().then(function (newImage) {
      if (user != undefined) {
        createUserActivity(clientEventId, user, newImage.id, restaurantId);
        var userPoints = config['upload_image']['user_points'];
        user.increment('points', userPoints);
        user.save();
      }
      var imageRes = imageAssembler.assemble(newImage);
      var response = {};
      response['result'] = imageRes;
      res.status(200).json(response);
    }, function (error) {
      errorHandler.handle(error, {}, res);
    });
  });
}

exports.findAllByRestaurantId = function (req, res) {
  var restaurantId = req.query.restaurantId;
  var restaurant = {
    __type: "Pointer",
    className: "Restaurant",
    objectId: restaurantId
  };
  var query = new Parse.Query(Image);
  query.equalTo('restaurant', restaurant);
  query.find().then(function (images) {
    var results = [];
    if (images != undefined && images.length > 0) {
      _.each(images, function (image) {
        var result = imageAssembler.assemble(image);
        results.push(result);
      });
    }
    var response = {};
    response['results'] = results;
    res.status(200).json(response)
  }, function (error) {
    errorHandler.handle(error, {}, res);
  });
}

function createResizedImage(base64Code, size) {
  var promise = new Parse.Promise();

  var buffer = new Buffer(base64Code, 'base64');
  sharp(buffer)
    .resize(size, size)
    .max()
    .toFormat('jpeg')
    .toBuffer()
    .then(data => {
      promise.resolve(data.toString('base64'));
    });

  return promise;
}

function createUserActivity(eventId, user, imageId, restaurantId) {
  var query = new Parse.Query(UserActivity);
  query.equalTo('event_id', eventId);
  query.find().then(function (activities) {
    var activity;
    if (activities != undefined && activities.length > 0) {
      activity = activities[0];
    } else {
      activity = new UserActivity();
    }
    activity.set('user', user);
    activity.set('event_id', eventId);
    activity.set('type', 'upload_image');
    activity.add('photos', imageId);
    if (activity.get('restaurant') == undefined) {
      var restaurant = {
        __type: "Pointer",
        className: "Restaurant",
        objectId: restaurantId
      };
      activity.set('restaurant', restaurant);
    }
    activity.save();
  }, function () {

  });
}
