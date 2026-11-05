function calculateStandings(results, teamNames = {}) {
  const rows = new Map();
  const getRow = (id) => {
    if (!rows.has(id)) {
      rows.set(id, {
        teamId: id,
        teamName: teamNames[id] || id,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        points: 0
      });
    }
    return rows.get(id);
  };

  for (const [id, name] of Object.entries(teamNames)) {
    getRow(id).teamName = name || id;
  }

  for (const result of results) {
    if (result.status !== 'published') continue;
    const homeId = String(result.homeTeamId ?? result.homeTeam);
    const awayId = String(result.awayTeamId ?? result.awayTeam);
    const homeScore = Number(result.homeScore);
    const awayScore = Number(result.awayScore);
    if (!homeId || !awayId || homeId === awayId
      || !Number.isInteger(homeScore) || homeScore < 0
      || !Number.isInteger(awayScore) || awayScore < 0) continue;

    const home = getRow(homeId);
    const away = getRow(awayId);
    home.played += 1;
    away.played += 1;
    home.goalsFor += homeScore;
    home.goalsAgainst += awayScore;
    away.goalsFor += awayScore;
    away.goalsAgainst += homeScore;
    if (homeScore > awayScore) {
      home.wins += 1;
      home.points += 3;
      away.losses += 1;
    } else if (homeScore < awayScore) {
      away.wins += 1;
      away.points += 3;
      home.losses += 1;
    } else {
      home.draws += 1;
      away.draws += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  return [...rows.values()]
    .map((row) => ({ ...row, goalDifference: row.goalsFor - row.goalsAgainst }))
    .sort((a, b) => b.points - a.points
      || b.goalDifference - a.goalDifference
      || b.goalsFor - a.goalsFor
      || a.teamName.localeCompare(b.teamName));
}

module.exports = calculateStandings;
