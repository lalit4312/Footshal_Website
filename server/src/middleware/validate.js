const ApiError = require('../utils/ApiError');

function requireObjectBody(req, _res, next) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return next(new ApiError(400, 'Request body must be a JSON object'));
  }
  return next();
}

module.exports = { requireObjectBody };
