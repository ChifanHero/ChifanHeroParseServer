var user_assembler = require('../assemblers/user');
var image_assembler = require('../assemblers/image');
var error_handler = require('../error_handler');
var Buffer = require('buffer').Buffer;
var _ = require('underscore');

var TokenStorage = Parse.Object.extend('TokenStorage');

var restrictedAcl = new Parse.ACL();
restrictedAcl.setPublicReadAccess(false);
restrictedAcl.setPublicWriteAccess(false);

exports.oauthLogIn = function(req, res){
	var oauthLogin = req.body["oauth_login"];
	var accessToken = req.body["access_token"];

	Parse.Cloud.useMasterKey();
	Parse.Promise.as().then(function() {
		if (oauthLogin != undefined) {
		 	return upsertOauthUser(accessToken, oauthLogin);
		} else {
		  	return Parse.Promise.error("Oauth Login is required");
		}
	}).then(function(user) {
		var response = {};
		response['success'] = true;
		response['session_token'] = user.getSessionToken();

		var userRes = user_assembler.assemble(user);
		response['user'] = userRes;
		res.status(200).json(response);
	});
}

/**
 *   This function checks to see if this user has logged in before.
 *   If the user is found, update the access_token (if necessary) and return
 *   the users session token.  If not found, return the newOauthUser promise.
 */
var upsertOauthUser = function(accessToken, oauthLogin) {
 	var query = new Parse.Query(TokenStorage);
 	query.equalTo('oauth_login', oauthLogin);
 	query.ascending('createdAt');
  	var password;
  	// Check if this oauthLogin has previously logged in, using the master key
  	return query.first({ useMasterKey: true }).then(function(tokenData) {
    	// If not, create a new user.
    	if (!tokenData) {
      		return newOauthUser(accessToken, oauthLogin);
    	}
    	// If found, fetch the user.
    	var user = tokenData.get('user');
   		return user.fetch({ useMasterKey: true }).then(function(user) {
	      	// Update the accessToken if it is different.
	      	if (accessToken !== tokenData.get('access_token')) {
	        	tokenData.set('access_token', accessToken);
	      	}
	      /**
	       * This save will not use an API request if the token was not changed.
	       * e.g. when a new user is created and upsert is called again.
	       */
	      	return tokenData.save(null, { useMasterKey: true });
    	}).then(function(obj) {
			password = new Buffer(24);
			_.times(24, function(i) {
				password.set(i, _.random(0, 255));
			});
			password = password.toString('base64')
			user.setPassword(password);
			return user.save();
    	}).then(function(user) {
			return Parse.User.logIn(user.get('username'), password);
    	}).then(function(user) {
     		// Return the user object.
      		return Parse.Promise.as(user);
    	});
  	});
}

/**
 *   This function creates a Parse User, and
 *   associates it with an object in the TokenStorage class.
 *   Once completed, this will return upsertOauthUser.  This is done to protect
 *   against a race condition:  In the rare event where 2 new users are created
 *   at the same time, only the first one will actually get used.
 */
var newOauthUser = function(accessToken, oauthLogin) {
  	var user = new Parse.User();
  	// Generate a random username and password.
  	var username = oauthLogin + "#ChifanHero";
  	var password = new Buffer(24);
  	_.times(24, function(i) {
    	password.set(i, _.random(0, 255));
  	});
  	user.set("username", username);
  	user.set("password", password.toString('base64'));
  	// Sign up the new User
  	return user.signUp().then(function(user) {
    	// create a new TokenStorage object to store the user+GitHub association.
    	var ts = new TokenStorage();
	    ts.set('oauth_login', oauthLogin);
	    ts.set('access_token', accessToken);
	    ts.set('user', user);
	    ts.setACL(restrictedAcl);
	    // Use the master key because TokenStorage objects should be protected.
    	return ts.save(null, { useMasterKey: true });
  	}).then(function(tokenStorage) {
    	return upsertOauthUser(accessToken, oauthLogin);
  	});
}

