'use strict';

const _ = require('underscore');
const Review = Parse.Object.extend('Review');
const UserActivity = Parse.Object.extend('UserActivity');
const errorHandler = require('../errorHandler');
const Image = Parse.Object.extend('Image');
const Restaurant = Parse.Object.extend('Restaurant');
const reviewAssembler = require('../assemblers/review');

exports.createReview = function (req, res) {
  console.log('CFH_CreateReview');
  const user = req.user;
  if (user === undefined) {
    errorHandler.handleCustomizedError(400, "User session token is required", res);
    return;
  }
  const rating = req.body['rating'];
  const content = req.body['content'];
  const restaurantId = req.params.id;
  
  if (rating === undefined) {
    errorHandler.handleCustomizedError(400, "Rating is required", res);
    return;
  }
  
  const review = new Review();
  if (content !== undefined) {
    review.set('content', content);
  }
  review.set('rating', rating);
  
  const restaurant = new Restaurant();
  restaurant.id = restaurantId;
  review.set('restaurant', restaurant);
  review.set('user', user);
  
  review.save().then(savedReview => {
    const response = {};
    response['result'] = reviewAssembler.assemble(savedReview);
    res.status(201).json(response);
  }, error => {
    console.error('Error_CreateReview');
    errorHandler.handle(error, res);
  });
};

exports.updateReview = function (req, res) {
  console.log('CFH_UpdateReview');
  const user = req.user;
  if (user === undefined) {
    errorHandler.handleCustomizedError(400, "User session token is required", res);
    return;
  }
  const rating = req.body['rating'];
  const content = req.body['content'];
  const reviewId = req.params.id;
  
  const query = new Parse.Query(Review);
  query.get(reviewId).then(review => {
    if (rating !== undefined) {
      review.set('rating', rating);
    }
    if (content !== undefined) {
      review.set('content', content);
    }
    review.save().then(savedReview => {
      const response = {};
      response['result'] = reviewAssembler.assemble(savedReview);
      res.status(200).json(response);
    }, error => {
      console.error('Error_UpdateReview');
      errorHandler.handle(error, res);
    });
  });
};

exports.findAllReviewsOfOneRestaurant = function (req, res) {
  console.log('CFH_GetAllReviews');
  const restaurantId = req.params.id;
  const skip = req.query["skip"];
  const limit = req.query["limit"];
  
  const reviewQuery = new Parse.Query(Review);
  const restaurant = new Restaurant();
  restaurant.id = restaurantId;
  reviewQuery.equalTo('restaurant', restaurant);
  reviewQuery.descending('updatedAt');
  if (skip !== undefined) {
    reviewQuery.skip(skip);
  }
  if (limit !== undefined) {
    reviewQuery.limit(limit);
  }
  reviewQuery.include('user');
  reviewQuery.include('user.picture');
  reviewQuery.find().then(reviews => {
    const response = {};
    const results = [];
    _.each(reviews, review => {
      results.push(reviewAssembler.assemble(review));
    });

    response['results'] = results;
    res.status(200).json(response);
  }, error => {
    console.error('Error_GetAllReviews');
    errorHandler.handle(error, res);
  });
};

exports.findReviewById = function (req, res) {
  console.log('CFH_GetReview');
  const id = req.params.id;
  const reviewQuery = new Parse.Query(Review);
  
  reviewQuery.include('user');
  reviewQuery.include('user.picture');
  reviewQuery.include('restaurant');
  const p1 = reviewQuery.get(id);
  
  const imageQuery = new Parse.Query(Image);
  const review = new Review();
  review.id = id;
  imageQuery.equalTo('review', review);
  const p2 = imageQuery.find();
  
  Parse.Promise.when(p1, p2).then((review, photos) => {
    if (review !== undefined) {
      const result = reviewAssembler.assemble(review, photos);
      const response = {};
      response['result'] = result;
      res.status(200).json(response);
    } else {
      res.status(404).json({});
    }
  }, error => {
    console.error('Error_GetReview');
    errorHandler.handle(error, res);
  });
};

exports.findReviewByRestaurantIdAndUserSession = function (req, res) {
  console.log('CFH_GetReviewByRestaurantIdAndUserSession');
  const restaurantId = req.params.id;
  const user = req.user;
  if (user === undefined) {
    errorHandler.handleCustomizedError(400, "User session token is required", res);
    return;
  }
  
  const reviewQuery = new Parse.Query(Review);
  reviewQuery.include('user');
  reviewQuery.include('user.picture');
  const restaurant = new Restaurant();
  restaurant.id = restaurantId;
  reviewQuery.equalTo('restaurant', restaurant);
  reviewQuery.equalTo('user', user);
  reviewQuery.find().then(reviews => {
    if (reviews.length > 1) {
      console.error('Error_User(' + user.id + ') has multiple reviews for a restaurant(' + restaurantId + ')');
      errorHandler.handleCustomizedError(500, 'User should not have multiple reviews for one restaurant', res);
    } else if (reviews.length === 1) {
      const review = reviews[0];
      const imageQuery = new Parse.Query(Image);
      imageQuery.equalTo('review', review);
      imageQuery.find().then(photos => {
        const result = reviewAssembler.assemble(review, photos);
        const response = {};
        response['result'] = result;
        res.status(200).json(response);
      });
    } else {
      res.status(404).json({});
    }
  });
};