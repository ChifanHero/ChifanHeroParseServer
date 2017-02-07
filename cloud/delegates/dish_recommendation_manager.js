var _ = require('underscore');
var UserActivity = Parse.Object.extend('UserActivity');
var Dish = Parse.Object.extend('NewDish');
var error_handler = require('../error_handler');
var Image = Parse.Object.extend('Image');
var Restaurant = Parse.Object.extend('Restaurant');
var review_assembler = require('../assemblers/review');
var dish_assembler = require('../assemblers/dish');
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('cloud/config.js'));

// photo ids
// dish id, name
// restaurant id
// user
exports.createDishRecommendation = function(req, res){
	var user = req.user;
	var dishId = req.body['dish_id'];
	var dishName = req.body['dish_name'];
	var restaurantId = req.body['restaurant_id'];
	var photos = req.body['photos'];
	var dish = new Dish();
	var userPoints = config['dish_recommendation']['user_points'];
	if (dishId !== undefined) {
		dish.id = dishId;
	} else {
		var restaurant = {
	        __type: "Pointer",
	        className: "Restaurant",
	        objectId: restaurantId
	    };
		dish.set('from_restaurant', restaurant);
		dish.set('name', dishName);
	}
	dish.increment('recommend_count', 1);
	if (user != undefined) {
		dish.add('recommended_by', user.id);
		user.increment('points', userPoints);
		user.save();
	}
	dish.save().then(function(_dish) {
		var objectsToSave = [];
		if (user != undefined) {
			var userActivity = new UserActivity();
			userActivity.set('user', user);
			userActivity.set('type', 'recommend_dish');
			userActivity.set('dish', _dish);
			objectsToSave.push(userActivity);
		}
		if (photos != undefined && _.isArray(photos) && photos.length > 0) {
			_.each(photos, function(photoId){
				var image = new Image();
				image.id = photoId;
				image.set('owner_type', "Dish");
				image.set('dish', _dish);
				objectsToSave.push(image);
			});
		}
		Parse.Object.saveAll(objectsToSave);
		var response = {};
		var recommendation = {};
		recommendation['dish'] = dish_assembler.assemble(_dish);
		recommendation['points_rewarded'] = userPoints;
		response['result'] = recommendation;
		res.status(201).json(response);
	}, function(error) {
		error_handler.handle(error, {}, res);
	});
	

}