exports.logIn = function(req, res){

	//can't use req.body['username']
	var username = req.body.username;
	var encodedPassword = req.body.password;
	Parse.User.logIn(username, encodedPassword).then(function(_user){
		var response = {};
		response['success'] = true;
		response['session_token'] = _user.getSessionToken();
		var user = user_assembler.assemble(_user);
		var picture = _user.get('picture');
		if (picture != undefined) {
			picture.fetch().then(function(_picture){
				var picture = image_assembler.assemble(_picture);
				user['picture'] = picture;
				response['user'] = user;
				res.status(200).json(response);
			}, function(error){
				response['user'] = user;
				res.status(200).json(response);
			});
		} else {
			response['user'] = user;
			res.status(200).json(response);
		}
	}, function(error){
		error_handler.handle(error, {}, res);
	});
}


exports.signUp = function(req, res) {

	//can't use req.body['username']
	var username = req.body.username;
	var encodedPassword = req.body.password;
	var email = username;

	//username must be provided
	if (username == undefined) {
		var error = {};
		error['message'] = "username must be provided";
		res.status(400).json(error);
		return;
	}

	//no need to write additional function to validate username. Parse will do that (validate email)

	//password must be provided
	if (encodedPassword == undefined) {
		var error = {};
		error['message'] = "password must be provided";
		res.status(400).json(error);
		return;
	}

	//since this is encoded password, we can't validate here
	//please validate password on client side


	var user = new Parse.User();
	user.set('username', username);
	user.set('password', encodedPassword);
	user.set('email', email);
	user.signUp().then(function(_user){
		var response = {};
		response['success'] = true;
		response['session_token'] = _user.getSessionToken();

		var userRes = user_assembler.assemble(_user);
		var picture = _user.get('picture');

		if (picture != undefined) {
			picture.fetch().then(function(_picture){
				var picture = image_assembler.assemble(_picture);
				userRes['picture'] = picture;
				response['user'] = userRes;
				res.status(200).json(response);
			}, function(error){
				error_handler.handle(error, {}, res);
			});
		} else {
			response['user'] = userRes;
			res.status(200).json(response);
		}
	}, function(error){
		error_handler.handle(error, {}, res);
	});
	
}

exports.update = function(req, res){

	//If session token is invalid, Parse will handle that
	//We don't need to verify session token
	var user = req.user;

	var nickName = req.body['nick_name'];
	var pictureId = req.body['pictureId']

	if(nickName != undefined){
		user.set('nick_name', nickName);
	}
	if(pictureId != undefined){
		var picture = {
	        __type: "Pointer",
	        className: "Image",
	        objectId: pictureId
	    };
		user.set('picture', picture)
	}
	
	user.save().then(function(_user){
		var response = {};
		response['success'] = true;

		var userRes = {};
		userRes = user_assembler.assemble(_user);
		var picture = _user.get('picture');
		if (picture != undefined) {
			picture.fetch().then(function(_picture){
				var pictureRes = image_assembler.assemble(_picture);
				userRes['picture'] = pictureRes;
				response['user'] = userRes;
				res.status(200).json(response);
			}, function(error){
				error_handler.handle(error, {}, res);
			});
		} else {
			response['user'] = userRes;
			res.status(200).json(response);
		}
	}, function(error){
		error_handler.handle(error, {}, res);
	}); 
}

exports.logOut = function(req, res){

	//User-Session is required in HTTP header
	Parse.User.logOut().then(function(){
		var response = {};
		response['success'] = true;
		res.status(200).json(response);
	}, function(error){
		error_handler.handle(error, {}, res);
	});	
}

exports.resetPassword = function(req, res){
	Parse.User.requestPasswordReset("email@example.com", {
  success: function() {
  // Password reset request was sent successfully
  },
  error: function(error) {
    // Show the error message somewhere
    alert("Error: " + error.code + " " + error.message);
  }
});
}

