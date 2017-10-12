/**
 * Created by xnzhang on 10/11/17.
 */
'use strict';

const KeyValueConfigs = Parse.Object.extend('KeyValueConfigs');
const errorHandler = require('../errorHandler');

exports.getAppStoreVersionInfo = function (req, res) {
  console.log("CFH_GetAppStoreVersionInfo");

  if (req.query.appVersion === undefined) {
    errorHandler.handleCustomizedError(400, "App version is required", res);
    return;
  }
  const currentVersion = req.query.appVersion;
  
  const configQuery = new Parse.Query(KeyValueConfigs);
  configQuery.equalTo('key', 'app_store_version');
  configQuery.first().then(config => {
    if (config === undefined) {
      console.error('Error_NewRandomUser_UnableToReadConfig');
      errorHandler.handleCustomizedError(500, "Unable to read config", res);
    } else {
      const appStoreVersion = config.get('stringValue');
      const isMandatory = config.get('isMandatory');
      const isLatestVersion = versionCompare(appStoreVersion, currentVersion) !== 1;
      const response = {
        'isLatestVersion': isLatestVersion,
        'isMandatory': isMandatory,
        'latestVersion': appStoreVersion,
        'updateInfo': config.get('updateInfo')
      };
      res.status(200).json(response);
    }
  }, error => {
    console.error('Error_GetAppStoreVersionInfo');
    errorHandler.handle(error, res);
  });
  
};

// Return 1 if v1 > v2
// Return -1 if v1 < v2
// Return 0 if v1 == v2
function versionCompare(v1, v2) {
  if (v1 === v2) {
    return 0;
  }

  const v1Components = v1.split(".");
  const v2Components = v2.split(".");

  const len = Math.min(v1Components.length, v2Components.length);

  // loop while the components are equal
  for (let i = 0; i < len; i++) {
    // v1 bigger than v2
    if (parseInt(v1Components[i]) > parseInt(v2Components[i])) {
      return 1;
    }

    // v2 bigger than v1
    if (parseInt(v1Components[i]) < parseInt(v2Components[i])) {
      return -1;
    }
  }

  // If one's a prefix of the other, the longer one is greater.
  if (v1Components.length > v2Components.length) {
    return 1;
  }

  if (v1Components.length < v2Components.length) {
    return -1;
  }

  // Otherwise they are the same.
  return 0;
}
