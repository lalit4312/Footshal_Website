import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, BarChart3, CalendarDays, Check,
  ChevronDown, CircleDot, Clock3, Eye, EyeOff, Flag, Goal, LayoutDashboard,
  LogOut, Menu, Search, ShieldCheck, Trophy, Users, X,
} from 'lucide-react';
import { api, fetchList, fetchOne, getPayload, send, uploadImage } from './api';

const navigation = [
  ['Overview', '/'],
  ['Fixtures', '/fixtures'],
  ['Results', '/results'],
  ['Bracket', '/bracket'],
  ['Standings', '/standings'],
  ['Teams', '/teams'],
  ['Players', '/players'],
  ['Stats', '/stats'],
];

const pageCopy = {
  '/fixtures': ['The schedule', 'Fixtures', 'Every kick-off, all in one place.'],
  '/results': ['The scoreboard', 'Match results', 'The latest scores from the tournament.'],
  '/standings': ['The table', 'Standings', 'The race to the top, updated after every result.'],
  '/teams': ['Meet the clubs', 'Teams', 'The teams bringing the competition to life.'],
  '/players': ['The talent', 'Players', 'Get to know the players making their mark.'],
  '/stats': ['By the numbers', 'Tournament stats', 'The stories behind every goal and result.'],
  '/bracket': ['Knockout stage', 'Tournament bracket', 'The path to the final.'],
  '/sponsors': ['Our partners', 'Sponsors', 'Proudly supported by our partners.'],
};

function recordId(record) {
  return record?._id || record?.id || record?.teamId || '';
}

function messageFromError(error, fallback) {
  return error?.response?.data?.message || error?.response?.data?.error?.message || error?.message || fallback;
}

function nameOfTeam(team) {
  if (!team) return 'TBD';
  return typeof team === 'string' ? team : team.name || team.teamName || 'TBD';
}

function logoOfTeam(team) {
  return typeof team === 'object' && team ? team.logo?.url || team.logoUrl || team.logo || '' : '';
}

function dateLabel(value, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!value) return 'Date to be confirmed';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date to be confirmed' : new Intl.DateTimeFormat('en', options).format(date);
}

function statusOf(match) {
  return String(match?.status || match?.state || 'scheduled').toLowerCase();
}

function matchDate(match) {
  return match?.kickoffAt || match?.scheduledAt || match?.date || match?.kickoff || match?.matchDate;
}

function scoreOf(match, side) {
  const result = match?.result || match?.score || {};
  return side === 'home'
    ? result.homeScore ?? result.home ?? match?.homeScore
    : result.awayScore ?? result.away ?? match?.awayScore;
}

function tournamentId(tournament) {
  return recordId(tournament);
}

function Empty({ title = 'Nothing here yet', text = 'Published tournament information will appear here.' }) {
  return <div className="empty-state"><span className="empty-icon"><Flag size={19} /></span><strong>{title}</strong><p>{text}</p></div>;
}

function ErrorState({ onRetry }) {
  return (
    <div className="error-state" role="alert">
      <strong>We couldn’t load tournament data.</strong>
      <span>Check your connection and try again.</span>
      {onRetry && <button className="button button-light button-small" onClick={onRetry}>Try again</button>}
    </div>
  );
}

function BrandMark({ compact = false }) {
  return (
    <Link className={`brand ${compact ? 'brand-compact' : ''}`} to="/">
      <span className="brand-symbol">N<span>.</span></span>
      {!compact && <span className="brand-copy"><b>NECO INSURANCE</b><small>FUTSAL CUP</small></span>}
    </Link>
  );
}

