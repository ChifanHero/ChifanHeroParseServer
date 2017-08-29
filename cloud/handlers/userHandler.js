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
        const picture = oldUser.get("picture");
        if (picture !== undefined) {
          picture.destroy().then(() => {
            response.success();
          }, error => {
            if (error.code === 101) { // Object not found for delete
              response.success();
            } else {
              response.reject(error);  
            }
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