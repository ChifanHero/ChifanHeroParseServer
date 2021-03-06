'use strict';

const Image = Parse.Object.extend('Image');
const userAssembler = require('../assemblers/user');
const restUserAssembler = require('../assemblers/restUser');
const imageAssembler = require('../assemblers/image');
const errorHandler = require('../errorHandler');
const Buffer = require('buffer').Buffer;
const _ = require('underscore');
const cryptoUtil = require('parse-server/lib/cryptoUtils');
const KeyValueConfigs = Parse.Object.extend('KeyValueConfigs');
const DefaultProfilePicture = Parse.Object.extend('DefaultProfilePicture');
const _crypto = require('crypto');

const TokenStorage = Parse.Object.extend('TokenStorage');
const ParseRestApi = require('../rest/ParseRestApi');

const restrictedAcl = new Parse.ACL();
restrictedAcl.setPublicReadAccess(false);
restrictedAcl.setPublicWriteAccess(false);

const ERROR_CODE_MAP = {
  'EMAIL_EXISTING': 1000,
  'USERNAME_EXISTING': 1001,
  'NEW_ACCOUNT_NOT_AVAILABLE': 1002,
  'EMAIL_NOT_FOUND': 1003,
  'INVALID_LOGIN_CREDENTIAL': 101
};

// Not in use
exports.oauthLogIn = function (req, res) {
  // const oauthLogin = req.body["oauth_login"];
  // const accessToken = req.body["access_token"]

  // Parse.Cloud.useMasterKey();
  // Parse.Promise.as().then(function () {
  //   if (oauthLogin !== undefined) {
  //     return upsertOauthUser(accessToken, oauthLogin);
  //   } else {
  //     return Parse.Promise.error("Oauth Login is required");
  //   }
  // }).then(function (user) {
  //   const response = {};
  //   response['success'] = true;
  //   response['session_token'] = user.getSessionToken();

  //   const userRes = userAssembler.assemble(user);
  //   response['user'] = userRes;
  //   res.status(200).json(response);
  // });
};

/**
 *   This function checks to see if this user has logged in before.
 *   If the user is found, update the access_token (if necessary) and return
 *   the users session token.  If not found, return the newOauthUser promise.
 */
 // Not in use
const upsertOauthUser = function (accessToken, oauthLogin) {
  // const query = new Parse.Query(TokenStorage);
  // query.equalTo('oauth_login', oauthLogin);
  // query.ascending('createdAt');
  // let password;
  // // Check if this oauthLogin has previously logged in, using the master key
  // return query.first({useMasterKey: true}).then(function (tokenData) {
  //   // If not, create a new user.
  //   if (!tokenData) {
  //     return newOauthUser(accessToken, oauthLogin);
  //   }
  //   // If found, fetch the user.
  //   const user = tokenData.get('user');
  //   return user.fetch({useMasterKey: true}).then(function (user) {
  //     // Update the accessToken if it is different.
  //     if (accessToken !== tokenData.get('access_token')) {
  //       tokenData.set('access_token', accessToken);
  //     }
  //     /**
  //      * This save will not use an API request if the token was not changed.
  //      * e.g. when a new user is created and upsert is called again.
  //      */
  //     return tokenData.save(null, {useMasterKey: true});
  //   }).then(function (obj) {
  //     password = new Buffer(24);
  //     _.times(24, function (i) {
  //       password.set(i, _.random(0, 255));
  //     });
  //     password = password.toString('base64');
  //     user.setPassword(password);
  //     return user.save();
  //   }).then(function (user) {
  //     return Parse.User.logIn(user.get('username'), password);
  //   }).then(function (user) {
  //     // Return the user object.
  //     return Parse.Promise.as(user);
  //   });
  // });
};

/**
 *   This function creates a Parse User, and
 *   associates it with an object in the TokenStorage class.
 *   Once completed, this will return upsertOauthUser.  This is done to protect
 *   against a race condition:  In the rare event where 2 new users are created
 *   at the same time, only the first one will actually get used.
 */
 // Not in use
