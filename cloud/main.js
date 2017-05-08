"use strict";

require('./handlers/imageHandler.js');
require('./handlers/favoriteHandler.js');
require('./handlers/restaurantHandler.js');
require('./handlers/userHandler.js');
require('./handlers/reviewHandler.js');

var yelp = require('./util/yelpFusion.js');

/*
yelp.accessToken().then(tokenResponse => {
  yelp.client(tokenResponse.access_token).business('gary-danko-san-francisco').then(httpResponse => {
    console.log('Yelp authorization token updated successfully!');
  })
}, error => {
  console.log(error);
});
*/