function Header({ tournament }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <header className="site-header">
      <div className="header-inner">
        <BrandMark />
        <nav className={`main-nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Main navigation">
          {navigation.map(([label, path]) => (
            <NavLink key={path} to={path} end={path === '/'} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{label}</NavLink>
          ))}
        </nav>
        <div className="header-side">
          <span className="edition-tag"><span className="edition-dot" />{tournament?.edition || 'TOURNAMENT'}</span>
          <Link className="admin-link" to="/admin"><ShieldCheck size={15} /> Admin</Link>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'}>
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
    </header>
  );
}

function Footer({ sponsors }) {
  const visibleSponsors = sponsors.slice(0, 5);
  return (
    <footer className="site-footer">
      <div className="sponsor-band">
        <div className="sponsor-band-copy"><span className="eyebrow">GOOD COMPANY</span><h2>Made possible by<br />our partners.</h2></div>
        <div className="sponsor-logos">
          {visibleSponsors.length ? visibleSponsors.map((sponsor) => (
            <a key={recordId(sponsor)} className="sponsor-logo" href={sponsor.website || sponsor.websiteUrl || '#'} target={sponsor.website || sponsor.websiteUrl ? '_blank' : undefined} rel="noreferrer">
              {sponsor.logo?.url || sponsor.logoUrl ? <img src={sponsor.logo?.url || sponsor.logoUrl} alt={`${sponsor.name} logo`} /> : <span>{sponsor.name}</span>}
            </a>
          )) : <span className="sponsor-placeholder">Partner announcements coming soon</span>}
        </div>
      </div>
      <div className="footer-bottom">
        <BrandMark />
        <p>Every match. Every moment. <span>© {new Date().getFullYear()} Neco Insurance Limited.</span></p>
        <div className="footer-links"><Link to="/sponsors">Partners</Link><Link to="/admin">Admin portal <ArrowUpRight size={13} /></Link><a href="https://necoinsurance.com" target="_blank" rel="noreferrer">Company <ArrowUpRight size={13} /></a></div>
      </div>
    </footer>
  );
}

function TeamBadge({ team, size = 'normal' }) {
  const logo = logoOfTeam(team);
  const name = nameOfTeam(team);
  return (
    <span className={`team-badge ${size === 'small' ? 'team-badge-small' : ''}`}>
      {logo ? <img src={logo} alt="" /> : <span>{name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()}</span>}
    </span>
  );
}

function MatchCard({ match, compact = false }) {
  const home = match.homeTeam || match.home || match.teams?.[0];
  const away = match.awayTeam || match.away || match.teams?.[1];
  const state = statusOf(match);
  const completed = state === 'completed' || state === 'published';
  const live = state === 'live';
  const homeScore = scoreOf(match, 'home');
  const awayScore = scoreOf(match, 'away');
  return (
    <article className={`match-card ${compact ? 'match-card-compact' : ''}`}>
      <div className="match-meta">
        <span className={`match-status ${live ? 'status-live' : completed ? 'status-done' : ''}`}><i />{live ? 'Live now' : completed ? 'Full time' : (match.round || match.matchday || 'Upcoming')}</span>
        <span>{dateLabel(matchDate(match), { month: 'short', day: 'numeric' })}{matchDate(match) ? ` · ${new Date(matchDate(match)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</span>
      </div>
      <div className="match-teams">
        <div className="match-side"><TeamBadge team={home} /><span>{nameOfTeam(home)}</span></div>
        <div className="match-score">{completed || live ? `${homeScore ?? 0} — ${awayScore ?? 0}` : <span>VS</span>}</div>
        <div className="match-side match-side-away"><TeamBadge team={away} /><span>{nameOfTeam(away)}</span></div>
      </div>
      <div className="match-footer"><span><CalendarDays size={13} />{match.venue?.name || match.venue || 'Venue to be confirmed'}</span><span>{match.group?.name || match.group || match.round || ''}</span></div>
    </article>
  );
}

function StandingsTable({ rows, compact = false }) {
  const visibleRows = compact ? rows.slice(0, 5) : rows;
  return (
    <div className="table-scroll">
      <table className="standings-table">
        <thead><tr><th>#</th><th>TEAM</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>PTS</th></tr></thead>
        <tbody>
          {visibleRows.length ? visibleRows.map((row, index) => {
            const team = row.team || row;
            return <tr key={recordId(team) || index}>
              <td><span className={`position ${index === 0 ? 'position-first' : ''}`}>{row.position || row.rank || index + 1}</span></td>
              <td><div className="table-team"><TeamBadge team={team} size="small" /><b>{nameOfTeam(team)}</b></div></td>
              <td>{row.played ?? row.matchesPlayed ?? 0}</td><td>{row.won ?? row.wins ?? 0}</td><td>{row.drawn ?? row.draws ?? 0}</td>
              <td>{row.lost ?? row.losses ?? 0}</td><td>{row.goalDifference ?? row.goalDiff ?? 0}</td><td className="points-cell">{row.points ?? row.pts ?? 0}</td>
            </tr>;
          }) : <tr><td className="table-empty" colSpan="8">No standings data yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function HomePage({ data, loading, error, retry }) {
  const tournament = data.tournaments[0];
  const upcoming = data.matches.filter((match) => ['scheduled', 'upcoming', 'postponed'].includes(statusOf(match))).slice(0, 2);
  const recent = data.matches.filter((match) => ['completed', 'published', 'live'].includes(statusOf(match))).slice(0, 3);
  const gamesPlayed = data.matches.filter((match) => ['completed', 'published'].includes(statusOf(match))).length;
  const totalGoals = data.matches.reduce((total, match) => total + (Number(scoreOf(match, 'home')) || 0) + (Number(scoreOf(match, 'away')) || 0), 0);
  const tournamentStatus = tournament?.status || 'Upcoming';
  const [first, ...rest] = (tournament?.name || 'Neco Insurance Futsal Cup').split(' ');
  if (error) return <ErrorState onRetry={retry} />;
  return (
    <>
      <section className="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="hero-overline"><span className="pulse-dot" />{tournamentStatus} <span className="overline-divider">/</span> NECO INSURANCE LIMITED</div>
            <h1>{first}<br /><span>{rest.join(' ') || 'Futsal Cup'}</span><i>.</i></h1>
            <p className="hero-description">{tournament?.description || 'A celebration of teamwork, talent and the beautiful game. Follow all the action from the Neco Insurance futsal tournament.'}</p>
            <div className="hero-actions"><Link className="button button-coral" to="/fixtures">Explore fixtures <ArrowRight size={16} /></Link><Link className="text-link" to="/standings">View standings <ArrowDownRight size={15} /></Link></div>
            <div className="hero-note"><span className="note-line" />{tournament?.venue?.name || tournament?.venue || 'One tournament. One champion.'}</div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
            <div className="art-number">01</div><div className="art-swoosh" />
            <div className="art-ball"><span /><i /><b /></div>
            <div className="art-caption"><span>THE BEAUTIFUL GAME</span><span>EST. NECO INSURANCE</span></div>
            <div className="art-stamp"><Trophy size={18} /><span>PLAY<br />WITH<br />PURPOSE</span></div>
          </div>
        </div>
        <div className="hero-bottom">
          <div className="hero-tournament"><span className="eyebrow">THE TOURNAMENT</span><b>{tournament?.edition || (tournament?.startDate ? new Date(tournament.startDate).getFullYear() : 'SEASON 01')}</b></div>
          <div className="hero-stats">
            <div><strong>{data.teams.length}</strong><span>TEAMS</span></div>
            <div><strong>{gamesPlayed}<small>/{data.matches.length}</small></strong><span>MATCHES PLAYED</span></div>
            <div><strong>{totalGoals}</strong><span>GOALS SCORED</span></div>
          </div>
          <span className="hero-scroll">SCROLL TO EXPLORE <ArrowDownRight size={15} /></span>
        </div>
      </section>

      <main className="page-main">
        <section className="section-block">
          <div className="section-heading"><div><span className="eyebrow">THE NEXT 90</span><h2>Up next<span className="heading-period">.</span></h2></div><Link className="arrow-link" to="/fixtures">Full fixture list <ArrowRight size={15} /></Link></div>
          {loading ? <div className="skeleton-grid"><div /><div /></div> : upcoming.length ? <div className="match-grid">{upcoming.map((match) => <MatchCard key={recordId(match)} match={match} />)}</div> : <Empty title="No upcoming fixtures" text="New match schedules will appear here as soon as they are published." />}
        </section>

        <section className="section-block standings-preview">
          <div className="section-heading"><div><span className="eyebrow">THE RACE</span><h2>Standings<span className="heading-period">.</span></h2></div><Link className="arrow-link" to="/standings">Full table <ArrowRight size={15} /></Link></div>
          <div className="standings-panel"><div className="panel-top"><span><Trophy size={15} /> {tournament?.name || 'Tournament table'}</span><span>UPDATED AUTOMATICALLY</span></div><StandingsTable rows={data.standings} compact /></div>
        </section>

        <section className="results-section section-block">
          <div className="section-heading"><div><span className="eyebrow">THE LATEST</span><h2>Final whistle<span className="heading-period">.</span></h2></div><Link className="arrow-link" to="/results">All results <ArrowRight size={15} /></Link></div>
          {recent.length ? <div className="result-list">{recent.map((match) => <MatchCard key={recordId(match)} match={match} compact />)}</div> : <Empty title="The first whistle is still to come" text="Published match results and final scores will show here." />}
        </section>
        <Callout />
      </main>
    </>
  );
}

function Callout() {
  return <section className="callout"><div className="callout-orb" /><div><span className="eyebrow">MORE THAN A GAME</span><h2>Good things happen<br />when we play together.</h2></div><Link className="button button-dark" to="/teams">Meet the teams <ArrowRight size={15} /></Link></section>;
}

function PageIntro({ label, title, description }) {
  return <div className="page-intro"><div className="breadcrumb"><Link to="/">HOME</Link><span>/</span><span>{label}</span></div><span className="eyebrow">{label}</span><h1>{title}<i>.</i></h1><p>{description}</p></div>;
}

function PublicListing({ path, data, loading, error, retry }) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const copy = pageCopy[path];
  const listMap = {
    '/fixtures': data.matches,
    '/results': data.matches.filter((match) => ['completed', 'published', 'live'].includes(statusOf(match))),
    '/teams': data.teams,
    '/players': data.players,
    '/standings': data.standings,
    '/sponsors': data.sponsors,
  };
  const list = listMap[path] || [];
  const filtered = list.filter((item) => {
    const text = `${item.name || ''} ${item.firstName || ''} ${item.lastName || ''} ${nameOfTeam(item.homeTeam || item.team)} ${nameOfTeam(item.awayTeam)}`.toLowerCase();
    const matchesText = text.includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'all' || statusOf(item) === statusFilter;
    const matchesTeam = selectedTeam === 'all' || [item.homeTeam, item.awayTeam, item.team].some((team) => recordId(team) === selectedTeam || nameOfTeam(team) === selectedTeam);
    return matchesText && matchesStatus && matchesTeam;
  });
  if (error) return <ErrorState onRetry={retry} />;
  return (
    <main className="listing-main page-main">
      <PageIntro label={copy[0]} title={copy[1]} description={copy[2]} />
      {['/fixtures', '/results', '/teams', '/players'].includes(path) && <div className="filters">
        <label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={path === '/players' ? 'Search players' : 'Search by team'} /></label>
        {['/fixtures', '/results'].includes(path) && <label className="filter-select"><span className="sr-only">Filter by status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All matches</option><option value="scheduled">Scheduled</option><option value="live">Live</option><option value="completed">Completed</option><option value="postponed">Postponed</option></select><ChevronDown size={14} /></label>}
        {['/fixtures', '/results'].includes(path) && <label className="filter-select"><span className="sr-only">Filter by team</span><select value={selectedTeam} onChange={(event) => setSelectedTeam(event.target.value)}><option value="all">All teams</option>{data.teams.map((team) => <option key={recordId(team)} value={recordId(team)}>{team.name}</option>)}</select><ChevronDown size={14} /></label>}
      </div>}
      <div className="listing-count"><span>{loading ? 'Loading…' : `${filtered.length} ${filtered.length === 1 ? 'entry' : 'entries'}`}</span><span>{data.tournaments[0]?.name || 'NECO INSURANCE TOURNAMENT'}</span></div>
      {loading ? <div className="skeleton-grid"><div /><div /><div /></div> : filtered.length ? (
        path === '/standings' ? <div className="standings-panel full-standings"><div className="panel-top"><span><Trophy size={15} /> {data.tournaments[0]?.name || 'Tournament standings'}</span><span>3 PTS WIN · 1 PT DRAW</span></div><StandingsTable rows={filtered} /></div>
          : path === '/fixtures' || path === '/results' ? <div className="match-grid listing-match-grid">{filtered.map((match) => <MatchCard key={recordId(match)} match={match} />)}</div>
            : path === '/teams' ? <div className="team-grid">{filtered.map((team, index) => <TeamCard key={recordId(team)} team={team} index={index} />)}</div>
              : path === '/players' ? <div className="player-grid">{filtered.map((player) => <PlayerCard key={recordId(player)} player={player} />)}</div>
                : <div className="sponsor-grid">{filtered.map((sponsor) => <SponsorCard key={recordId(sponsor)} sponsor={sponsor} />)}</div>
      ) : <Empty title={query ? 'No matching results' : undefined} text={query ? 'Try another search or clear your filters.' : undefined} />}
    </main>
  );
}

function TeamCard({ team, index }) {
  const members = Number(team.playerCount ?? team.players?.length ?? 0);
  return <article className="team-card"><div className={`team-card-top team-tone-${index % 4}`}><span className="team-card-index">TEAM / {String(index + 1).padStart(2, '0')}</span><TeamBadge team={team} /><span className="team-card-decoration">{String(index + 1).padStart(2, '0')}</span></div><div className="team-card-bottom"><div><h3>{team.name}</h3><span>{team.group?.name || team.group || team.category || 'Participating team'}</span></div><div className="team-card-meta"><Users size={14} /> {members} {members === 1 ? 'player' : 'players'}</div></div></article>;
}

function PlayerCard({ player }) {
  const fullName = player.name || [player.firstName, player.lastName].filter(Boolean).join(' ') || 'Player';
  return <article className="player-card"><div className="player-photo">{player.photo?.url || player.photoUrl || player.image ? <img loading="lazy" src={player.photo?.url || player.photoUrl || player.image} alt={fullName} /> : <Users size={35} />}{player.jerseyNumber != null && <span className="jersey">{String(player.jerseyNumber).padStart(2, '0')}</span>}</div><div className="player-info"><div><span className="eyebrow">{nameOfTeam(player.team)}</span><h3>{fullName}</h3><span>{player.position || 'Squad player'}</span></div><div className="player-goals"><b>{player.goals ?? player.statistics?.goals ?? 0}</b><span>GOALS</span></div></div></article>;
}

function SponsorCard({ sponsor }) {
  const image = sponsor.logo?.url || sponsor.logoUrl;
  const website = sponsor.website || sponsor.websiteUrl;
  return <a className="sponsor-card" href={website || '#'} target={website ? '_blank' : undefined} rel="noreferrer"><div className="sponsor-card-logo">{image ? <img loading="lazy" src={image} alt={`${sponsor.name} logo`} /> : <strong>{sponsor.name}</strong>}</div><span className="eyebrow">{sponsor.category || sponsor.tier || 'PARTNER'}</span><h3>{sponsor.name}</h3><p>{sponsor.description || 'Supporting the tournament and the spirit of the game.'}</p><ArrowUpRight size={17} /></a>;
}

function StatsPage({ data, loading }) {
  const scoring = data.statistics?.topScorers || data.statistics?.scorers || [];
  const stats = data.statistics || {};
  const goals = stats.totalGoals ?? stats.goalsScored ?? data.matches.reduce((sum, match) => sum + (Number(scoreOf(match, 'home')) || 0) + (Number(scoreOf(match, 'away')) || 0), 0);
  const played = stats.matchesPlayed ?? data.matches.filter((m) => ['completed', 'published'].includes(statusOf(m))).length;
  const average = stats.averageGoals ?? stats.averageGoalsPerMatch ?? (played ? (goals / played).toFixed(1) : '0.0');
  return <main className="listing-main page-main"><PageIntro label={pageCopy['/stats'][0]} title={pageCopy['/stats'][1]} description={pageCopy['/stats'][2]} />
    {loading ? <div className="skeleton-grid"><div /><div /></div> : <>
      <div className="stat-overview">
        <StatTile icon={<Goal size={19} />} label="TOTAL GOALS" value={goals} tone="orange" />
        <StatTile icon={<CircleDot size={19} />} label="MATCHES PLAYED" value={played} />
        <StatTile icon={<BarChart3 size={19} />} label="GOALS PER MATCH" value={average} />
        <StatTile icon={<Users size={19} />} label="TEAMS" value={data.teams.length} />
      </div>
      <div className="stats-content">
        <section className="stat-leaders"><div className="panel-top"><span><Goal size={15} /> GOLDEN BOOT RACE</span><span>TOP SCORERS</span></div>{scoring.length ? scoring.slice(0, 8).map((scorer, index) => <div className="leader-row" key={recordId(scorer.player) || index}><span className="leader-rank">{String(index + 1).padStart(2, '0')}</span><span className="leader-name"><b>{scorer.player?.name || scorer.name}</b><small>{nameOfTeam(scorer.team || scorer.player?.team)}</small></span><b className="leader-score">{scorer.goals ?? scorer.totalGoals ?? 0}<small> G</small></b></div>) : <Empty title="Player goal totals aren't tracked yet" text="This app currently calculates team and match statistics, but doesn't record individual goal scorers." />}</section>
        <section className="stat-feature"><span className="eyebrow">THE NUMBERS GAME</span><h2>Every goal<br />has a story.</h2><p>All tournament statistics are calculated from published match results and player data.</p><div className="stat-feature-bottom"><span>OFFICIAL TOURNAMENT DATA</span><BarChart3 size={24} /></div></section>
      </div>
    </>}</main>;
}

function StatTile({ icon, label, value, tone = '' }) {
  return <article className={`stat-tile ${tone}`}><span className="stat-tile-icon">{icon}</span><span className="eyebrow">{label}</span><strong>{value}</strong><span className="stat-tile-foot">LIVE TOURNAMENT DATA</span></article>;
}

function BracketPage({ data }) {
  const rounds = [...new Set(data.matches.map((match) => match.round).filter(Boolean))];
  const orderedRounds = rounds.length ? rounds : ['Quarter-finals', 'Semi-finals', 'Final'];
  return <main className="listing-main page-main"><PageIntro label={pageCopy['/bracket'][0]} title={pageCopy['/bracket'][1]} description={pageCopy['/bracket'][2]} />
    <div className="bracket-wrap">{orderedRounds.map((round, roundIndex) => {
      const matches = data.matches.filter((match) => match.round === round);
      return <section className="bracket-round" key={round}><div className="bracket-round-heading"><span className="eyebrow">ROUND 0{roundIndex + 1}</span><h2>{round}</h2></div>
        {matches.length ? matches.map((match) => <BracketMatch key={recordId(match)} match={match} />) : <div className="bracket-placeholder"><span>—</span><p>Matchups will appear<br />when confirmed.</p></div>}</section>;
    })}</div><p className="bracket-note"><CircleDot size={13} /> Bracket progress follows published match results.</p>
  </main>;
}

function BracketMatch({ match }) {
  const home = match.homeTeam || match.home;
  const away = match.awayTeam || match.away;
  return <div className="bracket-match"><div><TeamBadge team={home} size="small" /><b>{nameOfTeam(home)}</b><span>{scoreOf(match, 'home') ?? '—'}</span></div><div><TeamBadge team={away} size="small" /><b>{nameOfTeam(away)}</b><span>{scoreOf(match, 'away') ?? '—'}</span></div><small>{match.status || 'TBD'} · {dateLabel(matchDate(match), { month: 'short', day: 'numeric' })}</small></div>;
}

const adminSections = [
  ['overview', 'Overview', LayoutDashboard],
  ['tournaments', 'Tournaments', Trophy],
  ['teams', 'Teams', Users],
  ['players', 'Players', Users],
  ['matches', 'Fixtures', CalendarDays],
  ['results', 'Results', Goal],
  ['sponsors', 'Sponsors', Flag],
  ['audit-logs', 'Audit log', ShieldCheck],
];

const resourceForms = {
  tournaments: {
    title: 'Tournaments',
    fields: [
      { key: 'name', label: 'Tournament name', required: true },
      { key: 'edition', label: 'Edition' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'logoUrl', label: 'Tournament logo', type: 'image' },
      { key: 'bannerUrl', label: 'Tournament banner', type: 'image' },
      { key: 'venue', label: 'Venue' },
      { key: 'startDate', label: 'Start date', type: 'date' },
      { key: 'endDate', label: 'End date', type: 'date' },
      { key: 'format', label: 'Format', type: 'select', options: ['league', 'knockout', 'group-stage', 'group-knockout'], required: true },
      { key: 'status', label: 'Publication status', type: 'select', options: ['draft', 'published', 'completed'], required: true },
    ],
  },
  teams: {
    title: 'Teams',
    fields: [
      { key: 'name', label: 'Team name', required: true },
      { key: 'shortName', label: 'Short name' },
      { key: 'logoUrl', label: 'Team logo', type: 'image' },
      { key: 'coach', label: 'Coach' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'groupName', label: 'Group' },
      { key: 'tournament', label: 'Tournament', type: 'relation', source: 'tournaments', required: true },
      { key: 'active', label: 'Active team', type: 'checkbox' },
    ],
  },
  players: {
    title: 'Players',
    fields: [
      { key: 'name', label: 'Player name', required: true },
      { key: 'jerseyNumber', label: 'Jersey number', type: 'number', min: 0, max: 99 },
      { key: 'position', label: 'Position' },
      { key: 'photoUrl', label: 'Player photo', type: 'image' },
      { key: 'team', label: 'Team', type: 'relation', source: 'teams', required: true },
      { key: 'active', label: 'Active player', type: 'checkbox' },
    ],
  },
  matches: {
    title: 'Fixtures',
    fields: [
      { key: 'tournament', label: 'Tournament', type: 'relation', source: 'tournaments', required: true },
      { key: 'homeTeam', label: 'Home team', type: 'relation', source: 'teams', required: true },
      { key: 'awayTeam', label: 'Away team', type: 'relation', source: 'teams', required: true },
      { key: 'kickoffAt', label: 'Kick-off time', type: 'datetime-local', required: true },
      { key: 'venue', label: 'Venue' },
      { key: 'round', label: 'Round / matchday' },
      { key: 'status', label: 'Match status', type: 'select', options: ['scheduled', 'cancelled'], required: true },
    ],
  },
  sponsors: {
    title: 'Sponsors',
    fields: [
      { key: 'name', label: 'Sponsor name', required: true },
      { key: 'logoUrl', label: 'Sponsor logo', type: 'image' },
      { key: 'websiteUrl', label: 'Website URL', type: 'url' },
      { key: 'tier', label: 'Sponsor category' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'tournament', label: 'Tournament (optional)', type: 'relation', source: 'tournaments' },
      { key: 'active', label: 'Active sponsor', type: 'checkbox' },
    ],
  },
  users: {
    title: 'Admin users',
    fields: [
      { key: 'name', label: 'Full name', required: true },
      { key: 'email', label: 'Email address', type: 'email', required: true },
      { key: 'role', label: 'Role', type: 'select', options: ['Super Admin', 'Admin', 'Editor'], required: true },
      { key: 'active', label: 'Active account', type: 'checkbox' },
      { key: 'password', label: 'Password (at least 12 characters)', type: 'password', required: true, keepEmptyOnEdit: true },
    ],
  },
};

function AdminPage() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [results, setResults] = useState([]);
  const [activePanel, setActivePanel] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [loginFeedback, setLoginFeedback] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const loadAdminData = useCallback(async () => {
    try {
      const teamPath = user?.role === 'Editor' ? '/public/teams' : '/admin/teams';
      const [matchRows, teamRows, resultRows] = await Promise.all([
        fetchList('/admin/matches', { limit: 100 }),
        fetchList(teamPath, { limit: 100 }),
        fetchList('/admin/results', { limit: 100 }),
      ]);
      setMatches(matchRows);
      setTeams(teamRows);
      setResults(resultRows);
    } catch (loadError) {
      setError(messageFromError(loadError, 'Unable to load admin data.'));
    }
  }, [user?.role]);

  useEffect(() => {
    api.get('/auth/me')
      .then((response) => setUser(getPayload(response)?.user || getPayload(response)))
      .catch((authError) => {
        if (authError.response?.status !== 401) setError(messageFromError(authError, 'Unable to verify admin session.'));
      })
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => { if (user) loadAdminData(); }, [user, loadAdminData]);

  async function login(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setLoginFeedback(null);
    try {
      const response = await api.post('/auth/login', credentials);
      const signedInUser = getPayload(response)?.user || getPayload(response);
      setUser(signedInUser);
      setLoginFeedback({ type: 'success', message: 'Signed in successfully.' });
    } catch (loginError) {
      setLoginFeedback({ type: 'error', message: messageFromError(loginError, 'Sign in failed. Check your email and password.') });
    } finally { setSaving(false); }
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
      setUser(null);
      navigate('/admin', { replace: true });
    } catch (logoutError) {
      setError(messageFromError(logoutError, 'Could not sign out. Please try again.'));
    }
  }

  if (checking) return <main className="admin-shell"><div className="admin-loading"><span className="loader" />Checking admin access…</div></main>;
  if (!user) return <main className="admin-shell admin-login-shell"><Link className="back-link" to="/"><ArrowRight size={15} /> Back to tournament</Link>{loginFeedback && <div className={`auth-toast auth-toast-${loginFeedback.type}`} role={loginFeedback.type === 'error' ? 'alert' : 'status'} aria-live={loginFeedback.type === 'error' ? 'assertive' : 'polite'}><span>{loginFeedback.type === 'success' ? <Check size={17} /> : <X size={17} />}{loginFeedback.message}</span><button onClick={() => setLoginFeedback(null)} aria-label="Dismiss sign-in message"><X size={15} /></button></div>}<section className="admin-login-card"><BrandMark /><span className="eyebrow">SECURE ADMIN PORTAL</span><h1>Welcome<br />back<span>.</span></h1><p>Sign in to manage tournament content and results.</p><form onSubmit={login}><label>Email address<input required type="email" autoComplete="username" value={credentials.email} onChange={(event) => { setCredentials({ ...credentials, email: event.target.value }); setLoginFeedback(null); }} /></label><label>Password<span className="password-input-wrap"><input required type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={credentials.password} onChange={(event) => { setCredentials({ ...credentials, password: event.target.value }); setLoginFeedback(null); }} /><button className="password-visibility-toggle" type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span></label><button className="button button-coral button-wide" disabled={saving}>{saving ? 'Signing in…' : 'Sign in securely'} <ArrowRight size={16} /></button></form><small className="login-foot"><ShieldCheck size={13} /> Protected access for authorized administrators</small></section></main>;

  const completed = matches.filter((match) => ['completed', 'published'].includes(statusOf(match))).length;
  const upcoming = matches.filter((match) => ['scheduled', 'upcoming'].includes(statusOf(match))).length;
  const visibleSections = adminSections.filter(([key]) => {
    if (user.role === 'Editor') return ['overview', 'matches', 'results'].includes(key);
    if (key === 'audit-logs') return ['Super Admin', 'Admin'].includes(user.role);
    return true;
  });
  if (user.role === 'Super Admin') visibleSections.push(['users', 'Admin users', ShieldCheck]);
  const activeSection = visibleSections.find(([key]) => key === activePanel);
  const panelTitle = activePanel === 'overview' ? `Good day, ${(user.name || 'admin').split(' ')[0]}.` : (activeSection?.[1] || 'Overview');

  return <main className="admin-shell">
    {loginFeedback && <div className={`auth-toast auth-toast-${loginFeedback.type}`} role={loginFeedback.type === 'error' ? 'alert' : 'status'} aria-live={loginFeedback.type === 'error' ? 'assertive' : 'polite'}><span>{loginFeedback.type === 'success' ? <Check size={17} /> : <X size={17} />}{loginFeedback.message}</span><button onClick={() => setLoginFeedback(null)} aria-label="Dismiss sign-in message"><X size={15} /></button></div>}
    <aside className="admin-sidebar"><BrandMark /><div className="admin-sidebar-label">WORKSPACE</div>{visibleSections.map(([key, label, Icon]) => <button key={key} className={activePanel === key ? 'admin-sidebar-active' : 'admin-sidebar-item'} onClick={() => setActivePanel(key)}><Icon size={16} />{label}</button>)}<div className="admin-sidebar-bottom"><span className="admin-user-icon">{(user.name || user.email || 'A')[0].toUpperCase()}</span><div><b>{user.name || user.email}</b><small>{user.role || 'Administrator'}</small></div><button onClick={logout} aria-label="Sign out"><LogOut size={16} /></button></div></aside>
    <section className="admin-workspace"><header className="admin-topbar"><div><span className="eyebrow">NECO INSURANCE / ADMIN</span><h1>{panelTitle}</h1></div><button className="button button-light" onClick={() => loadAdminData()}><CircleDot size={14} /> Refresh data</button></header>
      {error && <div className="form-error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X size={14} /></button></div>}{notice && <div className="form-success"><Check size={15} />{notice}<button onClick={() => setNotice('')} aria-label="Dismiss notification"><X size={14} /></button></div>}
      {activePanel === 'overview' && <>
        <div className="admin-stat-grid"><StatTile icon={<Users size={18} />} label="TEAMS" value={teams.length} /><StatTile icon={<CalendarDays size={18} />} label="TOTAL MATCHES" value={matches.length} /><StatTile icon={<Check size={18} />} label="COMPLETED" value={completed} tone="orange" /><StatTile icon={<Clock3 size={18} />} label="UPCOMING" value={upcoming} /></div>
        <div className="admin-content-grid"><section className="admin-panel"><div className="admin-panel-heading"><div><span className="eyebrow">MATCH CENTER</span><h2>Recent fixtures</h2></div><Link className="text-link" to="/fixtures">View public page <ArrowUpRight size={14} /></Link></div>{matches.slice(0, 5).length ? <div className="admin-match-list">{matches.slice(0, 5).map((match) => <div className="admin-match-row" key={recordId(match)}><div><b>{nameOfTeam(match.homeTeam || match.home)} <span>vs</span> {nameOfTeam(match.awayTeam || match.away)}</b><small>{dateLabel(matchDate(match))}</small></div><span className={`match-status ${statusOf(match) === 'live' ? 'status-live' : ''}`}><i />{statusOf(match)}</span></div>)}</div> : <Empty title="No fixtures yet" text="Fixtures added to your tournament will appear in this workspace." />}</section>
          <section className="admin-panel admin-quick-panel"><span className="eyebrow">QUICK ACTION</span><h2>Publish a result</h2><p>Choose a match and update its score. Published changes feed the public tournament pages.</p><QuickResultForm matches={matches} results={results} onSaved={loadAdminData} setNotice={setNotice} setError={setError} /></section></div>
      </>}
      {['tournaments', 'teams', 'players', 'matches', 'sponsors'].includes(activePanel) && <AdminResourceManager resource={activePanel} user={user} onChanged={loadAdminData} setError={setError} setNotice={setNotice} />}
      {activePanel === 'results' && <section className="admin-panel admin-resource-panel"><div className="admin-panel-heading"><div><span className="eyebrow">RESULT CONTROL</span><h2>Draft and publish scores</h2></div></div><QuickResultForm matches={matches} results={results} onSaved={loadAdminData} setNotice={setNotice} setError={setError} /><div className="admin-panel-heading results-panel-heading"><div><span className="eyebrow">RECENT ACTIVITY</span><h2>Saved results</h2></div></div><div className="admin-resource-list">{results.map((result) => <div className="admin-resource-row" key={recordId(result)}><div><b>{nameOfTeam(result.homeTeam)} {result.homeScore} — {result.awayScore} {nameOfTeam(result.awayTeam)}</b><small>{result.status} · {dateLabel(result.publishedAt || result.updatedAt)}</small></div></div>)}</div></section>}
      {activePanel === 'audit-logs' && <AdminResourceManager resource="audit-logs" user={user} onChanged={loadAdminData} setError={setError} setNotice={setNotice} />}
      {activePanel === 'users' && user.role === 'Super Admin' && <AdminResourceManager resource="users" user={user} onChanged={loadAdminData} setError={setError} setNotice={setNotice} />}
    </section>
  </main>;
}

function AdminResourceManager({ resource, user, onChanged, setError, setNotice }) {
  const isAudit = resource === 'audit-logs';
  const config = resourceForms[resource];
  const [rows, setRows] = useState([]);
  const [lookups, setLookups] = useState({});
  const [form, setForm] = useState({});
  const [editing, setEditing] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUploadsInProgress, setImageUploadsInProgress] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const path = isAudit ? '/admin/audit-logs' : `/admin/${resource}`;
      const lookupPrefix = resource === 'matches' && user?.role === 'Editor' ? '/public' : '/admin';
      const [items, tournaments, teams] = await Promise.all([
        fetchList(path, { limit: 100 }),
        ['teams', 'players', 'matches', 'sponsors'].includes(resource) ? fetchList(`${lookupPrefix}/tournaments`, { limit: 100 }) : Promise.resolve([]),
        ['players', 'matches'].includes(resource) ? fetchList(`${lookupPrefix}/teams`, { limit: 100 }) : Promise.resolve([]),
      ]);
      setRows(items);
      setLookups({ tournaments, teams });
    } catch (loadError) {
      setError(messageFromError(loadError, `Unable to load ${config?.title?.toLowerCase() || 'admin records'}.`));
    } finally { setLoading(false); }
  }, [config?.title, isAudit, resource, setError, user?.role]);

  useEffect(() => { load(); }, [load]);

  function blankForm() {
    const initial = {};
    for (const field of config.fields) {
      if (field.type === 'checkbox') initial[field.key] = true;
      else if (field.key === 'status') initial[field.key] = resource === 'matches' ? 'scheduled' : 'draft';
      else if (field.key === 'role') initial[field.key] = 'Editor';
      else initial[field.key] = '';
    }
    return initial;
  }

  function startCreate() {
    setEditing('');
    setForm(blankForm());
    setError('');
  }

  function startEdit(row) {
    setEditing(recordId(row));
    const values = {};
    for (const field of config.fields) {
      let value = row[field.key];
      if (field.type === 'relation') value = recordId(value);
      if ((field.type === 'date' || field.type === 'datetime-local') && value) {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) {
          if (field.type === 'date') value = date.toISOString().slice(0, 10);
          else {
            date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
            value = date.toISOString().slice(0, 16);
          }
        }
      }
      values[field.key] = field.type === 'checkbox' ? Boolean(value) : value ?? '';
    }
    setForm(values);
    setError('');
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const payload = {};
    for (const field of config.fields) {
      const value = form[field.key];
      if (field.type === 'checkbox') payload[field.key] = Boolean(value);
      else if (value !== '' && value !== undefined) payload[field.key] = field.type === 'number' ? Number(value) : value;
      else if (editing && !field.required && !field.keepEmptyOnEdit) payload[field.key] = null;
    }
    try {
      await send(editing ? `/admin/${resource}/${editing}` : `/admin/${resource}`, editing ? 'patch' : 'post', payload);
      await load();
      await onChanged();
      setForm({});
      setEditing('');
      setNotice(`${config.title.replace(/s$/, '')} ${editing ? 'updated' : 'created'} successfully.`);
    } catch (saveError) {
      setError(messageFromError(saveError, `Unable to save ${config.title.toLowerCase()}.`));
    } finally { setSaving(false); }
  }

  async function remove(row) {
    if (!window.confirm(`Delete "${row.name || row.email || config.title}"? This action cannot be undone.`)) return;
    setError('');
    try {
      await send(`/admin/${resource}/${recordId(row)}`, 'delete');
      await load();
      await onChanged();
      setNotice(`${config.title.replace(/s$/, '')} deleted.`);
    } catch (deleteError) {
      setError(messageFromError(deleteError, `Unable to delete ${config.title.toLowerCase()}.`));
    }
  }

  function relationLabel(row, field) {
    if (resource === 'matches') {
      if (field.key === 'homeTeam') return nameOfTeam(row.homeTeam);
      if (field.key === 'awayTeam') return nameOfTeam(row.awayTeam);
    }
    const value = row[field.key];
    if (value && typeof value === 'object') return value.name || value.email || '—';
    return value || '—';
  }

  const columns = isAudit
    ? [{ key: 'actor', label: 'ACTOR' }, { key: 'action', label: 'ACTION' }, { key: 'resource', label: 'RECORD TYPE' }, { key: 'createdAt', label: 'DATE' }]
    : config.fields.filter((field) => !['description', 'logoUrl', 'photoUrl', 'password'].includes(field.key)).slice(0, 5).map((field) => ({ key: field.key, label: field.label.toUpperCase() }));

  return <section className="admin-panel admin-resource-panel">
    <div className="admin-panel-heading"><div><span className="eyebrow">{isAudit ? 'ADMINISTRATIVE HISTORY' : 'CONTENT MANAGEMENT'}</span><h2>{isAudit ? 'Audit log' : config.title}</h2></div>{!isAudit && <button className="button button-coral" onClick={startCreate}>Add {config.title.replace(/s$/, '')} <ArrowRight size={14} /></button>}</div>
    {!isAudit && <form className="resource-form" onSubmit={save}><div className="resource-form-heading"><b>{editing ? `Edit ${config.title.replace(/s$/, '')}` : `New ${config.title.replace(/s$/, '')}`}</b>{Boolean(editing) && <button type="button" className="resource-cancel" onClick={() => { setEditing(''); setForm({}); }}>Cancel edit</button>}</div><div className="resource-fields">{config.fields.map((field) => {
      if (field.type === 'checkbox') return <label className="resource-checkbox" key={field.key}><input type="checkbox" checked={Boolean(form[field.key])} onChange={(event) => setForm({ ...form, [field.key]: event.target.checked })} />{field.label}</label>;
      if (field.type === 'textarea') return <label className="resource-field resource-field-wide" key={field.key}>{field.label}<textarea required={field.required} rows="3" value={form[field.key] || ''} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} /></label>;
      if (field.type === 'image') return <ImageUploadField key={field.key} field={field} value={form[field.key] || ''} onChange={(url) => setForm((current) => ({ ...current, [field.key]: url }))} onUploadStateChange={(uploading) => setImageUploadsInProgress((count) => Math.max(0, count + (uploading ? 1 : -1)))} />;
      if (field.type === 'select' || field.type === 'relation') {
        let choices = field.type === 'select' ? field.options.map((value) => ({ id: value, name: value })) : lookups[field.source] || [];
        if (resource === 'matches' && ['homeTeam', 'awayTeam'].includes(field.key) && form.tournament) {
          choices = choices.filter((team) => recordId(team.tournament) === form.tournament);
        }
        return <label className="resource-field" key={field.key}>{field.label}<select required={field.required} value={form[field.key] || ''} onChange={(event) => {
          const nextForm = { ...form, [field.key]: event.target.value };
          if (resource === 'matches' && field.key === 'tournament') {
            nextForm.homeTeam = '';
            nextForm.awayTeam = '';
          }
          setForm(nextForm);
        }}><option value="">Select…</option>{choices.map((choice) => <option key={recordId(choice) || choice.id} value={recordId(choice) || choice.id}>{choice.name || choice.email}</option>)}</select></label>;
      }
      return <label className="resource-field" key={field.key}>{field.label}<input required={field.required && !(editing && field.type === 'password')} type={field.type || 'text'} min={field.min} max={field.max} placeholder={editing && field.type === 'password' ? 'Leave blank to keep current password' : undefined} autoComplete={field.type === 'password' ? 'new-password' : undefined} value={form[field.key] || ''} onChange={(event) => setForm({ ...form, [field.key]: event.target.value })} /></label>;
    })}</div><div className="resource-form-actions"><button className="button button-dark" disabled={saving || imageUploadsInProgress > 0}>{saving ? 'Saving…' : imageUploadsInProgress ? 'Wait for image upload…' : editing ? 'Save changes' : 'Create record'} <Check size={14} /></button><span>Changes are saved to the tournament database.</span></div></form>}
    {loading ? <div className="admin-resource-loading"><span className="loader" /> Loading records…</div> : rows.length ? <div className="admin-resource-table-wrap"><table className="admin-resource-table"><thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}{!isAudit && <th>ACTIONS</th>}</tr></thead><tbody>{rows.map((row) => <tr key={recordId(row)}>{columns.map((column) => <td key={column.key}>{column.key === 'createdAt' ? dateLabel(row.createdAt) : column.key === 'actor' ? (row.actor?.name || row.actor?.email || 'System') : relationLabel(row, column)}</td>)}{!isAudit && <td><div className="resource-actions"><button onClick={() => startEdit(row)}>Edit</button><button className="danger-action" onClick={() => remove(row)}>Delete</button></div></td>}</tr>)}</tbody></table></div> : <Empty title={isAudit ? 'No administrative activity yet' : `No ${config.title.toLowerCase()} yet`} text={isAudit ? 'Important administrative changes will be recorded here.' : 'Create your first record using the form above.'} />}
  </section>;
}

