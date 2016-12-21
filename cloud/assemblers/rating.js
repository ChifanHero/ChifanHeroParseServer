var restaurant_assembler = require('./restaurant');
var dish_assembler = require('./dish');
var selectedCollection_assembler = require('./selectedCollection');

exports.assemble = function(source){
	var rating = {};
	if (source != undefined) {
		rating['id'] = source.id;
		rating['type'] = source.get('type');
		rating['action'] = source.get('action');
		if (source.get('user') != undefined) {
			var user = {};
			user['id'] = source.get('user').id;
			rating['user'] = user;
		}
		if (source.get('dish') != undefined) {
			var dish = dish_assembler.assemble(source.get('dish'));
			rating['dish'] = dish;
		}
		if (source.get('restaurant') != undefined) {
			var restaurant = restaurant_assembler.assemble(source.get('restaurant'));
			rating['restaurant'] = restaurant;
		}
		if (source.get('selected_collection') != undefined) {
			var selectedCollection = selectedCollection_assembler.assemble(source.get('selected_collection'));
			rating['selected_collection'] = selectedCollection;
		}
	}
	return rating;
}