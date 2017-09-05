'use strict';

const Image = Parse.Object.extend('Image');
const userAssembler = require('../assemblers/user');
const imageAssembler = require('../assemblers/image');
const errorHandler = require('../errorHandler');
const Buffer = require('buffer').Buffer;
const _ = require('underscore');
const cryptoUtil = require('parse-server/lib/cryptoUtils');
const KeyValueConfigs = Parse.Object.extend('KeyValueConfigs');
const DefaultProfilePicture = Parse.Object.extend('DefaultProfilePicture');

const TokenStorage = Parse.Object.extend('TokenStorage');

const restrictedAcl = new Parse.ACL();
restrictedAcl.setPublicReadAccess(false);
restrictedAcl.setPublicWriteAccess(false);

const ERROR_CODE_MAP = {
  'EMAIL_EXISTING': 1000,
  'USERNAME_EXISTING': 1001,
  'NEW_ACCOUNT_NOT_AVAILABLE': 1002,
  'EMAIL_NOT_FOUND': 1003
};

exports.oauthLogIn = function (req, res) {
  const oauthLogin = req.body["oauth_login"];
  const accessToken = req.body["access_token"];

  Parse.Cloud.useMasterKey();
  Parse.Promise.as().then(function () {
    if (oauthLogin !== undefined) {
      return upsertOauthUser(accessToken, oauthLogin);
    } else {
      return Parse.Promise.error("Oauth Login is required");
    }
  }).then(function (user) {
    const response = {};
    response['success'] = true;
    response['session_token'] = user.getSessionToken();

    const userRes = userAssembler.assemble(user);
    response['user'] = userRes;
    res.status(200).json(response);
  });
};

/**
 *   This function checks to see if this user has logged in before.
 *   If the user is found, update the access_token (if necessary) and return
 *   the users session token.  If not found, return the newOauthUser promise.
 */
const upsertOauthUser = function (accessToken, oauthLogin) {
  const query = new Parse.Query(TokenStorage);
  query.equalTo('oauth_login', oauthLogin);
  query.ascending('createdAt');
  let password;
  // Check if this oauthLogin has previously logged in, using the master key
  return query.first({useMasterKey: true}).then(function (tokenData) {
    // If not, create a new user.
    if (!tokenData) {
      return newOauthUser(accessToken, oauthLogin);
    }
    // If found, fetch the user.
    const user = tokenData.get('user');
    return user.fetch({useMasterKey: true}).then(function (user) {
      // Update the accessToken if it is different.
      if (accessToken !== tokenData.get('access_token')) {
        tokenData.set('access_token', accessToken);
      }
      /**
       * This save will not use an API request if the token was not changed.
       * e.g. when a new user is created and upsert is called again.
       */
      return tokenData.save(null, {useMasterKey: true});
    }).then(function (obj) {
      password = new Buffer(24);
      _.times(24, function (i) {
        password.set(i, _.random(0, 255));
      });
      password = password.toString('base64');
      user.setPassword(password);
      return user.save();
    }).then(function (user) {
      return Parse.User.logIn(user.get('username'), password);
    }).then(function (user) {
      // Return the user object.
      return Parse.Promise.as(user);
    });
  });
};

/**
 *   This function creates a Parse User, and
 *   associates it with an object in the TokenStorage class.
 *   Once completed, this will return upsertOauthUser.  This is done to protect
 *   against a race condition:  In the rare event where 2 new users are created
 *   at the same time, only the first one will actually get used.
 */
const newOauthUser = function (accessToken, oauthLogin) {
  const user = new Parse.User();
  // Generate a random username and password.
  const username = oauthLogin + "#ChifanHero";
  const password = new Buffer(24);
  _.times(24, function (i) {
    password.set(i, _.random(0, 255));
  });
  user.set("username", username);
  user.set("password", password.toString('base64'));
  // Sign up the new User
  return user.signUp().then(function (user) {
    // create a new TokenStorage object to store the user+GitHub association.
    const ts = new TokenStorage();
    ts.set('oauth_login', oauthLogin);
    ts.set('access_token', accessToken);
    ts.set('user', user);
    ts.setACL(restrictedAcl);
    // Use the master key because TokenStorage objects should be protected.
    return ts.save(null, {useMasterKey: true});
  }).then(function (tokenStorage) {
    return upsertOauthUser(accessToken, oauthLogin);
  });
};

exports.logIn = function (req, res) {
  console.log('CFH_LogIn');
  const username = req.body['username'];
  const encodedPassword = req.body['password'];
  Parse.User.logIn(username, encodedPassword).then(fetchedUser => {
    const response = {
      'success': true,
      'session_token': fetchedUser.getSessionToken()
    };
    const user = userAssembler.assemble(fetchedUser);
    const picture = fetchedUser.get('picture');
    if (picture !== undefined) {
      picture.fetch().then(fetchedPicture => {
        const picture = imageAssembler.assemble(fetchedPicture);
        user['picture'] = picture;
        response['user'] = user;
        res.status(200).json(response);
      }, error => {
        response['user'] = user;
        res.status(200).json(response);
      });
    } else {
      response['user'] = user;
      res.status(200).json(response);
    }
  }, error => {
    console.error('Error_LogIn');
    errorHandler.handle(error, res);
  });
};

