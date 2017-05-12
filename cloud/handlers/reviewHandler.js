"use strict";

const Review = Parse.Object.extend('Review');
const Restaurant = Parse.Object.extend('Restaurant');

Parse.Cloud.beforeSave('Review', function (request, response) {
  const reviewToSave = request.object;
  if (reviewToSave.dirty('rating')) {
    
    const restaurant = reviewToSave.get('restaurant');
    const query = new Parse.Query(Restaurant);
    query.get(restaurant.id).then(restaurant => {
      
      const newRating = reviewToSave.get('rating');
      
      if (newRating === 1) {
        restaurant.increment('score_1', 1);
      } else if (newRating === 2) {
        restaurant.increment('score_2', 1);
      } else if (newRating === 3) {
        restaurant.increment('score_3', 1);
      } else if (newRating === 4) {
        restaurant.increment('score_4', 1);
      } else if (newRating === 5) {
        restaurant.increment('score_5', 1);
      }
      restaurant.save().then(r => {
        response.success();
      });
    }, function (error) {
      response.error(error);
    });
  } else {
    response.success();
  }
});