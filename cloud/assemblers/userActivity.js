var userAssembler = require('./user');
var reviewAssembler = require('./review');

exports.assemble = function(source) {
	var activity = {};
	if (source != undefined) {
		activity['id'] = source.id;
		activity['last_update_time'] = source.updatedAt;
		activity['user'] = userAssembler.assemble(source.get('user'));
		var type = source.get('type');;
		activity['type'] = type
		if (type == 'review') {
			activity['review'] = reviewAssembler.assemble(source.get('review'));
		} else if (type == 'upload_image') {
			var uploadActivity = {};
			activity['upload_image'] = uploadActivity;
		}
	} 
	return activity; 
}