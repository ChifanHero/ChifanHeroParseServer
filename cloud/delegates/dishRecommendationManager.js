var _ = require('underscore');
var UserActivity = Parse.Object.extend('UserActivity');
var Dish = Parse.Object.extend('NewDish');
var errorHandler = require('../errorHandler');
var Image = Parse.Object.extend('Image');
var Restaurant = Parse.Object.extend('Restaurant');
var dishAssembler = require('../assemblers/dish');

/**
 * Please skip this feature for now
 * @param req
 * @param res
 */
exports.createDishRecommendation = function (req, res) {
  var user = req.user;
  var dishId = req.body['dish_id'];
  var dishName = req.body['dish_name'];
  var restaurantId = req.body['restaurant_id'];
  var photos = req.body['photos'];
  var dish = new Dish();
  var userPoints = CONFIG.dish_recommendation.user_points;
  if (dishId !== undefined) {
    dish.id = dishId;
  } else {
    var restaurant = {
      __type: "Pointer",
      className: "Restaurant",
      objectId: restaurantId
    };
    dish.set('from_restaurant', restaurant);
    dish.set('name', dishName);
  }
  dish.increment('recommend_count', 1);
  if (user != undefined) {
    dish.add('recommended_by', user.id);
    user.increment('points', userPoints);
    user.save();
  }
  dish.save().then(function (_dish) {
    var objectsToSave = [];
    if (user != undefined) {
      var userActivity = new UserActivity();
      userActivity.set('user', user);
      userActivity.set('type', 'recommend_dish');
      userActivity.set('dish', _dish);
      objectsToSave.push(userActivity);
    }
    if (photos != undefined && _.isArray(photos) && photos.length > 0) {
      _.each(photos, function (photoId) {
        var image = new Image();
        image.id = photoId;
        image.set('owner_type', "Dish");
        image.set('dish', _dish);
        objectsToSave.push(image);
      });
    }
    Parse.Object.saveAll(objectsToSave);
    var response = {};
    var recommendation = {};
    recommendation['dish'] = dishAssembler.assemble(_dish);
    recommendation['points_rewarded'] = userPoints;
    response['result'] = recommendation;
    res.status(201).json(response);
  }, function (error) {
    errorHandler.handle(error, res);
  });
}
