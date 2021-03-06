'use strict';

// How to reuse this code map?
const ERROR_CODE_MAP = {
  'EMAIL_EXISTING': 1000,
  'USERNAME_EXISTING': 1001,
  'NEW_ACCOUNT_NOT_AVAILABLE': 1002,
  'EMAIL_NOT_FOUND': 1003
};

Parse.Cloud.beforeSave(Parse.User, function (request, response) {
  const userToSave = request.object;
  validate(userToSave).then(() => {
    if (userToSave.isNew()) {
      response.success();
      return;
    }
    if (userToSave.dirty('password')) {
      userToSave.set('using_default_password', false);
    }
    if (userToSave.dirty('username')) {
      userToSave.set('using_default_username', false);
    }
    if (userToSave.dirty('nick_name')) {
      if (!(userToSave.dirty('using_default_nickname') && userToSave.get('using_default_nickname') === true)) {
        userToSave.set('usingDefaultNickname', false);
      }
    }
    if (userToSave.dirty('picture')) {
      const oldUserQuery = new Parse.Query(Parse.User);
      oldUserQuery.include('picture');
      oldUserQuery.get(userToSave.id).then(oldUser => {
        if (oldUser !== undefined) {
          const picture = oldUser.get("picture");
          if (picture !== undefined && picture.get('type') !== 'DefaultProfile') {
            picture.destroy().then(() => {
              response.success();
            }, error => {
              if (error.code === 101) { // Object not found for delete
                response.success();
              } else {
                response.error(error);  
              }
            });
          } else {
            response.success();
          }
        }
      }, error => {
        response.error(error);
      });
    } else {
      response.success();
    }
  }, error => {
    response.error(error);
  });
});

function validate(user) {
  const promises = [];
  if (user.dirty('username') && user.get('username') !== undefined) {
    promises.push(validateUsername(user.get('username')));
  }
  if (user.dirty('email') && user.get('email') !== undefined) {
    promises.push(validateEmail(user.get('email'), user));
  }
  return Parse.Promise.when(promises);
}

function validateUsername(username) {
  const promise = new Parse.Promise();
  const User = Parse.Object.extend("User");
  const query = new Parse.Query(Parse.User);
  query.equalTo('username', username);
  query.find().then(users => {
    if (users !== undefined && users.length > 0) {
      promise.reject('USERNAME_EXISTING');
    } else {
      promise.resolve();
    }
  }, error => {
    promise.reject(error);
  });
  return promise;
}

function validateEmail(email, user) {
  const promise = new Parse.Promise();
  const User = Parse.Object.extend("User");
  const query = new Parse.Query(Parse.User);
  query.equalTo('email', email);
  query.find().then(users => {
    if (users !== undefined && users.length > 1) {
      promise.reject('EMAIL_EXISTING');
    } else if (users !== undefined && users.length === 1) {
      if (users[0].id === user.id) {
        promise.resolve();
      } else {
        promise.reject('EMAIL_EXISTING');
      }
    } else {
      promise.resolve();
    }
  }, error => {
    promise.reject(error);
  });
  return promise;
}