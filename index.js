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
const appVersionManager = require('./cloud/delegates/appVersionManager');
const errorHandler = require('./cloud/errorHandler');

const ParseRestApi = require('./cloud/rest/ParseRestApi');

const devEnv = {
  //dbURI: "",
  dbURI: "",
  appId: "",
  masterKey: "",
  serverURL: "http://localhost:1337/parse",
  fileKey: "",
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
      fromAddress: '',
      // Your domain from mailgun.com
      domain: '',
      // Your API key from mailgun.com
      apiKey: '',
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
      "appName": process.env.APP_NAME || devEnv.appName,
      "iconName": "AppLogo.png"
    }
  ],
  "iconsFolder": "./icons",
  "users": [
    {
      "user":"chifanheroparsealex",
      "pass":"1234"
    },
    {
      "user":"chifanheroparsericky",
      "pass":"1234"
    }
  ],
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
    const restApi = new ParseRestApi(req.auth.config.publicServerURL, req.auth.config.applicationId);
    restApi.retrieveUserFromSession(sessionToken).then(user => {
      req.user = user;
      next();
    }, error => {
      errorHandler.handle(error, res);
    });
  }

});

app.use('/dashboard', dashboard);

// Web homepage
app.use("/",  express.static(__dirname + '/web'));
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, '/web/index.html'));
});

// There will be a test page available on the /test path of your server url
// Remove this before launching your app
app.get('/test', function (req, res) {
  res.sendFile(path.join(__dirname, '/public/test.html'));
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

app.get('/parse/appVersionInfo', appVersionManager.getAppStoreVersionInfo);


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
