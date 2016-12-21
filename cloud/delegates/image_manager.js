var _ = require('underscore');
var image_assembler = require('../assemblers/image');
var error_handler = require('../error_handler');
var UserActivity = Parse.Object.extend('UserActivity');
var ImageDatabase = Parse.Object.extend('Image');

// exports.upload = function(req, res){
// 	var base64Code = req.body["base64_code"];
// 	var file = new Parse.File("profile.jpeg", { base64: base64Code });

// 	var image = new ImageDatabase();
// 	image.set("original", file);

// 	image.save().then(function(_image) {
// 		var imageRes = {};
// 		imageRes["result"] = image_assembler.assemble(_image);
// 		res.json(200, imageRes);
// 	}, function(error) {
// 		error_handler.handle(error, {}, res);
// 	});
// }

exports.uploadImage = function(req, res) {
	var restaurantId = req.body["restaurant_id"];
	var type = req.body["type"];
	var base64Code = req.body["base64_code"];
	var clientEventId = req.body["event_id"];
	var user = req.user; 

	var file = new Parse.File(type + ".jpeg", { base64: base64Code });

	var newImage = new ImageDatabase();
	newImage.set("original", file);
	newImage.set("type", type);
	if (restaurantId != undefined) {
		var restaurant = {
	        __type: "Pointer",
	        className: "Restaurant",
	        objectId: restaurantId
		};
		newImage.set("restaurant", restaurant);
	}  
	
	newImage.save().then(function(newImage) {
		if (user != undefined) {
			createUserActivity(clientEventId, user, newImage.id, restaurantId);
			var userPoints = config['upload_image']['user_points'];
			user.increment('points', userPoints);
			user.save();
		}
		var imageRes = image_assembler.assemble(newImage);
		var response = {};
		response['result'] = imageRes;
		res.json(200, response);
	}, function(error) {
		error_handler.handle(error, {}, res);
	});
}

function createUserActivity(eventId, user, imageId, restaurantId) {
	var query = new Parse.Query(UserActivity);
	query.equalTo('event_id', eventId);
	query.find().then(function(activities){
		var activity;
		if (activities != undefined && activities.length > 0) {
			activity = activities[0];
		} else {
			activity = new UserActivity();
		}
		activity.set('user', user);
		activity.set('event_id', eventId);
		activity.set('type', 'upload_image');
		activity.add('photos', imageId);
		if (activity.get('restaurant') == undefined) {
			var restaurant = {
		        __type: "Pointer",
		        className: "Restaurant",
		        objectId: restaurantId
		    };
		    activity.set('restaurant', restaurant);
		}	
		activity.save();
	}, function(){

	});
}


exports.findAllByRestaurantId = function(req, res) {
	console.log('here1');
	var restaurantId = req.query.restaurantId;
	var restaurant = {
	        __type: "Pointer",
	        className: "Restaurant",
	        objectId: restaurantId
	};
	var query = new Parse.Query(ImageDatabase);
	query.equalTo('restaurant', restaurant);
	query.find().then(function(images) {
		console.log('here2');
		var results = [];
		if (images != undefined && images.length > 0) {
			_.each(images, function(image) {
				var result = image_assembler.assemble(image);
				results.push(result);
			});
		}
		var response = {};
		response['results'] = results;
		res.json(200, response);
	}, function(error) {
		console.log('here3');
		error_handler.handle(error, {}, res);
	});
}
