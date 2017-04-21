var userAssembler = require('./user');
var imageAssembler = require('./image');
var restaurantAssembler = require('./restaurant');
var CONFIG = require('../config.json');
var _ = require('underscore');

exports.assemble = function(source, photos) {
	var review = {};
	if (source != undefined) {
		review['id'] = source.id;
		review['content'] = source.get('content');
		review['last_update_time'] = source.updatedAt;
		review['rating'] = source.get('rating');
		review['user'] = userAssembler.assemble(source.get('user'));
		var reviewQuality = source.get('review_quality');
		review['review_quality'] = reviewQuality;
		review['good_review'] = source.get('good_review');
		if (review['user']['id'] != undefined) {
			var pointsRewarded = CONFIG.review.user_points;
			if (reviewQuality >= CONFIG.review.good_review_threshold) {
				pointsRewarded = CONFIGreview.good_review_user_points;
			}
			review['points_rewarded'] = pointsRewarded;
		}
		if (photos != undefined && photos.length > 0) {
			var _photos = [];
			_.each(photos, function(_photo){
				var photo = imageAssembler.assemble(_photo);
				_photos.push(photo);
			});
			review['photos'] = _photos;

		}
		review['restaurant'] = restaurantAssembler.assemble(source.get('restaurant'));
	}
	return review; 
}