const _ = require('underscore');
const favoriteAssembler = require('../assemblers/favorite');
const errorHandler = require('../errorHandler');

const Favorite = Parse.Object.extend('Favorite');
const Restaurant = Parse.Object.extend('Restaurant');
const SelectedCollection = Parse.Object.extend('SelectedCollection');


/**
 * Add favorite for user
 * @param req
 * @param res
 */
exports.addByUserSession = function (req, res) {
  const user = req.user;
  const type = req.body['type'];
  const objectId = req.body['object_id'];

  if (user === undefined) {
    errorHandler.handleCustomizedError(400, "Missing user session token", res);
  }

  if (!validateParameters(type)) {
    errorHandler.handleCustomizedError(400, "The parameter \'type\' has invalid value", res);
  }

  const favorite = new Favorite();
  if (type === 'restaurant') {
    const restaurant = new Restaurant();
    restaurant.id = objectId;
    favorite.set('type', type);
    favorite.set('user', user);
    favorite.set('restaurant', restaurant);
  } else if (type === 'selected_collection') {
    const selectedCollection = new SelectedCollection();
    selectedCollection.id = objectId;
    favorite.set('type', type);
    favorite.set('user', user);
    favorite.set('selected_collection', selectedCollection);
  }
  favorite.save().then(result => {
    const favoriteRes = favoriteAssembler.assemble(result);
    const response = {
      'result': favoriteRes
    };
    res.status(201).json(response);
  }, function (error) {
    errorHandler.handle(error, res);
  });

};

/**
 * Find favorite by user
 * @param req
 * @param res
 */
exports.findAllFavoritesByUserSession = function (req, res) {
  const type = req.query['type'];
  const user = req.user;
  if (user === undefined) {
    errorHandler.handleCustomizedError(400, "Missing user session token", res);
  }

  if (!validateParameters(type)) {
    errorHandler.handleCustomizedError(400, "The parameter \'type\' has invalid value", res);
  }

  const query = new Parse.Query(Favorite);
  query.equalTo('user', user);
  query.equalTo('type', type);
  query.include('restaurant');
  query.include('restaurant.image');
  query.include('selected_collection');
  query.include('selected_collection.cell_image');

  query.find().then(results => {
    const response = {
      'results': []
    };
    if (results !== undefined && results.length > 0) {
      _.each(results, result => {
        response['results'].push(favoriteAssembler.assemble(result));
      });
    }
    res.status(200).json(response);
  }, function (error) {
    errorHandler.handle(error, res);
  });

};

/**
 * Delete favorite by user
 * @param req
 * @param res
 */
exports.deleteByUserSession = function (req, res) {
  const user = req.user;
  const type = req.body['type'];
  const objectId = req.body['object_id'];
  const query = new Parse.Query(Favorite);
  query.equalTo('user', user);
  if (type === 'restaurant') {
    const restaurant = new Restaurant();
    restaurant.id = objectId;
    query.equalTo('restaurant', restaurant);
  } else if (type === 'selected_collection') {
    const selectedCollection = new SelectedCollection();
    selectedCollection.id = objectId;
    query.equalTo('selected_collection', selectedCollection);
  }
  query.find().then(results => {
    return Parse.Object.destroyAll(results);
  }).then(() => {
    res.status(200).json({});
  }, error => {
    errorHandler.handle(error, res);
  });
};


function validateParameters(type) {
  return !(type !== 'restaurant' && type !== 'selected_collection');
}