const newOauthUser = function (accessToken, oauthLogin) {
  // const user = new Parse.User();
  // // Generate a random username and password.
  // const username = oauthLogin + "#ChifanHero";
  // const password = new Buffer(24);
  // _.times(24, function (i) {
  //   password.set(i, _.random(0, 255));
  // });
  // user.set("username", username);
  // user.set("password", password.toString('base64'));
  // // Sign up the new User
  // return user.signUp().then(function (user) {
  //   // create a new TokenStorage object to store the user+GitHub association.
  //   const ts = new TokenStorage();
  //   ts.set('oauth_login', oauthLogin);
  //   ts.set('access_token', accessToken);
  //   ts.set('user', user);
  //   ts.setACL(restrictedAcl);
  //   // Use the master key because TokenStorage objects should be protected.
  //   return ts.save(null, {useMasterKey: true});
  // }).then(function (tokenStorage) {
  //   return upsertOauthUser(accessToken, oauthLogin);
  // });
};

exports.logIn = function (req, res) {
  console.log('CFH_LogIn');
  const username = req.body['username'];
  const email = req.body['email'];
  const password = req.body['password'];
  const restApi = new ParseRestApi(req.auth.config.publicServerURL, req.auth.config.applicationId);
  if (username !== undefined) {
    loginWithUsernamePassword(restApi, username, password, res);
  } else if (email !== undefined) {
    const query = new Parse.Query(Parse.User);
    query.equalTo('email', email);
    query.equalTo('emailVerified', true);
    query.find().then(users => {
      if (users === undefined || users.length === 0) {
        errorHandler.handleCustomizedError(404, "Invalid login credential", res, ERROR_CODE_MAP['INVALID_LOGIN_CREDENTIAL']);
      } else if (users.length > 1) {
        // This should not happen
        errorHandler.handleCustomizedError(500, "Find multiple users with same email", res);
      } else {
        const user = users[0];
        const retrievedUsername = user.get('username');
        loginWithUsernamePassword(restApi, retrievedUsername, password, res);
      }
    }, error => {
      console.error('Error_LogIn');
      errorHandler.handle(error, res);
    });
  } else {

  }
  
};

function loginWithUsernamePassword(restApi, username, password, res) {
  return restApi.logIn(username, password).then(fetchedUser => {
    const response = {
      'success': true,
      'session_token': fetchedUser['sessionToken']
    };
    response['user'] = restUserAssembler.assemble(fetchedUser);
    res.status(200).json(response);
  }, error => {
    console.error('Error_LogIn');
    errorHandler.handle(error, res);
  });
}

exports.retrieveMyInfo = function (req, res) {
  console.log('CFH_RetrieveUserInfo');
  if (req.user === undefined) {
    errorHandler.handle(new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, "invalid session token"), res);
    return;
  }
  const restApi = new ParseRestApi(req.auth.config.publicServerURL, req.auth.config.applicationId);
  const include = {'include': 'picture'};
  restApi.getUser(req.user['objectId'], req.user['sessionToken'], include).then(retrivedUser => {
    const assembledUser = restUserAssembler.assemble(retrivedUser);
    const response = {
      'user': assembledUser
    };
    res.status(200).json(response);
  }, error => {
    errorHandler.handle(error, res);
  });
};

// Not in use
exports.emailVerified = function (req, res) {
  // console.log('CFH_IsEmailVerified');
  // const user = req.user;
  // const response = {
  //   'verified': user.get('emailVerified')
  // };
  // res.status(200).json(response);
};


// This needs to be retouched before open sign up to users
exports.signUp = function (req, res) {
  // console.log('CFH_SignUp');
  // const username = req.body['username'];
  // const encodedPassword = req.body['password'];
  // const email = username;

  // //username must be provided
  // if (username === undefined) {
  //   errorHandler.handleCustomizedError(400, "Username must be provided", res);
  //   return;
  // }
  // //no need to write additional function to validate username. Parse will do that (validate email)
  // //password must be provided
  // if (encodedPassword === undefined) {
  //   errorHandler.handleCustomizedError(400, "Password must be provided", res);
  //   return;
  // }
  // //since this is encoded password, we can't validate here
  // //please validate password on client side
  
  // const user = new Parse.User();
  // user.set('username', username);
  // user.set('password', encodedPassword);
  // user.set('email', email);
  // user.signUp().then(newUser => {
  //   const response = {
  //     'success': true,
  //     'session_token': newUser.getSessionToken(),
  //     'user': userAssembler.assemble(newUser)
  //   };
  //   res.status(201).json(response);
  // }, error => {
  //   console.error('Error_SignUp');
  //   errorHandler.handle(error, res);
  // });

};

