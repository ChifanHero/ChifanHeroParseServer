'use strict';

Parse.Cloud.beforeSave(Parse.User, function (request, response) {
  const userToSave = request.object;
  if (userToSave.isNew()) {
    response.success();
    return;
  }
  if (userToSave.dirty('picture')) {
    const oldUserQuery = new Parse.Query(Parse.User);
    oldUserQuery.get(userToSave.id).then(oldUser => {
      if (oldUser !== undefined) {
        const image = oldUser.get("picture");
        if (image !== undefined) {
          image.destroy().then(() => {
            response.success();
          }, error => {
            response.reject(error);
          });
        } else {
          response.success();
        }
      }
    }, error => {
      response.reject(error);
    });
  } else {
    response.success();
  }
});