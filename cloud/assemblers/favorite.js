var restaurantAssembler = require('./restaurant');
var dishAssembler = require('./dish');
var selectedCollectionAssembler = require('./selectedCollection');

exports.assemble = function(source, lat, lon){
	var favorite = {};
	if (source != undefined) {
		favorite['id'] = source.id;
		favorite['type'] = source.get('type');
		if (source.get('user') != undefined) {
			var user = {};
			user['id'] = source.get('user').id;
			favorite['user'] = user;
		}
		if (source.get('dish') != undefined) {
			var dish = dishAssembler.assemble(source.get('dish'));
			favorite['dish'] = dish;
		}
		if (source.get('restaurant') != undefined) {
			var restaurant = restaurantAssembler.assemble(source.get('restaurant'), lat, lon);
			favorite['restaurant'] = restaurant;
		}
		if (source.get('selected_collection') != undefined) {
			var selectedCollection = selectedCollectionAssembler.assemble(source.get('selected_collection'));
			favorite['selected_collection'] = selectedCollection;
		}
	}
	return favorite;
}