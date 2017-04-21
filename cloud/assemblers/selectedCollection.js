var imageAssembler = require('./image');

exports.assemble = function(source) {
	var selectedCollection = {};
	if (source != undefined) {
		selectedCollection['id'] = source.id;
		selectedCollection['title'] = source.get('title');
		selectedCollection['description'] = source.get('description');
		selectedCollection['type_id'] = source.get('type_id');
		selectedCollection['member_count'] = source.get('member_count');
		selectedCollection['user_favorite_count'] = source.get('user_favorite_count');
		selectedCollection['like_count'] = source.get('like_count');
		selectedCollection['cell_image'] = imageAssembler.assemble(source.get('cell_image'));
		selectedCollection['coverage_radius'] = source.get('coverage_radius');
		var coverageCenterGeo = source.get('coverage_center_geo');
		if (coverageCenterGeo !== undefined) {
			var coverageCenterGeoRes = {};
			coverageCenterGeoRes['lat'] = coverageCenterGeo.latitude;
			coverageCenterGeoRes['lon'] = coverageCenterGeo.longitude;
			selectedCollection['coverage_center_geo'] = coverageCenterGeoRes;
		}
	}		
	return selectedCollection;
}