var _ = require('underscore');
var Rating = Parse.Object.extend('Rating');
var Restaurant = Parse.Object.extend('Restaurant');
var Dish = Parse.Object.extend('Dish');
var List = Parse.Object.extend('SelectedCollection');
var restaurantAssembler = require('../assemblers/restaurant');
var rating_assembler = require('../assemblers/rating');
var errorHandler = require('../errorHandler');

exports.rateByUserSession = function (req, res) {
  var user = req.user;
  var type = req.body['type'];
  var action = req.body['action'];
  var objectId = req.body['object_id'];
  if (!validateParameters(type, action, res)) {
    return;
  }
  var rating = new Rating();
  if (type === 'dish') {
    var dish = {
      __type: "Pointer",
      className: "Dish",
      objectId: objectId
    };
    rating.set('type', type);
    rating.set('action', action);
    rating.set('user', user);
    rating.set('dish', dish);
  } else if (type === 'restaurant') {
    var restaurant = {
      __type: "Pointer",
      className: "Restaurant",
      objectId: objectId
    };
    rating.set('type', type);
    rating.set('action', action);
    rating.set('user', user);
    rating.set('restaurant', restaurant);
  } else if (type === 'selected_collection') {
    var selected_collection = {
      __type: "Pointer",
      className: "SelectedCollection",
      objectId: objectId
    };
    rating.set('type', type);
    rating.set('action', action);
    rating.set('user', user);
    rating.set('selected_collection', selected_collection);
  }
  rating.save().then(function (_rating) {
    var ratingRes = rating_assembler.assemble(_rating);
    var response = {};
    response['result'] = ratingRes;
    res.status(201).json(response);
  }, function (error) {
    errorHandler.handle(error, {}, res);
  });
}

function validateParameters(type, action, res) {
  if (type !== 'dish' && type !== 'restaurant' && type !== 'selected_collection') {
    var error = new Parse.Error(Parse.Error.INVALID_QUERY, "The parameter \'type\' is invalid");
    errorHandler.handle(error, {}, res);
    return false;
  }
  if (action !== 'like' && action != 'dislike' && action != 'neutral') {
    var error = new Parse.Error(Parse.Error.INVALID_QUERY, "The parameter \'action\' is invalid");
    errorHandler.handle(error, {}, res);
    return false;
  }
  return true;
}

exports.findByUserSession = function (req, res) {
  var action = req.query['action'];
  var type = req.query['type'];
  var user = req.user;
  if (user == undefined) {
    var error = new Parse.Error(Parse.Error.SESSION_MISSING, "Not able to recoginize the user");
    errorHandler.handle(error, {}, res);
  } else {
    if (!validateParameters(type, action, res)) {
      return;
    }
    var query = new Parse.Query(rating);
    query.equalTo('user', user);
    query.limit(10);
    query.include('dish.from_restaurant');
    query.include('dish.picture');
    query.include('restaurant.picture');
    query.include('selected_collection');
    query.equalTo('type', type);
    query.find().then(function (results) {
      if (results != undefined && results.length > 0) {
        var ratings = [];
        _.each(results, function (result) {
          var rev = rating_assembler.assemble(result);
          ratings.push(rev);
        });
        var response = {};
        response['results'] = ratings;
        res.status(200).json(response);
      } else {
        var response = {};
        response['results'] = [];
        res.status(200).json(response);
      }
    }, function (error) {
      errorHandler.handle(error, {}, res);
    });
  }

}