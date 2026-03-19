const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const { pipeline } = require('stream/promises');
const { Writable } = require('stream');

const CACHE_FILE = path.join(__dirname, 'hygdata_1000ly_v3.json');
const HYG_URL = 'https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv';
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_DIST_PC = 1000 / 3.26156; // 1000 LY in parsecs

function cacheIsValid() {
  if (!fs.existsSync(CACHE_FILE)) return false;
  const stat = fs.statSync(CACHE_FILE);
  return (Date.now() - stat.mtimeMs) < CACHE_MAX_AGE_MS;
}

async function fetchAndCache() {
  const fetch = (await import('node-fetch')).default;

  console.log('Connecting to GitHub...');
  const res = await fetch(HYG_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const stars = [];
  const round4 = v => Math.round(v * 1e4) / 1e4;
  const round2 = v => Math.round(v * 1e2) / 1e2;

  // Stream CSV rows one at a time - avoids loading the full 32MB into memory
  const parser = parse({ columns: true, skip_empty_lines: true });
  const collector = new Writable({
    objectMode: true,
    write(r, _, cb) {
      const dist = parseFloat(r.dist);
      if (dist > 0 && dist <= MAX_DIST_PC) {
        const id = r.id;
        const star = {
          id,
          x: round4(parseFloat(r.x)),
          y: round4(parseFloat(r.y)),
          z: round4(parseFloat(r.z)),
          mag: round2(parseFloat(r.mag)),
          absmag: round2(parseFloat(r.absmag)),
          lum: round4(parseFloat(r.lum)),
          dist: round4(dist),
        };
        if (r.hip)    star.hip    = r.hip;
        if (r.proper) star.name   = r.proper;
        if (r.bayer)  star.bayer  = r.bayer;
        if (r.con)    star.con    = r.con;
        if (r.spect)  star.spect  = r.spect;
        if (r.comp_primary && r.comp_primary !== id) star.comp_primary = r.comp_primary;
        stars.push(star);
      }
      cb();
    }
  });

  console.log('Streaming and parsing star data...');
  await pipeline(res.body, parser, collector);

  fs.writeFileSync(CACHE_FILE, JSON.stringify(stars));
  console.log(`Cached ${stars.length} stars`);
  return stars;
}

async function getStars() {
  if (cacheIsValid()) {
    console.log('Serving stars from cache');
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  }
  return fetchAndCache();
}

module.exports = { getStars };
