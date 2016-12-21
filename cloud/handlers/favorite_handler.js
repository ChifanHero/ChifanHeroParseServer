var Favorite = Parse.Object.extend('Favorite');

Parse.Cloud.beforeSave('Favorite', function(request, response){
	var favoriteToSave = request.object;
	var user = favoriteToSave.get('user');
	var type = favoriteToSave.get('type');
	if (user == undefined || type == undefined) {
		response.error("incomplete request");
		return;
	}
	var query = new Parse.Query(Favorite);
	query.equalTo('user', user);
	if (type === 'dish') {
		query.equalTo('dish', favoriteToSave.get('dish'));
	} else if (type === 'restaurant') {
		query.equalTo('restaurant', favoriteToSave.get('restaurant'));
	} else if (type === 'selected_collection') {
		query.equalTo('selected_collection', favoriteToSave.get('selected_collection'));
	}
	query.count().then(function(count){
		if (count > 0) {
			response.error('favorite existing');
		} else {
			response.success();
		}
	}, function(error){
		response.error(error);
	});
});

Parse.Cloud.afterSave('Favorite', function(request){
	var favoriteSaved = request.object;
	var type = favoriteSaved.get('type');
	if (type == undefined) {
		return;
	}
	if (type === 'dish') {
		var dish = favoriteSaved.get('dish');
		if (dish != undefined) {
			dish.fetch().then(function(_dish){
				if(_dish.get('favorite_count') == undefined){
					_dish.set('favorite_count', 1);
				} else{
					_dish.increment('favorite_count', 1);
				}
				_dish.save();
			});
		}
	} else if (type === 'restaurant') {
		var restaurant = favoriteSaved.get('restaurant');
		if (restaurant != undefined) {
			restaurant.fetch().then(function(_restaurant){
				if(_restaurant.get('favorite_count') == undefined){
					_restaurant.set('favorite_count', 1);
				} else{
					_restaurant.increment('favorite_count', 1);
				}
				_restaurant.save();
			});
		}
	} else if (type === 'selected_collection') {
		var selectedCollection = favoriteSaved.get('selected_collection');
		if (selectedCollection != undefined) {
			selectedCollection.fetch().then(function(_selectedCollection){
				if(_selectedCollection.get('user_favorite_count') == undefined){
					_selectedCollection.set('user_favorite_count', 1);
				} else{
					_selectedCollection.increment('user_favorite_count', 1);
				}
				_selectedCollection.save();
			})
		}
	}
});

Parse.Cloud.afterDelete('Favorite', function(request){
	var favoriteDeleted = request.object;
	var type = favoriteDeleted.get('type');
	if (type == undefined) {
		return;
	}
	if (type === 'dish') {
		var dish = favoriteDeleted.get('dish');
		if (dish != undefined) {
			dish.fetch().then(function(dish){
				dish.increment('favorite_count', -1);
				dish.save();
			});
		}
	} else if (type === 'restaurant') {
		var restaurant = favoriteDeleted.get('restaurant');
		if (restaurant != undefined) {
			restaurant.fetch().then(function(restaurant){
				restaurant.increment('favorite_count', -1);
				restaurant.save();
			});
		}
	} else if (type === 'selected_collection') {
		var selectedCollection = favoriteDeleted.get('selected_collection');
		if (selectedCollection != undefined) {
			selectedCollection.fetch().then(function(_selectedCollection){
				_selectedCollection.increment('user_favorite_count', -1);
				_selectedCollection.save();
			})
		}
	}
});