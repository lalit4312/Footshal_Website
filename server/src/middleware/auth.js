const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const COOKIE_NAME = 'neco_token';

function requireAuth(config) {
  return asyncHandler(async (req, _res, next) => {
    const token = req.cookies[COOKIE_NAME];
    if (!token) throw new ApiError(401, 'Authentication required');
    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch (_error) {
      throw new ApiError(401, 'Invalid or expired session');
    }
    const user = await User.findById(payload.sub);
    if (!user || !user.active) throw new ApiError(401, 'Account is unavailable');
    req.user = user;
    next();
  });
}

function requireRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action'));
    }
    return next();
  };
}

module.exports = { COOKIE_NAME, requireAuth, requireRoles };
