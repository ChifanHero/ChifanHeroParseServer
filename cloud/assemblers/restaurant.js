const imageAssembler = require('./image');

const ratingUtil = require('../util/ratingUtil.js');

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
    } else {
      let score1 = 0;
      let score2 = 0;
      let score3 = 0;
      let score4 = 0;
      let score5 = 0;
      if (source.get('score_1') !== undefined) {
        score1 = source.get('score_1');
      }
      if (source.get('score_2') !== undefined) {
        score2 = source.get('score_2');
      }
      if (source.get('score_3') !== undefined) {
        score3 = source.get('score_3');
      }
      if (source.get('score_4') !== undefined) {
        score4 = source.get('score_4');
      }
      if (source.get('score_5') !== undefined) {
        score5 = source.get('score_5');
      }
      const userRatingCount = score1 + score2 + score3 + score4 + score5;
      let userRating = 0;
      if (userRatingCount !== 0) {
        userRating = (score1 + score2 * 2 + score3 * 3 + score4 * 4 + score5 * 5) / userRatingCount;  
      }
      let totalRating = ratingUtil.mergeRating(userRating, userRatingCount, source.get('google_rating'));
      restaurant['rating'] = parseFloat(totalRating.toFixed(1));
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
    if (source.get('profile_photo_reference') !== undefined) {
      if (restaurant['picture'] === undefined) {
        restaurant['picture'] = {};
      }
      restaurant['picture']['google_photo_reference'] = source.get('profile_photo_reference');
    }
	}
	return restaurant; 
};