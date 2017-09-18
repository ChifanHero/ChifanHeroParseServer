'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

function ParseRestApi(serverURL, applicationId) {
	this.serverURL = serverURL;
 	this.applicationId = applicationId;
}

ParseRestApi.prototype.retriveUserFromSession = function (session) {
	const promise = new Parse.Promise();
	const url = this.serverURL + '/users/me';
	Parse.Cloud.httpRequest({
		method: 'GET',
		url: url,
		headers: {
		  'Content-Type': 'application/json;charset=utf-8',
		  'X-Parse-Application-Id': this.applicationId,
		  'X-Parse-Session-Token': session
		}
	}).then(function(httpResponse) {
		promise.resolve(httpResponse.data);
	}, function(httpResponse) {
		handleError(httpResponse, promise);
	});
	return promise;
}

ParseRestApi.prototype.getUser = function(userId, session, includes) {
	const promise = new Parse.Promise();
	const params = encodeQueryData(includes);
	const url = this.serverURL + '/users/' + userId + '?' + params;
	Parse.Cloud.httpRequest({
		method: 'GET',
		url: url,
		headers: {
		  'Content-Type': 'application/json;charset=utf-8',
		  'X-Parse-Application-Id': this.applicationId,
		  'X-Parse-Session-Token': session
		}
	}).then(function(httpResponse) {
		promise.resolve(httpResponse.data);
	}, function(httpResponse) {
		handleError(httpResponse, promise);
	});
	return promise;
}

ParseRestApi.prototype.signUp = function (username, password) {
	const promise = new Parse.Promise();
	const url = this.serverURL + '/users';
	const body = {
	'username': username,
	'password': password
	}
	Parse.Cloud.httpRequest({
		method: 'POST',
		url: url,
		headers: {
		  'Content-Type': 'application/json;charset=utf-8',
		  'X-Parse-Application-Id': this.applicationId
		},
		body: body
	}).then(function(httpResponse) {
		promise.resolve(httpResponse.data);
	}, function(httpResponse) {
		handleError(httpResponse, promise);
	});
	return promise;
}

ParseRestApi.prototype.logIn = function (username, password) {
	const promise = new Parse.Promise();
	const params = encodeQueryData({'username': username, 'password': password});
	const url = this.serverURL + '/login?' + params;
	Parse.Cloud.httpRequest({
		method: 'GET',
		url: url,
		headers: {
		  'Content-Type': 'application/json;charset=utf-8',
		  'X-Parse-Application-Id': this.applicationId
		}
	}).then(function(httpResponse) {
		promise.resolve(httpResponse.data);
	}, function(httpResponse) {
		handleError(httpResponse, promise);
	});
	return promise;
}

ParseRestApi.prototype.updateUser = function (data, sessionToken) {
	const promise = new Parse.Promise();
	const url = this.serverURL + '/users/' + data['objectId'];
	const userData = {};
	for (var key in data) {
      if (key == 'objectId' || key == 'sessionToken') {
        continue;
      }
      userData[key] = data[key];
    }
    Parse.Cloud.httpRequest({
		method: 'PUT',
		url: url,
		headers: {
		  'Content-Type': 'application/json;charset=utf-8',
		  'X-Parse-Application-Id': this.applicationId,
		  'X-Parse-Session-Token': sessionToken
		},
		body: userData
	}).then(function(httpResponse) {
		promise.resolve(httpResponse.data);
	}, function(httpResponse) {
		handleError(httpResponse, promise);
	});
	return promise;
}

ParseRestApi.prototype.logOut = function (session) {
	const promise = new Parse.Promise();
	const url = this.serverURL + '/logout';
	Parse.Cloud.httpRequest({
		method: 'POST',
		url: url,
		headers: {
		  'Content-Type': 'application/json;charset=utf-8',
		  'X-Parse-Application-Id': this.applicationId,
		  'X-Parse-Session-Token': session
		}
	}).then(function(httpResponse) {
		promise.resolve(true);
	}, function(httpResponse) {
		handleError(httpResponse, promise);
	});
	return promise;
}

function handleError (httpResponse, promise) {
	const errorJson = httpResponse.data;
	if (errorJson !== undefined && errorJson['code'] !== undefined) {
		promise.reject(new Parse.Error(errorJson['code'], errorJson['error']));
	} else {
		promise.reject(new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR, ""));
	}
}

function encodeQueryData(data) {
   let ret = [];
   for (let d in data)
     ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(data[d]));
   return ret.join('&');
} 

exports.default = ParseRestApi;

module.exports = ParseRestApi;