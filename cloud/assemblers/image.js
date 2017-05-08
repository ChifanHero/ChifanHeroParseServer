exports.assemble = function(source){
	const image = {};
	if (source !== undefined) {
		image['id'] = source.id;
		if (source.get('thumbnail') !== undefined) {
			image['thumbnail'] = source.get('thumbnail').url();
		}
		if (source.get('original') !== undefined) {
			image['original'] = source.get('original').url();
		}
		image['type'] = source.get('type');
		image['restaurant'] = source.get('restaurant');
		
		/* for Google photo api */
		image['photo_reference'] = source.get('photo_reference');
	}
	return image;
};