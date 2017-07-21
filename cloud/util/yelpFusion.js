/**
 * Created by xnzhang on 4/28/17.
 */

'use strict';

const send = function (requestOptionUserDefined) {
  var requestOption = {
    method: requestOptionUserDefined.method || 'GET',
    url: requestOptionUserDefined.url,
    params: requestOptionUserDefined.query,
    headers: {
      'Content-Type': 'application/json;charset=utf-8',
      'Authorization': requestOptionUserDefined.bearerToken
    }
  };

  return Parse.Cloud.httpRequest(requestOption);
}

class YelpClient {
  constructor(token) {
    this.token = 'Bearer '+ token;
  }

  search(parameters) {
    return send({
      url: 'https://api.yelp.com/v3/businesses/search',
      query: parameters,
      bearerToken: this.token
    });
  }

  phoneSearch(parameters) {
    return send({
      url: 'https://api.yelp.com/v3/businesses/search/phone',
      query: parameters,
      bearerToken: this.token
    });
  }

  transactionSearch(transactionType, parameters) {
    return send({
      url: 'https://api.yelp.com/v3/transactions/' + transactionType + '/search',
      query: parameters,
      bearerToken: this.token
    });
  }

  business(id) {
    return send({
      url: 'https://api.yelp.com/v3/businesses/' + id,
      bearerToken: this.token
    });
  }

  reviews(businessId) {
    return send({
      url: 'https://api.yelp.com/v3/businesses/' + businessId + '/reviews',
      bearerToken: this.token
    });
  }

  autocomplete(parameters) {
    return send({
      url: 'https://api.yelp.com/v3/autocomplete',
      query: parameters,
      bearerToken: this.token
    });
  }
}

const accessToken = () => {
  if(isTokenExpired()) {
    var promise = new Parse.Promise();
    send({
      url: 'https://api.yelp.com/oauth2/token',
      method: 'POST',
      query: {
        grant_type: 'client_credentials',
        client_id: 'yUHWciwXnBYi7K-PPUhFrQ',
        client_secret: 'B2scbiYoH8GHZJCVG3P3asygRf08l5HMmYxOMjfYSyvCGYYYNopg0YnG7szeRBx5'
      }
    }).then(httpResponse => {
      saveToken(httpResponse.data.access_token, httpResponse.data.expires_in);
      promise.resolve(httpResponse.data);
    });
    return promise;
  } else {
    var promise = new Parse.Promise();
    promise.resolve({
      access_token: global.token
    });
    return promise;
  }
};

const createClient = (token) => {
  return new YelpClient(token);
};

const saveToken = (token, tokenRemainingTime) => {
  global.token = token;
  global.tokenRemainingTime = tokenRemainingTime;
  global.tokenSavedTime = new Date().getTime();
}

const isTokenExpired = () => {
  if(global.tokenSavedTime === undefined || global.tokenRemainingTime === undefined) {
    return true;
  }
  /* We want 1 day buffer so minus 86400 seconds */
  if ((new Date().getTime() / 1000 - global.tokenSavedTime) < (global.tokenRemainingTime - 86400)) {
    return false;
  }
  return true;
}


module.exports = {
  client: createClient,
  accessToken: accessToken
};
