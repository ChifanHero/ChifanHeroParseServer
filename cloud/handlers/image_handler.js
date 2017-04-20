var Restaurant = Parse.Object.extend('Restaurant');

Parse.Cloud.afterSave("Image", function (request) {
  var imageSaved = request.object;
  var restaurant = imageSaved.get("restaurant");
  if (restaurant != undefined) {
    restaurant.fetch().then(function (restaurant) {
      console.log(restaurant);
      if (restaurant.get("image") == undefined) {
        restaurant.set("image", imageSaved);
        restaurant.save();
      }
    });
  }
});