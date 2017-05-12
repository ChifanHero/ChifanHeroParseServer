'use strict';

const userAssembler = require('./user');
const imageAssembler = require('./image');
const restaurantAssembler = require('./restaurant');
const _ = require('underscore');

exports.assemble = function(source, photos) {
  const review = {};
	if (source !== undefined) {
		review['id'] = source.id;
		review['content'] = source.get('content');
		review['last_update_time'] = source.updatedAt;
		review['rating'] = source.get('rating');
		review['user'] = userAssembler.assemble(source.get('user'));
		if (photos !== undefined && photos.length > 0) {
      const assembledPhotoList = [];
			_.each(photos, function(photo){
        const assembledPhoto = imageAssembler.assemble(photo);
        assembledPhotoList.push(assembledPhoto);
			});
			review['photos'] = assembledPhotoList;
		}
		review['restaurant'] = restaurantAssembler.assemble(source.get('restaurant'));
	}
	return review; 
};