function ImageUploadField({ field, value, onChange, onUploadStateChange }) {
  const [pendingFile, setPendingFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewReady, setPreviewReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!previewUrl) return undefined;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  async function handleFileChange(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Choose a JPG, PNG, WebP, or GIF image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be 5 MB or smaller.');
      return;
    }

    setError('');
    setProgress(0);
    setPendingFile(file);
    setPreviewReady(false);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function handleUpload() {
    if (!pendingFile || !previewReady) return;
    setError('');
    setUploading(true);
    onUploadStateChange(true);
    try {
      const url = await uploadImage(pendingFile, setProgress);
      onChange(url);
      setPendingFile(null);
      setPreviewReady(false);
      setPreviewUrl('');
    } catch (uploadError) {
      setError(messageFromError(uploadError, 'Image upload failed. Please try again.'));
    } finally {
      setUploading(false);
      onUploadStateChange(false);
    }
  }

  return <div className="resource-field image-upload-field">
    <span>{field.label}</span>
    {(previewUrl || value) && <img
      className="image-upload-preview"
      src={previewUrl || value}
      alt={`${field.label} preview`}
      onLoad={() => { if (pendingFile) setPreviewReady(true); }}
      onError={() => {
        if (pendingFile) {
          setPreviewReady(false);
          setError('This image could not be previewed. Choose a valid image file.');
        }
      }}
    />}
    {pendingFile && <small className="image-preview-confirmation" role="status">Preview this image before uploading: {pendingFile.name}</small>}
    <label className={`image-upload-button ${uploading ? 'image-upload-button-disabled' : ''}`}>
      <Flag size={15} />{uploading ? 'Uploading from your device…' : pendingFile ? 'Choose another image' : value ? 'Choose a different image' : 'Choose an image from this device'}
      <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploading} onChange={handleFileChange} />
    </label>
    <small>Select a photo or image stored on your computer or mobile device. JPG, PNG, WebP or GIF · up to 5 MB.</small>
    {pendingFile && <div className="image-upload-actions">
      <button type="button" className="button button-coral" disabled={uploading || !previewReady} onClick={handleUpload}>{uploading ? `Uploading… ${progress}%` : 'Upload this image'}</button>
      <button type="button" className="resource-cancel" disabled={uploading} onClick={() => { setPendingFile(null); setPreviewReady(false); setPreviewUrl(''); setError(''); }}>Cancel selection</button>
    </div>}
    {uploading && <progress className="image-upload-progress" max="100" value={progress} aria-label={`Uploading ${field.label}`} />}
    {uploading && <small role="status">Uploading image… {progress}%</small>}
    {error && <small className="image-upload-error" role="alert">{error}</small>}
  </div>;
}

