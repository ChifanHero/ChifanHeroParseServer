var user_assembler = require('./user');
var review_assembler = require('./review');
var dish_assembler = require('./dish');
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('cloud/config.js'));

exports.assemble = function(source) {
	var activity = {};
	if (source != undefined) {
		activity['id'] = source.id;
		activity['last_update_time'] = source.updatedAt;
		activity['user'] = user_assembler.assemble(source.get('user'));
		var type = source.get('type');;
		activity['type'] = type
		if (type == 'review') {
			activity['review'] = review_assembler.assemble(source.get('review'));
		} else if (type == 'upload_image') {
			var uploadActivity = {};
			activity['upload_image'] = uploadActivity;
		} else if (type == 'recommend_dish') {
			var dishRecommendation = {};
			dishRecommendation['dish'] = dish_assembler.assemble(source.get('dish'));
			activity['recommend_dish'] = dishRecommendation;
		}
		
	} 
	return activity; 
}