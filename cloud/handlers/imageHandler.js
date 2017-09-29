'use strict';

const Image = Parse.Object.extend('Image');
const sharp = require('sharp');
const THUMBNAIL_SIZE = 100;

Parse.Cloud.beforeSave('Image', function (request, response) {
  const imageToSave = request.object;
  if (imageToSave.isNew()) {
    response.success();
    return;
  }

  if (imageToSave.dirty('original') && imageToSave.dirty('thumbnail')) {
    response.success();
    return;
  }

  // 1. if delete original, then remove original file
  // 2. if insert original, then create thumbnail and then save both
  // when saving thumbnail, if thumbnail exists, then need to remove thumbnail file
  // 3. if replace original, then do both 1 and 2
  if (imageToSave.dirty('original') && !imageToSave.dirty('thumbnail')) {
    const oldImageQuery = new Parse.Query(Image);
    oldImageQuery.get(imageToSave.id).then(oldImage => {
      let p1 = new Parse.Promise();
      p1.resolve();
      if (oldImage.get('original') !== undefined) {
        const originalName = oldImage.get('original').name();
        const requestOptionOfOriginal = createRequestOption(originalName);
        p1 = deleteImage(requestOptionOfOriginal);
      }
      let p2 = new Parse.Promise();
      p2.resolve(undefined);
      if (imageToSave.get('original') !== undefined) {
        p2 = Parse.Cloud.httpRequest({url: imageToSave.get('original').url()});  
      }
      let p3 = new Parse.Promise();
      p3.resolve();
      if (imageToSave.get('original') !== undefined && oldImage.get('thumbnail') !== undefined) {
        const thumbnailName = oldImage.get('thumbnail').name();
        const requestOptionOfThumbnail = createRequestOption(thumbnailName);
        p3 = deleteImage(requestOptionOfThumbnail);
      }
      
      Parse.Promise.when(p1, p2, p3).then(function (oldOriginalRes, newOriginalRes, oldThumbnailRes) {
        if (newOriginalRes === undefined) {
          response.success();
          return;
        }
        sharp(newOriginalRes.buffer)
          .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE)
          .max()
          .toFormat('jpeg')
          .toBuffer()
          .then(data => {
            const thumbnailImage = new Parse.File(imageToSave.get('original').name(), {base64: data.toString('base64')});
            thumbnailImage.save().then((thumbnailImage) => {
              imageToSave.set('thumbnail', thumbnailImage);
              response.success();
            });
          });
      });
    });
    return;
  }

  if (!imageToSave.dirty('original') && imageToSave.dirty('thumbnail')) {
    const oldImageQuery = new Parse.Query(Image);
    oldImageQuery.get(imageToSave.id).then(oldImage => {
      const thumbnailName = oldImage.get('thumbnail').name();
      const requestOptionOfThumbnail = createRequestOption(thumbnailName);

      deleteImage(requestOptionOfThumbnail).then(thumbnailResponse => {
        if (thumbnailResponse.status < 300) {
          response.success();
        } else {
          response.error("Image deletion failed: " + imageToSave.id);
        }
      });
    });
    return;
  }
  response.success();
});


/*
 * If restaurant doesn't have a profile image, then make
 * the first stored image as restaurant profile image
 */
Parse.Cloud.afterSave('Image', function (request) {
  const imageSaved = request.object;
  const restaurant = imageSaved.get('restaurant');
  if (restaurant !== undefined) {
    restaurant.fetch().then(function (restaurant) {
      if (restaurant.get('image') === undefined) {
        restaurant.set('image', imageSaved);
        restaurant.save();
      }
    });
  }
});

/*
 * Delete files from disk before deleting image record
 */
Parse.Cloud.beforeDelete('Image', function (request, response) {
  const imageToBeDeleted = request.object;
  const originalName = imageToBeDeleted.get('original').name();
  const thumbnailName = imageToBeDeleted.get('thumbnail').name();

  const requestOptionOfOriginal = createRequestOption(originalName);
  const requestOptionOfThumbnail = createRequestOption(thumbnailName);

  const p1 = deleteImage(requestOptionOfOriginal);
  const p2 = deleteImage(requestOptionOfThumbnail);

  Parse.Promise.when(p1, p2).then(function (originalResponse, thumbnailResponse) {
    if (originalResponse.status < 300 && thumbnailResponse.status < 300) {
      response.success();
    } else {
      response.error("Image deletion failed: " + imageToBeDeleted.id);
    }
  });
});

function deleteImage(requestOption) {
  return Parse.Cloud.httpRequest(requestOption);
}

function createRequestOption(fileName) {
  let requestOption = {};
  if (process.env.NODE_ENV === "production") {
    requestOption = {
      method: 'DELETE',
      url: 'http://chifanhero.us-east-1.elasticbeanstalk.com/parse/files/' + fileName,
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'X-Parse-Application-Id': 'Z6ND8ho1yR4aY3NSq1zNNU0kPc0GDOD1UZJ5rgxM',
        'X-Parse-Master-Key': 'KheL2NaRmyVKr11LZ7yC0uvMHxNv8RpX389oUf8F'
      },
      body: {}
    };
  } else if (process.env.NODE_ENV === "staging") {
    requestOption = {
      method: 'DELETE',
      url: 'http://chifanhero-staging.us-east-1.elasticbeanstalk.com/parse/files/' + fileName,
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'X-Parse-Application-Id': '28BX7btLUKGGsFGCSyGGv9Pzj1nCWDl9EV6GpMBQ',
        'X-Parse-Master-Key': 'rj0pEKLhfWX8310qDj9s0rUEAo4ukQJrTNtCP11j'
      },
      body: {}
    };
  } else {
    requestOption = {
      method: 'DELETE',
      url: 'http://localhost:1337/parse/files/' + fileName,
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'X-Parse-Application-Id': '28BX7btLUKGGsFGCSyGGv9Pzj1nCWDl9EV6GpMBQ',
        'X-Parse-Master-Key': 'rj0pEKLhfWX8310qDj9s0rUEAo4ukQJrTNtCP11j'
      },
      body: {}
    }
  }
  return requestOption;
}