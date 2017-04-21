var _ = require('underscore');
var UserActivity = Parse.Object.extend('UserActivity');
var errorHandler = require('../errorHandler');
var activityAssembler = require('../assemblers/userActivity');
var CONFIG = require('../config.json');

exports.listUserActivities = function (req, res) {
  var userId = req.params['user_id'];
  var skip = req.params["skip"];
  var limit = req.params["limit"];
  var userActivityQuery = new Parse.Query(UserActivity);
  userActivityQuery.skip(skip);
  userActivityQuery.limit(limit);
  userActivityQuery.include('user');
  userActivityQuery.include('user.picture');
  userActivityQuery.include('review');
  userActivityQuery.include('review.restaurant');
  userActivityQuery.include('restaurant');
  userActivityQuery.include('dish');
  // userActivityQuery.include('recommendation');
  userActivityQuery.descending('updatedAt');
  userActivityQuery.find().then(function (_activities) {
    var response = {};
    var results = [];
    _.each(_activities, function (_activity) {
      var activity = activityAssembler.assemble(_activity);
      results.push(activity);
    });

    response['results'] = results;
    res.status(200).json(response);
  }, function (error) {
    errorHandler.handle(error, {}, res);
  });
}