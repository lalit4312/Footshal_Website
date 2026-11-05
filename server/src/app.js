const express = require('express');
const net = require('node:net');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const loadEnv = require('./config/env');
const { requireAuth, requireRoles } = require('./middleware/auth');
const { requireObjectBody } = require('./middleware/validate');
const errorHandler = require('./middleware/errorHandler');
const createAuthRouter = require('./routes/auth');
const createResourceRouters = require('./routes/resources');
const createUsersRouter = require('./routes/users');
const { createUploadsRouter } = require('./routes/uploads');
const ApiError = require('./utils/ApiError');

function createApp(config = loadEnv()) {
  const app = express();
  app.set('trust proxy', config.nodeEnv === 'production' ? 1 : false);
  app.disable('x-powered-by');
  app.use(helmet());
  app.use((req, res, next) => cors({
    origin(origin, callback) {
      if (isAllowedRequestOrigin(origin, req, config)) return callback(null, true);
      return callback(new ApiError(403, 'Origin is not allowed by CORS'));
    },
    credentials: true
  })(req, res, next));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use(rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: config.rateLimitMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false
  }));
  app.use('/api', (req, res, next) => requireObjectBodyForWrites(req, res, next, config));
  app.use('/api/auth', createAuthRouter(config, rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: Math.min(config.rateLimitMax, 10),
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler(req, res, _next, options) {
      console.warn('[auth] Sign-in rate limit reached', {
        timestamp: new Date().toISOString(),
        path: req.path
      });
      res.status(options.statusCode).json({
        error: { message: 'Too many sign-in attempts. Please wait before trying again.' }
      });
    }
  })));

  const { publicRouter, adminRouter } = createResourceRouters();
  app.use('/api/public', publicRouter);
  app.use('/api/admin/uploads', requireAuth(config), requireRoles('Super Admin', 'Admin'), createUploadsRouter(config.cloudinary));
  app.use('/api/admin', requireAuth(config), adminRouter);
  app.use('/api/admin/users', requireAuth(config), requireRoles('Super Admin'), createUsersRouter());

  app.use((_req, _res, next) => next(new ApiError(404, 'Endpoint not found')));
  app.use(errorHandler);
  return app;
}

function requireObjectBodyForWrites(req, res, next, config) {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)
    && req.headers.origin && !isAllowedRequestOrigin(req.headers.origin, req, config)) {
    return next(new ApiError(403, 'Origin is not allowed to modify API data'));
  }
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) return requireObjectBody(req, res, next);
  return next();
}

function isAllowedOrigin(origin, config) {
  if (!origin || config.corsOrigins.includes(origin)) return true;
  return config.nodeEnv !== 'production' && isLocalDevelopmentOrigin(origin);
}

function isAllowedRequestOrigin(origin, req, config) {
  if (isAllowedOrigin(origin, config)) return true;
  if (config.nodeEnv !== 'production' || !origin) return false;
  return origin === `${req.protocol}://${req.get('host')}`;
}

function isLocalDevelopmentOrigin(origin) {
  let url;
  try {
    url = new URL(origin);
  } catch (_error) {
    return false;
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== origin) return false;
  if (url.hostname === 'localhost') return true;
  if (!net.isIPv4(url.hostname)) return false;

  const [first, second] = url.hostname.split('.').map(Number);
  return first === 10
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || first === 127;
}

module.exports = createApp;
