"use strict";

const _ = require('underscore');
const errorHandler = require('../errorHandler');
const Image = Parse.Object.extend('Image');
const Restaurant = Parse.Object.extend('Restaurant');
const RecommendedDish = Parse.Object.extend('RecommendedDish');
const recommendedDishAssembler = require('../assemblers/recommendedDish');

exports.findAllRecommendedDishesOfOneRestaurant = function(req, res) {
  const restaurantId = req.params.id;
  const restaurant = new Restaurant();
  restaurant.id = restaurantId;

  const recommendedDishQuery = new Parse.Query(RecommendedDish);
  recommendedDishQuery.equalTo('restaurant', restaurant);
  recommendedDishQuery.find().then(recommendedDishes => {
    const response = {
      'results': []
    };
    _.each(recommendedDishes, recommendedDish => {
      response['results'].push(recommendedDishAssembler.assemble(recommendedDish));
    });
    res.status(200).json(response);
  });
};

exports.upsertRecommendedDish = function (req, res) {
  const user = req.user;
  const dishName = req.body['name'];
  const restaurantId = req.body['restaurant_id'];
  const restaurant = new Restaurant();
  restaurant.id = restaurantId;

  const recommendedDishQuery = new Parse.Query(RecommendedDish);
  recommendedDishQuery.equalTo('name', dishName);
  recommendedDishQuery.equalTo('restaurant', restaurant);
  recommendedDishQuery.first().then(recommendedDish => {
    if (recommendedDish !== undefined) {
      recommendedDish.increment('recommendation_count', 1);
      recommendedDish.save().then(newRecommendedDish => {
        const response = {
          'result': recommendedDishAssembler.assemble(newRecommendedDish)
        };
        res.status(200).json(response);
      });
    } else {
      const recommendedDish = new RecommendedDish();
      recommendedDish.set('name', dishName);
      recommendedDish.set('recommendation_count', 1);
      recommendedDish.set('restaurant', restaurant);
      recommendedDish.save().then(newRecommendedDish => {
        const response = {
          'result': recommendedDishAssembler.assemble(newRecommendedDish)
        };
        res.status(201).json(response);
      });
    }
  });
};
