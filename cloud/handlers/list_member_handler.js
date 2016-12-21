var ListMember = Parse.Object.extend('ListMember');
var ListCandidate = Parse.Object.extend('ListCandidate');
var Dish = Parse.Object.extend('Dish');

Parse.Cloud.beforeSave('ListMember', function(request, response){
	var member = request.object;
	var dish = member.get('dish');
	var list = member.get('list');
	if (dish == undefined || list == undefined) {
		response.error('dish and list must not be undefined');
		return;
	}
	var tasks = []; 
	if (member.dirty('dish') || member.dirty('list')) { 
		validateMemberLocation(dish, list).then(function() { 
			tasks.push(findListMember(dish, list));
			Parse.Promise.when(tasks).then(function(members){
				console.log('inside');
				console.log('members.length');
				if (members != undefined && members.length > 0){
					response.error('This dish is already in the list');
					return;
				}
				response.success();
			}, function(error){
				response.error(error);
			});
		}, function() {
			response.error("The dish is beyond the range of the list");
		});
	} else {
		response.success();
	}
});

function validateMemberLocation(dish, list) {
	var promise = new Parse.Promise();
	var tasks = []; 
	tasks.push(list.fetch());
	var dishQuery = new Parse.Query(Dish);
	dishQuery.include('from_restaurant');
	tasks.push(dishQuery.get(dish.id));
	Parse.Promise.when(tasks).then(function(list, dish){
		var listLocation = list.get("center_location");
		var dishLocation = dish.get('from_restaurant').get('coordinates');
		if (listLocation != undefined && dishLocation != undefined) {
			if (listLocation.milesTo(dishLocation) > 50) {
				promise.reject();
			} else {
				promise.resolve();
			}
		} else {
			promise.resolve();
		}
	}, function() {
		promise.resolve();
	});
	return promise;
}

function findListMember(dish, list){
	var promise = new Parse.Promise();
	var query = new Parse.Query(ListMember);
	query.equalTo('dish', dish);
	query.equalTo('list', list);
	query.find().then(function(members){
		promise.resolve(members);
	}, function(error){
		promise.reject(error);
	});
	return promise;
} 