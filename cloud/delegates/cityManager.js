const City = Parse.Object.extend('City');
const errorHandler = require('../errorHandler');
const cityAssembler = require('../assemblers/city');
const _ = require('underscore');

exports.findCitiesWithPrefix = function (req, res) {
  console.log('CFH_GetCitiesWithPrefix');
  const prefix = req.query['prefix'];
  if (prefix === undefined) {
    errorHandler.handleCustomizedError(400, "prefix is required.", res);
    return;
  }
  const query = new Parse.Query(City);
  query.startsWith('name', prefix);
  query.limit(20);
  query.find().then(cities => {
    const response = {
      'results': []
    };
    if (cities !== undefined && cities.length > 0) {
      _.each(cities, city => {
        response['results'].push(cityAssembler.assemble(city));
      });
    }
    response['results'] = cities;
    res.status(200).json(response);
  }, error => {
    errorHandler.handle(error, res);
  });
};

exports.findAllHotCities = function (req, res) {
  const query = new Parse.Query(City);
  query.equalTo("activated", true);
  query.descending("member_count");
  query.find().then(cities => {
    const response = {
      'results': []
    };
    if (cities !== undefined && cities.length > 0) {
      _.each(cities, city => {
        response['results'].push(cityAssembler.assemble(city));
      });
    }
    res.status(200).json(response);
  }, error => {
    errorHandler.handle(error, res);
  });
};