exports.update = function (req, res) {
  console.log('CFH_UpdateUserInfo');
  //If session token is invalid, Parse will handle that
  //We don't need to verify session token

  const restApi = new ParseRestApi(req.auth.config.publicServerURL, req.auth.config.applicationId);
  const user = {
    'objectId': req.user['objectId']
  };
  const nickName = req.body['nick_name'];
  const pictureId = req.body['picture_id'];
  const username = req.body['username'];
  const email = req.body['email'];
  if (nickName !== undefined) {
    user['nick_name'] = nickName;
  }
  if (pictureId !== undefined) {
    user['picture'] = {
      __type: 'Pointer',
      className: 'Image',
      objectId: pictureId
    };
  }
  if (username !== undefined) {
    user['username'] = username;
  }
  if (email !== undefined) {
    user['email'] = email;
  }
  restApi.updateUser(user, req.user['sessionToken']).then(() => {
    const include = {'include': 'picture'};
    return restApi.getUser(req.user['objectId'], req.user['sessionToken'], include);
  }, error => {
    console.error('Error_UpdateUserInfo');
    const messages = error['message'];
    if (messages !== undefined && messages.length > 0 && messages[0] === 'USERNAME_EXISTING') {
      errorHandler.handleCustomizedError(400, "Username existing", res, ERROR_CODE_MAP['USERNAME_EXISTING']);
    } else if (messages !== undefined && messages.length > 0 && messages[0] === 'EMAIL_EXISTING') {
      errorHandler.handleCustomizedError(400, "Email existing", res, ERROR_CODE_MAP['EMAIL_EXISTING']);
    } else {
      errorHandler.handle(error, res);
    }
  }).then(retrivedUser => {
    const assembledUser = restUserAssembler.assemble(retrivedUser);
    const response = {
      'user': assembledUser,
      'success': true
    };
    res.status(200).json(response);
  }, error => {
    console.error('Error_UpdateUserInfo_RetriveUserInfo');
    errorHandler.handle(error, res);
  });
};

exports.logOut = function (req, res) {
  console.log('CFH_LogOut');

  if (req.user === undefined) {
    errorHandler.handle(new Parse.Error(Parse.Error.INVALID_SESSION_TOKEN, "invalid session token"), res);
    return;
  }
  
  const restApi = new ParseRestApi(req.auth.config.publicServerURL, req.auth.config.applicationId);
  restApi.logOut(req.user['sessionToken']).then(success => {
    const response = {};
    response['success'] = success;
    res.status(200).json(response);
  }, error => {
    console.error('Error_LogOut');
    errorHandler.handle(error, res);
  });
};