function QuickResultForm({ matches, results, onSaved, setNotice, setError }) {
  const [matchId, setMatchId] = useState('');
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [busy, setBusy] = useState(false);
  const saveResult = async (event) => {
    event.preventDefault();
    if (!matchId) return setError('Select a match before saving a result.');
    const shouldPublish = event.nativeEvent.submitter?.value !== 'draft';
    setBusy(true);
    setError('');
    try {
      const match = matches.find((item) => recordId(item) === matchId);
      if (!match?.tournament || !match?.homeTeam || !match?.awayTeam) {
        throw new Error('The match is missing its tournament or team information.');
      }
      const payload = {
        match: matchId,
        tournament: recordId(match.tournament),
        homeTeam: recordId(match.homeTeam),
        awayTeam: recordId(match.awayTeam),
        homeScore: Number(homeScore),
        awayScore: Number(awayScore),
      };
      const existing = results.find((result) => recordId(result.match) === matchId);
      const draft = existing
        ? await send(`/admin/results/${recordId(existing)}`, 'patch', payload)
        : await send('/admin/results', 'post', payload);
      if (!recordId(draft)) throw new Error('The server did not confirm the saved result.');
      if (shouldPublish) {
        await send(`/admin/results/${recordId(draft)}/publish`, 'post', {});
        setNotice('Result published. Public standings and statistics are recalculated from published results.');
      } else {
        setNotice('Result saved as a draft. Draft scores are not shown on the public website.');
      }
      setHomeScore(''); setAwayScore('');
      await onSaved();
    } catch (publishError) {
      setError(messageFromError(publishError, 'Unable to save result.'));
    } finally { setBusy(false); }
  };
  return <form className="quick-result-form" onSubmit={saveResult}><label>Fixture<select required value={matchId} onChange={(event) => setMatchId(event.target.value)}><option value="">Select a match</option>{matches.map((match) => <option key={recordId(match)} value={recordId(match)}>{nameOfTeam(match.homeTeam || match.home)} vs {nameOfTeam(match.awayTeam || match.away)}{results.some((result) => recordId(result.match) === recordId(match)) ? ' · result exists' : ''}</option>)}</select></label><div className="score-inputs"><label>Home score<input required type="number" min="0" max="99" value={homeScore} onChange={(event) => setHomeScore(event.target.value)} /></label><span>—</span><label>Away score<input required type="number" min="0" max="99" value={awayScore} onChange={(event) => setAwayScore(event.target.value)} /></label></div><div className="result-actions"><button type="submit" value="draft" className="button button-light" disabled={busy || !matches.length}>Save draft</button><button type="submit" value="publish" className="button button-coral" disabled={busy || !matches.length}>{busy ? 'Saving…' : 'Publish result'} <ArrowRight size={15} /></button></div></form>;
}

