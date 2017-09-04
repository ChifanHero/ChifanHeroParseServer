'use strict';

Parse.Cloud.beforeSave(Parse.User, function (request, response) {
  const userToSave = request.object;
  validate(userToSave).then(() => {
    if (userToSave.isNew()) {
      response.success();
      return;
    }
    if (userToSave.dirty('password')) {
      userToSave.set('usingDefaultPassword', false);
    }
    if (userToSave.dirty('username')) {
      userToSave.set('usingDefaultUsername', false);
    }
    if (userToSave.dirty('nick_name')) {
      if (!(userToSave.dirty('usingDefaultNickname') && userToSave.get('usingDefaultNickname') == true)) {
        userToSave.set('usingDefaultNickname', false);
      }
    }
    if (userToSave.dirty('picture')) {
      const oldUserQuery = new Parse.Query(Parse.User);
      oldUserQuery.get(userToSave.id).then(oldUser => {
        if (oldUser !== undefined) {
          const picture = oldUser.get("picture");
          if (picture !== undefined) {
            picture.destroy().then(() => {
              response.success();
            }, error => {
              if (error.code === 101) { // Object not found for delete
                response.success();
              } else {
                response.reject(error);  
              }
            });
          } else {
            response.success();
          }
        }
      }, error => {
        response.reject(error);
      });
    } else {
      response.success();
    }
  }, error => {
    response.reject(error);
  });
});

function validate(user) {
  const promise = new Parse.Promise();
  promise.resolve();
  return promise;
}

// {
//   "code": 209,
//   "message": "invalid session token"
// }

// function findRestaurantById(id) {
//   const query = new Parse.Query(Restaurant);
//   query.include('image');
//   return query.get(id);
// }

// function findGoogleRestaurantById(id) {
//   const promise = new Parse.Promise();
//   const query = new Parse.Query(Restaurant);
//   query.get(id).then(restaurant => {
//     google.client().placeDetail(restaurant.get('google_place_id')).then(restaurantFromGoogle => {
//       promise.resolve(restaurantFromGoogle);
//     });
//   });
//   return promise;
// }

// const p1 = findRestaurantById(id);
//   const p2 = findRecommendedDishesByRestaurantId(id);
//   const p3 = findReviewsByRestaurantId(id);
//   const p4 = findPhotosByRestaurantId(id);
//   const p5 = findGoogleRestaurantById(id);
//   const p6 = checkIfCurrentUserFavorite(id, currentUser);
//   Parse.Promise.when(p1, p2, p3, p4, p5, p6)