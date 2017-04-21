require('./handlers/imageHandler.js');
require('./handlers/ratingHandler.js');
require('./handlers/favoriteHandler.js');
require('./handlers/restaurantHandler.js');
require('./handlers/userHandler.js');
require('./handlers/reviewHandler.js');

Parse.Cloud.define('hello', function (req, res) {
  res.success('Hi');
});