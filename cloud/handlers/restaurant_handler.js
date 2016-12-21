var GOOGLE_API_KEY = 'AIzaSyCRvcRsKxM0WHjJOOMGKnxtFF7CwoYJ7FU';
var GOOGLE_GEOCODING_ENDPOINT = 'https://maps.googleapis.com/maps/api/geocode/json?key='.concat(GOOGLE_API_KEY).concat('&');
var Review = Parse.Object.extend('Review');
var Favorite = Parse.Object.extend('Favorite');
var Dish = Parse.Object.extend('Dish');
var Menu = Parse.Object.extend('MenuItem');
var Restaurant = Parse.Object.extend('Restaurant');
var _Image = Parse.Object.extend('Image');

Parse.Cloud.beforeSave('Restaurant', function(request, response){
	var restaurantToSave = request.object;
	if (restaurantToSave.dirty('like_count') || restaurantToSave.dirty('neutral_count') || restaurantToSave.dirty('dislike_count')) {
		var oldRestaurant = new Restaurant();
		oldRestaurant.set("objectId", restaurantToSave.id);
		oldRestaurant.fetch().then(function(oldRestaurant){
			var likeCount = 0;
			var neutralCount = 0;
			var dislikeCount = 0;
			if (oldRestaurant.get('like_count') != undefined) {
				likeCount = oldRestaurant.get('like_count');
			}
			if (oldRestaurant.get('neutral_count') != undefined) {
				neutralCount = oldRestaurant.get('neutral_count');
			}
			if (oldRestaurant.get('dislike_count') != undefined) {
				dislikeCount = oldRestaurant.get('dislike_count');
			}
			if (restaurantToSave.dirty('like_count')) {
				likeCount = restaurantToSave.get('like_count');
			}
			if (restaurantToSave.dirty('neutral_count')) {
				neutralCount = restaurantToSave.get('neutral_count');
			}
			if (restaurantToSave.dirty('dislike_count')) {
				dislikeCount = restaurantToSave.get('dislike_count');
			}
			var score = 0.0;
			if (likeCount != 0 || neutralCount != 0 || dislikeCount != 0) {
				score = 5 * (likeCount * 1.0 + neutralCount * 0.7) / (likeCount + neutralCount + dislikeCount);
			} 
			
			score = parseFloat(score.toFixed(1));
			restaurantToSave.set('score', score);
			response.success();
		}, function(error) {
			response.error(error);
		});
	} else if (restaurantToSave.dirty('address')) {
		var address = restaurantToSave.get('address');
		getCoordinatesFromAddress(address).then(function(lat, lon, formattedAddress){	
			console.log(lat);
			console.log(lon);
			var coordinates = new Parse.GeoPoint({latitude : lat, longitude : lon});
			restaurantToSave.set('coordinates', coordinates);
			if (formattedAddress != undefined) {
				restaurantToSave.set('address', formattedAddress);
			}
			response.success();
		}, function(error){
			console.log(error);
			response.success();
		});
	} else if (restaurantToSave.dirty('image')) {
		var oldRestaurant = new Restaurant();
		oldRestaurant.set("objectId", restaurantToSave.id);
		oldRestaurant.fetch().then(function(oldRestaurant){
			var image = oldRestaurant.get("image");
			if (image != undefined) {
				var imageId = image.id;
				console.log("image id is ".concat(imageId));
				var image = new _Image();
				image.id = imageId;
				image.destroy().then(function(){ 
					console.log("successfully deleted old image");
					response.success();
				}, function(error){
					response.success(); 
				});
			} else {
				response.success();
			}
		}, function(error) {
			response.error(error);
		});
	} else if (restaurantToSave.dirty('score_1') || restaurantToSave.dirty('score_2') || restaurantToSave.dirty('score_3') || restaurantToSave.dirty('score_4') || restaurantToSave.dirty('score_5')) {
		var oldRestaurant = new Restaurant();
		oldRestaurant.set("objectId", restaurantToSave.id);
		oldRestaurant.fetch().then(function(oldRestaurant){
			var score1 = 0;
			var score2 = 0;
			var score3 = 0;
			var score4 = 0;
			var score5 = 0;
			if (oldRestaurant.get('score_1') != undefined) {
				score1 = oldRestaurant.get('score_1');
			}
			if (oldRestaurant.get('score_2') != undefined) {
				score2 = oldRestaurant.get('score_2');
			}
			if (oldRestaurant.get('score_3') != undefined) {
				score3 = oldRestaurant.get('score_3');
			}
			if (oldRestaurant.get('score_4') != undefined) {
				score4 = oldRestaurant.get('score_4');
			}
			if (oldRestaurant.get('score_5') != undefined) {
				score5 = oldRestaurant.get('score_5');
			}
			if (restaurantToSave.dirty('score_1')) {
				score1 = restaurantToSave.get('score_1');
			}
			if (restaurantToSave.dirty('score_2')) {
				score2 = restaurantToSave.get('score_2');
			}
			if (restaurantToSave.dirty('score_3')) {
				score3 = restaurantToSave.get('score_3');
			}
			if (restaurantToSave.dirty('score_4')) {
				score4 = restaurantToSave.get('score_4');
			}
			if (restaurantToSave.dirty('score_5')) {
				score5 = restaurantToSave.get('score_5');
			}
			var ratingTotal = score1 + score2 + score3 + score4 + score5;
			var score = (score1 + score2 * 2 + score3 * 3 + score4 * 4 + score5 * 5) / ratingTotal;
			score = parseFloat(score.toFixed(1));
			restaurantToSave.set('score', score);
			restaurantToSave.set('rating_total', ratingTotal);
			response.success();
		}, function(error) {
			response.error(error);
		});
	} else {
		response.success();
	}
}); 


