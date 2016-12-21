var ListMember = Parse.Object.extend('ListMember');
var ListCandidate = Parse.Object.extend('ListCandidate');
var Dish = Parse.Object.extend('Dish');

Parse.Cloud.beforeSave('ListCandidate', function(request, response){
	var candidate = request.object;
	var dish = candidate.get('dish');
	var list = candidate.get('list');
	var count = candidate.get('count');
	if (dish == undefined || list == undefined) {
		response.error('dish and list must not be undefined');
		return;
	} 
	if (count == undefined) {
		candidate.set('count', 1);
	}
	var tasks = []; 
	if (candidate.dirty('dish') || candidate.dirty('list')) {
		validateCandidateLocation(dish, list).then(function() {
			tasks.push(findListMember(dish, list));
			tasks.push(findListCandidate(dish, list));
			Parse.Promise.when(tasks).then(function(members, candidates){
				console.log('inside');
				console.log('members.length');
				if (members != undefined && members.length > 0){
					response.error('This dish is already in the list');
					return;
				}
				console.log('candidates: '.concat(candidates));
				if (candidates != undefined && candidates.length >0){
					console.log('found');
					var existingCandidate = candidates[0];
					existingCandidate.increment('count', 1);
					existingCandidate.save();
					// response.success();
					response.error('Object exists and not allowed to be redundant');
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

function findListCandidate(dish, list){
	var promise = new Parse.Promise();
	var query = new Parse.Query(ListCandidate);
	query.equalTo('dish', dish);
	query.equalTo('list', list);
	query.find().then(function(candidates){
		promise.resolve(candidates);
	}, function(error){
		promise.reject(error);
	});
	return promise;
}

function validateCandidateLocation(dish, list) {
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

Parse.Cloud.afterSave('ListCandidate', function(request){
	var candidate = request.object;
	var count = candidate.get('count');
	if (count > 10) {
		var dish = candidate.get('dish');
		dish.fetch().then(function(dish){
			var score = dish.get('score');
			var list = candidate.get('list');
			var listMember = new ListMember();
			listMember.set('dish', dish);
			listMember.set('list', list);
			listMember.set('score', score);
			list.increment("member_count");
			list.save();
			listMember.save();
		});
		candidate.destroy();
	}
});