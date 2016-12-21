// var fs = require('fs');
// var config = JSON.parse(fs.readFileSync('cloud/config.js'));

// Parse.Cloud.afterSave('UserActivity', function(request){
// 	var userActivity = request.object;
// 	var type = userActivity.get('type');
// 	if (type == "review") {
// 		var review = userActivity.get('review');
// 		var user = userActivity.get('user');
// 		if (review != undefined && user != undefined) {
// 			review.fetch().then(function(_review){
// 				if (_review != undefined) {
// 					var reviewQuality = _review.get('review_quality');
// 					var pointsRewarded = config['review']['user_points'];
// 					if (reviewQuality >= config['review']['good_review_threshold']) {
// 						pointsRewarded = config['review']['good_review_user_points'];
// 					}
// 					user.fetch().then(function(_user) {
						
// 					});
// 				}
				
// 			}, function() {

// 			});
// 		}
		
// 	}
// });