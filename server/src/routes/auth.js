const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const recordAudit = require('../services/audit');
const { COOKIE_NAME, requireAuth } = require('../middleware/auth');

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

function createAuthRouter(config, loginLimiter) {
  const router = express.Router();
  const cookieOptions = {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: '/',
    maxAge: 24 * 60 * 60 * 1000
  };

  router.post('/login', loginLimiter, asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new ApiError(400, 'Email and password are required');
    }
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
    if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new ApiError(401, 'Invalid email or password');
    }
    user.lastLoginAt = new Date();
    await user.save();
    const token = jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
    res.cookie(COOKIE_NAME, token, cookieOptions);
    await recordAudit(user, 'login', 'auth', user.id);
    console.info('[auth] Sign-in succeeded', {
      timestamp: new Date().toISOString(),
      userId: user.id,
      role: user.role
    });
    res.json({ data: { user: publicUser(user) } });
  }));

  router.post('/logout', requireAuth(config), asyncHandler(async (req, res) => {
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: undefined });
    await recordAudit(req.user, 'logout', 'auth', req.user.id);
    res.json({ data: { message: 'Logged out' } });
  }));

  router.get('/me', requireAuth(config), (req, res) => {
    res.json({ data: { user: publicUser(req.user) } });
  });

  return router;
}

module.exports = createAuthRouter;