Parse.Cloud.afterDelete('Restaurant', function(request) {
 	var restaurant = request.object;
 	deleteRelatedRecords(restaurant);	
});


function deleteRelatedRecords(restaurant) {
	if (restaurant === undefined) {
		return;
	}
	var reviewQuery = new Parse.Query(Review);
	var favoriteQuery = new Parse.Query(Favorite);
	var dishQuery = new Parse.Query(Dish);
	var menuQuery = new Parse.Query(Menu);
	reviewQuery.equalTo('restaurant', restaurant);
	favoriteQuery.equalTo('restaurant', restaurant);
	dishQuery.equalTo('from_restaurant', restaurant);
	reviewQuery.find().then(function(results){
		Parse.Object.destroyAll(results).then(function(){

		}, function(error){
			console.error('Error deleting reviews. error is ' + error.code + ': ' + error.message);
		});
	});
	favoriteQuery.find().then(function(results){
		Parse.Object.destroyAll(results).then(function(){

		}, function(error){
			console.error('Error deleting favorites. error is ' + error.code + ': ' + error.message);
		});
	});
	dishQuery.find().then(function(results){
		Parse.Object.destroyAll(results).then(function(){

		}, function(error){
			console.error('Error deleting dishes. error is ' + error.code + ': ' + error.message);
		});
	});
	menuQuery.find().then(function(results){
		Parse.Object.destroyAll(results).then(function(){

		}, function(error){
			console.error('Error deleting menu. error is ' + error.code + ': ' + error.message);
		});
	});
}


function getCoordinatesFromAddress(address) {
	var promise = new Parse.Promise();
	if (address != undefined) {
		address = encodeURIComponent(address);
    	var url = GOOGLE_GEOCODING_ENDPOINT.concat('address=').concat(address);
    	Parse.Cloud.httpRequest({
    		url : url,
    		success : function(httpResponse){
    			var data = httpResponse.data;
    			if(data.status === 'OK' && data.results !== undefined 
                                        && data.results.length > 0 && data.results[0].geometry !== undefined 
                                        && data.results[0].geometry.location !== undefined){
	                var location = data.results[0].geometry.location;
	            	var formattedAddress = data.results[0]['formatted_address'];
	                promise.resolve(location.lat, location.lng, formattedAddress);
	            } else {
	            	console.log(data);
	                promise.reject('unable to get restaurant address from google geocoding');
	            }
    		}
    	});
	} else {
		promise.reject('restaurant address undefined');
	}
	return promise;
}