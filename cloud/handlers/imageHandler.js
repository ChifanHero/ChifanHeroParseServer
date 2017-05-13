"use strict";

/*
 * If restaurant doesn't have a profile image, then make
 * the first stored image as restaurant profile image
 */
Parse.Cloud.afterSave('Image', function (request) {
  const imageSaved = request.object;
  const restaurant = imageSaved.get('restaurant');
  if (restaurant !== undefined) {
    restaurant.fetch().then(function (restaurant) {
      console.log(restaurant);
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