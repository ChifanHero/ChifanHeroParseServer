var SelectedCollection = Parse.Object.extend('SelectedCollection');
var RestaurantCollectionMember = Parse.Object.extend('RestaurantCollectionMember');
var RestaurantCollectionMemCan = Parse.Object.extend('RestaurantCollectionMemCan');

var selectedCollectionAssembler = require('../assemblers/selectedCollection');
var restaurantAssembler = require('../assemblers/restaurant');
var errorHandler = require('../errorHandler');
var _ = require('underscore');

var COVERAGE_RADIUS = 100;

exports.findSelectedCollectionById = function (req, res) {
  var id = req.params.id;
  var query = new Parse.Query(SelectedCollection);
  query.include('cell_image');
  query.get(id).then(function (_selectedCollection) {
    var selectedCollection = selectedCollectionAssembler.assemble(_selectedCollection);
    var response = {};
    response['result'] = selectedCollection;
    res.status(200).json(response);
  }, function (error) {
    errorHandler.handle(error, res);
  });
}

exports.findAllSelectedCollectionsGivenCenterAndRadius = function (req, res) {
  if (req.query.lat == undefined || req.query.lon == undefined) {
    var error = new Parse.Error(Parse.Error.INVALID_QUERY, "Please input latitude and longitude");
    errorHandler.handle(error, res);
  }
  var userLocation = {};
  userLocation['lat'] = req.query.lat;
  userLocation['lon'] = req.query.lon;
  var query = new Parse.Query(SelectedCollection);
  var userGeoPoint = new Parse.GeoPoint(parseFloat(userLocation.lat), parseFloat(userLocation.lon));
  query.withinMiles("coverage_center_geo", userGeoPoint, COVERAGE_RADIUS);
  query.include("cell_image");

  query.find().then(function (_selectedCollections) {
    var results = [];
    if (_selectedCollections != undefined && _selectedCollections.length > 0) {
      _.each(_selectedCollections, function (selectedCollection) {
        var result = selectedCollectionAssembler.assemble(selectedCollection);
        results.push(result);
      });
    }
    var response = {};
    response['results'] = results;
    res.status(200).json(response);
  }, function (error) {
    errorHandler.handle(error, res);
  });
}

exports.findAllRestaurantMembersById = function (req, res) {
  var id = req.params.id;
  var selectedCollection = new SelectedCollection();
  selectedCollection.id = id;
  var query = new Parse.Query(RestaurantCollectionMember);
  query.include('restaurant');
  query.include('restaurant.image');
  query.equalTo('selected_collection', selectedCollection);
  query.find().then(function (_restaurantCollectionMembers) {
    var restaurants = [];
    if (_restaurantCollectionMembers != undefined && _restaurantCollectionMembers.length > 0) {
      _.each(_restaurantCollectionMembers, function (restaurantCollectionMember) {
        var restaurant = restaurantAssembler.assemble(restaurantCollectionMember.get('restaurant'));
        restaurants.push(restaurant);
      });
    }
    var response = {};
    response['results'] = restaurants;
    res.status(200).json(response);
  }, function (error) {
    errorHandler.handle(error, res);
  });
}

exports.nominateRestaurant = function (req, res) {
  var collectionId = req.body["collection_id"];
  var restaurantId = req.body["restaurant_id"];

  var restaurant = {
    __type: "Pointer",
    className: "Restaurant",
    objectId: restaurantId
  };
  var selectedCollection = {
    __type: "Pointer",
    className: "SelectedCollection",
    objectId: collectionId
  };

  var query = new Parse.Query(RestaurantCollectionMemCan);
  query.equalTo("selected_collection", selectedCollection);
  query.equalTo("restaurant", restaurant);
  query.find().then(function (memCanList) {
    if (memCanList.length > 0) {
      var memCan = memCanList[0];
      memCan.increment("count", 1);
      memCan.save().then(function (_memCan) {
        var response = {};
        var memCanRes = {};
        memCanRes["count"] = _memCan.get("count");
        response["result"] = memCanRes;
        res.status(200).json(response);
      }, function (error) {
        errorHandler.handle(error, res);
      });
    } else {
      var memCan = new RestaurantCollectionMemCan();
      memCan.set("selected_collection", selectedCollection);
      memCan.set("restaurant", restaurant);
      memCan.set("count", 1);
      memCan.save().then(function (_memCan) {
        var response = {};
        var memCanRes = {};
        memCanRes["count"] = _memCan.get("count");
        response["result"] = memCanRes;
        res.status(200).json(response);
      }, function (error) {
        errorHandler.handle(error, res);
      });
    }
  }, function (error) {
    errorHandler.handle(error, res);
  });
}

