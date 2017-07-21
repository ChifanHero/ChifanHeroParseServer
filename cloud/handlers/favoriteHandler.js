const Favorite = Parse.Object.extend('Favorite');

Parse.Cloud.beforeSave('Favorite', function (request, response) {
  const favoriteToSave = request.object;
  const user = favoriteToSave.get('user');
  const type = favoriteToSave.get('type');
  if (user === undefined || type === undefined) {
    response.error("Incomplete request");
    return;
  }
  const query = new Parse.Query(Favorite);
  query.equalTo('user', user);
  if (type === 'restaurant') {
    query.equalTo('restaurant', favoriteToSave.get('restaurant'));
  } else if (type === 'selected_collection') {
    query.equalTo('selected_collection', favoriteToSave.get('selected_collection'));
  }
  query.count().then(count => {
    if (count > 0) {
      response.error('Favorite exists');
    } else {
      response.success();
    }
  }, error => {
    response.error(error);
  });
});

Parse.Cloud.afterSave('Favorite', function (request) {
  const favoriteSaved = request.object;
  const type = favoriteSaved.get('type');
  if (type === 'restaurant') {
    const restaurant = favoriteSaved.get('restaurant');
    if (restaurant !== undefined) {
      restaurant.fetch().then(restaurant => {
        if (restaurant.get('favorite_count') === undefined) {
          restaurant.set('favorite_count', 1);
        } else {
          restaurant.increment('favorite_count', 1);
        }
        restaurant.save();
      });
    }
  } else if (type === 'selected_collection') {
    const selectedCollection = favoriteSaved.get('selected_collection');
    if (selectedCollection !== undefined) {
      selectedCollection.fetch().then(selectedCollection => {
        if (selectedCollection.get('user_favorite_count') === undefined) {
          selectedCollection.set('user_favorite_count', 1);
        } else {
          selectedCollection.increment('user_favorite_count', 1);
        }
        selectedCollection.save();
      })
    }
  }
});

Parse.Cloud.afterDelete('Favorite', function (request) {
  const favoriteDeleted = request.object;
  const type = favoriteDeleted.get('type');
  if (type === 'restaurant') {
    const restaurant = favoriteDeleted.get('restaurant');
    if (restaurant !== undefined) {
      restaurant.fetch().then(restaurant => {
        if (restaurant.get('favorite_count') !== undefined && restaurant.get('favorite_count') !== 0) {
          restaurant.increment('favorite_count', -1);
        }
        restaurant.save();
      });
    }
  } else if (type === 'selected_collection') {
    const selectedCollection = favoriteDeleted.get('selected_collection');
    if (selectedCollection !== undefined) {
      selectedCollection.fetch().then(selectedCollection => {
        if (selectedCollection.get('user_favorite_count') !== undefined && selectedCollection.get('user_favorite_count') !== 0) {
          selectedCollection.increment('user_favorite_count', -1);
        }
        selectedCollection.save();
      })
    }
  }
});