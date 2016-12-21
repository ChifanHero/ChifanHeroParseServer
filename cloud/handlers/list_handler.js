var Review = Parse.Object.extend('Review');
var Favorite = Parse.Object.extend('Favorite');

Parse.Cloud.afterDelete('List', function(request){
	var listDeleted = request.object;
	var reviewQuery = new Parse.Query(Review);
	var favoriteQuery = new Parse.Query(Favorite);
	reviewQuery.equalTo('list', listDeleted);
	favoriteQuery.equalTo('list', listDeleted);
	reviewQuery.find().then(function(results){
		Parse.Object.destroyAll(results).then(function(){

		}, function(error){
			console.error('Error deleting reviews. error is ' + error.code + ': ' + error.message);
		});
	});
	favoriteQuery.find().then(function(results){
		Parse.Object.destroyAll(results).then(function(){

		}, function(error){
			console.error('Error deleting favorites. error is ' + error.code + ': ' + error.message);
		});
	});
});



