'use strict';

const express = require('express');
const ParseServer = require('parse-server').ParseServer;
const ParseDashboard = require('parse-dashboard');
const path = require('path');

const restaurantManager = require('./cloud/delegates/restaurantManager');
const userManager = require('./cloud/delegates/userManager');
const favoriteManager = require('./cloud/delegates/favoriteManager');
const imageManager = require('./cloud/delegates/imageManager');
const selectedCollectionManager = require('./cloud/delegates/selectedCollectionManager');
const cityManager = require('./cloud/delegates/cityManager');
const homepageManager = require('./cloud/delegates/homepageManager');
const reviewManager = require('./cloud/delegates/reviewManager');
const userActivityManager = require('./cloud/delegates/userActivityManager');
const recommendedDishManager = require('./cloud/delegates/recommendedDishManager');
const errorHandler = require('./cloud/errorHandler');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const ParseRestApi = require('./cloud/rest/ParseRestApi');
var _ParseRestApi = _interopRequireDefault(ParseRestApi);

const devEnv = {
  //dbURI: "mongodb://aws:aws@ds015780.mlab.com:15780/lightning-staging",
  dbURI: "mongodb://readwrite:readwrite@ec2-34-212-245-174.us-west-2.compute.amazonaws.com:27017/chifanhero?authSource=admin",
  appId: "28BX7btLUKGGsFGCSyGGv9Pzj1nCWDl9EV6GpMBQ",
  masterKey: "rj0pEKLhfWX8310qDj9s0rUEAo4ukQJrTNtCP11j",
  serverURL: "http://localhost:1337/parse",
  fileKey: "b0e50b64-fcb1-41db-8a0d-96a8e5de542d",
  appName: "ChifanHero-Staging"
};
const databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;

const api = new ParseServer({
  databaseURI: databaseUri || devEnv.dbURI,
  cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
  appId: process.env.APP_ID || devEnv.appId,
  masterKey: process.env.MASTER_KEY || devEnv.masterKey, //Add your master key here. Keep it secret!
  fileKey: process.env.FILE_KEY || devEnv.fileKey, // Add the file key to provide access to files already hosted on Parse
  serverURL: process.env.SERVER_URL || devEnv.serverURL,  // Don't forget to change to https if needed
  liveQuery: {
    classNames: ["Image"] // List of classes to support for query subscriptions
  },
  verifyUserEmails: true,
  appName: process.env.APP_NAME || devEnv.appName,
  publicServerURL: process.env.SERVER_URL || devEnv.serverURL,
  emailAdapter: {
    module: 'parse-server-simple-mailgun-adapter',
    options: {
      // The address that your emails come from
      fromAddress: 'noreply@mail.chifanhero.com',
      // Your domain from mailgun.com
      domain: 'mail.chifanhero.com',
      // Your API key from mailgun.com
      apiKey: 'key-57edf739c4830a0094f772422e46d5ee',
    }
  },
  preventLoginWithUnverifiedEmail: false,
  emailVerifyTokenValidityDuration: 24 * 60 * 60,
  revokeSessionOnPasswordReset: true,
  passwordPolicy: {
    // a RegExp object or a regex string representing the pattern to enforce 
    validatorPattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{8,})/, // enforce password with at least 8 char with at least 1 lower case, 1 upper case and 1 digit
    //optional setting to set a validity duration for password reset links (in seconds)
    resetTokenValidityDuration: 24 * 60 * 60, // expire after 24 hours
  }
});

const dashboard = new ParseDashboard({
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

const app = express();

// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

// Serve the Parse API on the /parse URL prefix
const mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, api);
app.use(mountPath, function (req, res, next) {
  const sessionToken = req.get("User-Session");
  if (sessionToken === undefined) {
    next();
  } else {
    const restApi = new _ParseRestApi.default(req.auth.config.publicServerURL, req.auth.config.applicationId);
    restApi.retriveUserFromSession(sessionToken).then(user => {
      req.user = user;
      next();
    }, error => {
      errorHandler.handle(error, res);
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


// Web homepage
app.use("/",  express.static(__dirname + '/web'));
app.get('/home', function (req, res) {
  res.sendFile(path.join(__dirname, '/web/index.html'));
});


//GET

app.get('/parse/restaurants/:id', restaurantManager.findRestaurantById);
//app.get('/parse/restaurants/:id/images', imageManager.findAllImagesOfOneRestaurant);
app.get('/parse/restaurants/:id/reviews', reviewManager.findAllReviewsOfOneRestaurant);
app.get('/parse/restaurants/:id/recommendedDishes', recommendedDishManager.findAllRecommendedDishesOfOneRestaurant);

app.get('/parse/favorites', favoriteManager.findAllFavoritesByUserSession);
//app.get('/parse/isFavorite', favorite_manager.checkIsUserFavorite);

app.get('/parse/selectedCollections/:id', selectedCollectionManager.findSelectedCollectionById);
app.get('/parse/selectedCollections', selectedCollectionManager.findAllSelectedCollectionsGivenCenterAndRadius);
app.get('/parse/selectedCollections/:id/restaurantCollectionMembers', selectedCollectionManager.findAllRestaurantMembersById);

app.get('/parse/cities', cityManager.findCitiesWithPrefix);
app.get('/parse/hotCities', cityManager.findAllHotCities);

app.get('/parse/homepages', homepageManager.getHomePages);
app.get('/parse/reviews/:id', reviewManager.findReviewById);

app.get('/parse/newRandomUser', userManager.newRandomUser);
app.get('/parse/me', userManager.retrieveMyInfo);
app.get('/parse/me/emailVerified', userManager.emailVerified);


//POST
app.post('/parse/favorites', favoriteManager.addByUserSession);
app.post('/parse/images', imageManager.uploadImage);

app.post('/parse/users/oauthLogin', userManager.oauthLogIn);
app.post('/parse/users/signUp', userManager.signUp);
app.post('/parse/users/logIn', userManager.logIn);
app.post('/parse/users/update', userManager.update);
app.post('/parse/users/logOut', userManager.logOut);
app.post('/parse/users/changePassword', userManager.changePassword);
app.post('/parse/users/resetPassword', userManager.resetPassword);
app.post('/parse/restaurantCollectionMemCan', selectedCollectionManager.nominateRestaurant);
app.post('/parse/restaurants/:id', restaurantManager.updateRestaurantById);
app.post('/parse/restaurants/:restaurantId/reviews', reviewManager.upsertReview);
app.post('/parse/restaurants/:restaurantId/reviews/:reviewId', reviewManager.upsertReview);
app.post('/parse/restaurants/:id/recommendedDishes', recommendedDishManager.upsertRecommendedDish);

//DELETE
app.delete('/parse/favorites', favoriteManager.deleteByUserSession);
app.delete('/parse/images', imageManager.deleteImages);

const port = process.env.PORT || 1337;
const httpServer = require('http').createServer(app);
httpServer.listen(port, function () {
  console.log('parse-server-production running on port ' + port + '.');
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);

// For testing
module.exports = httpServer;
