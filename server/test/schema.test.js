const test = require('node:test');
const assert = require('node:assert/strict');
const Result = require('../src/models/Result');
const Team = require('../src/models/Team');

test('a fixture can have at most one result record', () => {
  const matchIndex = Result.schema.indexes().find(([keys]) => keys.match === 1);
  assert.ok(matchIndex, 'result schema should index the fixture reference');
  assert.equal(matchIndex[1].unique, true);
});

test('teams are assigned to a tournament', () => {
  assert.equal(Team.schema.path('tournament').isRequired, true);
});
