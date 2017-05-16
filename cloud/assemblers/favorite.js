const restaurantAssembler = require('./restaurant');
const selectedCollectionAssembler = require('./selectedCollection');

exports.assemble = function(source, lat, lon){
  const favorite = {};
	if (source !== undefined) {
		favorite['id'] = source.id;
		favorite['type'] = source.get('type');
		if (source.get('user') !== undefined) {
      const user = {};
			user['id'] = source.get('user').id;
			favorite['user'] = user;
		}
		if (source.get('restaurant') !== undefined) {
      favorite['restaurant'] = restaurantAssembler.assemble(source.get('restaurant'), lat, lon);
		}
		if (source.get('selected_collection') !== undefined) {
      favorite['selected_collection'] = selectedCollectionAssembler.assemble(source.get('selected_collection'));
		}
	}
	return favorite;
};