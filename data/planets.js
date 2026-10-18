const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, 'planets.json');
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// NASA Exoplanet Archive — use pscomppars (one row per planet, best values)
const NASA_URL = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=' +
  encodeURIComponent(
    'SELECT pl_name,hostname,hip_name,sy_dist,pl_orbper,pl_rade,pl_bmasse,pl_eqt,discoverymethod,disc_year,pl_orbsmax,pl_orbeccen,pl_orbincl,pl_orblper,pl_orbtper ' +
    'FROM pscomppars ' +
    'WHERE pl_controv_flag=0'
  ) + '&format=json';

function cacheIsValid() {
  if (!fs.existsSync(CACHE_FILE)) return false;
  const stat = fs.statSync(CACHE_FILE);
  return (Date.now() - stat.mtimeMs) < CACHE_MAX_AGE_MS;
}

function readCache() {
  return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
}

async function getPlanets() {
  if (cacheIsValid()) {
    console.log('Serving planets from cache');
    return { data: readCache(), source: 'cache' };
  }

  console.log('Fetching exoplanet data from NASA...');
  let raw;
  try {
    const fetch = (await import('node-fetch')).default;
    const res = await fetch(NASA_URL);
    if (!res.ok) throw new Error(`NASA API HTTP ${res.status}`);
    raw = await res.json();
    if (!Array.isArray(raw)) throw new Error('NASA API returned non-array response (likely a TAP error)');
  } catch (err) {
    if (fs.existsSync(CACHE_FILE)) {
      console.warn(`NASA fetch failed (${err.message}); serving stale cache`);
      return { data: readCache(), source: 'stale' };
    }
    // No cache available (e.g. fresh deploy with NASA down). Return empty set
    // rather than failing - the star map should still render without planets.
    console.warn(`NASA fetch failed (${err.message}); no cache available, returning empty planet set`);
    return { data: [], source: 'unavailable' };
  }
  console.log(`Fetched ${raw.length} planet records`);

  // Group planets by host star — index by HIP and by hostname
  const byHip = {};
  const byName = {};

  for (const p of raw) {
    const hip = p.hip_name ? p.hip_name.replace('HIP ', '').trim() : null;
    const key = hip || p.hostname;
    const store = hip ? byHip : byName;

    if (!store[key]) store[key] = { hostname: p.hostname, hip: hip || null, dist_pc: p.sy_dist, planets: [] };
    store[key].planets.push({
      name: p.pl_name,
      period_days: p.pl_orbper,
      radius_earth: p.pl_rade,
      mass_earth: p.pl_bmasse,
      temp_k: p.pl_eqt,
      method: p.discoverymethod,
      year: p.disc_year,
      sma_au: p.pl_orbsmax != null ? p.pl_orbsmax : null,
      eccentricity: p.pl_orbeccen != null ? p.pl_orbeccen : null,
      inclination: p.pl_orbincl != null ? p.pl_orbincl : null,
      omega_deg: p.pl_orblper != null ? p.pl_orblper : null,
      t_peri_bjd: p.pl_orbtper != null ? p.pl_orbtper : null,
    });
  }

  const result = [...Object.values(byHip), ...Object.values(byName)];
  fs.writeFileSync(CACHE_FILE, JSON.stringify(result));
  console.log(`Cached ${result.length} planetary systems`);
  return { data: result, source: 'fresh' };
}

module.exports = { getPlanets };
