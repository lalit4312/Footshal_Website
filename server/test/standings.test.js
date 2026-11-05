const test = require('node:test');
const assert = require('node:assert/strict');
const calculateStandings = require('../src/utils/standings');

test('calculates standings from published results and applies tie-breakers', () => {
  const results = [
    { status: 'published', homeTeam: 'a', awayTeam: 'b', homeScore: 4, awayScore: 1 },
    { status: 'published', homeTeam: 'b', awayTeam: 'c', homeScore: 2, awayScore: 2 },
    { status: 'published', homeTeam: 'c', awayTeam: 'a', homeScore: 3, awayScore: 2 },
    { status: 'draft', homeTeam: 'b', awayTeam: 'a', homeScore: 9, awayScore: 0 }
  ];

  const standings = calculateStandings(results, { a: 'Alpha', b: 'Beta', c: 'Gamma' });

  assert.deepEqual(standings.map(({ teamId, played, points, goalDifference }) => ({
    teamId, played, points, goalDifference
  })), [
    { teamId: 'c', played: 2, points: 4, goalDifference: 1 },
    { teamId: 'a', played: 2, points: 3, goalDifference: 2 },
    { teamId: 'b', played: 2, points: 1, goalDifference: -3 }
  ]);
});
