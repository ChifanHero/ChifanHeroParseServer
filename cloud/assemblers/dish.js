const imageAssembler = require('./image');
const restaurantAssembler = require('./restaurant');

exports.assemble = function(source) {
  const dish = {};
	if (source !== undefined) {
		dish['id'] = source.id;
		dish['name'] = source.get('name');
		dish['english_name'] = source.get('english_name');
		dish['favorite_count'] = source.get('favorite_count');
		dish['like_count'] = source.get('like_count');
		dish['dislike_count'] = source.get('dislike_count');
		dish['neutral_count'] = source.get('neutral_count');
		dish['picture'] = imageAssembler.assemble(source.get('image'));
		dish['from_restaurant'] = restaurantAssembler.assemble(source.get('from_restaurant'));
	}
	return dish;
};