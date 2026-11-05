const express = require('express');
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { requireRoles } = require('../middleware/auth');
const recordAudit = require('../services/audit');
const Result = require('../models/Result');
const Match = require('../models/Match');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const publicTournamentStatuses = ['published', 'completed'];

const config = {
  tournaments: { model: require('../models/Tournament'), fields: ['name', 'edition', 'description', 'logoUrl', 'bannerUrl', 'venue', 'format', 'startDate', 'endDate', 'status'] },
  teams: { model: require('../models/Team'), fields: ['name', 'shortName', 'logoUrl', 'coach', 'description', 'groupName', 'tournament', 'active'] },
  players: { model: require('../models/Player'), fields: ['name', 'jerseyNumber', 'position', 'photoUrl', 'team', 'active'] },
  matches: { model: Match, fields: ['tournament', 'homeTeam', 'awayTeam', 'kickoffAt', 'venue', 'round', 'status'] },
  results: { model: Result, fields: ['match', 'tournament', 'homeTeam', 'awayTeam', 'homeScore', 'awayScore'] },
  sponsors: { model: require('../models/Sponsor'), fields: ['name', 'logoUrl', 'websiteUrl', 'tier', 'description', 'tournament', 'active'] }
};

const safePopulates = {
  teams: 'tournament',
  players: 'team',
  matches: 'tournament homeTeam awayTeam',
  results: 'match tournament homeTeam awayTeam',
  sponsors: 'tournament'
};

function filterBody(body, fields) {
  return Object.fromEntries(fields.filter((field) => Object.hasOwn(body, field)).map((field) => [field, body[field]]));
}

async function validateResultFixture(result) {
  const fixture = await Match.findById(result.match).select('tournament homeTeam awayTeam');
  if (!fixture) throw new ApiError(400, 'The selected fixture does not exist');
  if (String(fixture.tournament) !== String(result.tournament)
    || String(fixture.homeTeam) !== String(result.homeTeam)
    || String(fixture.awayTeam) !== String(result.awayTeam)) {
    throw new ApiError(400, 'Result tournament and teams must match the selected fixture');
  }
}

async function validateFixture(fixture) {
  if (String(fixture.homeTeam) === String(fixture.awayTeam)) {
    throw new ApiError(400, 'A team cannot play itself');
  }
  const teamCount = await Team.countDocuments({
    _id: { $in: [fixture.homeTeam, fixture.awayTeam] },
    tournament: fixture.tournament
  });
  if (teamCount !== 2) throw new ApiError(400, 'Both fixture teams must belong to its tournament');
}

