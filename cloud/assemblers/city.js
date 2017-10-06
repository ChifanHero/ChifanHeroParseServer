exports.assemble = function(source) {
	const city = {};
	if (source !== undefined) {
		city['id'] = source.id;
		city['zip'] = source.get('zip');
		city['name'] = source.get('name');
		city['state'] = source.get('state');
		if (source.get('center') !== undefined) {
      const center = source.get('center');
      city['center'] = {
        'lat': center['latitude'],
        'lon': center['longitude']
      };
		}
		city['localized_country_name'] = source.get('localized_country_name');
		if (source.get('activated') !== undefined) {
			city['activated'] = source.get('activated');
		} else {
			city['activated'] = false
		}
	}
	return city; 
};