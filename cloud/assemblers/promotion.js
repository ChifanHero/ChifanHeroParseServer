var restaurant_assembler = require('./restaurant');
var dish_assembler = require('./dish');

exports.assemble = function(source, lat, lon){
	var promotion = {};
	if (source != undefined) {
		promotion.id = source.id;
		promotion.type = source.get('type');
		if (source.get('restaurant') != undefined) {
			var restaurant = restaurant_assembler.assemble(source.get('restaurant'), lat, lon);
			promotion['restaurant'] = restaurant;
		}
		if (source.get('dish') != undefined) {
			var dish = dish_assembler.assemble(source.get('dish'));
			promotion['dish'] = dish;
		}
	}
	return promotion;
}