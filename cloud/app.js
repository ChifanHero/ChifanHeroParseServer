var express = require('express');
var app = express();

var restaurant_manager = require('cloud/delegates/restaurant_manager');
var promotion_manager = require('cloud/delegates/promotion_manager');
var message_manager = require('cloud/delegates/message_manager');
var dish_manager = require('cloud/delegates/dish_manager');
var user_manager = require('cloud/delegates/user_manager');
var rating_manager = require('cloud/delegates/rating_manager');
var favorite_manager = require('cloud/delegates/favorite_manager');
var candidate_manager = require('cloud/delegates/candidate_manager');
var menu_manager = require('cloud/delegates/menu_manager');
var image_manager = require('cloud/delegates/image_manager');
var selectedCollection_manager = require('cloud/delegates/selectedCollection_manager');
var city_manager = require('cloud/delegates/city_manager');
var homepage_manager = require('cloud/delegates/homepage_manager');
var review_manager = require('cloud/delegates/review_manager');
var userActivity_manager = require('cloud/delegates/userActivity_manager');
var dish_recommendation_manager = require('cloud/delegates/dish_recommendation_manager');

//Populate req.body
app.use(express.bodyParser());
app.use(function(req, res, next){
    var sessionToken = req.get("User-Session");
    if(sessionToken === undefined){
        next();
    } else {
        Parse.User.become(sessionToken).then(function(user){
            req.user = user;
            next();
        }, function(error){
            res.status(401);
            var validationError = {};
            validationError.message = error.message;
            validationError.code = error.code;
            res.json(validationError);
        });
    }
      
});

//GET

app.get('/restaurants/:id', restaurant_manager.findById);
app.get('/restaurants/:id/menus', menu_manager.findByRestaurantId);


app.get('/messages', message_manager.listAll);
app.get('/messages/:id', message_manager.findById);



app.get('/dishes', dish_manager.findByRestaurantId);
app.get('/dishes/:id', dish_manager.findById);

app.get('/ratings', rating_manager.findByUserSession);
app.get('/favorites', favorite_manager.findByUserSession);
app.get('/isFavorite', favorite_manager.checkIsUserFavorite);

app.get('/selectedCollections/:id', selectedCollection_manager.findById);
app.get('/selectedCollections', selectedCollection_manager.findAllWithCenterAndRadius);
app.get('/restaurantCollectionMembers/:id', selectedCollection_manager.findAllRestaurantsMembersById);

app.get('/cities', city_manager.findCitiesWithPrefix);
app.get('/hotCities', city_manager.getHotCities);

app.get('/images', image_manager.findAllByRestaurantId);

// app.get('/homepage', homepage_manager.getHomePage);
app.get('/homepage', homepage_manager.getRecommendations);
app.get('/reviews', review_manager.listReviews);
app.get('/activities', userActivity_manager.listUserActivities);
app.get('/reviews/:id', review_manager.fetchReview);

//POST
app.post('/restaurants', restaurant_manager.listAll);
app.post('/promotions', promotion_manager.listAll);
app.post('/ratings', rating_manager.rateByUserSession);
app.post('/favorites', favorite_manager.addByUserSession);
app.post('/images', image_manager.uploadImage);
app.post('/restaurantCandidates', restaurant_manager.vote);

app.post('/users/oauthLogin', user_manager.oauthLogIn);
app.post('/users/signUp', user_manager.signUp);
app.post('/users/logIn', user_manager.logIn);
app.post('/users/update', user_manager.update);
app.post('/users/logOut', user_manager.logOut);
app.post('/reviews', review_manager.createReview);
app.post('/dishRecommendations', dish_recommendation_manager.createDishRecommendation);


//PUT
app.put('/restaurants/:id', restaurant_manager.update);
app.put('/restaurantCollectionMemCan', selectedCollection_manager.nominateRestaurant);

//DELETE
app.delete('/favorites', favorite_manager.deleteByUserSession); 

app.listen();