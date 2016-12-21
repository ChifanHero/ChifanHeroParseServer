var user_assembler = require('./user');
var image_assembler = require('./image');
var restaurant_assembler = require('./restaurant');
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('cloud/config.js'));
var _ = require('underscore');

exports.assemble = function(source, photos) {
	var review = {};
	if (source != undefined) {
		review['id'] = source.id;
		review['content'] = source.get('content');
		review['last_update_time'] = source.updatedAt;
		review['rating'] = source.get('rating');
		review['user'] = user_assembler.assemble(source.get('user'));
		var reviewQuality = source.get('review_quality');
		review['review_quality'] = reviewQuality;
		review['good_review'] = source.get('good_review');
		if (review['user']['id'] != undefined) {
			var pointsRewarded = config['review']['user_points'];
			if (reviewQuality >= config['review']['good_review_threshold']) {
				pointsRewarded = config['review']['good_review_user_points'];
			}
			review['points_rewarded'] = pointsRewarded;
		}
		if (photos != undefined && photos.length > 0) {
			var _photos = [];
			_.each(photos, function(_photo){
				var photo = image_assembler.assemble(_photo);
				_photos.push(photo);
			});
			review['photos'] = _photos;

		}
		review['restaurant'] = restaurant_assembler.assemble(source.get('restaurant'));

	}
	return review; 
}