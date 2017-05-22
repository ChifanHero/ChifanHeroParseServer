const restaurantAssembler = require('./restaurant');
const selectedCollectionAssembler = require('./selectedCollection');
const userAssembler = require('./user');

exports.assemble = function(source){
  const favorite = {};
	if (source !== undefined) {
		favorite['id'] = source.id;
		favorite['type'] = source.get('type');
		if (source.get('user') !== undefined) {
			favorite['user'] = userAssembler.assemble(source.get('user'));
		}
		if (source.get('restaurant') !== undefined) {
      favorite['restaurant'] = restaurantAssembler.assemble(source.get('restaurant'));
		}
		if (source.get('selected_collection') !== undefined) {
      favorite['selected_collection'] = selectedCollectionAssembler.assemble(source.get('selected_collection'));
		}
	}
	return favorite;
};