'use strict';

const Review = Parse.Object.extend('Review');
const Favorite = Parse.Object.extend('Favorite');
const Restaurant = Parse.Object.extend('Restaurant');
const Image = Parse.Object.extend('Image');

const google = require('../util/googlePlace.js');

Parse.Cloud.beforeSave('Restaurant', function (request, response) {
  const restaurantToSave = request.object;
  if (restaurantToSave.isNew()) {
    restaurantToSave.set('user_rating', 0);
    restaurantToSave.set('user_rating_count', 0);
    restaurantToSave.set('favorite_count', 0);
    if (restaurantToSave.get('google_place_id') !== undefined) {
      getCoordinatesFromGoogle(restaurantToSave.get('google_place_id')).then(coordinates => {
        restaurantToSave.set('coordinates', coordinates);
        response.success();
      }, error => {
        response.error(error);
      });
    } else {
      response.success();
    }
    return;
  }

  if (restaurantToSave.dirty('google_place_id')) {
    getCoordinatesFromGoogle(restaurantToSave.get('google_place_id')).then(coordinates => {
      restaurantToSave.set('coordinates', coordinates);
      response.success();
    }, error => {
      response.error(error);
    });
  } else if (restaurantToSave.dirty('score_1') || restaurantToSave.dirty('score_2') || restaurantToSave.dirty('score_3') || restaurantToSave.dirty('score_4') || restaurantToSave.dirty('score_5')) {
    let score1 = 0;
    let score2 = 0;
    let score3 = 0;
    let score4 = 0;
    let score5 = 0;
    if (restaurantToSave.get('score_1') !== undefined) {
      score1 = restaurantToSave.get('score_1');
    }
    if (restaurantToSave.get('score_2') !== undefined) {
      score2 = restaurantToSave.get('score_2');
    }
    if (restaurantToSave.get('score_3') !== undefined) {
      score3 = restaurantToSave.get('score_3');
    }
    if (restaurantToSave.get('score_4') !== undefined) {
      score4 = restaurantToSave.get('score_4');
    }
    if (restaurantToSave.get('score_5') !== undefined) {
      score5 = restaurantToSave.get('score_5');
    }
    const userRatingCount = score1 + score2 + score3 + score4 + score5;
    let userRating = (score1 + score2 * 2 + score3 * 3 + score4 * 4 + score5 * 5) / userRatingCount;
    let totalRating = mergeRating(userRating, userRatingCount, restaurantToSave.get('google_rating'));
    userRating = parseFloat(userRating.toFixed(1));
    totalRating = parseFloat(totalRating.toFixed(1));
    
    restaurantToSave.set('user_rating', userRating);
    restaurantToSave.set('user_rating_count', userRatingCount);
    restaurantToSave.set('rating', totalRating);
    response.success();
  } else {
    response.success();
  }
});


Parse.Cloud.afterDelete('Restaurant', function (request) {
  const restaurant = request.object;
  deleteRelatedRecords(restaurant);
});

function mergeRating(chifanHeroRating, chifanHeroRatingCount, googleRating) {
  let googleRatingCount = 15; // Assume every restaurant has 15 ratings
  if (googleRating === undefined) {
    googleRating = 0;
    googleRatingCount = 0;
  }
  if (chifanHeroRating !== undefined && chifanHeroRatingCount !== undefined) {
    return parseFloat(((chifanHeroRating * chifanHeroRatingCount + googleRating * googleRatingCount) / (chifanHeroRatingCount + googleRatingCount)).toFixed(1));
  }
  return googleRating;
}


/*
 * TODO: Delete RestaurantCollectionMember as well
 */
function deleteRelatedRecords(restaurant) {
  if (restaurant === undefined) {
    return;
  }
  const reviewQuery = new Parse.Query(Review);
  const favoriteQuery = new Parse.Query(Favorite);
  const imageQuery = new Parse.Query(Image);
  reviewQuery.equalTo('restaurant', restaurant);
  favoriteQuery.equalTo('restaurant', restaurant);
  imageQuery.equalTo('restaurant', restaurant);

  reviewQuery.find().then(results => {
    Parse.Object.destroyAll(results).then(function () {

    }, function (error) {
      console.error('Error when deleting reviews');
      console.error(error);
    });
  });
  favoriteQuery.find().then(results => {
    Parse.Object.destroyAll(results).then(function () {

    }, function (error) {
      console.error('Error when deleting favorites');
      console.error(error);
    });
  });
  imageQuery.find().then(results => {
    Parse.Object.destroyAll(results).then(function () {

    }, function (error) {
      console.error('Error when deleting images');
      console.error(error);
    });
  });

}

function getCoordinatesFromGoogle(placeId) {
  const promise = new Parse.Promise();
  google.client().placeDetail(placeId).then(restaurantFromGoogle => {
    if (restaurantFromGoogle.result.geometry !== undefined && restaurantFromGoogle.result.geometry.location !== undefined) {
      const lat = parseFloat(restaurantFromGoogle.result.geometry.location.lat.toFixed(7));
      const lon = parseFloat(restaurantFromGoogle.result.geometry.location.lng.toFixed(7));
      const geoPoint = new Parse.GeoPoint(lat, lon);
      promise.resolve(geoPoint);
    } else {
      promise.reject();
    }
  });
  return promise;
}