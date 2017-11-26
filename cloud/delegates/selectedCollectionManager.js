const Restaurant = Parse.Object.extend('Restaurant');
const SelectedCollection = Parse.Object.extend('SelectedCollection');
const RestaurantCollectionMember = Parse.Object.extend('RestaurantCollectionMember');
const RestaurantCollectionMemCan = Parse.Object.extend('RestaurantCollectionMemCan');

const selectedCollectionAssembler = require('../assemblers/selectedCollection');
const restaurantAssembler = require('../assemblers/restaurant');
const errorHandler = require('../errorHandler');
const _ = require('underscore');

const COVERAGE_RADIUS = 100;

exports.findSelectedCollectionById = function (req, res) {
  console.log('CFH_GetSelectedCollection');
  const id = req.params.id;
  const query = new Parse.Query(SelectedCollection);
  query.include('cell_image');
  query.get(id).then(selectedCollection => {
    const response = {
      'result': selectedCollectionAssembler.assemble(selectedCollection)
    };
    res.status(200).json(response);
  }, error => {
    console.error('Error_GetSelectedCollection');
    errorHandler.handle(error, res);
  });
};

exports.findAllSelectedCollectionsGivenCenterAndRadius = function (req, res) {
  console.log('CFH_GetAllSelectedCollections');
  if (req.query.lat === undefined || req.query.lon === undefined) {
    errorHandler.handleCustomizedError(400, "Latitude and longitude are required", res);
    return;
  }
  const userLocation = {
    'lat': req.query.lat,
    'lon': req.query.lon
  };
  const query = new Parse.Query(SelectedCollection);
  const userGeoPoint = new Parse.GeoPoint(parseFloat(userLocation.lat), parseFloat(userLocation.lon));
  query.withinMiles("coverage_center_geo", userGeoPoint, COVERAGE_RADIUS);
  query.include("cell_image");

  query.find().then(selectedCollections => {
    const response = {
      'results': []
    };
    if (selectedCollections !== undefined && selectedCollections.length > 0) {
      _.each(selectedCollections, selectedCollection => {
        response['results'].push(selectedCollectionAssembler.assemble(selectedCollection));
      });
    }
    res.status(200).json(response);
  }, error => {
    console.error('Error_GetAllSelectedCollections');
    errorHandler.handle(error, res);
  });
};

exports.findAllRestaurantMembersById = function (req, res) {
  console.log('CFH_GetAllRestaurantMembers');
  const id = req.params.id;
  const selectedCollection = new SelectedCollection();
  selectedCollection.id = id;
  let longitude = undefined;
  let latitude = undefined;
  if (req.query.lon !== undefined) {
    longitude = parseFloat(req.query.lon);
  }
  if (req.query.lat !== undefined) {
    latitude = parseFloat(req.query.lat);
  }
  const query = new Parse.Query(RestaurantCollectionMember);
  query.include('restaurant');
  query.include('restaurant.image');
  query.equalTo('selected_collection', selectedCollection);
  query.find().then(restaurantCollectionMembers => {
    const response = {
      'results': []
    };
    if (restaurantCollectionMembers !== undefined && restaurantCollectionMembers.length > 0) {
      _.each(restaurantCollectionMembers, restaurantCollectionMember => {
        const restaurant = restaurantAssembler.assemble(restaurantCollectionMember.get('restaurant'));
        if (latitude !== undefined && longitude !== undefined 
          && restaurant.coordinates !== undefined 
          && restaurant.coordinates.lat !== undefined && restaurant.coordinates.lon !== undefined) {
          const startPoint = new Parse.GeoPoint(latitude, longitude);
          const destination = new Parse.GeoPoint(restaurant.coordinates.lat, restaurant.coordinates.lon);
          let distanceValue = startPoint.milesTo(destination);
          let distance = {};
          if (distanceValue !== undefined) {
            distanceValue = parseFloat(distanceValue.toFixed(2));
            distance["value"] = distanceValue;
            distance["unit"] = "mi";
            restaurant['distance'] = distance;
          }
        }
        response['results'].push(restaurant);
      });
    }
    res.status(200).json(response);
  }, error => {
    console.error('Error_GetAllRestaurantMembers');
    errorHandler.handle(error, res);
  });
};

exports.nominateRestaurant = function (req, res) {
  console.log('CFH_NominateRestaurant');
  const collectionId = req.body["collection_id"];
  const restaurantId = req.body["restaurant_id"];

  const restaurant = new Restaurant();
  restaurant.id = restaurantId;
  const selectedCollection = new SelectedCollection();
  selectedCollection.id = collectionId;

  const query = new Parse.Query(RestaurantCollectionMemCan);
  query.equalTo("selected_collection", selectedCollection);
  query.equalTo("restaurant", restaurant);
  query.first().then(memCan => {
    if (memCan !== undefined) {
      memCan.increment("count", 1);
      memCan.save().then(newMemCan => {
        const response = {
          'result': newMemCan.get('count')
        };
        res.status(200).json(response);
      });
    } else {
      const memCan = new RestaurantCollectionMemCan();
      memCan.set("selected_collection", selectedCollection);
      memCan.set("restaurant", restaurant);
      memCan.set("count", 1);
      memCan.save().then(memCan => {
        const response = {
          'result': memCan.get('count')
        };
        res.status(200).json(response);
      });
    }
  });
};

