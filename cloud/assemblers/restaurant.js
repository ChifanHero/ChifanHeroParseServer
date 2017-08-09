const imageAssembler = require('./image');

exports.assemble = function(source) {
	let restaurant = {};
	if (source !== undefined) {
		restaurant['id'] = source.id;
		restaurant['name'] = source.get('name');
		restaurant['google_name'] = source.get('google_name');
		restaurant['favorite_count'] = source.get('favorite_count');
    if (source.get('rating') !== undefined) {
      restaurant['rating'] = parseFloat(source.get('rating').toFixed(1)); 
    }
    restaurant['google_place_id'] = source.get('google_place_id');
    if (source.get('coordinate') !== undefined) {
      restaurant['coordinate'] = {
        "lat": source.get('coordinate').latitude,
        "lon": source.get('coordinate').longitude
      };  
    }
		if (source.get('image') !== undefined) {
      restaurant['picture'] = imageAssembler.assemble(source.get('image'));  
    }
	}
	return restaurant; 
};