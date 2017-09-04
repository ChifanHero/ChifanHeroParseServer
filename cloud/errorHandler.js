const ERROR_CODE_MAP = {
  '-1': 520,
  '1': 500,
  '100': 500,
  '101': 404,
  '102': 500,
  '103': 500,
  '104': 400,
  '105': 500,
  '106': 500,
  '107': 400,
  '108': 403,
  '109': 500,
  '111': 500,
  '112': 500,
  '113': 500,
  '114': 500,
  '115': 500,
  '116': 413,
  '117': 500,
  '118': 500,
  '119': 403,
  '120': 500,
  '121': 500,
  '122': 500,
  '123': 500,
  '124': 408,
  '125': 500,
  '126': 500,
  '127': 500,
  '128': 500,
  '129': 500,
  '130': 500,
  '131': 500,
  '132': 500,
  '133': 500,
  '134': 500,
  '135': 500,
  '136': 500,
  '137': 500,
  '138': 500,
  '139': 500,
  '140': 429,
  '141': 500,
  '142': 400,
  '143': 500,
  '144': 500,
  '145': 500,
  '146': 500,
  '147': 500,
  '148': 500,
  '149': 500,
  '150': 500,
  '151': 500,
  '152': 500,
  '153': 500,
  '154': 500,
  '155': 500,
  '156': 500,
  '157': 500,
  '159': 500,
  '160': 500,
  '200': 400,
  '201': 400,
  '202': 500,
  '203': 500,
  '204': 500,
  '205': 500,
  '206': 500,
  '207': 500,
  '208': 500,
  '209': 401,
  '250': 500,
  '251': 500,
  '252': 500,
  '253': 500,
  '600': 500
};

exports.handle = function (error, res) {
  const response = {
    'error': error
  };
  let status = 500;
  if (error !== undefined) {
    status = ERROR_CODE_MAP[error.code];
  }
  res.status(status).json(response);
};

exports.handleCustomizedError = function (status, message, res) {
  const response = {
    'error': {
      'message': message
    }
  };
  res.status(status).json(response);
};

exports.handleCustomizedError = function (status, errorCode, message, res) {
  const response = {
    'error': {
      'message': message,
      'code': errorCode
    }
  };
  res.status(status).json(response);
};