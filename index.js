'use strict';
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

const AF_BASE = 'https://v3.football.api-sports.io';
const AF_HDR  = () => ({ 'x-apisports-key': process.env.API_FOOTBALL_KEY || '' });

const OWNER_URL = 'https://t.me/AlkanjutReal';
const FOOTER    = 'FootBot | @AlkanjutReal';

// ─── SEASONS — diperbarui ke musim 2025 ──────────────────────────────────────
const CURRENT_SEASON = '2025';

// ─── LEAGUES ──────────────────────────────────────────────────────────────────
const POPULAR_LEAGUES = [
  // 🇮🇩 Indonesia
  { id: '253', name: 'BRI Liga 1',        flag: '🇮🇩', season: '2025', country: 'Indonesia' },
  { id: '254', name: 'Liga 2 Indonesia',  flag: '🇮🇩', season: '2025', country: 'Indonesia' },
  { id: '977', name: 'Piala Indonesia',   flag: '🇮🇩', season: '2024', country: 'Indonesia' },
  // 🏴󠁧󠁢󠁥󠁮󠁧󠁿 England
  { id: '39',  name: 'Premier League',    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', season: '2025', country: 'England'   },
  { id: '45',  name: 'FA Cup',            flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', season: '2025', country: 'England'   },
  // 🇪🇸 Spain
  { id: '140', name: 'La Liga',           flag: '🇪🇸', season: '2025', country: 'Spain'     },
  // 🇮🇹 Italy
  { id: '135', name: 'Serie A',           flag: '🇮🇹', season: '2025', country: 'Italy'     },
  // 🇩🇪 Germany
  { id: '78',  name: 'Bundesliga',        flag: '🇩🇪', season: '2025', country: 'Germany'   },
  // 🇫🇷 France
  { id: '61',  name: 'Ligue 1',           flag: '🇫🇷', season: '2025', country: 'France'    },
  // 🇳🇱 Netherlands
  { id: '88',  name: 'Eredivisie',        flag: '🇳🇱', season: '2025', country: 'Netherlands' },
  // 🇵🇹 Portugal
  { id: '94',  name: 'Primeira Liga',     flag: '🇵🇹', season: '2025', country: 'Portugal'  },
  // 🇹🇷 Turkey
  { id: '203', name: 'Super Lig',         flag: '🇹🇷', season: '2025', country: 'Turkey'    },
  // 🇸🇦 Saudi
  { id: '307', name: 'Saudi Pro League',  flag: '🇸🇦', season: '2025', country: 'Saudi Arabia' },
  // 🇯🇵 Japan
  { id: '98',  name: 'J1 League',         flag: '🇯🇵', season: '2025', country: 'Japan'     },
  // 🇰🇷 Korea
  { id: '292', name: 'K League 1',        flag: '🇰🇷', season: '2025', country: 'South Korea' },
  // ⭐ Continental
  { id: '2',   name: 'Champions League',  flag: '⭐',  season: '2025', country: 'World'     },
  { id: '3',   name: 'Europa League',     flag: '🌍',  season: '2025', country: 'World'     },
  { id: '848', name: 'Conference League', flag: '🌍',  season: '2025', country: 'World'     },
  // 🌏 AFC
  { id: '17',  name: 'AFC Champions',     flag: '🌏',  season: '2025', country: 'Asia'      },
  // 🌏 International
  { id: '1',   name: 'World Cup 2026',    flag: '🌏',  season: '2026', country: 'World'     },
];

// Liga Indonesia khusus untuk pencarian mudah
const INDONESIA_LEAGUES = POPULAR_LEAGUES.filter(l => l.country === 'Indonesia');

const LEAGUE_PRIORITY = {
  'liga 1': 1, 'bri liga': 1, 'liga 2': 2, 'piala indonesia': 3, 'piala presiden': 4,
  'champions league': 10, 'premier league': 11, 'la liga': 12,
  'serie a': 13, 'bundesliga': 14, 'ligue 1': 15,
  'europa league': 16, 'conference league': 17,
  'eredivisie': 20, 'primeira liga': 21, 'super lig': 22, 'saudi': 23,
  'j1 league': 24, 'k league': 25,
  'afc champions': 30, 'aff': 31, 'piala asia': 32, 'world cup': 33,
};
function leaguePriorityScore(country, league) {
  if (country === 'Indonesia') return 0; // Indonesia selalu prioritas
  const h = `${league} ${country}`.toLowerCase();
  for (const [kw, sc] of Object.entries(LEAGUE_PRIORITY)) if (h.includes(kw)) return sc;
  return 999;
}

const PHOTO_URL = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/FIFA_World_Cup_2018_qualification_Novi_Sad.jpg/800px-FIFA_World_Cup_2018_qualification_Novi_Sad.jpg';
let PHOTO_FILE_ID = null;

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function s(text) {
  if (text == null) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!')
    .replace(/\-/g, '\\-')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/`/g, '\\`')
    .replace(/>/g, '\\>')
    .replace(/</g, '\\<')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/=/g, '\\=')
    .replace(/\|/g, '\\|')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\~')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\\_');
}

function sr(text) { // safe raw (for code blocks, no escaping needed)
  if (text == null) return '';
  return String(text);
}

function block(lines) { return '```\n' + lines.join('\n') + '\n```'; }
function nowWIB() {
  return new Date(Date.now() + 7*3600*1000).toISOString().substring(11,16) + ' WIB';
}

// ─── CACHE ────────────────────────────────────────────────────────────────────
const cache = new Map();
function setCache(k, v, ttl = 8*60*1000) { cache.set(k, { v, exp: Date.now()+ttl }); }
function getCache(k) {
  const c = cache.get(k);
  if (!c || Date.now() > c.exp) { cache.delete(k); return null; }
  return c.v;
}
function clearCache(k) { cache.delete(k); }

// ─── SESSIONS ─────────────────────────────────────────────────────────────────
const sessions = new Map();
function storeMatch(id, data) { sessions.set(String(id), { ...data, exp: Date.now()+60*60*1000 }); }
function getMatch(id) {
  const m = sessions.get(String(id));
  if (!m || Date.now() > m.exp) { sessions.delete(String(id)); return null; }
  return m;
}

// ─── NOTIFIKASI GOL ───────────────────────────────────────────────────────────
// subs: Map<userId, Set<fixtureId>>
// goalTrack: Map<fixtureId, { home: n, away: n, notified: Set<userId> }>
const notifSubs = new Map();   // userId -> Set<fixtureId>
const goalTrack = new Map();   // fixtureId -> { homeScore, awayScore, events: [] }
const userChatId = new Map();  // userId -> chatId (untuk kirim notif)

function addNotif(userId, chatId, fixtureId) {
  userChatId.set(userId, chatId);
  if (!notifSubs.has(userId)) notifSubs.set(userId, new Set());
  notifSubs.get(userId).add(String(fixtureId));
}
function removeNotif(userId, fixtureId) {
  const s = notifSubs.get(userId);
  if (s) { s.delete(String(fixtureId)); if (!s.size) notifSubs.delete(userId); }
}
function hasNotif(userId, fixtureId) {
  return notifSubs.get(userId)?.has(String(fixtureId)) || false;
}
function getAllSubscribedFixtures() {
  const all = new Set();
  for (const s of notifSubs.values()) for (const id of s) all.add(id);
  return all;
}

// ─── QUEUE ────────────────────────────────────────────────────────────────────
const queue = [];
let qRunning = false;
async function runQueue() {
  if (!queue.length) { qRunning = false; return; }
  qRunning = true;
  const fn = queue.shift();
  await new Promise(r => setImmediate(r));
  try { await fn(); } catch (err) { console.error('Queue:', err.message); }
  setImmediate(runQueue);
}
function enqueue(fn) { queue.push(fn); if (!qRunning) runQueue(); }

