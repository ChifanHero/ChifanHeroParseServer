'use strict';

const _ = require('underscore');
const Review = Parse.Object.extend('Review');
const UserActivity = Parse.Object.extend('UserActivity');
const errorHandler = require('../errorHandler');
const Image = Parse.Object.extend('Image');
const Restaurant = Parse.Object.extend('Restaurant');
const reviewAssembler = require('../assemblers/review');

exports.createReview = function (req, res) {
  const user = req.user;
  const rating = req.body['rating'];
  const content = req.body['content'];
  const photos = req.body['photos'];
  const restaurantId = req.body['restaurant_id'];
  
  const review = new Review();
  review.set('content', content);
  review.set('rating', rating);
  
  const restaurant = new Restaurant();
  restaurant.id = restaurantId;
  review.set('restaurant', restaurant);
  
  if (user !== undefined) {
    review.set('user', user);
  }
  
  review.save().then(savedReview => {
    const imagesToSave = [];
    if (photos !== undefined && _.isArray(photos) && photos.length > 0) {
      _.each(photos, photoId => {
        const image = new Image();
        image.id = photoId;
        image.set('review', savedReview);
        imagesToSave.push(image);
      });
    }
    Parse.Object.saveAll(imagesToSave);
    const response = {};
    response['result'] = reviewAssembler.assemble(savedReview);
    res.status(201).json(response);
  }, function (error) {
    errorHandler.handle(error, res);
  });
};

exports.listReviews = function (req, res) {
  const restaurantId = req.query['restaurant_id'];
  const sort = req.query['sort'];
  const skip = req.query["skip"];
  const limit = req.query["limit"];
  
  const reviewQuery = new Parse.Query(Review);
  const restaurant = new Restaurant();
  restaurant.id = restaurantId;
  reviewQuery.equalTo('restaurant', restaurant);
  if (sort === 'latest') {
    reviewQuery.descending('updatedAt');
  }
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
    _.each(reviews, function (review) {
      results.push(reviewAssembler.assemble(review));
    });

    response['results'] = results;
    res.status(200).json(response);
  }, function (error) {
    errorHandler.handle(error, res);
  });
};

exports.fetchReview = function (req, res) {
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
  
  Parse.Promise.when(p1, p2).then(function (review, photos) {
    if (review !== undefined) {
      const result = reviewAssembler.assemble(review, photos);
      const response = {};
      response['result'] = result;
      res.status(200).json(response);
    } else {
      res.status(404).json({});
    }
  }, function (error) {
    errorHandler.handle(error, res);
  });
};