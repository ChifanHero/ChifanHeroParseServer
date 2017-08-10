const imageAssembler = require('./image');

exports.assemble = function(source) {
	let restaurant = {};
	if (source !== undefined) {
		restaurant['id'] = source.id;
		restaurant['google_name'] = source.get('google_name');
		restaurant['favorite_count'] = source.get('favorite_count');
		if (source.get('name') !== undefined) {
      restaurant['name'] = source.get('name');
    } else {
      restaurant['name'] = source.get('google_name');
    }
    if (source.get('rating') !== undefined) {
      restaurant['rating'] = parseFloat(source.get('rating').toFixed(1)); 
    }
    restaurant['google_place_id'] = source.get('google_place_id');
    if (source.get('coordinates') !== undefined) {
      restaurant['coordinates'] = {
        "lat": source.get('coordinates').latitude,
        "lon": source.get('coordinates').longitude
      };  
    }
		if (source.get('image') !== undefined) {
      restaurant['picture'] = imageAssembler.assemble(source.get('image'));  
    }
	}
	return restaurant; 
};