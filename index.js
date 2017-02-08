// Example express application adding the parse-server module to expose Parse
// compatible API routes.

var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var ParseDashboard = require('parse-dashboard');
var path = require('path');

var restaurant_manager = require('./cloud/delegates/restaurant_manager');
var promotion_manager = require('./cloud/delegates/promotion_manager');
var dish_manager = require('./cloud/delegates/dish_manager');
var user_manager = require('./cloud/delegates/user_manager');
var rating_manager = require('./cloud/delegates/rating_manager');
var favorite_manager = require('./cloud/delegates/favorite_manager');
var menu_manager = require('./cloud/delegates/menu_manager');
var image_manager = require('./cloud/delegates/image_manager');
var selectedCollection_manager = require('./cloud/delegates/selectedCollection_manager');
var city_manager = require('./cloud/delegates/city_manager');
var homepage_manager = require('./cloud/delegates/homepage_manager');
var review_manager = require('./cloud/delegates/review_manager');
var userActivity_manager = require('./cloud/delegates/userActivity_manager');
var dish_recommendation_manager = require('./cloud/delegates/dish_recommendation_manager');

var globalKey = {
    dbURI: "mongodb://aws:aws@ds015670-a0.mlab.com:15670,ds015670-a1.mlab.com:15670/lightning?replicaSet=rs-ds015670",
    appId: "Z6ND8ho1yR4aY3NSq1zNNU0kPc0GDOD1UZJ5rgxM",
    masterKey: "KheL2NaRmyVKr11LZ7yC0uvMHxNv8RpX389oUf8F",
    serverURL: "http://localhost:1337/parse",
    fileKey: "c25308ff-6a43-40e0-a09a-2596427b692c"
}
var databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;

var api = new ParseServer({
    databaseURI: databaseUri || globalKey.dbURI,
    cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
    appId: process.env.APP_ID || globalKey.appId,
    masterKey: process.env.MASTER_KEY || globalKey.masterKey, //Add your master key here. Keep it secret!
    fileKey: process.env.FILE_KEY || globalKey.fileKey, // Add the file key to provide access to files already hosted on Parse
    serverURL: process.env.SERVER_URL || globalKey.serverURL,  // Don't forget to change to https if needed
    liveQuery: {
        classNames: ["Image"] // List of classes to support for query subscriptions
    }
});

var dashboard = new ParseDashboard({
    "apps": [
        {
            "serverURL": process.env.SERVER_URL || globalKey.serverURL,
            "appId": process.env.APP_ID || globalKey.appId,
            "masterKey": process.env.MASTER_KEY || globalKey.masterKey,
            "appName": "吃饭英雄"
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
app.use(mountPath, function(req, res, next){
    var sessionToken = req.get("User-Session");
    if(sessionToken === undefined){
        next();
    } else {
        Parse.User.become(sessionToken).then(function(user){
            req.user = user;
            next();
        }, function(error){
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
    res.status(200).send('Make sure to star the parse-server repo on GitHub!');
});

// There will be a test page available on the /test path of your server url
// Remove this before launching your app
app.get('/test', function (req, res) {
    res.sendFile(path.join(__dirname, '/public/test.html'));
});


//GET

app.get('/parse/restaurants/:id', restaurant_manager.findById);
app.get('/parse/restaurants/:id/menus', menu_manager.findByRestaurantId);



app.get('/parse/dishes', dish_manager.findByRestaurantId);
app.get('/parse/dishes/:id', dish_manager.findById);

app.get('/parse/ratings', rating_manager.findByUserSession);
app.get('/parse/favorites', favorite_manager.findByUserSession);
app.get('/parse/isFavorite', favorite_manager.checkIsUserFavorite);

app.get('/parse/selectedCollections/:id', selectedCollection_manager.findById);
app.get('/parse/selectedCollections', selectedCollection_manager.findAllWithCenterAndRadius);
app.get('/parse/restaurantCollectionMembers/:id', selectedCollection_manager.findAllRestaurantsMembersById);

app.get('/parse/cities', city_manager.findCitiesWithPrefix);
app.get('/parse/hotCities', city_manager.getHotCities);

app.get('/parse/images', image_manager.findAllByRestaurantId);

// app.get('/homepage', homepage_manager.getHomePage);
app.get('/parse/homepage', homepage_manager.getRecommendations);
app.get('/parse/reviews', review_manager.listReviews);
app.get('/parse/activities', userActivity_manager.listUserActivities);
app.get('/parse/reviews/:id', review_manager.fetchReview);

//POST
app.post('/parse/restaurants', restaurant_manager.listAll);
app.post('/parse/promotions', promotion_manager.listAll);
app.post('/parse/ratings', rating_manager.rateByUserSession);
app.post('/parse/favorites', favorite_manager.addByUserSession);
app.post('/parse/images', image_manager.uploadImage);
app.post('/parse/restaurantCandidates', restaurant_manager.vote);

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
