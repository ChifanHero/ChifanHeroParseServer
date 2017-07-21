'use strict';

const restaurantAssembler = require('./restaurant');
const reviewAssembler = require('./review');

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
		if(source.get('restaurant') !== undefined) {
      image['restaurant'] = restaurantAssembler.assemble(source.get('restaurant'));
    }
    if(source.get('review') !== undefined) {
      image['review'] = reviewAssembler.assemble(source.get('review'));
    }
	}
	return image;
};