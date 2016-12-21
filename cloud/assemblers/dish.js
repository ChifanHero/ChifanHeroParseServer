var image_assembler = require('./image');
var restaurant_assembler = require('./restaurant');

exports.assemble = function(source) {
	var dish = {};
	if (source != undefined) {
		dish['id'] = source.id;
		dish['name'] = source.get('name');
		dish['english_name'] = source.get('english_name');
		dish['favorite_count'] = source.get('favorite_count');
		dish['like_count'] = source.get('like_count');
		dish['dislike_count'] = source.get('dislike_count');
		dish['neutral_count'] = source.get('neutral_count');
		dish['picture'] = image_assembler.assemble(source.get('image'));
		dish['from_restaurant'] = restaurant_assembler.assemble(source.get('from_restaurant'));
	}
	return dish;
}