'use strict';

const _ = require('underscore');
const imageAssembler = require('../assemblers/image');
const errorHandler = require('../errorHandler');
const Image = Parse.Object.extend('Image');
const Restaurant = Parse.Object.extend('Restaurant');
const Review = Parse.Object.extend('Review');
const sharp = require('sharp');

const ORIGINAL_SIZE = 800;
const THUMBNAIL_SIZE = 100;

exports.uploadImage = function (req, res) {
  console.log('CFH_UploadImage');
  const restaurantId = req.body["restaurant_id"];
  const reviewId = req.body['review_id'];
  const type = req.body["type"];
  const base64Code = req.body["base64_code"];

  const p1 = createResizedImage(base64Code, ORIGINAL_SIZE);
  const p2 = createResizedImage(base64Code, THUMBNAIL_SIZE);

  Parse.Promise.when(p1, p2).then(function (originalBase64Code, thumbnailBase64Code) {
    const originalImage = new Parse.File("CFH_" + type + ".jpeg", {base64: originalBase64Code});
    const thumbnailImage = new Parse.File("CFH_" + type + ".jpeg", {base64: thumbnailBase64Code});
    const newImage = new Image();
    newImage.set("original", originalImage);
    newImage.set("thumbnail", thumbnailImage);
    newImage.set("type", type);
    if (restaurantId !== undefined) {
      const restaurant = new Restaurant();
      restaurant.id = restaurantId;
      newImage.set("restaurant", restaurant);
    }
    if (reviewId !== undefined) {
      const review = new Review();
      review.id = reviewId;
      newImage.set("review", review);
    }

    newImage.save().then(function (newImage) {
      const imageRes = imageAssembler.assemble(newImage);
      const response = {};
      response['result'] = imageRes;
      res.status(201).json(response);
    }, function (error) {
      console.error('Error_UploadImage');
      errorHandler.handle(error, res);
    });
  });
};

// Don't need this api for now
/*
exports.findAllImagesOfOneRestaurant = function (req, res) {
  console.log('CFH_GetAllImages');
  const restaurantId = req.params.id;
  const restaurant = {
    __type: "Pointer",
    className: "Restaurant",
    objectId: restaurantId
  };
  const query = new Parse.Query(Image);
  query.equalTo('restaurant', restaurant);
  query.find().then(images => {
    const results = [];
    if (images !== undefined && images.length > 0) {
      _.each(images, image => {
        const result = imageAssembler.assemble(image);
        results.push(result);
      });
    }
    const response = {};
    response['results'] = results;
    res.status(200).json(response)
  }, error => {
    console.error('Error_GetAllImages');
    errorHandler.handle(error, res);
  });
};
*/

exports.deleteImages = function (req, res) {
  console.log('CFH_DeleteImages');
  const imageIdArray = req.body['image_ids'];
  const toBeDeletedImages = [];
  _.each(imageIdArray, imageId => {
    const image = new Image();
    image.id = imageId;
    toBeDeletedImages.push(image);
  });
  Parse.Object.destroyAll(toBeDeletedImages).then(() => {
    res.status(200).json({});
  }, error => {
    console.error('Error_DeleteImages');
    errorHandler.handle(error, res);
  });
};

function createResizedImage(base64Code, size) {
  const promise = new Parse.Promise();

  const buffer = new Buffer(base64Code, 'base64');
  sharp(buffer)
    .resize(size, size)
    .max()
    .toFormat('jpeg')
    .toBuffer()
    .then(data => {
      promise.resolve(data.toString('base64'));
    });

  return promise;
}