exports.retrieveMyInfo = function (req, res) {
  console.log('CFH_RetrieveUserInfo');
  const query = new Parse.Query(Parse.User);
  query.include('picture');
  query.get(req.user.id).then(user => {
    const assembledUser = userAssembler.assemble(user);
    const response = {
      'result': assembledUser
    };
    res.status(200).json(response);
  }, error => {
    errorHandler.handle(error, res);
  });
};

exports.emailVerified = function (req, res) {
  console.log('CFH_IsEmailVerified');
  const user = req.user;
  const response = {
    'verified': user.get('emailVerified')
  }
  res.status(200).json(response);
}


exports.signUp = function (req, res) {
  console.log('CFH_SignUp');
  const username = req.body['username'];
  const encodedPassword = req.body['password'];
  const email = username;

  //username must be provided
  if (username === undefined) {
    errorHandler.handleCustomizedError(400, "Username must be provided", res);
    return;
  }
  //no need to write additional function to validate username. Parse will do that (validate email)
  //password must be provided
  if (encodedPassword === undefined) {
    errorHandler.handleCustomizedError(400, "Password must be provided", res);
    return;
  }
  //since this is encoded password, we can't validate here
  //please validate password on client side
  
  const user = new Parse.User();
  user.set('username', username);
  user.set('password', encodedPassword);
  user.set('email', email);
  user.signUp().then(newUser => {
    const response = {
      'success': true,
      'session_token': newUser.getSessionToken(),
      'user': userAssembler.assemble(newUser)
    };
    res.status(201).json(response);
  }, error => {
    console.error('Error_SignUp');
    errorHandler.handle(error, res);
  });

};

exports.update = function (req, res) {
  console.log('CFH_UpdateUserInfo');
  //If session token is invalid, Parse will handle that
  //We don't need to verify session token
  const user = req.user;

  const nickName = req.body['nick_name'];
  const pictureId = req.body['pictureId'];
  const username = req.body['username'];
  const email = req.body['email'];
  if (nickName !== undefined) {
    user.set('nick_name', nickName);
  }
  if (pictureId !== undefined) {
    const picture = new Image();
    picture.id = pictureId;
    user.set('picture', picture);
  }
  if (username != undefined) {
    user.set('username', username);
  }
  if (email != undefined) {
    user.set('email', email);
  }
  user.save().then(updatedUser => {
    const response = {
      'success': true,
      'session_token': updatedUser.getSessionToken(),
      'user': userAssembler.assemble(updatedUser)
    };
    res.status(200).json(response);
  }, error => {
    console.error('Error_UpdateUserInfo');
    const message = error['message'];
    if (message == 'USERNAME_EXISTING') {
      errorHandler.handleCustomizedError(400, ERROR_CODE_MAP['USERNAME_EXISTING'], "Username existing", res);
    } else if (message == 'EMAIL_EXISTING') {
      errorHandler.handleCustomizedError(400, ERROR_CODE_MAP['EMAIL_EXISTING'], "Email existing", res);
    } else {
      errorHandler.handle(error, res);
    }
  });
};

exports.logOut = function (req, res) {
  console.log('CFH_LogOut');
  //User-Session is required in HTTP header
  Parse.User.logOut().then(() => {
    const response = {};
    response['success'] = true;
    res.status(200).json(response);
  }, error => {
    console.error('Error_LogOut');
    errorHandler.handle(error, res);
  });
};

exports.resetPassword = function (req, res) {
  console.log("CFH_Reset_Password");
  const email = req.body['email'];
  var User = Parse.Object.extend("User");
  const query = new Parse.Query(Parse.User);
  query.equalTo('email', email);
  query.equalTo('emailVerified', true);
  query.find().then(users => {
    const response = {};
    if (users == undefined || users.length == 0) {
      errorHandler.handleCustomizedError(404, ERROR_CODE_MAP['EMAIL_NOT_FOUND'], "Email not found", res);
    } else {
      return Parse.User.requestPasswordReset(email);
    }
  }, error => {
    console.error('Error_ResetPassword_FindUserEmailError');
    errorHandler.handle(error, res);
  }).then(() => {
    const response = {
      'success': true
    };
    res.status(200).json(response);
  }, error => {
    console.error('Error_ResetPassword_ResetError');
    errorHandler.handle(error, res);
  });
};

