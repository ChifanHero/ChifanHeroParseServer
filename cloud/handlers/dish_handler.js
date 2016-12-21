var Review = Parse.Object.extend('Review');
var Favorite = Parse.Object.extend('Favorite');

Parse.Cloud.afterDelete('Dish', function(request){
	var dishDeleted = request.object;
	deleteRelatedRecords(dishDeleted);
});

function deleteRelatedRecords(dishDeleted) {
	if (dishDeleted === undefined) {
		return;
	} else {
		var reviewQuery = new Parse.Query(Review);
		var favoriteQuery = new Parse.Query(Favorite);
		reviewQuery.equalTo('dish', dishDeleted);
		favoriteQuery.equalTo('dish', dishDeleted);
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
	}
}



Parse.Cloud.afterSave('Dish', function(request) {
	var dish = request.object;
});