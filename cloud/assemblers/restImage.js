'use strict';

exports.assemble = function(source){
	const image = {};
	if (source !== undefined) {
		image['id'] = source['objectId'];
		if (source['thumbnail'] !== undefined) {
			image['thumbnail'] = source['thumbnail']['url'];
		}
		if (source['original'] !== undefined) {
			image['original'] = source['original']['url'];
		}
		image['type'] = source['type'];
	}
	return image;
};