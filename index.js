
'use strict'

var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var ParseDashboard = require('parse-dashboard');
var path = require('path');

var restaurant_manager = require('./cloud/delegates/restaurantManager');
var dish_manager = require('./cloud/delegates/dishManager');
var user_manager = require('./cloud/delegates/userManager');
var favorite_manager = require('./cloud/delegates/favoriteManager');
var image_manager = require('./cloud/delegates/imageManager');
var selectedCollection_manager = require('./cloud/delegates/selectedCollectionManager');
var city_manager = require('./cloud/delegates/cityManager');
var homepage_manager = require('./cloud/delegates/homepageManager');
var review_manager = require('./cloud/delegates/reviewManager');
var userActivity_manager = require('./cloud/delegates/userActivityManager');
var dish_recommendation_manager = require('./cloud/delegates/dishRecommendationManager');

var devEnv = {
  dbURI: "mongodb://aws:aws@ds015780.mlab.com:15780/lightning-staging",
  appId: "28BX7btLUKGGsFGCSyGGv9Pzj1nCWDl9EV6GpMBQ",
  masterKey: "rj0pEKLhfWX8310qDj9s0rUEAo4ukQJrTNtCP11j",
  serverURL: "http://localhost:1337/parse",
  fileKey: "b0e50b64-fcb1-41db-8a0d-96a8e5de542d",
  appName: "ChifanHero-Staging"
}
var databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;

var api = new ParseServer({
  databaseURI: databaseUri || devEnv.dbURI,
  cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
  appId: process.env.APP_ID || devEnv.appId,
  masterKey: process.env.MASTER_KEY || devEnv.masterKey, //Add your master key here. Keep it secret!
  fileKey: process.env.FILE_KEY || devEnv.fileKey, // Add the file key to provide access to files already hosted on Parse
  serverURL: process.env.SERVER_URL || devEnv.serverURL,  // Don't forget to change to https if needed
  liveQuery: {
    classNames: ["Image"] // List of classes to support for query subscriptions
  }
});

var dashboard = new ParseDashboard({
  "apps": [
    {
      "serverURL": process.env.SERVER_URL || devEnv.serverURL,
      "appId": process.env.APP_ID || devEnv.appId,
      "masterKey": process.env.MASTER_KEY || devEnv.masterKey,
      "appName": process.env.APP_NAME || devEnv.appName
    }
  ]
});
// Client-keys like the javascript key or the .NET key are not necessary with parse-server
// If you wish you require them, you can set them as options in the initialization above:
// javascriptKey, restAPIKey, dotNetKey, clientKey

var app = express();

// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

// Serve the Parse API on the /parse URL prefix
var mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, api);
app.use(mountPath, function (req, res, next) {
  var sessionToken = req.get("User-Session");
  if (sessionToken === undefined) {
    next();
  } else {
    Parse.User.become(sessionToken).then(function (user) {
      req.user = user;
      next();
    }, function (error) {
      var validationError = {};
      validationError.message = error.message;
      validationError.code = error.code;
      res.status(401).json(validationError);
    });
  }

});

app.use('/dashboard', dashboard);

// Parse Server plays nicely with the rest of your web routes
app.get('/', function (req, res) {
  res.status(200).send('Welcome to ChifanHero!');
});

// There will be a test page available on the /test path of your server url
// Remove this before launching your app
app.get('/test', function (req, res) {
  res.sendFile(path.join(__dirname, '/public/test.html'));
});


//GET

app.get('/parse/restaurants/:id', restaurant_manager.findById);


app.get('/parse/dishes', dish_manager.findByRestaurantId);
app.get('/parse/dishes/:id', dish_manager.findById);
app.get('/parse/restaurants', restaurant_manager.findAll);

app.get('/parse/favorites', favorite_manager.findByUserSession);
app.get('/parse/isFavorite', favorite_manager.checkIsUserFavorite);

app.get('/parse/selectedCollections/:id', selectedCollection_manager.findById);
app.get('/parse/selectedCollections', selectedCollection_manager.findAllWithCenterAndRadius);
app.get('/parse/restaurantCollectionMembers/:id', selectedCollection_manager.findAllRestaurantsMembersById);

app.get('/parse/cities', city_manager.findCitiesWithPrefix);
app.get('/parse/hotCities', city_manager.getHotCities);

app.get('/parse/images', image_manager.findAllByRestaurantId);

app.get('/parse/homepage', homepage_manager.getHomePages);
app.get('/parse/reviews', review_manager.listReviews);
app.get('/parse/activities', userActivity_manager.listUserActivities);
app.get('/parse/reviews/:id', review_manager.fetchReview);

//POST
app.post('/parse/favorites', favorite_manager.addByUserSession);
app.post('/parse/images', image_manager.uploadImage);

app.post('/parse/users/oauthLogin', user_manager.oauthLogIn);
app.post('/parse/users/signUp', user_manager.signUp);
app.post('/parse/users/logIn', user_manager.logIn);
app.post('/parse/users/update', user_manager.update);
app.post('/parse/users/logOut', user_manager.logOut);
app.post('/parse/reviews', review_manager.createReview);
app.post('/parse/dishRecommendations', dish_recommendation_manager.createDishRecommendation);

//PUT
app.put('/parse/restaurants/:id', restaurant_manager.update);
app.put('/parse/restaurantCollectionMemCan', selectedCollection_manager.nominateRestaurant);

//DELETE
app.delete('/parse/favorites', favorite_manager.deleteByUserSession);

var port = process.env.PORT || 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function () {
  console.log('parse-server-production running on port ' + port + '.');
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);

// For testing
module.exports = httpServer;
