const express = require('express');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const recordAudit = require('../services/audit');

const roles = ['Super Admin', 'Admin', 'Editor'];
const fields = ['name', 'email', 'role', 'active'];

function createUsersRouter() {
  const router = express.Router();
  router.get('/', asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const [users, total] = await Promise.all([
      User.find().select('-passwordHash').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      User.countDocuments()
    ]);
    res.json({ data: users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  }));
  router.post('/', asyncHandler(async (req, res) => {
    const { name, email, password, role = 'Editor' } = req.body || {};
    if (!name || !email || typeof password !== 'string' || password.length < 12 || !roles.includes(role)) {
      throw new ApiError(400, 'Name, valid email, role, and password (at least 12 characters) are required');
    }
    const user = await User.create({
      name, email, role, passwordHash: await bcrypt.hash(password, 12)
    });
    await recordAudit(req.user, 'create', 'users', user.id, { role: user.role });
    res.status(201).json({ data: { id: user.id, name: user.name, email: user.email, role: user.role } });
  }));
  router.patch('/:id', asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid user identifier');
    const update = Object.fromEntries(fields.filter((key) => Object.hasOwn(req.body || {}, key))
      .map((key) => [key, req.body[key]]));
    if (update.role && !roles.includes(update.role)) throw new ApiError(400, 'Invalid role');
    if (req.body.password !== undefined) {
      if (typeof req.body.password !== 'string' || req.body.password.length < 12) {
        throw new ApiError(400, 'Password must be at least 12 characters');
      }
      update.passwordHash = await bcrypt.hash(req.body.password, 12);
    }
    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
      .select('-passwordHash');
    if (!user) throw new ApiError(404, 'User not found');
    await recordAudit(req.user, 'update', 'users', user.id);
    res.json({ data: user });
  }));
  router.delete('/:id', asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid user identifier');
    if (String(req.params.id) === String(req.user._id)) throw new ApiError(400, 'You cannot delete your own account');
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) throw new ApiError(404, 'User not found');
    await recordAudit(req.user, 'delete', 'users', user.id);
    res.status(204).end();
  }));
  return router;
}

module.exports = createUsersRouter;