function pageOptions(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

function findPage(model, resource, filter, skip, limit) {
  let query = model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
  if (safePopulates[resource]) query = query.populate(safePopulates[resource]);
  return query.lean();
}

function createResourceRouters() {
  const publicRouter = express.Router();
  const adminRouter = express.Router();

  for (const [resource, { model, fields }] of Object.entries(config)) {
    const allowedRoles = ['matches', 'results'].includes(resource)
      ? ['Super Admin', 'Admin', 'Editor']
      : ['Super Admin', 'Admin'];
    publicRouter.get(`/${resource}`, asyncHandler(async (req, res) => {
      const { page, limit, skip } = pageOptions(req.query);
      const publicTournamentIds = await Tournament.find({ status: { $in: publicTournamentStatuses } }).distinct('_id');
      const filter = {};
      if (resource === 'results') filter.status = 'published';
      if (resource === 'tournaments') filter.status = { $in: publicTournamentStatuses };
      if (resource === 'teams') {
        filter.active = true;
        filter.tournament = { $in: publicTournamentIds };
      }
      if (resource === 'matches' || resource === 'results') {
        filter.tournament = { $in: publicTournamentIds };
      }
      if (resource === 'players') {
        filter.active = true;
        const publicTeams = await Team.find({ tournament: { $in: publicTournamentIds }, active: true }).distinct('_id');
        filter.team = { $in: publicTeams };
      }
      if (resource === 'sponsors') {
        filter.active = true;
        filter.$or = [
          { tournament: null },
          { tournament: { $in: publicTournamentIds } }
        ];
      }
      if (req.query.tournamentId && ['teams', 'players', 'matches', 'results', 'sponsors'].includes(resource)) {
        if (!mongoose.isValidObjectId(req.query.tournamentId)) throw new ApiError(400, 'Invalid tournament identifier');
        if (!publicTournamentIds.some((id) => String(id) === req.query.tournamentId)) {
          return res.json({ data: [], pagination: { page, limit, total: 0, pages: 0 } });
        }
        if (resource === 'players') {
          const tournamentTeams = await Team.find({ tournament: req.query.tournamentId, active: true }).distinct('_id');
          filter.team = { $in: tournamentTeams };
        } else if (resource === 'sponsors') {
          filter.$or = [{ tournament: req.query.tournamentId }, { tournament: null }];
        } else {
          filter.tournament = req.query.tournamentId;
        }
      }
      const [items, total] = await Promise.all([
        findPage(model, resource, filter, skip, limit),
        model.countDocuments(filter)
      ]);
      res.json({ data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    }));

    const adminResource = adminRouter.route(`/${resource}`).all(requireRoles(...allowedRoles));
    adminResource.get(asyncHandler(async (req, res) => {
      const { page, limit, skip } = pageOptions(req.query);
      const [items, total] = await Promise.all([
        findPage(model, resource, {}, skip, limit),
        model.countDocuments()
      ]);
      res.json({ data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    }));
    adminResource.post(asyncHandler(async (req, res) => {
      const payload = filterBody(req.body || {}, fields);
      if (resource === 'results') {
        payload.status = 'draft';
        payload.createdBy = req.user._id;
        await validateResultFixture(payload);
      }
      if (resource === 'matches') {
        await validateFixture(payload);
        if (payload.status === 'completed') {
          throw new ApiError(400, 'Publish a result to complete a fixture');
        }
      }
      const item = await model.create(payload);
      await recordAudit(req.user, 'create', resource, item.id);
      res.status(201).json({ data: item });
    }));

    adminRouter.patch(`/${resource}/:id`, requireRoles(...allowedRoles), asyncHandler(async (req, res) => {
      if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid resource identifier');
      const payload = filterBody(req.body || {}, resource === 'results' ? fields : fields);
      if (resource === 'results') delete payload.status;
      let item;
      if (resource === 'results') {
        item = await model.findById(req.params.id);
        if (!item) throw new ApiError(404, 'result not found');
        const wasPublished = item?.status === 'published';
        if (item && item.status === 'published') {
          item.status = 'draft';
          item.publishedAt = undefined;
          item.publishedBy = undefined;
        }
        if (item) {
          const updatedResult = { ...item.toObject(), ...payload };
          await validateResultFixture(updatedResult);
          Object.assign(item, payload);
          await item.save();
          if (wasPublished) await Match.findByIdAndUpdate(item.match, { status: 'scheduled' });
        }
      } else if (resource === 'matches') {
        item = await model.findById(req.params.id);
        if (!item) throw new ApiError(404, 'Fixture not found');
        const existingResult = await Result.findOne({ match: item._id });
        const changesFixtureTeams = ['tournament', 'homeTeam', 'awayTeam'].some((field) => Object.hasOwn(payload, field));
        if (existingResult && changesFixtureTeams) {
          throw new ApiError(409, 'Fixture teams and tournament cannot change after a result is entered');
        }
        const updatedFixture = { ...item.toObject(), ...payload };
        await validateFixture(updatedFixture);
        if (payload.status === 'completed' && existingResult?.status !== 'published') {
          throw new ApiError(409, 'Publish a result to complete a fixture');
        }
        if (existingResult?.status === 'published' && payload.status && payload.status !== 'completed') {
          throw new ApiError(409, 'A fixture with a published result must remain completed');
        }
        Object.assign(item, payload);
        await item.save();
      } else {
        item = await model.findByIdAndUpdate(req.params.id, payload, {
          new: true, runValidators: true, context: 'query'
        });
      }
      if (!item) throw new ApiError(404, `${resource.slice(0, -1)} not found`);
      await recordAudit(req.user, 'update', resource, item.id);
      res.json({ data: item });
    }));

    adminRouter.delete(`/${resource}/:id`, requireRoles(...allowedRoles), asyncHandler(async (req, res) => {
      if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid resource identifier');
      if (resource === 'matches' && await Result.exists({ match: req.params.id })) {
        throw new ApiError(409, 'Delete the match result before deleting this fixture');
      }
      if (resource === 'results') {
        const result = await Result.findById(req.params.id);
        if (!result) throw new ApiError(404, 'Result not found');
        if (result.status === 'published') {
          await Match.findByIdAndUpdate(result.match, { status: 'scheduled' });
        }
      }
      const item = await model.findByIdAndDelete(req.params.id);
      if (!item) throw new ApiError(404, `${resource.slice(0, -1)} not found`);
      await recordAudit(req.user, 'delete', resource, item.id);
      res.status(204).end();
    }));
  }

  publicRouter.get('/standings/:tournamentId', asyncHandler(async (req, res) => {
    const { validateId, getStandings } = require('../services/publicData');
    validateId(req.params.tournamentId);
    res.json({ data: await getStandings(req.params.tournamentId) });
  }));
  publicRouter.get('/stats/:tournamentId', asyncHandler(async (req, res) => {
    const { validateId, getStats } = require('../services/publicData');
    validateId(req.params.tournamentId);
    res.json({ data: await getStats(req.params.tournamentId) });
  }));

  adminRouter.post('/results/:id/publish', requireRoles('Super Admin', 'Admin', 'Editor'), asyncHandler(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid resource identifier');
    const result = await Result.findById(req.params.id);
    if (!result) throw new ApiError(404, 'Result not found');
    if (result.status !== 'published') {
      result.status = 'published';
      result.publishedAt = new Date();
      result.publishedBy = req.user._id;
      await result.save();
      await Match.findByIdAndUpdate(result.match, { status: 'completed' });
      await recordAudit(req.user, 'publish', 'results', result.id);
    }
    res.json({ data: result });
  }));

  const audit = require('../models/AuditLog');
  adminRouter.get('/audit-logs', requireRoles('Super Admin', 'Admin'), asyncHandler(async (req, res) => {
    const { page, limit, skip } = pageOptions(req.query);
    const [items, total] = await Promise.all([
      audit.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('actor', 'name email role').lean(),
      audit.countDocuments()
    ]);
    res.json({ data: items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  }));

  return { publicRouter, adminRouter };
}

module.exports = createResourceRouters;
