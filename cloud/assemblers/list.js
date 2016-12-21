var image_assembler = require('./image');

exports.assemble = function(source) {
	var list = {};
	if (source != undefined) {
		list['id'] = source.id;
		list['name'] = source.get('name');
		list['member_count'] = source.get('member_count');
		list['picture'] = image_assembler.assemble(source.get('image'));
		list['favorite_count'] = source.get('favorite_count');
		list['like_count'] = source.get('like_count');
		var centerLocation = source.get('center_location');
		if (centerLocation !== undefined) {
			console.log(centerLocation);
			var center = {};
			center['lat'] = centerLocation.latitude;
			center['lon'] = centerLocation.longitude;
			list['center'] = center;
		}
		

	}		
	return list;
}