// ─── DATE UTILS ───────────────────────────────────────────────────────────────
function getDateStr(offset = 0) {
  const wib = new Date(Date.now() + 7*3600*1000);
  wib.setDate(wib.getDate() + offset);
  return wib.toISOString().split('T')[0];
}
function offsetFromToday(ds) {
  const a = new Date(getDateStr(0)); a.setHours(0,0,0,0);
  const b = new Date(ds);            b.setHours(0,0,0,0);
  return Math.round((b - a) / 86400000);
}
function dayLabel(ds) {
  const off = offsetFromToday(ds);
  if (off === 0) return 'Hari ini';
  if (off === 1) return 'Besok';
  if (off === -1) return 'Kemarin';
  const d = new Date(ds);
  const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  return `${days[d.getDay()]} ${d.toLocaleDateString('id-ID', { day:'2-digit', month:'short' })}`;
}
function isoToWIB(iso) {
  if (!iso) return '--:--';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '--:--';
  const w = new Date(d.getTime() + 7*3600*1000);
  return String(w.getUTCHours()).padStart(2,'0') + ':' + String(w.getUTCMinutes()).padStart(2,'0');
}
function isoToDateStr(iso) { return iso ? String(iso).split('T')[0] : ''; }
function isoToMs(iso)       { return iso ? new Date(iso).getTime() : 0; }
function formatDateID(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── STATUS HELPERS ───────────────────────────────────────────────────────────
function epsToLabel(eps) {
  if (!eps) return '⏰';
  switch (String(eps).toUpperCase()) {
    case 'NS': case 'TBD': return '⏰';
    case '1H': return '🔴 1H'; case '2H': return '🔴 2H';
    case 'HT': return '🔴 HT'; case 'ET': return '🔴 ET';
    case 'BT': return '🔴 BT'; case 'P':  return '🔴 PEN';
    case 'LIVE': return '🔴 LIVE';
    case 'SUSP': return '⏸ SUSP'; case 'INT': return '⏸ INT';
    case 'FT': return '✅ FT'; case 'AET': return '✅ AET'; case 'PEN': return '✅ PEN';
    case 'PST': return '📌 PP'; case 'CANC': return '❌ CANC'; case 'ABD': return '❌ ABD';
    default: return `🔴 ${eps}`;
  }
}
function isLive(eps) {
  return ['1H','2H','HT','ET','BT','P','SUSP','INT','LIVE'].includes(String(eps||'').toUpperCase());
}
function isFinished(eps) {
  return ['FT','AET','PEN'].includes(String(eps||'').toUpperCase());
}
function pctBar(p, total = 10) {
  if (p == null) return '░'.repeat(total) + '   --%';
  const f = Math.min(total, Math.round((p||0)/100*total));
  return '█'.repeat(f) + '░'.repeat(total-f) + '  ' + String(p).padStart(3) + '%';
}
function statRow(label, hVal, aVal, pad = 14) {
  const l = String(label).padEnd(pad);
  const h = String(hVal ?? '-').padStart(4);
  const a = String(aVal ?? '-').padStart(4);
  return `  ${l}${h}  |${a}`;
}
function formEmoji(c) {
  if (c==='W') return '✅'; if (c==='L') return '❌'; return '〰️';
}
function fmtForm(formStr) {
  if (!formStr) return '';
  return formStr.split('').slice(-5).map(formEmoji).join('');
}
function ratingBar(rating) {
  const r = parseFloat(rating) || 0;
  if (r >= 8.5) return '🌟';
  if (r >= 8.0) return '⭐';
  if (r >= 7.5) return '🔥';
  if (r >= 7.0) return '👍';
  if (r >= 6.0) return '😐';
  return '👎';
}

// ─── API ──────────────────────────────────────────────────────────────────────
async function fetchScheduleLS(ds) {
  const ck = `ls_sched_${ds}`;
  const hit = getCache(ck);
  if (hit) return hit;

  const res = await axios.get(`${AF_BASE}/fixtures`, {
    params: { date: ds, timezone: 'Asia/Jakarta' }, headers: AF_HDR(), timeout: 18000,
  });
  const fixtures = res.data?.response || [];
  const leagueMap = {};
  let totalMatches = 0;

  for (const f of fixtures) {
    const country = f.league?.country || 'Internasional';
    const league  = f.league?.name   || 'Liga';
    const cid     = f.league?.id     ? String(f.league.id)     : null;
    const sid     = f.league?.season ? String(f.league.season) : null;
    const key     = `${country}__${league}`;
    const home = f.teams?.home?.name || '?';
    const away = f.teams?.away?.name || '?';
    const eps  = f.fixture?.status?.short || 'NS';
    const eid  = String(f.fixture?.id || '');
    const esd  = f.fixture?.date || '';
    if (!eid || !home || home === '?') continue;
    if (!leagueMap[key]) leagueMap[key] = { country, league, cid, sid, events: [] };
    leagueMap[key].events.push({
      id: eid, esd, time: isoToWIB(esd), home, away,
      homeScore: f.goals?.home ?? null, awayScore: f.goals?.away ?? null,
      eps, minute: f.fixture?.status?.elapsed ? `${f.fixture.status.elapsed}'` : null,
      cid, sid,
    });
    storeMatch(eid, {
      home, away, liga: league, country, cid, sid,
      homeId:   f.teams?.home?.id   ? String(f.teams.home.id)   : null,
      awayId:   f.teams?.away?.id   ? String(f.teams.away.id)   : null,
      homeScore: f.goals?.home ?? null, awayScore: f.goals?.away ?? null,
      eps, minute: f.fixture?.status?.elapsed ? `${f.fixture.status.elapsed}'` : null,
      venue:   f.fixture?.venue?.name   || null,
      city:    f.fixture?.venue?.city   || null,
      referee: f.fixture?.referee       || null,
      esd,
    });
    totalMatches++;
  }
  for (const l of Object.values(leagueMap)) l.events.sort((a,b) => a.esd < b.esd ? -1 : 1);
  const sortedLeagues = Object.entries(leagueMap).sort((a,b) => {
    const aL = a[1].events.filter(e=>isLive(e.eps)).length;
    const bL = b[1].events.filter(e=>isLive(e.eps)).length;
    if (bL !== aL) return bL - aL;
    const ap = leaguePriorityScore(a[1].country, a[1].league);
    const bp = leaguePriorityScore(b[1].country, b[1].league);
    if (ap !== bp) return ap - bp;
    return b[1].events.length - a[1].events.length;
  });
  const result = { total: totalMatches, leagueMap, sortedLeagues };
  const hasLive = sortedLeagues.some(([,l]) => l.events.some(e => isLive(e.eps)));
  if (totalMatches > 0) setCache(ck, result, hasLive ? 90*1000 : 10*60*1000);
  return result;
}

async function fetchSchedule24h() {
  const nowMs = Date.now(), endMs = nowMs + 24*3600*1000;
  const [d0, d1] = await Promise.all([fetchScheduleLS(getDateStr(0)), fetchScheduleLS(getDateStr(1))]);
  const merged = {};
  for (const src of [d0, d1]) {
    for (const [key, l] of Object.entries(src.leagueMap)) {
      const filtered = l.events.filter(ev => {
        if (isLive(ev.eps)) return true;
        const ms = isoToMs(ev.esd);
        return ms >= nowMs && ms <= endMs;
      });
      if (!filtered.length) continue;
      if (!merged[key]) merged[key] = { ...l, events: [] };
      merged[key].events.push(...filtered);
    }
  }
  for (const l of Object.values(merged)) l.events.sort((a,b) => a.esd < b.esd ? -1 : 1);
  const sortedLeagues = Object.entries(merged).sort((a,b) => {
    const aL = a[1].events.filter(e=>isLive(e.eps)).length;
    const bL = b[1].events.filter(e=>isLive(e.eps)).length;
    if (bL !== aL) return bL - aL;
    const ap = leaguePriorityScore(a[1].country, a[1].league);
    const bp = leaguePriorityScore(b[1].country, b[1].league);
    if (ap !== bp) return ap - bp;
    return b[1].events.length - a[1].events.length;
  });
  const total = sortedLeagues.reduce((s,[,l]) => s+l.events.length, 0);
  const result = { total, leagueMap: merged, sortedLeagues };
  const hasLive = sortedLeagues.some(([,l]) => l.events.some(e => isLive(e.eps)));
  setCache('ls_sched_24h', result, hasLive ? 60*1000 : 5*60*1000);
  return result;
}

async function fetchAFPrediction(fixtureId) {
  const ck = `af_pred_${fixtureId}`;
  const hit = getCache(ck);
  if (hit) return hit;
  try {
    const res = await axios.get(`${AF_BASE}/predictions`, {
      params: { fixture: fixtureId }, headers: AF_HDR(), timeout: 10000,
    });
    const errs = res.data?.errors;
    if (errs && Object.keys(errs).length > 0) throw new Error(Object.values(errs)[0]);
    const data = res.data?.response?.[0] || null;
    if (data) setCache(ck, data, 30*60*1000);
    return data;
  } catch (err) { console.error('AFPrediction:', err.message); return null; }
}

async function fetchMatchEvents(eid) {
  const ck = `mev_${eid}`;
  const hit = getCache(ck);
  if (hit) return hit;
  const res = await axios.get(`${AF_BASE}/fixtures/events`, {
    params: { fixture: eid }, headers: AF_HDR(), timeout: 12000,
  });
  const data = res.data?.response || [];
  setCache(ck, data, 30*1000);
  return data;
}

async function fetchMatchStats(eid) {
  const ck = `mstats_${eid}`;
  const hit = getCache(ck);
  if (hit) return hit;
  const res = await axios.get(`${AF_BASE}/fixtures/statistics`, {
    params: { fixture: eid }, headers: AF_HDR(), timeout: 12000,
  });
  const data = res.data?.response || [];
  setCache(ck, data, 45*1000);
  return data;
}

async function fetchLineups(eid) {
  const ck = `lineup_${eid}`;
  const hit = getCache(ck);
  if (hit) return hit;
  const res = await axios.get(`${AF_BASE}/fixtures/lineups`, {
    params: { fixture: eid }, headers: AF_HDR(), timeout: 12000,
  });
  const data = res.data?.response || [];
  setCache(ck, data, 10*60*1000);
  return data;
}

async function fetchPlayerRatings(eid) {
  const ck = `prating_${eid}`;
  const hit = getCache(ck);
  if (hit) return hit;
  const res = await axios.get(`${AF_BASE}/fixtures/players`, {
    params: { fixture: eid }, headers: AF_HDR(), timeout: 14000,
  });
  const data = res.data?.response || [];
  setCache(ck, data, 60*1000);
  return data;
}

async function fetchStandings(leagueId, season) {
  const ck = `st_${leagueId}_${season}`;
  const hit = getCache(ck);
  if (hit) return hit;
  const res = await axios.get(`${AF_BASE}/standings`, {
    params: { league: leagueId, season }, headers: AF_HDR(), timeout: 12000,
  });
  const errs = res.data?.errors;
  if (errs && Object.keys(errs).length > 0) throw new Error(Object.values(errs)[0]);
  const data = res.data?.response?.[0] || null;
  if (data) setCache(ck, data, 30*60*1000);
  return data;
}

async function fetchTopScorers(leagueId, season) {
  const ck = `topscore_${leagueId}_${season}`;
  const hit = getCache(ck);
  if (hit) return hit;
  const res = await axios.get(`${AF_BASE}/players/topscorers`, {
    params: { league: leagueId, season }, headers: AF_HDR(), timeout: 12000,
  });
  const data = res.data?.response || [];
  if (data.length) setCache(ck, data, 60*60*1000);
  return data;
}

async function fetchTopAssists(leagueId, season) {
  const ck = `topassist_${leagueId}_${season}`;
  const hit = getCache(ck);
  if (hit) return hit;
  const res = await axios.get(`${AF_BASE}/players/topassists`, {
    params: { league: leagueId, season }, headers: AF_HDR(), timeout: 12000,
  });
  const data = res.data?.response || [];
  if (data.length) setCache(ck, data, 60*60*1000);
  return data;
}

async function fetchOdds(fixtureId) {
  const ck = `odds_${fixtureId}`;
  const hit = getCache(ck);
  if (hit) return hit;
  try {
    const res = await axios.get(`${AF_BASE}/odds`, {
      params: { fixture: fixtureId, bookmaker: 8 }, headers: AF_HDR(), timeout: 12000,
    });
    const data = res.data?.response?.[0] || null;
    if (data) setCache(ck, data, 30*60*1000);
    return data;
  } catch (e) { return null; }
}

async function fetchH2H(team1Id, team2Id) {
  const ck = `h2h_${team1Id}_${team2Id}`;
  const hit = getCache(ck);
  if (hit) return hit;
  try {
    const res = await axios.get(`${AF_BASE}/fixtures/headtohead`, {
      params: { h2h: `${team1Id}-${team2Id}`, last: 10 }, headers: AF_HDR(), timeout: 14000,
    });
    const data = res.data?.response || [];
    if (data.length) setCache(ck, data, 60*60*1000);
    return data;
  } catch (e) { return []; }
}

async function fetchTeamSearch(query) {
  const ck = `team_search_${query.toLowerCase()}`;
  const hit = getCache(ck);
  if (hit) return hit;
  const res = await axios.get(`${AF_BASE}/teams`, {
    params: { search: query }, headers: AF_HDR(), timeout: 12000,
  });
  const data = res.data?.response || [];
  if (data.length) setCache(ck, data, 60*60*1000);
  return data;
}

async function fetchTeamFixtures(teamId, next = 5) {
  const ck = `team_next_${teamId}_${next}`;
  const hit = getCache(ck);
  if (hit) return hit;
  const res = await axios.get(`${AF_BASE}/fixtures`, {
    params: { team: teamId, next, timezone: 'Asia/Jakarta' }, headers: AF_HDR(), timeout: 12000,
  });
  const data = res.data?.response || [];
  if (data.length) setCache(ck, data, 15*60*1000);
  return data;
}

async function fetchTeamLastFixtures(teamId, last = 5) {
  const ck = `team_last_${teamId}_${last}`;
  const hit = getCache(ck);
  if (hit) return hit;
  const res = await axios.get(`${AF_BASE}/fixtures`, {
    params: { team: teamId, last, timezone: 'Asia/Jakarta' }, headers: AF_HDR(), timeout: 12000,
  });
  const data = res.data?.response || [];
  if (data.length) setCache(ck, data, 30*60*1000);
  return data;
}

async function fetchPlayerSearch(query) {
  const ck = `player_search_${query.toLowerCase()}`;
  const hit = getCache(ck);
  if (hit) return hit;
  try {
    const res = await axios.get(`${AF_BASE}/players`, {
      params: { search: query, season: CURRENT_SEASON }, headers: AF_HDR(), timeout: 14000,
    });
    const data = res.data?.response || [];
    if (data.length) setCache(ck, data, 60*60*1000);
    return data;
  } catch (e) { return []; }
}

async function fetchInjuries(leagueId, season) {
  const ck = `injuries_${leagueId}_${season}`;
  const hit = getCache(ck);
  if (hit) return hit;
  try {
    const res = await axios.get(`${AF_BASE}/injuries`, {
      params: { league: leagueId, season }, headers: AF_HDR(), timeout: 12000,
    });
    const data = res.data?.response || [];
    if (data.length) setCache(ck, data, 60*60*1000);
    return data;
  } catch (e) { return []; }
}

async function fetchTeamStats(teamId, leagueId, season) {
  const ck = `teamstats_${teamId}_${leagueId}_${season}`;
  const hit = getCache(ck);
  if (hit) return hit;
  try {
    const res = await axios.get(`${AF_BASE}/teams/statistics`, {
      params: { team: teamId, league: leagueId, season }, headers: AF_HDR(), timeout: 12000,
    });
    const data = res.data?.response || null;
    if (data) setCache(ck, data, 60*60*1000);
    return data;
  } catch (e) { return null; }
}

// Live fixture status (untuk notif)
async function fetchLiveFixture(eid) {
  try {
    const res = await axios.get(`${AF_BASE}/fixtures`, {
      params: { id: eid, timezone: 'Asia/Jakarta' }, headers: AF_HDR(), timeout: 10000,
    });
    return res.data?.response?.[0] || null;
  } catch (e) { return null; }
}

// ─── PREDICTION ENGINE ────────────────────────────────────────────────────────
function parsePct(str) {
  if (!str) return null;
  const n = parseFloat(String(str).replace('%',''));
  return isNaN(n) ? null : Math.round(n);
}

function calcPrediction({ afPred, home, away }) {
  let hp = null, dp = null, ap = null, source = '', h2hStats = null;

  if (afPred?.predictions?.percent) {
    const pct = afPred.predictions.percent;
    hp = parsePct(pct.home); dp = parsePct(pct.draw); ap = parsePct(pct.away);
    if (hp !== null && dp !== null && ap !== null) source = 'API-Football AI';
    else hp = dp = ap = null;
  }
  if (afPred?.h2h?.length) {
    let hW=0, aW=0, dr=0;
    for (const f of afPred.h2h.slice(0,10)) {
      const hG = f.goals?.home ?? f.score?.fulltime?.home ?? null;
      const aG = f.goals?.away ?? f.score?.fulltime?.away ?? null;
      if (hG===null || aG===null) continue;
      const isHome = (f.teams?.home?.name||'').toLowerCase().includes(home.toLowerCase().slice(0,5));
      if (hG>aG) isHome?hW++:aW++;
      else if (aG>hG) isHome?aW++:hW++;
      else dr++;
    }
    const total = hW+aW+dr;
    if (total>0) {
      h2hStats = { total, hW, aW, dr,
        hPct: Math.round(hW/total*100), dPct: Math.round(dr/total*100), aPct: Math.round(aW/total*100) };
      if (hp===null) {
        hp = Math.round(Math.min(80, Math.max(15, (hW+0.5)/(total+0.5)*100)));
        ap = Math.round(Math.min(80, Math.max(15, aW/(total+0.5)*100)));
        dp = Math.max(5, 100-hp-ap);
        source = `H2H (${total} laga)`;
      }
    }
  }
  if (hp===null && afPred?.comparison?.total) {
    const ct = afPred.comparison.total;
    hp = parsePct(ct.home); ap = parsePct(ct.away);
    if (hp!==null && ap!==null) { dp=Math.max(5,100-hp-ap); source='Analisis Form'; }
    else hp=dp=ap=null;
  }
  if (hp===null) { hp=40; dp=25; ap=35; source='Estimasi'; }

  let winner='Draw', conf='';
  if (hp>ap+8 && hp>dp) { winner=home; conf=hp>65?'Dominan':hp>53?'Unggul':'Tipis'; }
  else if (ap>hp+8 && ap>dp) { winner=away; conf=ap>65?'Dominan':ap>53?'Unggul':'Tipis'; }
  else conf=dp>30?'Kuat':'Kemungkinan';

  const expHome = parseFloat(afPred?.predictions?.goals?.home)||null;
  const expAway = parseFloat(afPred?.predictions?.goals?.away)||null;
  let estHome, estAway;
  if (expHome!==null && expAway!==null) { estHome=Math.round(expHome); estAway=Math.round(expAway); }
  else if (winner===home) {
    estHome=hp>=72?3:hp>=63?2:1; estAway=hp>=72||hp>=63?0:1;
    if (h2hStats?.aPct>=30 && estAway===0) estAway=1;
  } else if (winner===away) {
    estHome=ap>=72||ap>=63?0:1; estAway=ap>=72?3:ap>=63?2:1;
    if (h2hStats?.hPct>=30 && estHome===0) estHome=1;
  } else {
    estHome=1; estAway=1;
    if (dp>=36 && (!h2hStats||h2hStats.dr>=h2hStats.total*0.4)) { estHome=0; estAway=0; }
  }

  return {
    hp, dp, ap, winner, conf, estScore:`${estHome}-${estAway}`, source, h2hStats,
    advice:     afPred?.predictions?.advice || null,
    winnerName: afPred?.predictions?.winner?.name || null,
    underOver:  afPred?.predictions?.under_over || null,
    expHome, expAway,
    homeLast5:  afPred?.teams?.home?.last_5 || null,
    awayLast5:  afPred?.teams?.away?.last_5 || null,
  };
}

// ─── SEND / EDIT ──────────────────────────────────────────────────────────────
async function getUserPhoto(ctx) {
  try {
    const r = await ctx.telegram.getUserProfilePhotos(ctx.from?.id, 0, 1);
    if (r.total_count>0) { const sz=r.photos[0]; return sz[sz.length-1].file_id; }
  } catch (_) {}
  return null;
}

async function sendPhoto(ctx, caption, buttons, overridePhotoId=null) {
  const opts = { caption, parse_mode:'MarkdownV2', ...Markup.inlineKeyboard(buttons) };
  let sent;
  try {
    const pid = overridePhotoId || PHOTO_FILE_ID;
    if (pid) sent = await ctx.replyWithPhoto(pid, opts);
    else {
      sent = await ctx.replyWithPhoto({ url: PHOTO_URL }, opts);
      const ph = sent.photo;
      if (ph?.length>0) PHOTO_FILE_ID = ph[ph.length-1].file_id;
    }
  } catch (_) { sent = await ctx.replyWithMarkdownV2(caption, Markup.inlineKeyboard(buttons)).catch(()=>null); }
  return sent;
}

function truncateBlock(text, maxLen=1020) {
  if (text.length<=maxLen) return text;
  const cut = text.lastIndexOf('\n', maxLen-4);
  return (cut>0 ? text.substring(0,cut) : text.substring(0,maxLen-4)) + '\n```';
}

async function editCap(ctx, msgId, caption, buttons) {
  const chatId = ctx.chat.id;
  const kb = buttons?.length>0 ? Markup.inlineKeyboard(buttons) : {};
  const opts = { parse_mode:'MarkdownV2', ...kb };
  try { await ctx.telegram.editMessageText(chatId, msgId, null, caption, opts); return; }
  catch (e) {
    const msg = e.message||'';
    if (!msg.includes('there is no text') && !msg.includes('message is not modified')) console.error('editCap text:', msg);
    if (!msg.includes('there is no text')) return;
  }
  try { await ctx.telegram.editMessageCaption(chatId, msgId, null, truncateBlock(caption,1020), opts); }
  catch (e) { if (!(e.message||'').includes('message is not modified')) console.error('editCap cap:', e.message); }
}

// ─── MENU UTAMA ───────────────────────────────────────────────────────────────
function capMenu() {
  return block([
    '╔══════════════════════════════╗',
    '  ⚽  FootBot v2 — Fitur Lengkap',
    '╚══════════════════════════════╝',
    '',
    '  🇮🇩  BRI Liga 1 & Liga Indonesia',
    '  📅  Jadwal 24 jam seluruh dunia',
    '  🔴  Live score + notifikasi gol',
    '  🏆  Klasemen 20+ liga',
    '  ⚽  Top Skor & Top Assist',
    '  🤖  Prediksi + peluang menang',
    '  📊  Statistik & Match Stats',
    '  ⭐  Rating & Lineup pemain',
    '  ⚡  Events gol, kartu, VAR',
    '  💰  Odds / peluang taruhan',
    '  🔗  H2H head-to-head',
    '  🔍  Cari tim (/cari)',
    '  👤  Cari pemain (/pemain)',
    '  🏟  Cari & profil tim (/tim)',
    '  🔔  Notif gol live (/notif)',
    '',
    `  Update: ${sr(nowWIB())}`,
    `  ${sr(FOOTER)}`,
  ]);
}

async function showMenu(ctx, msgId, userPhotoId=null) {
  const cap  = capMenu();
  const btns = [
    [Markup.button.callback('🇮🇩  Liga Indo','main_indo'),   Markup.button.callback('📅  Jadwal','main_jadwal')],
    [Markup.button.callback('🔴  Live','main_live'),          Markup.button.callback('🏆  Klasemen','main_klasemen')],
    [Markup.button.callback('⚽  Top Skor','main_topskor'),   Markup.button.callback('📊  Top Assist','main_topassist')],
    [Markup.button.callback('🔔  Notif Saya','my_notif'),     Markup.button.callback('❓  Help','cmd_help')],
    [Markup.button.url('👤  Owner','https://t.me/AlkanjutReal')],
  ];
  if (msgId) await editCap(ctx, msgId, cap, btns);
  else await sendPhoto(ctx, cap, btns, userPhotoId);
}

// ─── MENU LIGA INDONESIA ──────────────────────────────────────────────────────
async function showIndoMenu(ctx, msgId) {
  const cap = block([
    '╔══════════════════════════════╗',
    '  🇮🇩  Liga Indonesia',
    '╚══════════════════════════════╝',
    '',
    '  Pilih kompetisi Indonesia:',
    '',
    `  ${sr(FOOTER)}`,
  ]);
  const btns = [
    [Markup.button.callback('🏆 Klasemen BRI Liga 1','kl:253:2025'),
     Markup.button.callback('🏆 Klasemen Liga 2','kl:254:2025')],
    [Markup.button.callback('⚽ Top Skor Liga 1','ts:253:2025'),
     Markup.button.callback('📊 Top Assist Liga 1','ta:253:2025')],
    [Markup.button.callback('📅 Jadwal Liga 1','indo_jadwal:253:2025'),
     Markup.button.callback('📅 Jadwal Liga 2','indo_jadwal:254:2025')],
    [Markup.button.callback('🏠  Menu','back_main')],
  ];
  await editCap(ctx, msgId, cap, btns);
}

// ─── JADWAL ───────────────────────────────────────────────────────────────────
async function showSchedule24h(ctx, msgId, page) {
  let data;
  try { data = await fetchSchedule24h(); }
  catch (err) {
    return editCap(ctx, msgId, block(['  Gagal ambil jadwal.', `  ${sr(err.message.substring(0,60))}`]),
      [[Markup.button.callback('🔄  Retry','main_jadwal')],[Markup.button.callback('🏠  Menu','back_main')]]);
  }
  if (data.total===0) {
    return editCap(ctx, msgId, block([
      '╔══════════════════════════════╗','  📅 Jadwal','╚══════════════════════════════╝',
      '  Tidak ada pertandingan 24 jam ke depan.',
    ]), [[Markup.button.callback('📅  Hari Ini','nav:0'),Markup.button.callback('📅  Besok','nav:1')],
         [Markup.button.callback('🏠  Menu','back_main')]]);
  }
  const { sortedLeagues } = data;
  const perPage=8, totalPages=Math.ceil(sortedLeagues.length/perPage)||1;
  const pg=Math.max(0, Math.min(page, totalPages-1));
  const liveTotal=sortedLeagues.reduce((s,[,l])=>s+l.events.filter(e=>isLive(e.eps)).length,0);
  const indoCount=sortedLeagues.filter(([,l])=>l.country==='Indonesia').reduce((s,[,l])=>s+l.events.length,0);
  const cap = block([
    '╔══════════════════════════════╗','  📅 Jadwal 24 Jam ke Depan','╚══════════════════════════════╝',
    `  Total: ${data.total} match  |  ${sortedLeagues.length} liga`,
    liveTotal>0 ? `  🔴 Live: ${liveTotal} berlangsung` : null,
    indoCount>0 ? `  🇮🇩 Indonesia: ${indoCount} laga` : null,
    `  Hal: ${pg+1}/${totalPages}`,
    '', '  Pilih liga:',`  ${sr(FOOTER)}`,
  ].filter(Boolean));
  const slice = sortedLeagues.slice(pg*perPage,(pg+1)*perPage);
  const buttons = slice.map(([key,l]) => {
    const lN=l.events.filter(e=>isLive(e.eps)).length;
    const indoFlag = l.country==='Indonesia' ? '🇮🇩 ' : '';
    return [Markup.button.callback(
      `${indoFlag}🏆 ${l.country?l.country+' — ':''}${l.league} (${l.events.length}${lN>0?` 🔴${lN}`:''})`,
      `lg:${encodeURIComponent(key)}:24h:0`
    )];
  });
  const pgNav=[];
  if (pg>0) pgNav.push(Markup.button.callback('⬅  Prev',`j24:${pg-1}`));
  if (pg<totalPages-1) pgNav.push(Markup.button.callback('Next  ➡',`j24:${pg+1}`));
  if (pgNav.length) buttons.push(pgNav);
  buttons.push([Markup.button.callback('📅  Hari Ini','nav:0'), Markup.button.callback('📅  Besok','nav:1'), Markup.button.callback('📅  +2 hari','nav:2')]);
  buttons.push([Markup.button.callback('🇮🇩  Liga Indo','main_indo'), Markup.button.callback('🏠  Menu','back_main')]);
  await editCap(ctx, msgId, cap, buttons);
}

async function showSchedule(ctx, msgId, ds, page) {
  let data;
  try { data = await fetchScheduleLS(ds); }
  catch (err) {
    return editCap(ctx, msgId, block(['  Gagal ambil jadwal.', `  ${sr(err.message.substring(0,60))}`]),
      [[Markup.button.callback('🔄  Retry','nav:0')],[Markup.button.callback('🏠  Menu','back_main')]]);
  }
  if (data.total===0) {
    const off=offsetFromToday(ds);
    return editCap(ctx, msgId, block([
      '╔══════════════════════════════╗','  📅 Jadwal','╚══════════════════════════════╝',
      `  ${sr(dayLabel(ds))}`,'  Tidak ada pertandingan.','  Geser ke hari lain:',
    ]), [[Markup.button.callback('◀  Kemarin',`nav:${off-1}`),Markup.button.callback('Besok  ▶',`nav:${off+1}`)],
         [Markup.button.callback('🏠  Menu','back_main')]]);
  }
  const { sortedLeagues } = data;
  const perPage=8, totalPages=Math.ceil(sortedLeagues.length/perPage)||1;
  const pg=Math.max(0, Math.min(page, totalPages-1));
  const liveTotal=sortedLeagues.reduce((s,[,l])=>s+l.events.filter(e=>isLive(e.eps)).length,0);
  const cap = block([
    '╔══════════════════════════════╗','  📅 Jadwal Bola','╚══════════════════════════════╝',
    `  ${sr(dayLabel(ds))}  |  ${data.total} pertandingan`,
    liveTotal>0 ? `  🔴 ${liveTotal} berlangsung` : null,
    `  Hal: ${pg+1}/${totalPages}`,
    '', '  Pilih liga:',`  ${sr(FOOTER)}`,
  ].filter(Boolean));
  const off=offsetFromToday(ds);
  const buttons = sortedLeagues.slice(pg*perPage,(pg+1)*perPage).map(([key,l]) => {
    const lN=l.events.filter(e=>isLive(e.eps)).length;
    const indoFlag = l.country==='Indonesia' ? '🇮🇩 ' : '';
    return [Markup.button.callback(
      `${indoFlag}🏆 ${l.country?l.country+' — ':''}${l.league} (${l.events.length}${lN>0?` 🔴${lN}`:''})`,
      `lg:${encodeURIComponent(key)}:${ds}:0`
    )];
  });
  buttons.push([
    Markup.button.callback('◀  Kemarin',`nav:${off-1}`),
    Markup.button.callback('24 Jam ↺',`j24:0`),
    Markup.button.callback('Besok  ▶',`nav:${off+1}`),
  ]);
  if (totalPages>1) {
    const nav=[];
    if (pg>0) nav.push(Markup.button.callback('⬅  Prev',`lp:${ds}:${pg-1}`));
    if (pg<totalPages-1) nav.push(Markup.button.callback('Next  ➡',`lp:${ds}:${pg+1}`));
    if (nav.length) buttons.push(nav);
  }
  buttons.push([Markup.button.callback('🏠  Menu','back_main')]);
  await editCap(ctx, msgId, cap, buttons);
}

async function showLeagueMatches(ctx, msgId, key, ds, page) {
  const cacheKey = ds==='24h' ? 'ls_sched_24h' : `ls_sched_${ds}`;
  let data = getCache(cacheKey);
  if (!data) {
    // Try to reload
    try {
      if (ds==='24h') data = await fetchSchedule24h();
      else data = await fetchScheduleLS(ds);
    } catch(_) {}
  }
  if (!data) return editCap(ctx, msgId, block(['  Data expired. Ketik /jadwal']),
    [[Markup.button.callback('🏠  Menu','back_main')]]);
  const l = data.leagueMap[key];
  if (!l) return editCap(ctx, msgId, block(['  Liga tidak ditemukan.']),
    [[Markup.button.callback('🔙  Liga',`lp:${ds}:0`)]]);
  const perPage=10, totalP=Math.ceil(l.events.length/perPage);
  const pg=Math.max(0, Math.min(page, totalP-1));
  const slice=l.events.slice(pg*perPage,(pg+1)*perPage);
  const liveN=l.events.filter(e=>isLive(e.eps)).length;
  const encKey=encodeURIComponent(key);
  const cap = block([
    '╔══════════════════════════════╗',`  🏆 ${sr(l.league)}`,'╚══════════════════════════════╝',
    `  ${sr(l.country)}  |  ${l.events.length} pertandingan`,
    liveN>0 ? `  🔴 ${liveN} sedang berlangsung` : null,
    totalP>1 ? `  Hal. ${pg+1}/${totalP}` : null,
    '', '  Pilih pertandingan:',`  ${sr(FOOTER)}`,
  ].filter(Boolean));
  const startN=pg*perPage+1;
  const buttons = slice.map((ev,i) => {
    const n=startN+i;
    const hl=ev.home.substring(0,11), al=ev.away.substring(0,11);
    const isTomorrow=ds==='24h' && ev.esd && isoToDateStr(ev.esd)===getDateStr(1);
    const timeLabel=isTomorrow?`Bsk ${ev.time}`:ev.time;
    let label;
    if (isLive(ev.eps))
      label=`${n}. ${epsToLabel(ev.eps)}${ev.minute?' '+ev.minute:''} ${hl} ${ev.homeScore??'-'}-${ev.awayScore??'-'} ${al}`;
    else if (isFinished(ev.eps))
      label=`${n}. ✅ ${hl} ${ev.homeScore??'-'}-${ev.awayScore??'-'} ${al}`;
    else
      label=`${n}. ⏰ ${timeLabel}  ${hl} vs ${al}`;
    return [Markup.button.callback(label, `sm:${ev.id}`)];
  });
  const pgNav=[];
  if (pg>0) pgNav.push(Markup.button.callback('⬅  Prev',`lg:${encKey}:${ds}:${pg-1}`));
  if (pg<totalP-1) pgNav.push(Markup.button.callback('Next  ➡',`lg:${encKey}:${ds}:${pg+1}`));
  if (pgNav.length) buttons.push(pgNav);
  buttons.push([Markup.button.callback('🔙  Liga',`lp:${ds}:0`)]);
  buttons.push([Markup.button.callback('🏠  Menu','back_main')]);
  await editCap(ctx, msgId, cap, buttons);
}

// ─── LIVE SCORE ───────────────────────────────────────────────────────────────
async function showLiveScore(ctx, msgId) {
  await editCap(ctx, msgId, block(['  🔄 Mengambil data live...', '  Mohon tunggu...']), []);
  try {
    const data = await fetchSchedule24h();
    const liveLeagues = data.sortedLeagues.filter(([,l]) => l.events.some(e=>isLive(e.eps)));
    if (!liveLeagues.length) {
      return editCap(ctx, msgId, block([
        '╔══════════════════════════════╗','  🔴 Live Score','╚══════════════════════════════╝',
        '','  Tidak ada pertandingan live.',
        '  Cek jadwal untuk waktu kickoff.',
        '','  Untuk notif otomatis,',
        '  pilih match lalu tap 🔔 Notif.',
        `  Update: ${sr(nowWIB())}`,`  ${sr(FOOTER)}`,
      ]), [[Markup.button.callback('🔄  Refresh','main_live')],
           [Markup.button.callback('📅  Jadwal','main_jadwal'), Markup.button.callback('🏠  Menu','back_main')]]);
    }
    const totalLive=liveLeagues.reduce((s,[,l])=>s+l.events.filter(e=>isLive(e.eps)).length,0);
    const lines=[
      '╔══════════════════════════════╗',
      '  🔴 Live Score',
      '╚══════════════════════════════╝',
      `  🔴 ${totalLive} pertandingan berlangsung`,
      '',
    ];
    // Indonesia dulu
    for (const [,l] of liveLeagues) {
      if (l.country !== 'Indonesia') continue;
      const liveEvs=l.events.filter(e=>isLive(e.eps));
      if (!liveEvs.length) continue;
      lines.push(`  🇮🇩 ${sr(l.league)}`);
      for (const ev of liveEvs) {
        const min=ev.minute ? ` ${ev.minute}` : '';
        const hS=ev.homeScore??'-', aS=ev.awayScore??'-';
        const hl=ev.home.substring(0,10), al=ev.away.substring(0,10);
        lines.push(`  🔴${min} ${sr(hl)} ${hS}-${aS} ${sr(al)}`);
      }
      lines.push('');
    }
    let shown=0;
    for (const [,l] of liveLeagues) {
      if (l.country === 'Indonesia') continue;
      const liveEvs=l.events.filter(e=>isLive(e.eps));
      if (!liveEvs.length) continue;
      lines.push(`  🏆 ${sr(l.league)}`);
      for (const ev of liveEvs) {
        const min=ev.minute ? ` ${ev.minute}` : '';
        const hS=ev.homeScore??'-', aS=ev.awayScore??'-';
        const hl=ev.home.substring(0,9), al=ev.away.substring(0,9);
        lines.push(`  🔴${min} ${sr(hl)} ${hS}-${aS} ${sr(al)}`);
        shown++;
        if (shown>=15) break;
      }
      lines.push('');
      if (shown>=15) break;
    }
    lines.push(`  Update: ${sr(nowWIB())}`);
    lines.push(`  ${sr(FOOTER)}`);
    await editCap(ctx, msgId, block(lines), [
      [Markup.button.callback('🔄  Refresh','main_live')],
      [Markup.button.callback('📅  Jadwal','main_jadwal'), Markup.button.callback('🏠  Menu','back_main')],
    ]);
  } catch (err) {
    console.error('Live:', err.message);
    await editCap(ctx, msgId, block(['  Gagal ambil live score.', `  ${sr(err.message.substring(0,60))}`]),
      [[Markup.button.callback('🔄  Retry','main_live')],[Markup.button.callback('🏠  Menu','back_main')]]);
  }
}

// ─── KLASEMEN ─────────────────────────────────────────────────────────────────
async function showKlasemenPick(ctx, msgId) {
  const cap = block([
    '╔══════════════════════════════╗','  🏆 Klasemen Liga','╚══════════════════════════════╝',
    '','  🇮🇩 Liga Indonesia diutamakan',
    '  Pilih liga:','', `  ${sr(FOOTER)}`,
  ]);
  const rows=[];
  // Indonesia dulu di baris terpisah
  rows.push([
    Markup.button.callback('🇮🇩 BRI Liga 1','kl:253:2025'),
    Markup.button.callback('🇮🇩 Liga 2 Indo','kl:254:2025'),
  ]);
  const otherLeagues = POPULAR_LEAGUES.filter(l => l.country !== 'Indonesia');
  for (let i=0; i<otherLeagues.length; i+=2) {
    const a=otherLeagues[i], b=otherLeagues[i+1];
    if (b) rows.push([
      Markup.button.callback(`${a.flag} ${a.name}`,`kl:${a.id}:${a.season}`),
      Markup.button.callback(`${b.flag} ${b.name}`,`kl:${b.id}:${b.season}`),
    ]);
    else rows.push([Markup.button.callback(`${a.flag} ${a.name}`,`kl:${a.id}:${a.season}`)]);
  }
  rows.push([Markup.button.callback('🏠  Menu','back_main')]);
  await editCap(ctx, msgId, cap, rows);
}

async function showKlasemen(ctx, msgId, leagueId, season, page=0) {
  await editCap(ctx, msgId, block(['  🔄 Memuat klasemen...', '  Mohon tunggu...']), []);
  const lg = POPULAR_LEAGUES.find(x => x.id===leagueId) || { name:'Liga', flag:'', country:'', season };
  try {
    let data = null, usedSeason = season;
    // Coba season saat ini, lalu fallback ke season sebelumnya
    const seasonsToTry = [season, String(parseInt(season)-1), String(parseInt(season)+1)];
    for (const fb of seasonsToTry) {
      data = await fetchStandings(leagueId, fb);
      if (data) { usedSeason = fb; break; }
    }
    if (!data) throw new Error('Data klasemen tidak tersedia');

    const apiLeagueName    = data.league?.name    || lg.name;
    const apiLeagueCountry = data.league?.country || '';
    const expectedCountry  = lg.country || '';

    // Validasi: jika liga Indonesia tapi data bukan Indonesia, tolak
    if (expectedCountry === 'Indonesia' && apiLeagueCountry &&
        !apiLeagueCountry.toLowerCase().includes('indonesia')) {
      throw new Error(`Data tidak sesuai: terima ${apiLeagueCountry}, harap Indonesia`);
    }

    const groups = data.league?.standings || [];
    let rows = [];
    for (const g of groups) { if (Array.isArray(g) && g.length) { rows=g; break; } }
    if (!rows.length) throw new Error('Data klasemen kosong');

    // Validasi tim Indonesia jika Liga 1/2
    if (expectedCountry === 'Indonesia') {
      // Pastikan tidak ada tim asing (simple check: nationalitiy bukan Indonesia)
      // Tidak ada field nationality di standings, jadi kita trust data API jika country match
    }

    const perPage=15;
    const totalPages=Math.ceil(rows.length/perPage)||1;
    const pg=Math.max(0, Math.min(page, totalPages-1));
    const slice=rows.slice(pg*perPage,(pg+1)*perPage);

    // Zona warna
    const getZone = (rank, total) => {
      if (leagueId === '253') { // BRI Liga 1
        if (rank <= 2) return 'UECL'; // UCL slot (misal 2 besar)
        if (rank > total - 3) return 'REL'; // degradasi 3 terbawah
      }
      return '';
    };

    const lines=[
      '╔══════════════════════════════╗',
      `  🏆 ${sr(apiLeagueName)}`,
      `  ${sr(apiLeagueCountry || expectedCountry)}  Musim ${usedSeason}`,
      '╚══════════════════════════════╝',
      totalPages>1 ? `  Hal. ${pg+1}/${totalPages}` : null,
      '',
      '  #   Tim              M   M  S  K   GD  Pts  Form',
      '  ─────────────────────────────────────────────────',
    ].filter(Boolean);

    for (const r of slice) {
      const rank  = String(r.rank||'').padStart(2);
      const team  = sr((r.team?.name||'').substring(0,14)).padEnd(15);
      const pl    = String(r.all?.played??0).padStart(2);
      const win   = String(r.all?.win??0).padStart(3);
      const dr    = String(r.all?.draw??0).padStart(2);
      const ls    = String(r.all?.lose??0).padStart(2);
      const gd    = r.goalsDiff != null ? (r.goalsDiff>=0?'+':'')+r.goalsDiff : ' 0';
      const pts   = String(r.points??0).padStart(4);
      const form  = r.form ? fmtForm(r.form) : '     ';
      const zone  = getZone(r.rank, rows.length);
      const zIcon = zone==='UECL'?'🔵':zone==='REL'?'🔴':'  ';
      lines.push(`  ${rank} ${team}${pl}  ${win} ${dr} ${ls} ${sr(String(gd).padStart(4))} ${pts}  ${form} ${zIcon}`);
    }
    lines.push('');
    if (expectedCountry === 'Indonesia') {
      lines.push('  🔵 Zona Eropa  🔴 Zona Degradasi');
      lines.push('');
    }
    lines.push(`  Update: ${sr(nowWIB())}`, `  ${sr(FOOTER)}`);

    const pgNav=[];
    if (pg>0) pgNav.push(Markup.button.callback('⬅  Prev',`kl:${leagueId}:${season}:${pg-1}`));
    if (pg<totalPages-1) pgNav.push(Markup.button.callback('Next  ➡',`kl:${leagueId}:${season}:${pg+1}`));
    const buttons=[];
    if (pgNav.length) buttons.push(pgNav);
    buttons.push([
      Markup.button.callback('⚽ Top Skor',`ts:${leagueId}:${usedSeason}`),
      Markup.button.callback('📊 Top Assist',`ta:${leagueId}:${usedSeason}`),
    ]);
    buttons.push([Markup.button.callback('🔄  Refresh',`kl:${leagueId}:${season}:${pg}`)]);
    buttons.push([Markup.button.callback('🔙  Liga Lain','main_klasemen'), Markup.button.callback('🏠  Menu','back_main')]);
    await editCap(ctx, msgId, block(lines), buttons);
  } catch (err) {
    console.error('Klasemen:', leagueId, err.message);
    await editCap(ctx, msgId, block([
      `  🏆 ${sr(lg.flag)} ${sr(lg.name)}`,'',
      '  Data klasemen tidak tersedia.',
      `  ${sr(err.message.substring(0,60))}`,
      '  Coba liga lain atau cek kembali nanti.',
      '',`  ${sr(FOOTER)}`,
    ]), [[Markup.button.callback('🔙  Liga Lain','main_klasemen')],[Markup.button.callback('🏠  Menu','back_main')]]);
  }
}

// ─── TOP SKOR ─────────────────────────────────────────────────────────────────
async function showTopSkorPick(ctx, msgId) {
  const cap = block([
    '╔══════════════════════════════╗','  ⚽ Top Skor & Assist','╚══════════════════════════════╝',
    '','  Pilih liga:','', `  ${sr(FOOTER)}`,
  ]);
  const rows=[];
  rows.push([
    Markup.button.callback('🇮🇩 BRI Liga 1','ts:253:2025'),
    Markup.button.callback('🇮🇩 Liga 2 Indo','ts:254:2025'),
  ]);
  const others = POPULAR_LEAGUES.filter(l=>l.country!=='Indonesia');
  for (let i=0; i<others.length; i+=2) {
    const a=others[i], b=others[i+1];
    if (b) rows.push([
      Markup.button.callback(`${a.flag} ${a.name}`,`ts:${a.id}:${a.season}`),
      Markup.button.callback(`${b.flag} ${b.name}`,`ts:${b.id}:${b.season}`),
    ]);
    else rows.push([Markup.button.callback(`${a.flag} ${a.name}`,`ts:${a.id}:${a.season}`)]);
  }
  rows.push([Markup.button.callback('🏠  Menu','back_main')]);
  await editCap(ctx, msgId, cap, rows);
}

async function showTopScorers(ctx, msgId, leagueId, season) {
  await editCap(ctx, msgId, block(['  🔄 Memuat top skor...', '  Mohon tunggu...']), []);
  const lg = POPULAR_LEAGUES.find(x=>x.id===leagueId) || { name:'Liga', flag:'', season };
  try {
    let data = await fetchTopScorers(leagueId, season);
    if (!data.length) {
      const fb=String(parseInt(season)-1);
      data = await fetchTopScorers(leagueId, fb);
    }
    if (!data.length) throw new Error('Data tidak tersedia');
    const top=data.slice(0,20);
    const lines=[
      '╔══════════════════════════════╗',
      `  ⚽ Top Skor ${sr(lg.flag)} ${sr(lg.name)}`,
      `  Musim ${season}`,
      '╚══════════════════════════════╝',
      '',
      '  #  Pemain           Tim        Gol  Ast  Pnl',
      '  ─────────────────────────────────────────────',
    ];
    top.forEach((entry,i) => {
      const rank   = String(i+1).padStart(2);
      const player = sr((entry.player?.name||'?').substring(0,14)).padEnd(15);
      const team   = sr((entry.statistics?.[0]?.team?.name||'?').substring(0,9)).padEnd(10);
      const goals  = String(entry.statistics?.[0]?.goals?.total||0).padStart(4);
      const assists= String(entry.statistics?.[0]?.goals?.assists||0).padStart(4);
      const penalty= String(entry.statistics?.[0]?.penalty?.scored||0).padStart(4);
      lines.push(`  ${rank} ${player} ${team}${goals} ${assists} ${penalty}`);
    });
    lines.push('', `  Update: ${sr(nowWIB())}`, `  ${sr(FOOTER)}`);
    await editCap(ctx, msgId, block(lines), [
      [Markup.button.callback('📊  Top Assist',`ta:${leagueId}:${season}`)],
      [Markup.button.callback('🔙  Liga Lain','main_topskor'), Markup.button.callback('🏠  Menu','back_main')],
    ]);
  } catch (err) {
    console.error('TopScorers:', err.message);
    await editCap(ctx, msgId, block([
      `  ⚽ ${sr(lg.flag)} ${sr(lg.name)}`,'  Data tidak tersedia.',
      `  ${sr(err.message.substring(0,60))}`,'',`  ${sr(FOOTER)}`,
    ]), [[Markup.button.callback('🔙  Liga Lain','main_topskor')],[Markup.button.callback('🏠  Menu','back_main')]]);
  }
}

// ─── TOP ASSIST ───────────────────────────────────────────────────────────────
async function showTopAssistPick(ctx, msgId) {
  const cap = block([
    '╔══════════════════════════════╗','  📊 Top Assist','╚══════════════════════════════╝',
    '','  Pilih liga:','', `  ${sr(FOOTER)}`,
  ]);
  const rows=[];
  rows.push([
    Markup.button.callback('🇮🇩 BRI Liga 1','ta:253:2025'),
    Markup.button.callback('🇮🇩 Liga 2 Indo','ta:254:2025'),
  ]);
  const others = POPULAR_LEAGUES.filter(l=>l.country!=='Indonesia');
  for (let i=0; i<others.length; i+=2) {
    const a=others[i], b=others[i+1];
    if (b) rows.push([
      Markup.button.callback(`${a.flag} ${a.name}`,`ta:${a.id}:${a.season}`),
      Markup.button.callback(`${b.flag} ${b.name}`,`ta:${b.id}:${b.season}`),
    ]);
    else rows.push([Markup.button.callback(`${a.flag} ${a.name}`,`ta:${a.id}:${a.season}`)]);
  }
  rows.push([Markup.button.callback('🏠  Menu','back_main')]);
  await editCap(ctx, msgId, cap, rows);
}

async function showTopAssists(ctx, msgId, leagueId, season) {
  await editCap(ctx, msgId, block(['  🔄 Memuat top assist...', '  Mohon tunggu...']), []);
  const lg = POPULAR_LEAGUES.find(x=>x.id===leagueId) || { name:'Liga', flag:'', season };
  try {
    let data = await fetchTopAssists(leagueId, season);
    if (!data.length) {
      const fb=String(parseInt(season)-1);
      data = await fetchTopAssists(leagueId, fb);
    }
    if (!data.length) throw new Error('Data tidak tersedia');
    const top=data.slice(0,20);
    const lines=[
      '╔══════════════════════════════╗',
      `  📊 Top Assist ${sr(lg.flag)} ${sr(lg.name)}`,
      `  Musim ${season}`,
      '╚══════════════════════════════╝',
      '',
      '  #  Pemain           Tim        Ast  Gol  Drb',
      '  ─────────────────────────────────────────────',
    ];
    top.forEach((entry,i) => {
      const rank   = String(i+1).padStart(2);
      const player = sr((entry.player?.name||'?').substring(0,14)).padEnd(15);
      const team   = sr((entry.statistics?.[0]?.team?.name||'?').substring(0,9)).padEnd(10);
      const assists= String(entry.statistics?.[0]?.goals?.assists||0).padStart(4);
      const goals  = String(entry.statistics?.[0]?.goals?.total||0).padStart(4);
      const drb    = String(entry.statistics?.[0]?.dribbles?.success||0).padStart(4);
      lines.push(`  ${rank} ${player} ${team}${assists} ${goals} ${drb}`);
    });
    lines.push('', `  Update: ${sr(nowWIB())}`, `  ${sr(FOOTER)}`);
    await editCap(ctx, msgId, block(lines), [
      [Markup.button.callback('⚽  Top Skor',`ts:${leagueId}:${season}`)],
      [Markup.button.callback('🔙  Liga Lain','main_topassist'), Markup.button.callback('🏠  Menu','back_main')],
    ]);
  } catch (err) {
    console.error('TopAssists:', err.message);
    await editCap(ctx, msgId, block([
      `  📊 ${sr(lg.flag)} ${sr(lg.name)}`,'  Data tidak tersedia.',
      `  ${sr(err.message.substring(0,60))}`,'',`  ${sr(FOOTER)}`,
    ]), [[Markup.button.callback('🔙  Liga Lain','main_topassist')],[Markup.button.callback('🏠  Menu','back_main')]]);
  }
}

// ─── MATCH MENU ───────────────────────────────────────────────────────────────
async function showMatchMenu(ctx, msgId, id) {
  const match = getMatch(id);
  if (!match) return editCap(ctx, msgId, block(['  Session habis. Ketik /jadwal']),
    [[Markup.button.callback('🏠  Menu','back_main')]]);
  const { home, away, liga, eps, homeScore, awayScore, minute, country } = match;
  const scoreLine = isLive(eps)
    ? `  🔴${minute?' '+minute:''} ${sr(home)} ${homeScore??'-'}-${awayScore??'-'} ${sr(away)}`
    : isFinished(eps)
    ? `  ✅ FT  ${sr(home)} ${homeScore}-${awayScore} ${sr(away)}`
    : `  ⏰ ${sr(home)} vs ${sr(away)}`;
  const userId = ctx.from?.id;
  const notifOn = userId ? hasNotif(userId, id) : false;
  const isIndo = country === 'Indonesia';

  await editCap(ctx, msgId, block([
    '╔══════════════════════════════╗','  ⚽ Detail Pertandingan','╚══════════════════════════════╝',
    scoreLine,
    liga ? `  🏆 ${sr(liga)}` : null,
    isIndo ? '  🇮🇩 Liga Indonesia' : null,
    '','  Pilih analisis:','',`  ${sr(FOOTER)}`,
  ].filter(Boolean)), [
    [Markup.button.callback('🤖  Prediksi',   `pr:${id}`),  Markup.button.callback('📈  Statistik',`mst:${id}`)],
    [Markup.button.callback('⚡  Events',      `ev:${id}`),  Markup.button.callback('📋  Lineup',   `lu:${id}`)],
    [Markup.button.callback('⭐  Rating Pemain',`rt:${id}`), Markup.button.callback('🏟  Info Match',`mi:${id}`)],
    [Markup.button.callback('💰  Odds',        `od:${id}`),  Markup.button.callback('🔗  H2H',      `h2h:${id}`)],
    [Markup.button.callback(notifOn?'🔔 Notif ON ✅':'🔔 Notif Gol', `notif:${id}`)],
    [Markup.button.callback('🔙  Kembali',    `back_ds:${id}`)],
    [Markup.button.callback('🏠  Menu',       'back_main')],
  ]);
}

// ─── PREDIKSI ─────────────────────────────────────────────────────────────────
async function showPrediksi(ctx, msgId, id) {
  const match = getMatch(id);
  if (!match) return editCap(ctx, msgId, block(['  Session habis. /jadwal']),
    [[Markup.button.callback('🏠  Menu','back_main')]]);
  const { home, away } = match;
  await editCap(ctx, msgId, block(['  🔄 Menganalisis data...', '  Mohon tunggu sebentar...']), []);
  try {
    const afPred = await fetchAFPrediction(id);
    const pred = calcPrediction({ afPred, home, away });
    const { hp, dp, ap, winner, conf, estScore, source, advice, winnerName, underOver, expHome, expAway } = pred;
    const confIcon = conf==='Dominan'?'💪':conf==='Unggul'?'📈':conf==='Tipis'?'⚖️':conf==='Kuat'?'🤝':'🎲';
    const lines=[
      '╔══════════════════════════════╗','  🤖 Analisis & Prediksi','╚══════════════════════════════╝',
      `  🏠 ${sr(home.substring(0,16))}`,
      `  ✈  ${sr(away.substring(0,16))}`,
      '',
      '  ── PREDIKSI ─────────────────',
      `  Pemenang : ${sr(winner==='Draw'?'Seri':winner)} ${confIcon}`,
      `  Conf     : ${conf}`,
      `  Skor Est : ${estScore}`,
      winnerName ? `  AI Pick  : ${sr(winnerName)}` : null,
      advice     ? `  Saran    : ${sr(advice.substring(0,36))}` : null,
      underOver  ? `  O/U      : ${sr(underOver)}` : null,
      (expHome!==null&&expAway!==null) ? `  xG       : H${expHome}  A${expAway}` : null,
      '',
      '  ── PELUANG MENANG ───────────',
      `  H ${sr(home.substring(0,9)).padEnd(10)} ${pctBar(hp)}`,
      `  D ${'Seri'.padEnd(10)} ${pctBar(dp)}`,
      `  A ${sr(away.substring(0,9)).padEnd(10)} ${pctBar(ap)}`,
      '',
      `  Sumber: ${sr(source)}`,
      `  ${sr(FOOTER)}`,
    ].filter(x=>x!==null);
    await editCap(ctx, msgId, block(lines), [
      [Markup.button.callback('📊  H2H Stats',`ps:${id}`), Markup.button.callback('💰  Odds',`od:${id}`)],
      [Markup.button.callback('⬅  Kembali',`sm:${id}`), Markup.button.callback('🏠  Menu','back_main')],
    ]);
  } catch (err) {
    console.error('Prediksi:', err.message);
    await editCap(ctx, msgId, block(['  Gagal memuat prediksi.', `  ${sr(err.message.substring(0,60))}`]),
      [[Markup.button.callback('⬅  Kembali',`sm:${id}`)],[Markup.button.callback('🏠  Menu','back_main')]]);
  }
}

// ─── ODDS ─────────────────────────────────────────────────────────────────────
async function showOdds(ctx, msgId, id) {
  const match = getMatch(id);
  if (!match) return editCap(ctx, msgId, block(['  Session habis. /jadwal']),
    [[Markup.button.callback('🏠  Menu','back_main')]]);
  const { home, away } = match;
  await editCap(ctx, msgId, block(['  🔄 Memuat odds...', '  Mohon tunggu...']), []);
  try {
    const odds = await fetchOdds(id);
    if (!odds) {
      return editCap(ctx, msgId, block([
        '╔══════════════════════════════╗','  💰 Odds Pertandingan','╚══════════════════════════════╝',
        `  ${sr(home)} vs ${sr(away)}`,
        '  Odds belum tersedia.',
        '  (Tersedia menjelang kickoff)',
        '',`  ${sr(FOOTER)}`,
      ]), [[Markup.button.callback('⬅  Kembali',`sm:${id}`)],[Markup.button.callback('🏠  Menu','back_main')]]);
    }
    const bookmaker = odds.bookmakers?.[0];
    const lines=[
      '╔══════════════════════════════╗',
      '  💰 Odds Pertandingan',
      '╚══════════════════════════════╝',
      `  🏠 ${sr(home.substring(0,16))}`,
      `  ✈  ${sr(away.substring(0,16))}`,
      bookmaker ? `  Sumber : ${sr(bookmaker.name)}` : null,
      '',
    ].filter(Boolean);

    for (const bet of (bookmaker?.bets || []).slice(0,5)) {
      lines.push(`  ── ${sr(bet.name)} ──────────────`);
      for (const v of (bet.values||[]).slice(0,4)) {
        const label = sr(String(v.value).padEnd(12));
        const odd   = sr(String(v.odd).padStart(5));
        lines.push(`    ${label}  ${odd}`);
      }
      lines.push('');
    }

    if (!bookmaker?.bets?.length) lines.push('  Belum ada data odds.');
    lines.push(`  ⚠️  Informasi edukasi saja`);
    lines.push(`  ${sr(FOOTER)}`);

    await editCap(ctx, msgId, block(lines), [
      [Markup.button.callback('🤖  Prediksi',`pr:${id}`)],
      [Markup.button.callback('⬅  Kembali',`sm:${id}`), Markup.button.callback('🏠  Menu','back_main')],
    ]);
  } catch (err) {
    console.error('Odds:', err.message);
    await editCap(ctx, msgId, block(['  Gagal memuat odds.', `  ${sr(err.message.substring(0,60))}`]),
      [[Markup.button.callback('⬅  Kembali',`sm:${id}`)],[Markup.button.callback('🏠  Menu','back_main')]]);
  }
}

// ─── H2H ──────────────────────────────────────────────────────────────────────
async function showH2H(ctx, msgId, id) {
  const match = getMatch(id);
  if (!match) return editCap(ctx, msgId, block(['  Session habis. /jadwal']),
    [[Markup.button.callback('🏠  Menu','back_main')]]);
  const { home, away, homeId, awayId } = match;
  await editCap(ctx, msgId, block(['  🔄 Memuat H2H...', '  Mohon tunggu...']), []);
  try {
    if (!homeId || !awayId) {
      return editCap(ctx, msgId, block([
        '╔══════════════════════════════╗','  🔗 Head to Head','╚══════════════════════════════╝',
        `  ${sr(home)} vs ${sr(away)}`,
        '  Data H2H tidak tersedia.',
        '',`  ${sr(FOOTER)}`,
      ]), [[Markup.button.callback('⬅  Kembali',`sm:${id}`)],[Markup.button.callback('🏠  Menu','back_main')]]);
    }
    const h2h = await fetchH2H(homeId, awayId);
    // Juga ambil dari prediksi API jika ada
    const afPred = getCache(`af_pred_${id}`);
    const h2hData = h2h.length ? h2h : (afPred?.h2h || []);

    if (!h2hData.length) {
      return editCap(ctx, msgId, block([
        '╔══════════════════════════════╗','  🔗 Head to Head','╚══════════════════════════════╝',
        `  ${sr(home)} vs ${sr(away)}`,'  Belum ada pertemuan sebelumnya.',
        '',`  ${sr(FOOTER)}`,
      ]), [[Markup.button.callback('⬅  Kembali',`sm:${id}`)],[Markup.button.callback('🏠  Menu','back_main')]]);
    }

    let hW=0, aW=0, dr=0, hG=0, aG=0;
    const recentLines=[];
    for (const f of h2hData.slice(0,10)) {
      const fhG = f.goals?.home ?? f.score?.fulltime?.home ?? null;
      const faG = f.goals?.away ?? f.score?.fulltime?.away ?? null;
      if (fhG===null || faG===null) continue;
      const ht = f.teams?.home?.name || '?';
      const at = f.teams?.away?.name || '?';
      const isHomeTeam = ht.toLowerCase().includes(home.toLowerCase().slice(0,5)) ||
                         (homeId && String(f.teams?.home?.id)===homeId);
      if (fhG>faG) isHomeTeam?hW++:aW++;
      else if (faG>fhG) isHomeTeam?aW++:hW++;
      else dr++;
      if (isHomeTeam) { hG+=fhG; aG+=faG; } else { hG+=faG; aG+=fhG; }
      const dt = f.fixture?.date ? isoToDateStr(f.fixture.date).substring(5) : '';
      const res = fhG>faG?(isHomeTeam?'M':'K'):faG>fhG?(isHomeTeam?'K':'M'):'S';
      const icon = res==='M'?'✅':res==='K'?'❌':'〰️';
      if (recentLines.length<8)
        recentLines.push(`  ${dt?dt+' ':''}${icon} ${sr(ht.substring(0,10))} ${fhG}-${faG} ${sr(at.substring(0,10))}`);
    }
    const total = hW+aW+dr;

    const lines=[
      '╔══════════════════════════════╗','  🔗 Head to Head','╚══════════════════════════════╝',
      `  🏠 ${sr(home.substring(0,15))}`,
      `  ✈  ${sr(away.substring(0,15))}`,
      `  Total: ${total} pertemuan`,
      '',
      '  ── REKOR ────────────────────',
      `  🏠 Menang : ${hW}  (${total?Math.round(hW/total*100):0}%)`,
      `  🤝 Seri   : ${dr}  (${total?Math.round(dr/total*100):0}%)`,
      `  ✈  Menang : ${aW}  (${total?Math.round(aW/total*100):0}%)`,
      '',
      `  ── GOL RATA-RATA ────────────`,
      `  🏠 ${total?Math.round(hG/total*10)/10:0} gol/laga`,
      `  ✈  ${total?Math.round(aG/total*10)/10:0} gol/laga`,
      '',
      '  ── 8 LAGA TERAKHIR ──────────',
      ...recentLines,
      '',
      `  ${sr(FOOTER)}`,
    ];
    await editCap(ctx, msgId, block(lines), [
      [Markup.button.callback('🤖  Prediksi',`pr:${id}`)],
      [Markup.button.callback('⬅  Kembali',`sm:${id}`), Markup.button.callback('🏠  Menu','back_main')],
    ]);
  } catch (err) {
    console.error('H2H:', err.message);
    await editCap(ctx, msgId, block(['  Gagal memuat H2H.', `  ${sr(err.message.substring(0,60))}`]),
      [[Markup.button.callback('⬅  Kembali',`sm:${id}`)],[Markup.button.callback('🏠  Menu','back_main')]]);
  }
}

// ─── PREDIKSI STATS ───────────────────────────────────────────────────────────
async function showPrediksiStats(ctx, msgId, id) {
  const match = getMatch(id);
  if (!match) return editCap(ctx, msgId, block(['  Session habis. /jadwal']),
    [[Markup.button.callback('🏠  Menu','back_main')]]);
  const { home, away } = match;
  const afPred = getCache(`af_pred_${id}`);
  let h2hStats = null;
  if (afPred?.h2h?.length) {
    let hW=0, aW=0, dr=0;
    for (const f of afPred.h2h.slice(0,10)) {
      const hG=f.goals?.home??f.score?.fulltime?.home??null;
      const aG=f.goals?.away??f.score?.fulltime?.away??null;
      if (hG===null||aG===null) continue;
      const isHome=(f.teams?.home?.name||'').toLowerCase().includes(home.toLowerCase().slice(0,5));
      if (hG>aG) isHome?hW++:aW++; else if (aG>hG) isHome?aW++:hW++; else dr++;
    }
    const total=hW+aW+dr;
    if (total>0) h2hStats={total,hW,aW,dr,
      hPct:Math.round(hW/total*100), dPct:Math.round(dr/total*100), aPct:Math.round(aW/total*100)};
  }
  const fmtLast5=(last5,name)=>{
    if (!last5) return [];
    const form=(last5.form||'').split('').slice(-5).map(formEmoji).join('');
    const lines=[`  ── ${sr(name.substring(0,14))} ──────────`];
    if (form) lines.push(`  Form : ${form}`);
    if (last5.played) lines.push(`  M/S/K: ${last5.wins??0}/${last5.draws??0}/${last5.loses??0}  (${last5.played} laga)`);
    if (last5.goals?.for?.total!=null)
      lines.push(`  Gol  : +${last5.goals.for.total} / -${last5.goals.against?.total??0}`);
    if (last5.goals?.for?.average)
      lines.push(`  Rata : ${last5.goals.for.average} gol/match`);
    if (last5.goals?.against?.average)
      lines.push(`  Kebobolan: ${last5.goals.against.average}/match`);
    return lines;
  };
  const h2hLines=[];
  if (afPred?.h2h?.length) {
    h2hLines.push('  ── H2H 5 LAGA TERAKHIR ───────');
    for (const f of afPred.h2h.slice(0,5)) {
      const hG=f.goals?.home??f.score?.fulltime?.home??'-';
      const aG=f.goals?.away??f.score?.fulltime?.away??'-';
      const ht=sr((f.teams?.home?.name||'?').substring(0,10));
      const at=sr((f.teams?.away?.name||'?').substring(0,10));
      const dt=f.fixture?.date ? isoToDateStr(f.fixture.date) : '';
      h2hLines.push(`  ${dt?dt.substring(5)+' ':''}${ht} ${hG}-${aG} ${at}`);
    }
  }
  const secH2H = h2hStats ? [
    '  ── WIN RATE H2H ─────────────',
    `  H ${sr(home.substring(0,9)).padEnd(10)} ${pctBar(h2hStats.hPct,8)}  ${h2hStats.hW}M`,
    `  D ${'Seri'.padEnd(10)} ${pctBar(h2hStats.dPct,8)}  ${h2hStats.dr}D`,
    `  A ${sr(away.substring(0,9)).padEnd(10)} ${pctBar(h2hStats.aPct,8)}  ${h2hStats.aW}M`,
    `  Total: ${h2hStats.total} pertemuan`,
  ] : [];
  const secHome=fmtLast5(afPred?.teams?.home?.last_5, `H ${home}`);
  const secAway=fmtLast5(afPred?.teams?.away?.last_5, `A  ${away}`);
  const secExtra=[
    afPred?.predictions?.goals?.home!=null ? `  xG: H${afPred.predictions.goals.home}  A${afPred.predictions.goals.away}` : null,
    afPred?.predictions?.under_over ? `  O/U: ${sr(afPred.predictions.under_over)}` : null,
    afPred?.comparison?.attacks?.home ? `  Serangan: H${afPred.comparison.attacks.home} A${afPred.comparison.attacks.away}` : null,
  ].filter(Boolean);
  const hasData=secH2H.length||h2hLines.length||secHome.length||secAway.length||secExtra.length;
  const lines=[
    '╔══════════════════════════════╗','  📊 Statistik Lanjut','╚══════════════════════════════╝',
    `  H ${sr(home.substring(0,15))}`,`  A  ${sr(away.substring(0,15))}`,'',
    ...(hasData?[
      ...secH2H,    ...(secH2H.length   ?['']:[] ),
      ...h2hLines,  ...(h2hLines.length ?['']:[] ),
      ...secHome,   ...(secHome.length  ?['']:[] ),
      ...secAway,   ...(secAway.length  ?['']:[] ),
      ...secExtra,  ...(secExtra.length ?['']:[] ),
    ]:['  Data statistik belum tersedia.','  (Tersedia sebelum pertandingan)','']),
    `  ${sr(FOOTER)}`,
  ];
  await editCap(ctx, msgId, block(lines), [
    [Markup.button.callback('⬅  Prediksi',`pr:${id}`), Markup.button.callback('🔗  H2H',`h2h:${id}`)],
    [Markup.button.callback('⬅  Match',`sm:${id}`), Markup.button.callback('🏠  Menu','back_main')],
  ]);
}

// ─── MATCH EVENTS ─────────────────────────────────────────────────────────────
async function showEvents(ctx, msgId, id) {
  const match = getMatch(id);
  if (!match) return editCap(ctx, msgId, block(['  Session habis. /jadwal']),
    [[Markup.button.callback('🏠  Menu','back_main')]]);
  const { home, away } = match;
  await editCap(ctx, msgId, block(['  🔄 Memuat events...', '  Mohon tunggu...']), []);
  try {
    const events = await fetchMatchEvents(id);
    if (!events.length) {
      return editCap(ctx, msgId, block([
        '╔══════════════════════════════╗','  ⚡ Events','╚══════════════════════════════╝',
        `  ${sr(home)} vs ${sr(away)}`,'  Belum ada events tersedia.',
        '  (Live saat pertandingan berlangsung)','',`  ${sr(FOOTER)}`,
      ]), [[Markup.button.callback('🔄  Refresh',`ev:${id}`)],
           [Markup.button.callback('🔙  Kembali',`sm:${id}`)],[Markup.button.callback('🏠  Menu','back_main')]]);
    }
    const goals=[], yellows=[], reds=[], subs=[], vars=[];
    for (const ev of events) {
      const type=ev.type||'', detail=ev.detail||'';
      const min=ev.time?.elapsed ? `${ev.time.elapsed}'${ev.time.extra?'+'+ev.time.extra:''}` : '?';
      const team=ev.team?.name||'', player=ev.player?.name||'?';
      const assist=ev.assist?.name||null;
      if (type==='Goal') {
        const icon=detail==='Own Goal'?'🥅(OG)':detail.toLowerCase().includes('penalty')?'⚽(P)':'⚽';
        goals.push(`  ${min.padEnd(6)} ${icon} ${sr(player.substring(0,15))}${assist?` (+${sr(assist.substring(0,9))})`:''} — ${sr(team.substring(0,9))}`);
      } else if (type==='Card') {
        const icon=detail==='Yellow Card'?'🟡':'🔴';
        const arr=detail==='Yellow Card'?yellows:reds;
        arr.push(`  ${min.padEnd(6)} ${icon} ${sr(player.substring(0,15))} — ${sr(team.substring(0,9))}`);
      } else if (type==='subst') {
        subs.push(`  ${min.padEnd(6)} 🔄 ${sr((ev.assist?.name||'?').substring(0,10))} ↓ ${sr(player.substring(0,10))} — ${sr(team.substring(0,8))}`);
      } else if (type==='Var') {
        vars.push(`  ${min.padEnd(6)} 📺 ${sr(detail)} — ${sr(team.substring(0,9))}`);
      }
    }
    const lines=[
      '╔══════════════════════════════╗','  ⚡ Goals & Events','╚══════════════════════════════╝',
      `  H ${sr(home.substring(0,12))}  vs  ${sr(away.substring(0,12))} A`,
      '',
      ...(goals.length  ?['  ── ⚽ GOL ─────────────────────',...goals,'']:[]),
      ...(reds.length   ?['  ── 🔴 KARTU MERAH ──────────────',...reds,'']:[]),
      ...(yellows.length?['  ── 🟡 KARTU KUNING ─────────────',...yellows.slice(0,8),'']:[]),
      ...(vars.length   ?['  ── 📺 VAR ─────────────────────',...vars,'']:[]),
      ...(subs.length   ?['  ── 🔄 SUBSTITUSI ──────────────',...subs.slice(0,8),'']:[]),
      `  Update: ${sr(nowWIB())}`,`  ${sr(FOOTER)}`,
    ];
    await editCap(ctx, msgId, block(lines), [
      [Markup.button.callback('🔄  Refresh',`ev:${id}`)],
      [Markup.button.callback('🔙  Kembali',`sm:${id}`), Markup.button.callback('🏠  Menu','back_main')],
    ]);
  } catch (err) {
    console.error('Events:', err.message);
    await editCap(ctx, msgId, block(['  Gagal memuat events.', `  ${sr(err.message.substring(0,60))}`]),
      [[Markup.button.callback('🔙  Kembali',`sm:${id}`)],[Markup.button.callback('🏠  Menu','back_main')]]);
  }
}

// ─── MATCH STATISTICS ─────────────────────────────────────────────────────────
async function showMatchStats(ctx, msgId, id) {
  const match = getMatch(id);
  if (!match) return editCap(ctx, msgId, block(['  Session habis. /jadwal']),
    [[Markup.button.callback('🏠  Menu','back_main')]]);
  const { home, away } = match;
  await editCap(ctx, msgId, block(['  🔄 Memuat statistik...', '  Mohon tunggu...']), []);
  try {
    const stats = await fetchMatchStats(id);
    if (!stats.length) {
      return editCap(ctx, msgId, block([
        '╔══════════════════════════════╗','  📈 Statistik Match','╚══════════════════════════════╝',
        `  ${sr(home)} vs ${sr(away)}`,'  Statistik belum tersedia.',
        '  (Tersedia saat/setelah live)','',`  ${sr(FOOTER)}`,
      ]), [[Markup.button.callback('🔙  Kembali',`sm:${id}`)],[Markup.button.callback('🏠  Menu','back_main')]]);
    }
    const hStats=stats[0], aStats=stats[1];
    const getStat=(obj,type)=>obj?.statistics?.find(x=>x.type===type)?.value??null;
    const hPoss=parseInt(getStat(hStats,'Ball Possession'))||null;
    const aPoss=parseInt(getStat(aStats,'Ball Possession'))||null;
    const hName=sr((hStats?.team?.name||home).substring(0,10));
    const aName=sr((aStats?.team?.name||away).substring(0,10));
    const lines=[
      '╔══════════════════════════════╗','  📈 Statistik Match','╚══════════════════════════════╝',
      `  H ${hName}  vs  ${aName} A`,
      `  Stat                H    | A`,
      '  ──────────────────────────────',
      ...(hPoss!==null?[
        '  ── PENGUASAAN BOLA ──────────',
        `  H ${pctBar(hPoss)}`,
        `  A ${pctBar(aPoss)}`,
        '',
      ]:[]),
      '  ── TEMBAKAN ─────────────────',
      statRow('Total Shots',    getStat(hStats,'Total Shots'),    getStat(aStats,'Total Shots')),
      statRow('On Target',      getStat(hStats,'Shots on Goal'),  getStat(aStats,'Shots on Goal')),
      statRow('Off Target',     getStat(hStats,'Shots off Goal'), getStat(aStats,'Shots off Goal')),
      statRow('Blocked',        getStat(hStats,'Blocked Shots'),  getStat(aStats,'Blocked Shots')),
      '',
      '  ── PELUANG ──────────────────',
      statRow('xG',             getStat(hStats,'expected_goals'), getStat(aStats,'expected_goals')),
      statRow('Big Chances',    getStat(hStats,'Big Chances'),    getStat(aStats,'Big Chances')),
      '',
      '  ── LAINNYA ──────────────────',
      statRow('Corner Kick',    getStat(hStats,'Corner Kicks'),   getStat(aStats,'Corner Kicks')),
      statRow('Pelanggaran',    getStat(hStats,'Fouls'),          getStat(aStats,'Fouls')),
      statRow('Offside',        getStat(hStats,'Offsides'),       getStat(aStats,'Offsides')),
      statRow('Kartu Kuning',   getStat(hStats,'Yellow Cards'),   getStat(aStats,'Yellow Cards')),
      statRow('Kartu Merah',    getStat(hStats,'Red Cards'),      getStat(aStats,'Red Cards')),
      statRow('Saves',          getStat(hStats,'Goalkeeper Saves'),getStat(aStats,'Goalkeeper Saves')),
      '',
      '  ── UMPAN ────────────────────',
      statRow('Total Passes',   getStat(hStats,'Total passes'),   getStat(aStats,'Total passes')),
      statRow('Akurasi %',      getStat(hStats,'Passes %'),       getStat(aStats,'Passes %')),
      statRow('Dribble',        getStat(hStats,'Dribbles'),       getStat(aStats,'Dribbles')),
      '',
      `  Update: ${sr(nowWIB())}`,`  ${sr(FOOTER)}`,
    ];
    await editCap(ctx, msgId, block(lines), [
      [Markup.button.callback('🔄  Refresh',`mst:${id}`)],
      [Markup.button.callback('🔙  Kembali',`sm:${id}`), Markup.button.callback('🏠  Menu','back_main')],
    ]);
  } catch (err) {
    console.error('MatchStats:', err.message);
    await editCap(ctx, msgId, block(['  Gagal memuat statistik.', `  ${sr(err.message.substring(0,60))}`]),
      [[Markup.button.callback('🔙  Kembali',`sm:${id}`)],[Markup.button.callback('🏠  Menu','back_main')]]);
  }
}

// ─── LINEUP ───────────────────────────────────────────────────────────────────
async function showLineup(ctx, msgId, id) {
  const match = getMatch(id);
  if (!match) return editCap(ctx, msgId, block(['  Session habis. /jadwal']),
    [[Markup.button.callback('🏠  Menu','back_main')]]);
  const { home, away } = match;
  await editCap(ctx, msgId, block(['  🔄 Memuat lineup...', '  Mohon tunggu...']), []);
  try {
    const lineups = await fetchLineups(id);
    if (!lineups.length) {
      return editCap(ctx, msgId, block([
        '╔══════════════════════════════╗','  📋 Starting Lineup','╚══════════════════════════════╝',
        `  ${sr(home)} vs ${sr(away)}`,'  Lineup belum tersedia.',
        '  (Biasanya 1 jam sebelum kickoff)','',`  ${sr(FOOTER)}`,
      ]), [[Markup.button.callback('🔙  Kembali',`sm:${id}`)],[Markup.button.callback('🏠  Menu','back_main')]]);
    }
    const posOrder={G:0,D:1,M:2,F:3};
    const posLabel={G:'GK',D:'DF',M:'MF',F:'FW'};
    const fmtTeam=(teamData,icon)=>{
      if (!teamData) return [];
      const name=teamData.team?.name||'?';
      const coach=teamData.coach?.name||null;
      const form=teamData.formation||'?';
      const startXI=(teamData.startXI||[]).map(x=>x.player).filter(Boolean);
      startXI.sort((a,b)=>(posOrder[a.pos]??9)-(posOrder[b.pos]??9));
      const grouped={};
      for (const p of startXI) {
        const pos=p.pos||'X';
        if (!grouped[pos]) grouped[pos]=[];
        grouped[pos].push(`${p.number}.${(p.name||'?').split(' ').pop().substring(0,10)}`);
      }
      const subs=(teamData.substitutes||[]).map(x=>x.player).filter(Boolean).slice(0,7);
      const lines=[
        `  ${icon} ${sr(name.substring(0,16))}  [${form}]`,
        coach ? `  Pelatih : ${sr(coach.substring(0,20))}` : null,
      ].filter(Boolean);
      for (const pos of ['G','D','M','F']) {
        if (grouped[pos]?.length) lines.push(`  ${posLabel[pos]||pos}  ${grouped[pos].join('  ')}`);
      }
      if (subs.length) {
        lines.push(`  Sub : ${subs.map(p=>`${p.number}.${(p.name||'?').split(' ').pop().substring(0,8)}`).join('  ')}`);
      }
      return lines;
    };
    const hTeam=lineups.find(t=>t.team?.name===home)||lineups[0];
    const aTeam=lineups.find(t=>t.team?.name===away&&t!==hTeam)||lineups[1];
    const lines=[
      '╔══════════════════════════════╗','  📋 Starting Lineup','╚══════════════════════════════╝',
      '',
      ...fmtTeam(hTeam,'🏠'),
      '','  ─────────────────────────────','',
      ...fmtTeam(aTeam,'✈ '),
      '',`  ${sr(FOOTER)}`,
    ];
    await editCap(ctx, msgId, block(lines), [
      [Markup.button.callback('⭐  Rating',`rt:${id}`), Markup.button.callback('⚡  Events',`ev:${id}`)],
      [Markup.button.callback('🔙  Kembali',`sm:${id}`), Markup.button.callback('🏠  Menu','back_main')],
    ]);
  } catch (err) {
    console.error('Lineup:', err.message);
    await editCap(ctx, msgId, block(['  Gagal memuat lineup.', `  ${sr(err.message.substring(0,60))}`]),
      [[Markup.button.callback('🔙  Kembali',`sm:${id}`)],[Markup.button.callback('🏠  Menu','back_main')]]);
  }
}

// ─── RATING PEMAIN ────────────────────────────────────────────────────────────
async function showPlayerRatings(ctx, msgId, id) {
  const match = getMatch(id);
  if (!match) return editCap(ctx, msgId, block(['  Session habis. /jadwal']),
    [[Markup.button.callback('🏠  Menu','back_main')]]);
  const { home, away } = match;
  await editCap(ctx, msgId, block(['  🔄 Memuat rating pemain...', '  Mohon tunggu...']), []);
  try {
    const data = await fetchPlayerRatings(id);
    if (!data.length) {
      return editCap(ctx, msgId, block([
        '╔══════════════════════════════╗','  ⭐ Rating Pemain','╚══════════════════════════════╝',
        `  ${sr(home)} vs ${sr(away)}`,'  Rating belum tersedia.',
        '  (Tersedia setelah pertandingan)','',`  ${sr(FOOTER)}`,
      ]), [[Markup.button.callback('🔙  Kembali',`sm:${id}`)],[Markup.button.callback('🏠  Menu','back_main')]]);
    }
    const lines=[
      '╔══════════════════════════════╗','  ⭐ Rating Pemain','╚══════════════════════════════╝',
      `  H ${sr(home.substring(0,13))} vs ${sr(away.substring(0,13))} A`,'',
    ];
    for (const teamData of data.slice(0,2)) {
      const tname=teamData.team?.name||'?';
      const players=(teamData.players||[])
        .filter(p=>p.statistics?.[0]?.games?.rating)
        .sort((a,b)=>parseFloat(b.statistics[0].games.rating||0)-parseFloat(a.statistics[0].games.rating||0))
        .slice(0,7);
      lines.push(`  ── ${sr(tname.substring(0,14))} ──────────────`);
      for (const p of players) {
        const rating=parseFloat(p.statistics[0].games.rating||0).toFixed(1);
        const pname=sr((p.player?.name||'?').substring(0,15)).padEnd(16);
        const goals=p.statistics[0].goals?.total||0;
        const assists=p.statistics[0].goals?.assists||0;
        const pos=p.statistics[0].games?.position||'';
        const star=ratingBar(rating);
        lines.push(`  ${star} ${pname} ${rating}  G:${goals} A:${assists} (${pos.substring(0,2)})`);
      }
      lines.push('');
    }
    lines.push(`  Update: ${sr(nowWIB())}`, `  ${sr(FOOTER)}`);
    await editCap(ctx, msgId, block(lines), [
      [Markup.button.callback('🔄  Refresh',`rt:${id}`)],
      [Markup.button.callback('📋  Lineup',`lu:${id}`)],
      [Markup.button.callback('🔙  Kembali',`sm:${id}`), Markup.button.callback('🏠  Menu','back_main')],
    ]);
  } catch (err) {
    console.error('Ratings:', err.message);
    await editCap(ctx, msgId, block(['  Gagal memuat rating.', `  ${sr(err.message.substring(0,60))}`]),
      [[Markup.button.callback('🔙  Kembali',`sm:${id}`)],[Markup.button.callback('🏠  Menu','back_main')]]);
  }
}

// ─── MATCH INFO ───────────────────────────────────────────────────────────────
async function showMatchInfo(ctx, msgId, id) {
  const match = getMatch(id);
  if (!match) return editCap(ctx, msgId, block(['  Session habis. /jadwal']),
    [[Markup.button.callback('🏠  Menu','back_main')]]);
  const { home, away, liga, country, venue, city, referee, esd, eps, homeScore, awayScore, minute } = match;
  const kickoff = esd ? `${isoToDateStr(esd)} ${isoToWIB(esd)} WIB` : '--';
  const statusLine = isLive(eps)
    ? `  Status  : 🔴 LIVE ${minute||''}`
    : eps==='FT' ? `  Status  : ✅ Selesai`
    : eps==='NS' ? `  Status  : ⏳ Belum Mulai`
    : `  Status  : ${epsToLabel(eps)}`;
  const scoreLine = (homeScore!==null && awayScore!==null)
    ? `  Skor    : ${homeScore} - ${awayScore}`
    : null;
  const isIndo = country === 'Indonesia';
  const lines=[
    '╔══════════════════════════════╗','  🏟 Info Pertandingan','╚══════════════════════════════╝',
    '',
    `  H  ${sr(home)}`,
    `  A  ${sr(away)}`,
    '',
    `  Liga    : ${sr(liga||'-')}${isIndo?' 🇮🇩':''}`,
    `  Negara  : ${sr(country||'-')}`,
    statusLine,
    scoreLine,
    '',
    `  Kickoff : ${sr(kickoff)}`,
    venue   ? `  Venue   : ${sr(venue.substring(0,24))}` : null,
    city    ? `  Kota    : ${sr(city.substring(0,20))}` : null,
    referee ? `  Wasit   : ${sr(referee.substring(0,24))}` : null,
    '',
    `  ${sr(FOOTER)}`,
  ].filter(x=>x!==null);
  await editCap(ctx, msgId, block(lines), [
    [Markup.button.callback('🔙  Kembali',`sm:${id}`), Markup.button.callback('🏠  Menu','back_main')],
  ]);
}

// ─── NOTIFIKASI ───────────────────────────────────────────────────────────────
async function showMyNotif(ctx, msgId) {
  const userId = ctx.from?.id;
  const subs = notifSubs.get(userId);
  if (!subs || !subs.size) {
    return editCap(ctx, msgId, block([
      '╔══════════════════════════════╗','  🔔 Notifikasi Saya','╚══════════════════════════════╝',
      '','  Kamu belum subscribe notifikasi.',
      '  Buka match & tap 🔔 Notif Gol',
      '  untuk aktifkan notifikasi gol live.',
      '',`  ${sr(FOOTER)}`,
    ]), [[Markup.button.callback('📅  Jadwal','main_jadwal')],[Markup.button.callback('🏠  Menu','back_main')]]);
  }
  const lines=[
    '╔══════════════════════════════╗','  🔔 Notifikasi Aktif','╚══════════════════════════════╝',
    `  ${subs.size} pertandingan dimonitor`,
    '',
  ];
  for (const eid of subs) {
    const m = getMatch(eid);
    if (m) lines.push(`  ✅ ${sr(m.home.substring(0,10))} vs ${sr(m.away.substring(0,10))}`);
    else   lines.push(`  ⚠️  Match ${eid} (expired)`);
  }
  lines.push('', '  Buka match dan tap 🔔 untuk', '  menonaktifkan notifikasi.');
  lines.push('', `  ${sr(FOOTER)}`);
  const btns = [[Markup.button.callback('🗑  Hapus Semua','clear_notif')],[Markup.button.callback('🏠  Menu','back_main')]];
  await editCap(ctx, msgId, block(lines), btns);
}

async function toggleNotif(ctx, msgId, eid) {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  if (!userId) return;
  if (hasNotif(userId, eid)) {
    removeNotif(userId, eid);
    await ctx.answerCbQuery('🔕 Notifikasi dinonaktifkan').catch(()=>{});
  } else {
    addNotif(userId, chatId, eid);
    const m = getMatch(eid);
    await ctx.answerCbQuery('🔔 Notifikasi aktif! Kamu akan dapat update gol.').catch(()=>{});
    if (m) {
      try {
        await ctx.telegram.sendMessage(chatId, block([
          '╔══════════════════════════════╗','  🔔 Notifikasi Diaktifkan!','╚══════════════════════════════╝',
          `  ${sr(m.home)} vs ${sr(m.away)}`,
          `  Liga: ${sr(m.liga||'-')}`,
          '','  Kamu akan dapat notif saat ada gol,',
          '  kartu merah, dan kickoff/selesai.',
          '',`  ${sr(FOOTER)}`,
        ]), { parse_mode: 'MarkdownV2' });
      } catch(_) {}
    }
  }
  await showMatchMenu(ctx, msgId, eid);
}

// ─── CARI TIM ─────────────────────────────────────────────────────────────────
async function showSearchTeam(ctx, msgId, query) {
  const q = query.trim().toLowerCase();
  if (!q || q.length < 2) {
    return editCap(ctx, msgId, block([
      '╔══════════════════════════════╗','  🔍 Cari Tim','╚══════════════════════════════╝',
      '  Ketik: /cari <nama tim>',
      '  Contoh: /cari persija','  Contoh: /cari arema','',`  ${sr(FOOTER)}`,
    ]), [[Markup.button.callback('🏠  Menu','back_main')]]);
  }
  let data;
  try { data = await fetchSchedule24h(); }
  catch (err) {
    return editCap(ctx, msgId, block(['  Gagal ambil data.', `  ${sr(err.message.substring(0,60))}`]),
      [[Markup.button.callback('🏠  Menu','back_main')]]);
  }
  const found = [];
  for (const [,l] of data.sortedLeagues) {
    for (const ev of l.events) {
      if (ev.home.toLowerCase().includes(q) || ev.away.toLowerCase().includes(q)) {
        found.push({ ev, league: l.league, country: l.country });
        if (found.length >= 10) break;
      }
    }
    if (found.length >= 10) break;
  }
  if (!found.length) {
    return editCap(ctx, msgId, block([
      '╔══════════════════════════════╗','  🔍 Cari Tim','╚══════════════════════════════╝',
      `  Tidak ditemukan: "${sr(query.substring(0,20))}"`,
      '  dalam jadwal 24 jam ke depan.','',
      '  Coba /tim untuk cari profil tim',`  ${sr(FOOTER)}`,
    ]), [[Markup.button.callback('📅  Jadwal','main_jadwal')],[Markup.button.callback('🏠  Menu','back_main')]]);
  }
  const cap = block([
    '╔══════════════════════════════╗','  🔍 Hasil Pencarian','╚══════════════════════════════╝',
    `  "${sr(query.substring(0,20))}" — ${found.length} hasil`,
    '','  Pilih pertandingan:','',`  ${sr(FOOTER)}`,
  ]);
  const buttons = found.map(({ ev, league, country }) => {
    const hl=ev.home.substring(0,11), al=ev.away.substring(0,11);
    const indoFlag = country==='Indonesia' ? '🇮🇩 ' : '';
    const label = isLive(ev.eps)
      ? `${indoFlag}🔴${ev.minute?' '+ev.minute:''} ${hl} ${ev.homeScore??'-'}-${ev.awayScore??'-'} ${al}`
      : `${indoFlag}⏰ ${ev.time} ${hl} vs ${al} (${league.substring(0,10)})`;
    return [Markup.button.callback(label, `sm:${ev.id}`)];
  });
  buttons.push([Markup.button.callback('🏠  Menu','back_main')]);
  await editCap(ctx, msgId, cap, buttons);
}

// ─── CARI PEMAIN ──────────────────────────────────────────────────────────────
async function showSearchPlayer(ctx, msgId, query) {
  const q = query.trim();
  if (!q || q.length < 3) {
    return editCap(ctx, msgId, block([
      '╔══════════════════════════════╗','  👤 Cari Pemain','╚══════════════════════════════╝',
      '  Ketik: /pemain <nama>',
      '  Contoh: /pemain ronaldo',
      '  Contoh: /pemain egy maulana','',`  ${sr(FOOTER)}`,
    ]), [[Markup.button.callback('🏠  Menu','back_main')]]);
  }
  await editCap(ctx, msgId, block(['  🔄 Mencari pemain...', `  "${sr(q)}"`, '  Mohon tunggu...']), []);
  try {
    const data = await fetchPlayerSearch(q);
    if (!data.length) {
      return editCap(ctx, msgId, block([
        '╔══════════════════════════════╗','  👤 Cari Pemain','╚══════════════════════════════╝',
        `  "${sr(q)}" tidak ditemukan.`,
        '  Coba nama lain atau nama lebih lengkap.',
        '',`  ${sr(FOOTER)}`,
      ]), [[Markup.button.callback('🏠  Menu','back_main')]]);
    }
    const top = data.slice(0,8);
    const lines=[
      '╔══════════════════════════════╗',
      '  👤 Info Pemain',
      '╚══════════════════════════════╝',
    ];
    for (const entry of top.slice(0,3)) {
      const p = entry.player;
      const st = entry.statistics?.[0];
      const team = st?.team?.name || '?';
      const league = st?.league?.name || '?';
      const pos = st?.games?.position || p?.position || '?';
      const age = p?.age || '?';
      const nat = p?.nationality || '?';
      lines.push('');
      lines.push(`  ── ${sr((p?.name||'?').substring(0,20))} ────────`);
      lines.push(`  Tim    : ${sr(team.substring(0,20))}`);
      lines.push(`  Liga   : ${sr(league.substring(0,20))}`);
      lines.push(`  Posisi : ${sr(pos)}  Umur: ${age}th`);
      lines.push(`  Negara : ${sr(nat)}`);
      if (st?.games) {
        lines.push(`  Tampil : ${st.games.appearences||0} kali  Menit: ${st.games.minutes||0}'`);
        lines.push(`  Rating : ${parseFloat(st.games.rating||0).toFixed(1)} ${ratingBar(st.games.rating)}`);
      }
      if (st?.goals) {
        const g=st.goals.total||0, a=st.goals.assists||0;
        lines.push(`  Gol    : ${g}  Assist: ${a}  (Penalti: ${st.penalty?.scored||0})`);
      }
      if (st?.cards) {
        lines.push(`  Kartu  : 🟡${st.cards.yellow||0}  🔴${st.cards.red||0}`);
      }
      if (st?.dribbles?.success) {
        lines.push(`  Dribble: ${st.dribbles.success}/${st.dribbles.attempts||0}`);
      }
    }
    if (top.length>3) lines.push(``, `  ...dan ${top.length-3} pemain lain ditemukan`);
    lines.push('', `  Musim ${CURRENT_SEASON}`, `  ${sr(FOOTER)}`);
    await editCap(ctx, msgId, block(lines), [[Markup.button.callback('🏠  Menu','back_main')]]);
  } catch (err) {
    console.error('PlayerSearch:', err.message);
    await editCap(ctx, msgId, block(['  Gagal cari pemain.', `  ${sr(err.message.substring(0,60))}`]),
      [[Markup.button.callback('🏠  Menu','back_main')]]);
  }
}

// ─── CARI TIM / PROFIL TIM ────────────────────────────────────────────────────
async function showSearchTeamProfile(ctx, msgId, query) {
  const q = query.trim();
  if (!q || q.length < 2) {
    return editCap(ctx, msgId, block([
      '╔══════════════════════════════╗','  🏟 Cari Tim','╚══════════════════════════════╝',
      '  Ketik: /tim <nama tim>',
      '  Contoh: /tim persija',
      '  Contoh: /tim manchester','',`  ${sr(FOOTER)}`,
    ]), [[Markup.button.callback('🏠  Menu','back_main')]]);
  }
  await editCap(ctx, msgId, block(['  🔄 Mencari tim...', `  "${sr(q)}"`, '  Mohon tunggu...']), []);
  try {
    const data = await fetchTeamSearch(q);
    if (!data.length) {
      return editCap(ctx, msgId, block([
        '╔══════════════════════════════╗','  🏟 Cari Tim','╚══════════════════════════════╝',
        `  "${sr(q)}" tidak ditemukan.`,
        '  Coba nama lain.',
        '',`  ${sr(FOOTER)}`,
      ]), [[Markup.button.callback('🏠  Menu','back_main')]]);
    }
    const top = data.slice(0,6);
    const cap = block([
      '╔══════════════════════════════╗','  🏟 Pilih Tim','╚══════════════════════════════╝',
      `  Ditemukan ${data.length} tim untuk "${sr(q)}"`,
      '','  Pilih untuk lihat detail:',`  ${sr(FOOTER)}`,
    ]);
    const buttons = top.map(entry => {
      const t = entry.team;
      const isIndo = (entry.team?.country||'').toLowerCase() === 'indonesia';
      return [Markup.button.callback(
        `${isIndo?'🇮🇩 ':''}🏟 ${(t?.name||'?').substring(0,25)} (${t?.country||'?'})`,
        `tp:${t.id}:${CURRENT_SEASON}`
      )];
    });
    buttons.push([Markup.button.callback('🏠  Menu','back_main')]);
    await editCap(ctx, msgId, cap, buttons);
  } catch (err) {
    console.error('TeamSearch:', err.message);
    await editCap(ctx, msgId, block(['  Gagal cari tim.', `  ${sr(err.message.substring(0,60))}`]),
      [[Markup.button.callback('🏠  Menu','back_main')]]);
  }
}

async function showTeamProfile(ctx, msgId, teamId, season) {
  await editCap(ctx, msgId, block(['  🔄 Memuat profil tim...', '  Mohon tunggu...']), []);
  try {
    const [nextFix, lastFix] = await Promise.all([
      fetchTeamFixtures(teamId, 5),
      fetchTeamLastFixtures(teamId, 5),
    ]);

    const t = nextFix?.[0]?.teams?.home?.id === parseInt(teamId)
      ? { name: nextFix[0].teams.home.name }
      : nextFix?.[0]?.teams?.away || lastFix?.[0]?.teams?.home || { name: 'Tim' };

    const lines=[
      '╔══════════════════════════════╗',
      `  🏟 ${sr((t?.name||'Tim').substring(0,20))}`,
      '╚══════════════════════════════╝',
    ];

    if (lastFix.length) {
      lines.push('', '  ── 5 LAGA TERAKHIR ──────────');
      for (const f of lastFix.slice(0,5)) {
        const ht = f.teams?.home?.name||'?';
        const at = f.teams?.away?.name||'?';
        const hG = f.goals?.home??'-', aG = f.goals?.away??'-';
        const isHome = String(f.teams?.home?.id) === String(teamId);
        const myScore = isHome ? hG : aG;
        const oppScore = isHome ? aG : hG;
        const opp = isHome ? at : ht;
        const res = myScore>oppScore?'✅':myScore<oppScore?'❌':'〰️';
        const dt = f.fixture?.date ? isoToDateStr(f.fixture.date).substring(5) : '';
        lines.push(`  ${dt} ${res} ${sr(opp.substring(0,11))} ${myScore}-${oppScore} ${isHome?'(H)':'(A)'}`);
        // Store for later navigation
        if (f.fixture?.id) storeMatch(String(f.fixture.id), {
          home: ht, away: at, liga: f.league?.name||'', country: f.league?.country||'',
          homeScore: f.goals?.home??null, awayScore: f.goals?.away??null,
          eps: f.fixture?.status?.short||'FT', minute: null,
          homeId: String(f.teams?.home?.id||''), awayId: String(f.teams?.away?.id||''),
          venue: f.fixture?.venue?.name||null, city: f.fixture?.venue?.city||null,
          referee: f.fixture?.referee||null, esd: f.fixture?.date||'',
          cid: f.league?.id?String(f.league.id):null, sid: f.league?.season?String(f.league.season):null,
        });
      }
    }

    if (nextFix.length) {
      lines.push('', '  ── JADWAL BERIKUTNYA ─────────');
      for (const f of nextFix.slice(0,5)) {
        const ht = f.teams?.home?.name||'?';
        const at = f.teams?.away?.name||'?';
        const isHome = String(f.teams?.home?.id) === String(teamId);
        const opp = isHome ? at : ht;
        const time = isoToWIB(f.fixture?.date);
        const date = f.fixture?.date ? isoToDateStr(f.fixture.date).substring(5) : '';
        const loc = isHome ? 'H' : 'A';
        lines.push(`  ${date} ⏰ ${time} vs ${sr(opp.substring(0,11))} (${loc})`);
        if (f.fixture?.id) storeMatch(String(f.fixture.id), {
          home: ht, away: at, liga: f.league?.name||'', country: f.league?.country||'',
          homeScore: null, awayScore: null, eps: 'NS', minute: null,
          homeId: String(f.teams?.home?.id||''), awayId: String(f.teams?.away?.id||''),
          venue: f.fixture?.venue?.name||null, city: f.fixture?.venue?.city||null,
          referee: null, esd: f.fixture?.date||'',
          cid: f.league?.id?String(f.league.id):null, sid: f.league?.season?String(f.league.season):null,
        });
      }
    }

    if (!nextFix.length && !lastFix.length) lines.push('', '  Tidak ada data laga ditemukan.');

    lines.push('', `  ${sr(FOOTER)}`);

    const buttons = [];
    // Jadwal berikutnya bisa diklik
    if (nextFix.length) {
      buttons.push(...nextFix.slice(0,3).map(f => {
        const ht=f.teams?.home?.name||'?', at=f.teams?.away?.name||'?';
        const time=isoToWIB(f.fixture?.date);
        return [Markup.button.callback(`⏰ ${time} ${ht.substring(0,9)} vs ${at.substring(0,9)}`, `sm:${f.fixture.id}`)];
      }));
    }
    buttons.push([Markup.button.callback('🏠  Menu','back_main')]);
    await editCap(ctx, msgId, block(lines), buttons);
  } catch (err) {
    console.error('TeamProfile:', err.message);
    await editCap(ctx, msgId, block(['  Gagal memuat profil tim.', `  ${sr(err.message.substring(0,60))}`]),
      [[Markup.button.callback('🏠  Menu','back_main')]]);
  }
}

// ─── JADWAL LIGA INDONESIA ────────────────────────────────────────────────────
async function showIndoLeagueSchedule(ctx, msgId, leagueId, season) {
  await editCap(ctx, msgId, block(['  🔄 Memuat jadwal...', '  Mohon tunggu...']), []);
  const lg = POPULAR_LEAGUES.find(x=>x.id===leagueId) || { name:'Liga', flag:'🇮🇩', season };
  try {
    // Cari fixture league khusus
    const today = getDateStr(0);
    const res = await axios.get(`${AF_BASE}/fixtures`, {
      params: { league: leagueId, season, next: 10, timezone: 'Asia/Jakarta' },
      headers: AF_HDR(), timeout: 15000,
    });
    const fixtures = res.data?.response || [];
    if (!fixtures.length) {
      return editCap(ctx, msgId, block([
        '╔══════════════════════════════╗',
        `  🇮🇩 ${sr(lg.name)}`,
        '╚══════════════════════════════╝',
        '  Tidak ada jadwal tersedia.',
        `  Musim ${season}`,
        '',`  ${sr(FOOTER)}`,
      ]), [[Markup.button.callback('🏠  Menu','back_main')]]);
    }
    const lines=[
      '╔══════════════════════════════╗',
      `  🇮🇩 ${sr(lg.name)} — Jadwal`,
      `  Musim ${season}`,
      '╚══════════════════════════════╝',
      '',
    ];
    for (const f of fixtures.slice(0,10)) {
      const ht = f.teams?.home?.name||'?';
      const at = f.teams?.away?.name||'?';
      const dt = f.fixture?.date ? isoToDateStr(f.fixture.date) : '';
      const time = isoToWIB(f.fixture?.date);
      const venue = f.fixture?.venue?.name||'';
      const eid = String(f.fixture?.id||'');
      if (eid) storeMatch(eid, {
        home: ht, away: at, liga: f.league?.name||'', country: 'Indonesia',
        homeScore: f.goals?.home??null, awayScore: f.goals?.away??null,
        eps: f.fixture?.status?.short||'NS', minute: null,
        homeId: String(f.teams?.home?.id||''), awayId: String(f.teams?.away?.id||''),
        venue: f.fixture?.venue?.name||null, city: f.fixture?.venue?.city||null,
        referee: f.fixture?.referee||null, esd: f.fixture?.date||'',
        cid: leagueId, sid: season,
      });
      lines.push(`  📅 ${dt} ${time} WIB`);
      lines.push(`  ${sr(ht)} vs ${sr(at)}`);
      if (venue) lines.push(`  🏟 ${sr(venue.substring(0,22))}`);
      lines.push('');
    }
    lines.push(`  ${sr(FOOTER)}`);
    const buttons = fixtures.slice(0,6).map(f => {
      const ht=f.teams?.home?.name||'?', at=f.teams?.away?.name||'?';
      const time=isoToWIB(f.fixture?.date);
      return [Markup.button.callback(`⏰ ${time} ${ht.substring(0,9)} vs ${at.substring(0,9)}`, `sm:${f.fixture.id}`)];
    });
    buttons.push([Markup.button.callback('🇮🇩  Menu Indo','main_indo'), Markup.button.callback('🏠  Menu','back_main')]);
    await editCap(ctx, msgId, block(lines), buttons);
  } catch (err) {
    console.error('IndoSchedule:', err.message);
    await editCap(ctx, msgId, block(['  Gagal memuat jadwal.', `  ${sr(err.message.substring(0,60))}`]),
      [[Markup.button.callback('🏠  Menu','back_main')]]);
  }
}

// ─── HELP ─────────────────────────────────────────────────────────────────────
function showHelp(ctx, msgId) {
  const cap = block([
    '╔══════════════════════════════╗',
    '  ❓ FootBot v2 — Panduan Lengkap',
    '╚══════════════════════════════╝',
    '',
    '  ── COMMAND ──────────────────',
    '  /start    — Buka menu utama',
    '  /jadwal   — Jadwal 24 jam',
    '  /live     — Live score sekarang',
    '  /klasemen — Klasemen liga',
    '  /topskor  — Top skor & assist',
    '  /help     — Panduan ini',
    '  /cari <tim>    — Cari jadwal tim',
    '  /pemain <nama> — Info pemain',
    '  /tim <nama>    — Profil tim',
    '  /notif    — Lihat notif aktif',
    '',
    '  ── FITUR PER MATCH ──────────',
    '  🤖 Prediksi  — Peluang menang',
    '  📊 H2H Stats — Form & H2H',
    '  📈 Match Stat — Tembakan dll',
    '  ⚡ Events    — Gol & kartu',
    '  📋 Lineup    — Starting XI',
    '  ⭐ Rating    — Rating pemain',
    '  💰 Odds      — Peluang taruhan',
    '  🔗 H2H       — Head to head',
    '  🏟 Info      — Venue & wasit',
    '  🔔 Notif     — Notif gol live',
    '',
    '  ── LIGA TERSEDIA ─────────────',
    '  🇮🇩 BRI Liga 1  🇮🇩 Liga 2',
    '  🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League  🇪🇸 La Liga',
    '  🇮🇹 Serie A    🇩🇪 Bundesliga',
    '  🇫🇷 Ligue 1    🇳🇱 Eredivisie',
    '  🇵🇹 Primeira   🇹🇷 Super Lig',
    '  🇸🇦 Saudi PL   🇯🇵 J1 League',
    '  ⭐ UCL 🌍 UEL 🌍 UECL',
    '  🌏 AFC Champions 🌏 WC2026',
    '',
    `  ${sr(FOOTER)}`,
  ]);
  if (msgId) return editCap(ctx, msgId, cap, [[Markup.button.callback('🏠  Menu','back_main')]]);
  return ctx.replyWithMarkdownV2(cap, Markup.inlineKeyboard([[Markup.button.callback('🏠  Menu','back_main')]]));
}

// ─── COMMANDS ─────────────────────────────────────────────────────────────────
bot.start(async ctx => {
  const userPhotoId = await getUserPhoto(ctx);
  await showMenu(ctx, null, userPhotoId);
});

bot.command('help', async ctx => { await showHelp(ctx, null); });

bot.command('jadwal', async ctx => {
  enqueue(async () => {
    const sent = await sendPhoto(ctx, block(['  Memuat jadwal...']), []);
    if (!sent) return;
    try { await showSchedule24h(ctx, sent.message_id, 0); }
    catch (err) { await editCap(ctx, sent.message_id, block([`  Error: ${sr(err.message)}`]),
      [[Markup.button.callback('🏠  Menu','back_main')]]); }
  });
});

bot.command('live', async ctx => {
  enqueue(async () => {
    const sent = await sendPhoto(ctx, block(['  Memuat live score...']), []);
    if (!sent) return;
    await showLiveScore(ctx, sent.message_id);
  });
});

bot.command('klasemen', async ctx => {
  enqueue(async () => {
    const sent = await sendPhoto(ctx, block(['  Memuat klasemen...']), []);
    if (!sent) return;
    await showKlasemenPick(ctx, sent.message_id);
  });
});

bot.command('topskor', async ctx => {
  enqueue(async () => {
    const sent = await sendPhoto(ctx, block(['  Memuat top skor...']), []);
    if (!sent) return;
    await showTopSkorPick(ctx, sent.message_id);
  });
});

bot.command('cari', async ctx => {
  const query = ctx.message.text.split(' ').slice(1).join(' ');
  enqueue(async () => {
    const sent = await sendPhoto(ctx, block(['  Mencari...']), []);
    if (!sent) return;
    await showSearchTeam(ctx, sent.message_id, query);
  });
});

bot.command('pemain', async ctx => {
  const query = ctx.message.text.split(' ').slice(1).join(' ');
  enqueue(async () => {
    const sent = await sendPhoto(ctx, block(['  Mencari pemain...']), []);
    if (!sent) return;
    await showSearchPlayer(ctx, sent.message_id, query);
  });
});

bot.command('tim', async ctx => {
  const query = ctx.message.text.split(' ').slice(1).join(' ');
  enqueue(async () => {
    const sent = await sendPhoto(ctx, block(['  Mencari tim...']), []);
    if (!sent) return;
    await showSearchTeamProfile(ctx, sent.message_id, query);
  });
});

bot.command('notif', async ctx => {
  enqueue(async () => {
    const sent = await sendPhoto(ctx, block(['  Memuat notifikasi...']), []);
    if (!sent) return;
    await showMyNotif(ctx, sent.message_id);
  });
});

// ─── ACTIONS ──────────────────────────────────────────────────────────────────
bot.action('back_main', async ctx => {
  await ctx.answerCbQuery().catch(()=>{});
  await showMenu(ctx, ctx.callbackQuery.message.message_id);
});

bot.action('cmd_help', async ctx => {
  await ctx.answerCbQuery().catch(()=>{});
  await showHelp(ctx, ctx.callbackQuery.message.message_id);
});

bot.action('main_jadwal', async ctx => {
  enqueue(async () => {
    await ctx.answerCbQuery().catch(()=>{});
    const msgId = ctx.callbackQuery.message.message_id;
    await editCap(ctx, msgId, block(['  Memuat jadwal...']), []);
    try { await showSchedule24h(ctx, msgId, 0); }
    catch (err) { await editCap(ctx, msgId, block([`  Error: ${sr(err.message)}`]),
      [[Markup.button.callback('🏠  Menu','back_main')]]); }
  });
});

bot.action('main_live', async ctx => {
  enqueue(async () => {
    await ctx.answerCbQuery('Memuat live...').catch(()=>{});
    await showLiveScore(ctx, ctx.callbackQuery.message.message_id);
  });
});

bot.action('main_klasemen', async ctx => {
  enqueue(async () => {
    await ctx.answerCbQuery().catch(()=>{});
    await showKlasemenPick(ctx, ctx.callbackQuery.message.message_id);
  });
});

bot.action('main_topskor', async ctx => {
  enqueue(async () => {
    await ctx.answerCbQuery().catch(()=>{});
    await showTopSkorPick(ctx, ctx.callbackQuery.message.message_id);
  });
});

bot.action('main_topassist', async ctx => {
  enqueue(async () => {
    await ctx.answerCbQuery().catch(()=>{});
    await showTopAssistPick(ctx, ctx.callbackQuery.message.message_id);
  });
});

bot.action('main_indo', async ctx => {
  enqueue(async () => {
    await ctx.answerCbQuery().catch(()=>{});
    await showIndoMenu(ctx, ctx.callbackQuery.message.message_id);
  });
});

bot.action('my_notif', async ctx => {
  enqueue(async () => {
    await ctx.answerCbQuery().catch(()=>{});
    await showMyNotif(ctx, ctx.callbackQuery.message.message_id);
  });
});

bot.action('clear_notif', async ctx => {
  await ctx.answerCbQuery('Semua notifikasi dihapus').catch(()=>{});
  const userId = ctx.from?.id;
  if (userId) notifSubs.delete(userId);
  await showMyNotif(ctx, ctx.callbackQuery.message.message_id);
});

bot.action(/^j24:(\d+)$/, async ctx => {
  enqueue(async () => {
    await ctx.answerCbQuery().catch(()=>{});
    await showSchedule24h(ctx, ctx.callbackQuery.message.message_id, parseInt(ctx.match[1]));
  });
});

bot.action(/^nav:(-?\d+)$/, async ctx => {
  enqueue(async () => {
    await ctx.answerCbQuery('Memuat...').catch(()=>{});
    await showSchedule(ctx, ctx.callbackQuery.message.message_id, getDateStr(parseInt(ctx.match[1])), 0);
  });
});

bot.action(/^lp:([^:]+):(\d+)$/, async ctx => {
  enqueue(async () => {
    await ctx.answerCbQuery().catch(()=>{});
    await showSchedule(ctx, ctx.callbackQuery.message.message_id, ctx.match[1], parseInt(ctx.match[2]));
  });
});

bot.action(/^lg:([^:]+):([^:]+):(\d+)$/, async ctx => {
  enqueue(async () => {
    await ctx.answerCbQuery().catch(()=>{});
    await showLeagueMatches(ctx, ctx.callbackQuery.message.message_id,
      decodeURIComponent(ctx.match[1]), ctx.match[2], parseInt(ctx.match[3]));
  });
});

bot.action(/^sm:(\w+)$/, async ctx => {
  enqueue(async () => {
    await ctx.answerCbQuery().catch(()=>{});
    await showMatchMenu(ctx, ctx.callbackQuery.message.message_id, ctx.match[1]);
  });
});

bot.action(/^back_ds:(\w+)$/, async ctx => {
  enqueue(async () => {
    await ctx.answerCbQuery().catch(()=>{});
    const msgId=ctx.callbackQuery.message.message_id, eid=ctx.match[1];
    const c24=getCache('ls_sched_24h');
    if (c24 && Object.values(c24.leagueMap).some(l=>l.events.some(e=>e.id===eid)))
      return showSchedule24h(ctx, msgId, 0);
    for (let i=-1; i<=2; i++) {
      const ds=getDateStr(i), data=getCache(`ls_sched_${ds}`);
      if (data && Object.values(data.leagueMap).some(l=>l.events.some(e=>e.id===eid)))
        return showSchedule(ctx, msgId, ds, 0);
    }
    await showSchedule24h(ctx, msgId, 0);
  });
});

bot.action(/^pr:(\w+)$/, async ctx => {
  enqueue(async () => {
    await ctx.answerCbQuery('Menganalisis...').catch(()=>{});
    await showPrediksi(ctx, ctx.callbackQuery.message.message_id, ctx.match[1]);
  });
});

bot.action(/^ps:(\w+)$/, async ctx => {
  enqueue(async () => {
    await ctx.answerCbQuery('Memuat statistik...').catch(()=>{});
    await showPrediksiStats(ctx, ctx.callbackQuery.message.message_id, ctx.match[1]);
  });
});

bot.action(/^ev:(\w+)$/, async ctx => {
  enqueue(async () => {
    await ctx.answerCbQuery('Memuat events...').catch(()=>{});
    await showEvents(ctx, ctx.callbackQuery.message.message_id, ctx.match[1]);
  });
});

bot.action(/^mst:(\w+)$/, async ctx => {
  enqueue(async () => {
    await ctx.answerCbQuery('Memuat statistik...').catch(()=>{});
    await showMatchStats(ctx, ctx.callbackQuery.message.message_id, ctx.match[1]);
  });
});

bot.action(/^lu:(\w+)$/, async ctx => {
  enqueue(async () => {
    await ctx.answerCbQuery('Memuat lineup...').catch(()=>{});
    await showLineup(ctx, ctx.callbackQuery.message.message_id, ctx.match[1]);
  });
});

bot.action(/^rt:(\w+)$/, async ctx => {
  enqueue(async () => {
    await ctx.answerCbQuery('Memuat rating...').catch(()=>{});
    await showPlayerRatings(ctx, ctx.callbackQuery.message.message_id, ctx.match[1]);
  });
});

bot.action(/^mi:(\w+)$/, async ctx => {
  enqueue(async () => {
    await ctx.answerCbQuery().catch(()=>{});
    await showMatchInfo(ctx, ctx.callbackQuery.message.message_id, ctx.match[1]);
  });
});

bot.action(/^od:(\w+)$/, async ctx => {
  enqueue(async () => {
    await ctx.answerCbQuery('Memuat odds...').catch(()=>{});
    await showOdds(ctx, ctx.callbackQuery.message.message_id, ctx.match[1]);
  });
});

bot.action(/^h2h:(\w+)$/, async ctx => {
  enqueue(async () => {
    await ctx.answerCbQuery('Memuat H2H...').catch(()=>{});
    await showH2H(ctx, ctx.callbackQuery.message.message_id, ctx.match[1]);
  });
});

bot.action(/^notif:(\w+)$/, async ctx => {
  const eid = ctx.match[1];
  enqueue(async () => {
    await toggleNotif(ctx, ctx.callbackQuery.message.message_id, eid);
  });
});

bot.action(/^kl:(\d+):(\d+)(?::(\d+))?$/, async ctx => {
  enqueue(async () => {
    await ctx.answerCbQuery('Memuat klasemen...').catch(()=>{});
    await showKlasemen(ctx, ctx.callbackQuery.message.message_id,
      ctx.match[1], ctx.match[2], parseInt(ctx.match[3]||'0'));
  });
});

bot.action(/^ts:(\d+):(\d+)$/, async ctx => {
  enqueue(async () => {
    await ctx.answerCbQuery('Memuat top skor...').catch(()=>{});
    await showTopScorers(ctx, ctx.callbackQuery.message.message_id, ctx.match[1], ctx.match[2]);
  });
});

bot.action(/^ta:(\d+):(\d+)$/, async ctx => {
  enqueue(async () => {
    await ctx.answerCbQuery('Memuat top assist...').catch(()=>{});
    await showTopAssists(ctx, ctx.callbackQuery.message.message_id, ctx.match[1], ctx.match[2]);
  });
});

bot.action(/^tp:(\d+):(\d+)$/, async ctx => {
  enqueue(async () => {
    await ctx.answerCbQuery('Memuat profil tim...').catch(()=>{});
    await showTeamProfile(ctx, ctx.callbackQuery.message.message_id, ctx.match[1], ctx.match[2]);
  });
});

bot.action(/^indo_jadwal:(\d+):(\d+)$/, async ctx => {
  enqueue(async () => {
    await ctx.answerCbQuery().catch(()=>{});
    await showIndoLeagueSchedule(ctx, ctx.callbackQuery.message.message_id, ctx.match[1], ctx.match[2]);
  });
});

// ─── NOTIFIKASI GOL — POLLING BACKGROUND ─────────────────────────────────────
async function checkGoalNotifs() {
  const fixtureIds = getAllSubscribedFixtures();
  if (!fixtureIds.size) return;

  for (const eid of fixtureIds) {
    try {
      const f = await fetchLiveFixture(eid);
      if (!f) continue;

      const eps = f.fixture?.status?.short || 'NS';
      const hScore = f.goals?.home ?? 0;
      const aScore = f.goals?.away ?? 0;
      const hName = f.teams?.home?.name || '?';
      const aName = f.teams?.away?.name || '?';
      const min = f.fixture?.status?.elapsed ? `${f.fixture.status.elapsed}'` : '';

      if (!goalTrack.has(eid)) {
        goalTrack.set(eid, { hScore, aScore, prevEps: eps, kickoffNotified: false, endNotified: false });
        // Notif kickoff jika sudah live
        if (isLive(eps)) {
          for (const [uid, subs] of notifSubs.entries()) {
            if (!subs.has(eid)) continue;
            const chatId = userChatId.get(uid);
            if (!chatId) continue;
            const gt = goalTrack.get(eid);
            if (!gt.kickoffNotified) {
              gt.kickoffNotified = true;
              await bot.telegram.sendMessage(chatId, block([
                '╔══════════════════════════════╗',
                '  🔔 KICKOFF!',
                '╚══════════════════════════════╝',
                `  🏠 ${sr(hName)} vs ${sr(aName)} ✈`,
                `  ${sr(f.league?.name||'')}`,
                '',
                '  Pertandingan telah dimulai!',
                `  ${sr(FOOTER)}`,
              ]), { parse_mode: 'MarkdownV2' }).catch(e => console.error('notif kick:', e.message));
            }
          }
        }
        continue;
      }

      const track = goalTrack.get(eid);

      // Cek gol baru
      const totalGoals = hScore + aScore;
      const prevTotal = track.hScore + track.aScore;

      if (totalGoals > prevTotal) {
        // Ada gol baru!
        const goalDiff = totalGoals - prevTotal;
        // Cari event gol terbaru
        let goalMsg = `  Skor: ${hScore}-${aScore}`;

        // Kirim notif ke semua subscriber
        for (const [uid, subs] of notifSubs.entries()) {
          if (!subs.has(eid)) continue;
          const chatId = userChatId.get(uid);
          if (!chatId) continue;
          await bot.telegram.sendMessage(chatId, block([
            '╔══════════════════════════════╗',
            '  ⚽ GOL!!!',
            '╚══════════════════════════════╝',
            `  ${min} ${sr(hName)} ${hScore} - ${aScore} ${sr(aName)}`,
            `  ${sr(f.league?.name||'')}`,
            '',
            goalMsg,
            `  Update: ${sr(nowWIB())}`,
            `  ${sr(FOOTER)}`,
          ]), { parse_mode: 'MarkdownV2' }).catch(e => console.error('notif goal:', e.message));
        }
        track.hScore = hScore;
        track.aScore = aScore;
      }

      // Cek pertandingan selesai
      if (isFinished(eps) && !track.endNotified && (track.kickoffNotified || isFinished(track.prevEps) === false)) {
        track.endNotified = true;
        for (const [uid, subs] of notifSubs.entries()) {
          if (!subs.has(eid)) continue;
          const chatId = userChatId.get(uid);
          if (!chatId) continue;
          await bot.telegram.sendMessage(chatId, block([
            '╔══════════════════════════════╗',
            '  ✅ SELESAI!',
            '╚══════════════════════════════╝',
            `  🏠 ${sr(hName)} ${hScore} - ${aScore} ${sr(aName)} ✈`,
            `  ${sr(f.league?.name||'')}`,
            '',
            '  Pertandingan telah selesai.',
            `  ${sr(FOOTER)}`,
          ]), { parse_mode: 'MarkdownV2' }).catch(e => console.error('notif end:', e.message));
          // Auto-remove subscription setelah selesai
          subs.delete(eid);
        }
        goalTrack.delete(eid);
      }

      track.prevEps = eps;
    } catch (e) {
      // ignore errors per fixture
    }
  }
}

// Poll setiap 60 detik
setInterval(checkGoalNotifs, 60 * 1000);

// ─── ERROR HANDLER ────────────────────────────────────────────────────────────
bot.catch((err, ctx) => {
  const msg = err?.message || String(err);
  if (!msg.includes('message is not modified') && !msg.includes('query is too old')) {
    console.error('Bot error:', msg.substring(0,100));
  }
});

// ─── LAUNCH ───────────────────────────────────────────────────────────────────
(async () => {
  try {
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
    await bot.launch({ dropPendingUpdates: true });
    console.log('⚽ FootBot v2 aktif!');
    console.log('   Commands: /start /jadwal /live /klasemen /topskor /cari /pemain /tim /notif /help');
    console.log('   Liga 1 Indonesia: ID=253, season=2025');
    console.log('   Notifikasi gol: polling setiap 60 detik');
  } catch (err) {
    console.error('❌ Gagal launch:', err.message);
    process.exit(1);
  }
})();

process.once('SIGINT',  () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// ─── KOYEB HEALTH CHECK ───────────────────────────────────────────────────────
const http = require('http');
http.createServer((_, res) => res.end('ok')).listen(process.env.PORT || 3000);