exports.changePassword = function (req, res) {
  console.log("CFH_Change_Password");
  const user = req.user;
  var User = Parse.Object.extend("User");
  const query = new Parse.Query(Parse.User);
  query.get(user.id).then(retrivedUser => {
    const userName = retrivedUser.get('username');
    const oldPassword = req.body['old_password'];
    const newPassword = req.body['new_password'];
    Parse.User.logOut().then(() => {
      Parse.User.logIn(userName, oldPassword).then(fetchedUser => {
        fetchedUser.set("password", newPassword);
        return fetchedUser.save();
      }, error => {
        console.error("Error_ChangePassword_LogInWithOldPasswordFailed");
        errorHandler.handle(error, res);
      }).then(() => {
        return Parse.User.logIn(userName, newPassword);
      }, error => {
        console.error("Error_ChangePassword_SavePasswordFailed");
        errorHandler.handle(error, res);
      }).then(fetchedUser => {
        const response = {
          'success': true,
          'new_session_token': fetchedUser.getSessionToken()
        };
        res.status(200).json(response);
      }, error => {
        console.error("Error_ChangePassword_LoginWithNewPasswordFailed");
        errorHandler.handle(error, res);
      });
    }, error => {
      console.error("Error_ChangePassword_LogOutFailed");
      errorHandler.handle(error, res);
    });
  }, error => {
    console.error("Error_ChangePassword_RetriveUserInfoFailed");
    errorHandler.handle(error, res);
  });
}

exports.newRandomUser = function (req, res) {
  // console.log(cryptoUtil.randomString(12));
  console.log("CFH_New_RandomUser");
  const configQuery = new Parse.Query(KeyValueConfigs);
  var generatedUsername;
  var generatedPassword;
  var generatedNickname;
  var randomUser;
  configQuery.equalTo('key', 'available_temp_users_count');
  configQuery.find().then(configs => {
    if (configs == undefined || configs.length != 1) {
      console.error('Error_NewRandomUser_UnableToReadConfig');
      res.status(500).send();
    } else {
      const config = configs[0];
      const availableUsers = config.get('numberValue');
      if (availableUsers >= 1) {
        config.increment('numberValue', -1);
        config.save();
        generatedUsername = cryptoUtil.randomString(12);
        generatedPassword = cryptoUtil.randomString(8);
        return Parse.User.signUp(generatedUsername, generatedPassword);
      } else {
        errorHandler.handleCustomizedError(200, ERROR_CODE_MAP['NEW_ACCOUNT_NOT_AVAILABLE'], "New account not available", res);
      }
    }
  }, error => {
    console.error('Error_NewRandomUser_UnableToReadConfig');
    errorHandler.handle(error, res);
  }).then(newUser => {    
    if (newUser != undefined) {
      randomUser = newUser;
      return pickRandomProfilePic();
    }
  }, error => {
    console.error('Error_NewRandomUser_UnableToCreateNewUser');
    errorHandler.handle(error, res);
  }).then(profilePic => {
    if (randomUser != undefined) {
      generatedNickname = cryptoUtil.randomString(8);
      randomUser.set('using_default_username', true);
      randomUser.set('using_default_password', true);
      randomUser.set('nick_name', generatedNickname);
      randomUser.set('using_default_nickname', true);
      randomUser.set('picture', profilePic);
      return randomUser.save();
    }
  }, error => {
    console.error('Error_NewRandomUser_UnableGetDefaultProfilePic');
    errorHandler.handle(error, res);
  }).then(() => {
    if (generatedUsername != undefined && generatedPassword != undefined) {
      return Parse.User.logIn(generatedUsername, generatedPassword);
    }
  }, error => {
    console.error('Error_NewRandomUser_UnableToSaveNicknameAndProfilePic');
    errorHandler.handle(error, res);
  }).then(fetchedUser => {
    const response = {
      'success': true,
      'session_token': fetchedUser.getSessionToken()
    };
    const user = userAssembler.assemble(fetchedUser);
    user['password'] = generatedPassword;
    const picture = fetchedUser.get('picture');
    if (picture !== undefined) {
      picture.fetch().then(fetchedPicture => {
        const picture = imageAssembler.assemble(fetchedPicture);
        user['picture'] = picture;
        response['user'] = user;
        res.status(200).json(response);
      }, error => {
        response['user'] = user;
        res.status(200).json(response);
      });
    } else {
      response['user'] = user;
      res.status(200).json(response);
    }
  }, error => {
    console.error('Error_NewRandomUser_UnableToSigninNewUser');
    errorHandler.handle(error, res);
  });
}

function pickRandomProfilePic() {
  const promise = new Parse.Promise();
  const query = new Parse.Query(DefaultProfilePicture);
  query.find().then(pics => {
    // google.client().placeDetail(restaurant.get('google_place_id')).then(restaurantFromGoogle => {
    //   promise.resolve(restaurantFromGoogle);
    // });
    if (pics == null || pics.length == 0) {
      console.error('Error_NewRandomUser_UnableToPickRandomProfilePic');
      promise.fail('no pic found');
    } else {
      const index = Math.floor(Math.random() * pics.length);
      const pic = pics[index];
      promise.resolve(pic.get('image'));
    }
  }, error => {
    console.error('Error_NewRandomUser_UnableToPickRandomProfilePic');
    promise.fail(error);
  });
  return promise;
}
