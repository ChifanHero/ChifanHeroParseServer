Parse.Cloud.afterSave('Rating', function(request){
	var ratingSaved = request.object;
	var type = ratingSaved.get('type');
	var action = ratingSaved.get('action');
	if (type == undefined) {
		return;
	}
	var object;
	if (type === 'dish') {
		object = ratingSaved.get('dish');
	} else if (type === 'restaurant') {
		object = ratingSaved.get('restaurant');
	} else if (type === 'selected_collection') {
		object = ratingSaved.get('selected_collection');
	}
	object.fetch().then(function(_object){
		if (action === 'like') {
			if(_object.get('like_count') == undefined){
				_object.set('like_count', 1); 
			} else{
				_object.increment('like_count', 1);
			}
		} else if (action === 'dislike') {
			if(_object.get('dislike_count') == undefined){
				_object.set('dislike_count', 1); 
			} else{
				_object.increment('dislike_count', 1);
			}
		} else if (action === 'neutral') {
			if(_object.get('neutral_count') == undefined){
				_object.set('neutral_count', 1); 
			} else{
				_object.increment('neutral_count', 1);
			}
		}
		_object.increment('rating_total', 1);
		_object.save(); 
	});
});

Parse.Cloud.afterDelete('Rating', function(request){
	var ratingDeleted = request.object;
	var type = ratingDeleted.get('type');
	var action = ratingDeleted.get('action');
	var object;
	if (type === 'dish') {
		object = ratingDeleted.get('dish');
	} else if (type === 'restaurant') {
		object = ratingDeleted.get('restaurant');
	} else if (type === 'selected_collection') {
		object = ratingDeleted.get('selected_collection');
	}
	object.fetch().then(function(object){
		if (action === 'like') {
			object.increment('like_count', -1);
		} else if (action === 'dislike') {
			object.increment('dislike_count', -1);
		} else if (action === 'neutral') {
			object.increment('neutral_count', -1);
		}
		object.increment('rating_total', -1);
		object.save(); 
	});
});