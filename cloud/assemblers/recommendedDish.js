/**
 * Created by xnzhang on 5/15/17.
 */

'use strict';

const restaurantAssembler = require('./restaurant');

exports.assemble = function(source) {
  let recommendedDish = {};
  if (source !== undefined) {
    recommendedDish['id'] = source.id;
    recommendedDish['name'] = source.get('name');
    recommendedDish['recommendation_count'] = source.get('recommendation_count');
    recommendedDish['restaurant'] = restaurantAssembler.assemble(source.get('restaurant'));
  }
  return recommendedDish;
};
