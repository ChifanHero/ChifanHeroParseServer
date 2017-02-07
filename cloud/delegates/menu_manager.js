var MenuItem = Parse.Object.extend('MenuItem');
var Dish = Parse.Object.extend('Dish');
var _ = require('underscore');
var error_handler = require('../error_handler');
var dish_assembler = require('../assemblers/dish');
var Restaurant = Parse.Object.extend('Restaurant');

exports.findByRestaurantId = function(req, res) {
	var restaurantId = req.params.id;
	var restaurant = new Restaurant();
	restaurant.id = restaurantId;
	var query = new Parse.Query(Dish);
	query.equalTo('from_restaurant', restaurant);
	query.include('picture');
	query.include('menu');
	query.limit(400);
	query.find().then(function(results){
		var menuDic = {};
		if (results != undefined && results.length > 0) {
			_.each(results, function(result){
				var menu = result.get('menu');
				if (menu != undefined) {
					var menuId = menu.id;
					if (menuDic[menuId] != undefined) {
						var menuItem = menuDic[menuId]; 
						if (menuItem['dishes'] != undefined) {
							menuItem['dishes'].push(dish_assembler.assemble(result));
						} else {
							var menuItem = menuDic[menuId]; 
							var dishes = [];
							dishes.push(dish_assembler.assemble(result));
							menuItem['dishes'] = dishes;
						}
					} else {
						var menuItem = {};
						menuItem['id'] = menuId;
						menuItem['name'] = menu.get('name');
						var dishes = [];
						dishes.push(dish_assembler.assemble(result));
						menuItem['dishes'] = dishes;
						menuDic[menuId] = menuItem;
					}
				}
			}); 
		}
		var response = {};
		response['results'] = _.values(menuDic);
		res.status(200).json(response);
	}, function(error){
		error_handler.handle(error, {}, res);
	});
}