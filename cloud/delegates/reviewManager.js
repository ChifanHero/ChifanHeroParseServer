'use strict';

const _ = require('underscore');
const Review = Parse.Object.extend('Review');
const UserActivity = Parse.Object.extend('UserActivity');
const errorHandler = require('../errorHandler');
const Image = Parse.Object.extend('Image');
const Restaurant = Parse.Object.extend('Restaurant');
const reviewAssembler = require('../assemblers/review');

exports.upsertReview = function (req, res) {
  console.log('CFH_UpsertReview');
  if (req.user === undefined) {
    errorHandler.handleCustomizedError(400, "User session token is required", res);
    return;
  }
  if (req.user['objectId'] === undefined) {
    errorHandler.handleCustomizedError(500, "User objectId is undefined", res);
    return;
  }
  const user = new Parse.User();
  user.id = req.user['objectId'];

  const rating = req.body['rating'];
  const content = req.body['content'];
  const restaurantId = req.params.restaurantId;
  const reviewId = req.params.reviewId;

  if (rating === undefined) {
    errorHandler.handleCustomizedError(400, "Rating is required", res);
    return;
  }

  const query = new Parse.Query(Review);
  if (reviewId !== undefined) {
    query.get(reviewId).then(review => {
      review.set('rating', rating);
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
  } else {
    const restaurant = new Restaurant();
    restaurant.id = restaurantId;
    query.equalTo('restaurant', restaurant);
    query.equalTo('user', user);
    query.first().then(review => {
      if (review !== undefined) {
        review.set('rating', rating);
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
      } else {
        const review = new Review();
        review.set('rating', rating);
        if (content !== undefined) {
          review.set('content', content);
        }
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
      }
    });
  }
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