var _ = require('underscore');
var favoriteAssembler = require('../assemblers/favorite');
var errorHandler = require('../errorHandler');

var Favorite = Parse.Object.extend('Favorite');
var Restaurant = Parse.Object.extend('Restaurant');
var Dish = Parse.Object.extend('Dish');
var SelectedCollection = Parse.Object.extend('SelectedCollection');


exports.addByUserSession = function (req, res) {
  var user = req.user;
  var type = req.body['type'];
  var objectId = req.body['object_id'];

  if (user == undefined) {
    var error = new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, "Invalid session token");
    errorHandler.handle(error, {}, res);
  }

  if (!validateParameters(type)) {
    var error = new Parse.Error(Parse.Error.INVALID_QUERY, "The parameter \'type\' has invalid value");
    errorHandler.handle(error, {}, res);
  }

  var favorite = new Favorite();
  if (type === 'dish') {
    var dish = new Dish();
    dish.id = objectId;
    favorite.set('type', type);
    favorite.set('user', user);
    favorite.set('dish', dish);
  } else if (type === 'restaurant') {
    var restaurant = new Restaurant();
    restaurant.id = objectId;
    favorite.set('type', type);
    favorite.set('user', user);
    favorite.set('restaurant', restaurant);
  } else if (type === 'selected_collection') {
    var selectedCollection = new SelectedCollection();
    selectedCollection.id = objectId;
    favorite.set('type', type);
    favorite.set('user', user);
    favorite.set('selected_collection', selectedCollection);
  }
  favorite.save().then(function (result) {
    var favoriteRes = favoriteAssembler.assemble(result);
    var response = {};
    response['result'] = favoriteRes;
    res.status(201).json(response);
  }, function (error) {
    errorHandler.handle(error, {}, res);
  });

}

exports.findByUserSession = function (req, res) {
  var type = req.query['type'];
  var lat = parseFloat(req.query['lat']);
  var lon = parseFloat(req.query['lon']);
  var user = req.user;
  if (user == undefined) {
    var error = new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, "Invalid session token");
    errorHandler.handle(error, {}, res);
  }

  if (!validateParameters(type)) {
    var error = new Parse.Error(Parse.Error.INVALID_QUERY, "The parameter \'type\' has invalid value");
    errorHandler.handle(error, {}, res);
  }

  var query = new Parse.Query(Favorite);
  query.equalTo('user', user);
  query.equalTo('type', type);
  query.limit(10);

  query.include('dish.from_restaurant');
  query.include('dish.image');
  query.include('restaurant');
  query.include('restaurant.image');
  query.include('selected_collection');
  query.include('selected_collection.cell_image');

  query.find().then(function (results) {
    var favorites = [];
    if (results != undefined && results.length > 0) {
      _.each(results, function (result) {
        var favorite = favoriteAssembler.assemble(result, lat, lon);
        favorites.push(favorite);
      });
    }
    var response = {};
    response['results'] = favorites;
    res.status(200).json(response);
  }, function (error) {
    errorHandler.handle(error, {}, res);
  });

}

exports.deleteByUserSession = function (req, res) {
  var user = req.user;
  var type = req.body['type'];
  var objectId = req.body['object_id'];
  var query = new Parse.Query(Favorite);
  query.equalTo('user', user);
  if (type === 'dish') {
    var dish = new Dish();
    dish.id = objectId;
    query.equalTo('dish', dish);
  } else if (type === 'restaurant') {
    var restaurant = new Restaurant();
    restaurant.id = objectId;
    query.equalTo('restaurant', restaurant);
  } else if (type === 'selected_collection') {
    var selectedCollection = new SelectedCollection();
    selectedCollection.id = objectId;
    query.equalTo('selected_collection', selectedCollection);
  }
  query.find().then(function (results) {
    return Parse.Object.destroyAll(results);
  }).then(function () {
    res.status(200).json({});
  }, function (error) {
    errorHandler.handle(error, {}, res);
  });
}

exports.checkIsUserFavorite = function (req, res) {
  var user = req.user
  var type = req.query['type']
  var objectId = req.query['id']
  if (user == undefined) {
    var error = new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, "Invalid session token");
    errorHandler.handle(error, {}, res);
  }

  if (!validateParameters(type)) {
    var error = new Parse.Error(Parse.Error.INVALID_QUERY, "The parameter \'type\' has invalid value");
    errorHandler.handle(error, {}, res);
  }

  var query = new Parse.Query(Favorite);
  query.equalTo('user', user);
  query.equalTo('type', type);
  if (type == "restaurant") {
    var restaurant = {
      __type: "Pointer",
      className: "Restaurant",
      objectId: objectId
    };
    query.equalTo('restaurant', restaurant);
  } else if (type == "selected_collection") {
    var selected_collection = {
      __type: "Pointer",
      className: "SelectedCollection",
      objectId: objectId
    };
    query.equalTo('selected_collection', selected_collection);
  }

  query.find().then(function (results) {
    if (results != undefined && results.length > 0) {
      var response = {};
      response['result'] = true;
      res.status(200).json(response);
      return;
    }
    var response = {};
    response['result'] = false;
    res.status(200).json(response);
  }, function (error) {
    errorHandler.handle(error, {}, res);
  });
}


function validateParameters(type) {
  if (type !== 'dish' && type !== 'restaurant' && type !== 'selected_collection') {
    return false;
  }
  return true;
}