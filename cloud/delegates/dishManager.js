"use strict";

var Dish = Parse.Object.extend('Dish');
var Restaurant = Parse.Object.extend('Restaurant');
var _ = require('underscore');
var dishAssembler = require('../assemblers/dish');
var errorHandler = require('../errorHandler');

/**
 * Find all dishes by restaurantId
 * @param req
 * @param res
 */
exports.findByRestaurantId = function (req, res) {
  var restId = req.query.restaurant;
  var rest = new Restaurant();
  rest.id = restId;
  var query = new Parse.Query(Dish);
  query.include('from_restaurant');
  query.equalTo('from_restaurant', rest);
  query.include('picture');
  query.limit(200);
  query.find().then(function (results) {
    var dishes = [];
    if (results != undefined && results.length > 0) {
      _.each(results, function (result) {
        var dish = dishAssembler.assemble(result);
        dishes.push(dish);
      });
    }
    var response = {};
    response['results'] = dishes;
    res.status(200).json(response);
  }, function (error) {
    errorHandler.handle(error, res);
  });
}

/**
 * Find dish by Id
 * @param req
 * @param res
 */
exports.findById = function (req, res) {
  var id = req.params.id;

  var query = new Parse.Query(Dish);
  query.include('from_restaurant.picture');
  query.include('picture');
  query.get(id).then(function(_dish) {
    var dish = dishAssembler.assemble(_dish);
    var response = {};
    response['result'] = dish;
    res.status(200).json(response);
  }, function (error) {
    errorHandler.handle(error, res);
  });
}