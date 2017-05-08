const imageAssembler = require('./image');

exports.assemble = function(source) {
	let restaurant = {};
	if (source !== undefined) {
		restaurant['id'] = source.id;
		let name = source.get('name');
		if (name === undefined || name === '') {
			let englishName = source.get('english_name'); 
			if (englishName !== undefined && englishName !== '') {
				name = englishName;
			}
		}
		restaurant['name'] = name;
		restaurant['english_name'] = source.get('english_name');
		restaurant['address'] = source.get('address');
		restaurant['favorite_count'] = source.get('favorite_count');
		restaurant['phone'] = source.get('phone');
		if (source.get('score') !== undefined) {
			restaurant['rating'] = parseFloat(source.get('score').toFixed(1));
		} else {
			restaurant['rating'] = 0.0
		}
		restaurant['picture'] = imageAssembler.assemble(source.get('image'));
	}
	return restaurant; 
};