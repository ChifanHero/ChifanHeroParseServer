'use strict';

const userAssembler = require('./user');
const imageAssembler = require('./image');
const restaurantAssembler = require('./restaurant');
const _ = require('underscore');

exports.assemble = function (source, photos) {
  const review = {};
  if (source !== undefined) {
    review['id'] = source.id;
    review['rating'] = source.get('rating');
    review['content'] = source.get('content');
    review['last_update_time'] = source.updatedAt;
    if (source.get('restaurant') !== undefined) {
      review['restaurant'] = restaurantAssembler.assemble(source.get('restaurant'));
    }
    if (source.get('user') !== undefined) {
      review['user'] = userAssembler.assemble(source.get('user'));
    }
    if (photos !== undefined && photos.length > 0) {
      const assembledPhotoList = [];
      _.each(photos, function (photo) {
        assembledPhotoList.push(imageAssembler.assemble(photo));
      });
      review['photos'] = assembledPhotoList;
    }
  }
  return review;
};
