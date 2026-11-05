const ApiError = require('../utils/ApiError');

function errorHandler(error, req, res, _next) {
  let status = error.statusCode || 500;
  let message = error.message || 'Internal server error';
  let details = error.details;

  if (error.name === 'ValidationError') {
    status = 400;
    message = 'Validation failed';
    details = Object.values(error.errors).map(({ path, message: issue }) => ({ path, message: issue }));
  } else if (error.name === 'CastError') {
    status = 400;
    message = 'Invalid resource identifier';
  } else if (error.code === 11000) {
    status = 409;
    message = 'A record with that value already exists';
  } else if (!(error instanceof ApiError) && status === 500) {
    message = 'Internal server error';
  }

  if (req.method === 'POST' && req.path === '/api/auth/login') {
    console.warn('[auth] Sign-in failed', {
      timestamp: new Date().toISOString(),
      status,
      reason: status >= 500 ? 'Unexpected server error' : message,
      error: error.name,
      origin: req.headers.origin || 'none'
    });
  }

  res.status(status).json({
    error: { message, ...(details ? { details } : {}) }
  });
}

module.exports = errorHandler;
