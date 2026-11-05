const ApiError = require('../utils/ApiError');
const calculateStandings = require('../utils/standings');
const Result = require('../models/Result');
const Team = require('../models/Team');

async function getStandings(tournamentId) {
  const results = await Result.find({ tournament: tournamentId, status: 'published' })
    .populate('homeTeam', 'name shortName')
    .populate('awayTeam', 'name shortName')
    .lean();
  const names = {};
  const rows = results.map((result) => {
    if (!result.homeTeam || !result.awayTeam) return null;
    names[String(result.homeTeam._id)] = result.homeTeam.shortName || result.homeTeam.name;
    names[String(result.awayTeam._id)] = result.awayTeam.shortName || result.awayTeam.name;
    return {
      status: result.status,
      homeTeam: result.homeTeam._id,
      awayTeam: result.awayTeam._id,
      homeScore: result.homeScore,
      awayScore: result.awayScore
    };
  }).filter(Boolean);

  const teams = await Team.find({ tournament: tournamentId, active: true }).select('_id name shortName').lean();
  for (const team of teams) names[String(team._id)] = team.shortName || team.name;
  return calculateStandings(rows, names);
}

async function getStats(tournamentId) {
  const results = await Result.find({ tournament: tournamentId, status: 'published' }).lean();
  const standings = await getStandings(tournamentId);
  return {
    matchesPlayed: results.length,
    goalsScored: results.reduce((sum, result) => sum + result.homeScore + result.awayScore, 0),
    averageGoalsPerMatch: results.length
      ? Number((results.reduce((sum, result) => sum + result.homeScore + result.awayScore, 0) / results.length).toFixed(2))
      : 0,
    teamCount: standings.length
  };
}

function validateId(id) {
  const { isValidObjectId } = require('mongoose');
  if (!isValidObjectId(id)) throw new ApiError(400, 'Invalid tournament identifier');
}

module.exports = { getStandings, getStats, validateId };
