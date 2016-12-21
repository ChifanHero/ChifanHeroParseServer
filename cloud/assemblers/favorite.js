var restaurant_assembler = require('./restaurant');
var dish_assembler = require('./dish');
var selectedCollection_assembler = require('./selectedCollection');

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
			var dish = dish_assembler.assemble(source.get('dish'));
			favorite['dish'] = dish;
		}
		if (source.get('restaurant') != undefined) {
			var restaurant = restaurant_assembler.assemble(source.get('restaurant'), lat, lon);
			favorite['restaurant'] = restaurant;
		}
		if (source.get('selected_collection') != undefined) {
			var selectedCollection = selectedCollection_assembler.assemble(source.get('selected_collection'));
			favorite['selected_collection'] = selectedCollection;
		}
	}
	return favorite;
}