export default function App() {
  const [data, setData] = useState({ tournaments: [], matches: [], teams: [], players: [], standings: [], sponsors: [], statistics: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const location = useLocation();
  const loadPublicData = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const tournaments = await fetchList('/public/tournaments', { limit: 100 });
      const selectedTournament = tournaments.find((item) => item.isPublished !== false && item.published !== false) || tournaments[0];
      const id = tournamentId(selectedTournament);
      const tournamentParams = id ? { tournamentId: id, limit: 100 } : { limit: 100 };
      const [rawMatches, teams, players, sponsors, results] = await Promise.all([
        fetchList('/public/matches', tournamentParams),
        fetchList('/public/teams', tournamentParams),
        fetchList('/public/players', tournamentParams),
        fetchList('/public/sponsors', tournamentParams),
        fetchList('/public/results', tournamentParams),
      ]);
      const resultByMatch = new Map(results.map((result) => [recordId(result.match), result]));
      const matches = rawMatches.map((match) => {
        const result = resultByMatch.get(recordId(match));
        return result ? {
          ...match,
          result,
          resultId: recordId(result),
          homeScore: result.homeScore,
          awayScore: result.awayScore,
          status: 'completed',
        } : match;
      });
      const [standings, statistics] = await Promise.all([
        id ? fetchOne(`/public/standings/${id}`) : Promise.resolve([]),
        id ? fetchOne(`/public/stats/${id}`) : Promise.resolve({}),
      ]);
      setData({ tournaments, matches, teams, players, standings, sponsors, statistics: statistics || {} });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPublicData(); }, [loadPublicData]);
  useEffect(() => {
    const timer = window.setInterval(loadPublicData, 60000);
    return () => window.clearInterval(timer);
  }, [loadPublicData]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [location.pathname]);

  const isAdmin = location.pathname.startsWith('/admin');
  const routes = useMemo(() => [
    { path: '/fixtures', element: <PublicListing path="/fixtures" data={data} loading={loading} error={error} retry={loadPublicData} /> },
    { path: '/results', element: <PublicListing path="/results" data={data} loading={loading} error={error} retry={loadPublicData} /> },
    { path: '/standings', element: <PublicListing path="/standings" data={data} loading={loading} error={error} retry={loadPublicData} /> },
    { path: '/teams', element: <PublicListing path="/teams" data={data} loading={loading} error={error} retry={loadPublicData} /> },
    { path: '/players', element: <PublicListing path="/players" data={data} loading={loading} error={error} retry={loadPublicData} /> },
    { path: '/stats', element: <StatsPage data={data} loading={loading} /> },
    { path: '/bracket', element: <BracketPage data={data} /> },
    { path: '/sponsors', element: <PublicListing path="/sponsors" data={data} loading={loading} error={error} retry={loadPublicData} /> },
  ], [data, loading, error, loadPublicData]);

  if (isAdmin) return <Routes><Route path="/admin/*" element={<AdminPage />} /></Routes>;
  return <><Header tournament={data.tournaments[0]} /><Routes><Route path="/" element={<HomePage data={data} loading={loading} error={error} retry={loadPublicData} />} />{routes.map((route) => <Route key={route.path} path={route.path} element={route.element} />)}<Route path="*" element={<HomePage data={data} loading={loading} error={error} retry={loadPublicData} />} /></Routes><Footer sponsors={data.sponsors} /></>;
}
