const userAssembler = require('./user');
const imageAssembler = require('./image');
const restaurantAssembler = require('./restaurant');
const CONFIG = require('../config.json');
const _ = require('underscore');

exports.assemble = function(source, photos) {
  const review = {};
	if (source !== undefined) {
		review['id'] = source.id;
		review['content'] = source.get('content');
		review['last_update_time'] = source.updatedAt;
		review['rating'] = source.get('rating');
		review['user'] = userAssembler.assemble(source.get('user'));
    const reviewQuality = source.get('review_quality');
		review['review_quality'] = reviewQuality;
		review['good_review'] = source.get('good_review');
		if (review['user']['id'] !== undefined) {
      let pointsRewarded = CONFIG.review.user_points;
			if (reviewQuality >= CONFIG.review.good_review_threshold) {
				pointsRewarded = CONFIGreview.good_review_user_points;
			}
			review['points_rewarded'] = pointsRewarded;
		}
		if (photos !== undefined && photos.length > 0) {
      const _photos = [];
			_.each(photos, function(_photo){
        const photo = imageAssembler.assemble(_photo);
				_photos.push(photo);
			});
			review['photos'] = _photos;

		}
		review['restaurant'] = restaurantAssembler.assemble(source.get('restaurant'));
	}
	return review; 
};