/**
 * Created by xnzhang on 5/2/17.
 */

'use strict'

const send = function (requestOptionUserDefined) {
  var promise = new Parse.Promise();
  var requestOption = {
    method: 'GET',
    url: requestOptionUserDefined.url,
    params: Object.assign(requestOptionUserDefined.query, {'key': 'AIzaSyDbWSwTi-anJJf25HxNrfBNicmrR0JSaOY'})
  };

  Parse.Cloud.httpRequest(requestOption).then(httpResponse => {
    promise.resolve(httpResponse.data);
  });

  return promise;
}

class GoogleClient {

  placeDetail(placeId) {
    return send({
      url: 'https://maps.googleapis.com/maps/api/place/details/json',
      query: {'placeid': placeId}
    });
  }
}

const createClient = () => {
  return new GoogleClient();
};


module.exports = {
  client: createClient
};
