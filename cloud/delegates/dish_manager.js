var Dish = Parse.Object.extend('Dish');
var Restaurant = Parse.Object.extend('Restaurant');
var ListMember = Parse.Object.extend('ListMember');
var _ = require('underscore');
var dish_assembler = require('../assemblers/dish');
var error_handler = require('../error_handler');

exports.findByRestaurantId = function(req, res) {
	var restId = req.query.restaurant;
	var rest = new Restaurant();
	rest.id = restId;
	var query = new Parse.Query(Dish);
	query.include('from_restaurant');
	query.equalTo('from_restaurant', rest);
	query.include('picture');
	query.limit(200);
	query.find().then(function(results) {
		var dishes = [];
		if (results != undefined && results.length > 0) {
			_.each(results, function(result){
				var dish = dish_assembler.assemble(result);
				dishes.push(dish);
			});
		}
		var response = {};
		response['results'] = dishes;
		res.json(200, response);
	}, function(error) {
		error_handler.handle(error, {}, res);
	});
}

exports.findById = function(req, res) {
	var id = req.params.id;
	var promises = [];
	promises.push(findDishById(id));
	promises.push(findListsByDishId(id));
	Parse.Promise.when(promises).then(function(_dish, _lists){
		var dish = dish_assembler.assemble(_dish);
		var lists = [];
		if (_lists != undefined && _lists.length > 0) {
			_.each(_lists, function(_list){
				var list = {};
				list['id'] = _list.id;
				list['name'] = _list['name'];
				lists.push(list);
			});
		}
		dish['related_lists'] = lists;
		var response = {};
		response['result'] = dish;
		res.json(200, response);
	}, function(error){
		error_handler.handle(error, {}, res);
	});
}

function findDishById(id) {
	var query = new Parse.Query(Dish);
	query.include('from_restaurant.picture');
	query.include('picture');
	return query.get(id);
}

function findListsByDishId(id) {
	var promise = new Parse.Promise();
	var dish = new Dish();
	dish.id = id;
	var query = new Parse.Query(ListMember);
	query.include('list');
	query.equalTo('dish', dish);
	query.find().then(function(results){
		var lists = [];
		if(results != undefined && results.length > 0){
			_.each(results, function(result){
				if (result.get('list') != undefined) {
					var _list = result.get('list');
					var list = {};
					list['id'] = _list.id;
					list['name'] = _list.get('name');
					lists.push(list);
				}
			});
		}
		promise.resolve(lists);
	}, function(error){
		promise.reject(error);
	});
	return promise;
}