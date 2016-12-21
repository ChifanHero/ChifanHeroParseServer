var Review = Parse.Object.extend('Review');
var Restaurant = Parse.Object.extend('Restaurant');


Parse.Cloud.beforeSave('Review', function(request, response){
	var reviewToSave = request.object;
	if (reviewToSave.dirty('rating')) {
		var id = reviewToSave.id;
		var restaurant = reviewToSave.get('restaurant');
		var promises = [];
		promises.push(findRestaurantById(restaurant.id));
		if (id != undefined) { // existing review
			promises.push(findReviewById(id));
		}
		Parse.Promise.when(promises).then(function(_restaurant, _oldReview){
			var oldRating = -1;
			if (_oldReview != undefined) {
				oldRating = _oldReview.get('rating');
			}
			var newRating = reviewToSave.get('rating');
			if (oldRating == 1) {
				_restaurant.increment('score_1', -1);
			} else if (oldRating == 2) {
				_restaurant.increment('score_2', -1);
			} else if (oldRating == 3) {
				_restaurant.increment('score_3', -1);
			} else if (oldRating == 4) {
				_restaurant.increment('score_4', -1);
			} else if (oldRating == 5) {
				_restaurant.increment('score_5', -1);
			}
			if (newRating == 1) {
				_restaurant.increment('score_1', 1);
			} else if (newRating == 2) {
				_restaurant.increment('score_2', 1);
			} else if (newRating == 3) {
				_restaurant.increment('score_3', 1);
			} else if (newRating == 4) {
				_restaurant.increment('score_4', 1);
			} else if (newRating == 5) {
				_restaurant.increment('score_5', 1);
			}
			_restaurant.save();
			response.success();
		}, function(error) {
			response.error(error);
		});

	} else {
		response.success();
	}
});

function findRestaurantById(id) {
	var query = new Parse.Query(Restaurant);
	return query.get(id);
}

function findReviewById(id) {
	var query = new Parse.Query(Review);
	return query.get(id);
}