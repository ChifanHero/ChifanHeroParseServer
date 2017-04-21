var Dish = Parse.Object.extend('Dish');
var Restaurant = Parse.Object.extend('Restaurant');
var List = Parse.Object.extend('List');
var ListCandidate = Parse.Object.extend('ListCandidate');
var candidate_assembler = require('../assemblers/candidate');
var error_handler = require('../error_handler');

exports.nominate = function (req, res) {
  var dishId = req.body['dish_id'];
  var listId = req.body['list_id'];
  if (dishId == undefined || listId == undefined) {
    res.json(401, 'invalid parameters');
    return;
  }
  var dish = new Dish();
  dish.id = dishId;
  var list = new List();
  list.id = listId;
  findListCandidate(dish, list).then(function (candidates) {
    if (candidates != undefined && candidates.length > 0) {
      console.log('found');
      var existingCandidate = candidates[0];
      existingCandidate.increment('count', 1);
      return existingCandidate.save();

    } else {
      var candidate = new ListCandidate();
      candidate.set('dish', dish);
      candidate.set('list', list);
      return candidate.save();
    }
  }).then(function (_candidate) {
    var candidate = candidate_assembler.assemble(_candidate);
    var response = {};
    response["result"] = candidate;
    res.json(201, response);
  }, function (error) {
    error_handler.handle(error, {}, res);
  });

}


function findListCandidate(dish, list) {
  var promise = new Parse.Promise();
  var query = new Parse.Query(ListCandidate);
  query.equalTo('dish', dish);
  query.equalTo('list', list);
  query.find().then(function (candidates) {
    promise.resolve(candidates);
  }, function (error) {
    promise.reject(error);
  });
  return promise;
}