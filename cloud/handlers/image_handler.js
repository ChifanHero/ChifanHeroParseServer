var Image = require("parse-image");
var Restaurant = Parse.Object.extend('Restaurant');

Parse.Cloud.beforeSave('Image', function(request, response){
	var imageToSave = request.object;
	if (imageToSave.dirty('original')) {
		var original = imageToSave.get('original');
		if (original != undefined && original.url() != undefined) {
			Parse.Cloud.httpRequest({
				url : original.url()
			}).then(function(raw){
				var data = raw.buffer;
				var tasks = [];
				var filename = getFileName(original.name());
				tasks.push(createThumbnail(data, filename));
				Parse.Promise.when(tasks).then(function(thumbnail){
					imageToSave.set('thumbnail', thumbnail);
					response.success();
				}, function(error){
					response.error(error);
				});
			}, function(error){
				response.error(error);
			});
		} else {
			response.success();
		}
	} else {
		response.success();
	}
});

Parse.Cloud.afterSave("Image", function(request){
	var imageSaved = request.object;
	var restaurant = imageSaved.get("restaurant");
	if (restaurant != undefined) {
		restaurant.fetch().then(function(restaurant){
			console.log(restaurant);
			if(restaurant.get("image") == undefined){
				restaurant.set("image", imageSaved);
				restaurant.save();
			}
		});
	}
	
	
});

function createThumbnail(data, fileName) {
	console.log('received filename is '.concat(fileName));
	var promise = new Parse.Promise();
	if (data == undefined) {
		promise.reject();
	} else {
		var image = new Image();
		image.setData(data).then(function(image){
			var width = image.width();
			var height = image.height();
			if (width <= 100 || height <= 100) {
				image.data().then(function(buffer){
					var base64 = buffer.toString('base64'); 
					var file = new Parse.File("thumbnail.jpeg", {base64 : base64});
					return file.save();
				}).then(function(file){
					promise.resolve(file);
				}, function(error){
					promise.reject(error);
				});
			} else {
				var ratio = Math.min(100/width, 100/height);
				image.scale({
					width : width * ratio,
					height : height * ratio
				}).then(function(scaledImage){
					return scaledImage.data(); 
				}).then(function(buffer){
					var _base64 = buffer.toString('base64');
					var file = new Parse.File("thumbnail.jpeg", {base64 : _base64});
					return file.save();
				}).then(function(file){
					promise.resolve(file);
				}, function(error){
					promise.reject(error);
				});
			}
		}, function(error){
			promise.reject(error);
		});
	}
	return promise;
}

function getFileName(name) {
	var filename = '';
	if (name != undefined) {
		filename = name.split('.')[0];
	}
	return filename;
}