exports.resetPassword = function (req, res) {
  console.log("CFH_Reset_Password");
  const email = req.body['email'];
  const User = Parse.Object.extend("User");
  const query = new Parse.Query(Parse.User);
  query.equalTo('email', email);
  query.equalTo('emailVerified', true);
  query.find().then(users => {
    const response = {};
    if (users === undefined || users.length === 0) {
      errorHandler.handleCustomizedError(404, "Email not found", res, ERROR_CODE_MAP['EMAIL_NOT_FOUND']);
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
  const restApi = new ParseRestApi(req.auth.config.publicServerURL, req.auth.config.applicationId);
  restApi.logIn(req.user['username'], req.body['old_password']).then(loggedInUser => {
    // veried old password is correct, now go ahead change the password
    const user = {
      'objectId': req.user['objectId'],
      'password': req.body['new_password']
    };
    return restApi.updateUser(user, req.user['sessionToken']);
  }, error => {
    console.error("Error_ChangePassword_LogInWithOldPasswordFailed");
    errorHandler.handle(error, res);
  }).then(updatedUser => {
    // updated password. old sessionToken will be revoked. now login again to get new sessionToken
    return restApi.logIn(req.user['username'], req.body['new_password']);
  }, error => {
    console.error("Error_ChangePassword_SavePasswordFailed");
    errorHandler.handle(error, res);
  }).then(newLoggedInUser => {
      const response = {
        'success': true,
        'session_token': newLoggedInUser['sessionToken']
      };
      res.status(200).json(response);
  }, error => {
    console.error("Error_ChangePassword_LoginWithNewPasswordFailed");
    errorHandler.handle(error, res);
  });
};

exports.newRandomUser = function (req, res) {
  console.log("CFH_New_RandomUser");
  const configQuery = new Parse.Query(KeyValueConfigs);
  let generatedUsername;
  let generatedPassword;
  let generatedNickname;
  let randomUser;
  configQuery.equalTo('key', 'available_temp_users_count');
  configQuery.first().then(config => {
    if (config === undefined) {
      console.error('Error_NewRandomUser_UnableToReadConfig');
      errorHandler.handleCustomizedError(500, "Unable to read config", res);
    } else {
      const availableUsers = config.get('numberValue');
      if (availableUsers >= 1) {
        config.increment('numberValue', -1);
        config.save();
        generatedUsername = cryptoUtil.randomString(12);
        generatedPassword = generateRandomPassword(8);
        return new ParseRestApi(req.auth.config.publicServerURL, req.auth.config.applicationId).signUp(generatedUsername, generatedPassword);
      } else {
        errorHandler.handleCustomizedError(200, "New account not available", res, ERROR_CODE_MAP['NEW_ACCOUNT_NOT_AVAILABLE']);
      }
    }
  }, error => {
    console.error('Error_NewRandomUser_UnableToReadConfig');
    errorHandler.handle(error, res);
  }).then(newUser => {    
    if (newUser !== undefined) {
      randomUser = newUser;
      return pickRandomProfilePic();
    }
  }, error => {
    console.error('Error_NewRandomUser_UnableToCreateNewUser');
    errorHandler.handle(error, res);
  }).then(profilePic => {
    if (randomUser !== undefined) {
      const picPointer = {
        __type: 'Pointer',
        className: 'Image',
        objectId: profilePic.id
      };
      const userToUpdate = {};
      generatedNickname = cryptoUtil.randomString(8);
      userToUpdate['using_default_username'] = true;
      userToUpdate['using_default_password'] = true;
      userToUpdate['nick_name'] = generatedNickname;
      userToUpdate['using_default_nickname'] = true;
      userToUpdate['picture'] = picPointer;
      userToUpdate['objectId'] = randomUser['objectId'];
      return new ParseRestApi(req.auth.config.publicServerURL, req.auth.config.applicationId).updateUser(userToUpdate, randomUser['sessionToken']);
    }
  }, error => {
    console.error('Error_NewRandomUser_UnableGetDefaultProfilePic');
    errorHandler.handle(error, res);
  }).then(() => {
    const response = {
      'success': true,
      'session_token': randomUser['sessionToken']
    };
    response['user'] = {
      'username': generatedUsername,
      'password': generatedPassword
    };
    res.status(200).json(response);
  }, error => {
    console.error('Error_NewRandomUser_UnableToSaveNicknameAndProfilePic');
    errorHandler.handle(error, res);
  });
};

function pickRandomProfilePic() {
  const promise = new Parse.Promise();
  const query = new Parse.Query(DefaultProfilePicture);
  query.find().then(pics => {
    if (pics === undefined || pics.length === 0) {
      console.error('Error_NewRandomUser_UnableToPickRandomProfilePic');
      promise.reject(new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, "Default profile pic not found"));
    } else {
      const index = Math.floor(Math.random() * pics.length);
      const pic = pics[index];
      promise.resolve(pic.get('image'));
    }
  }, error => {
    console.error('Error_NewRandomUser_UnableToPickRandomProfilePic');
    promise.reject(error);
  });
  return promise;
}

function generateRandomPassword(passwordLength) {
  if (passwordLength < 8) {
    throw new Error('Password must be 8 characters long.');
  }
  const upperCase = randomString(1, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  const lowerCase = randomString(1, 'abcdefghijklmnopqrstuvwxyz');
  const number = randomString(1, '0123456789');
  const rest = randomString(passwordLength - 3, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789');
  return shuffle(upperCase.concat(lowerCase).concat(number).concat(rest));
}

function shuffle(password) {
  let a = password.split("");
  const n = a.length;
  for(let i = n - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      let tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
  }
  return a.join("");
}

function randomString(size, charBase) {
  if (size === 0) {
    throw new Error('Zero-length randomString is useless.');
  }
  let objectId = '';
  const bytes = (0, _crypto.randomBytes)(size);
  for (let i = 0; i < bytes.length; ++i) {
    objectId += charBase[bytes.readUInt8(i) % charBase.length];
  }
  return objectId;
}
