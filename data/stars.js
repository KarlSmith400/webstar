const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const CACHE_FILE = path.join(__dirname, 'hygdata_1000ly_v3.json');
const HYG_URL = 'https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv';
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function fetchCSV(url) {
  const fetch = (await import('node-fetch')).default;

  console.log('Connecting to GitHub...');
  const res = await fetch(url);

  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const total = res.headers.get('content-length');
  let received = 0;
  let data = '';

  for await (const chunk of res.body) {
    data += chunk;
    received += chunk.length;
    if (total) {
      const pct = Math.round((received / total) * 100);
      process.stdout.write(`\rDownloading star data... ${pct}%`);
    }
  }

  console.log('\nDownload complete');
  return data;
}

function cacheIsValid() {
  if (!fs.existsSync(CACHE_FILE)) return false;
  const stat = fs.statSync(CACHE_FILE);
  return (Date.now() - stat.mtimeMs) < CACHE_MAX_AGE_MS;
}

async function getStars() {
  if (cacheIsValid()) {
    console.log('Serving stars from cache');
    return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  }

  const csv = await fetchCSV(HYG_URL);

  console.log('Parsing CSV...');
  const rows = parse(csv, { columns: true, skip_empty_lines: true });

  console.log('CSV columns:', Object.keys(rows[0]));
  console.log('First row sample:', rows[0]);

  const MAX_DIST_PC = 1000 / 3.26156; // 1000 LY in parsecs

  const stars = rows
    .filter(r => {
      const dist = parseFloat(r.dist);
      return dist > 0 && dist <= MAX_DIST_PC;
    })
    .map(r => {
      const id = r.id;
      const round4 = v => Math.round(v * 1e4) / 1e4;
      const round2 = v => Math.round(v * 1e2) / 1e2;
      const star = {
        id,
        x: round4(parseFloat(r.x)),
        y: round4(parseFloat(r.y)),
        z: round4(parseFloat(r.z)),
        mag: round2(parseFloat(r.mag)),
        absmag: round2(parseFloat(r.absmag)),
        lum: round4(parseFloat(r.lum)),
        dist: round4(parseFloat(r.dist)),
      };
      // Only include sparse / optional fields when non-empty — omitting nulls
      // cuts the JSON payload significantly (78K stars, most unnamed)
      if (r.hip)    star.hip    = r.hip;
      if (r.proper) star.name   = r.proper;
      if (r.bayer)  star.bayer  = r.bayer;
      if (r.con)    star.con    = r.con;
      if (r.spect)  star.spect  = r.spect;
      // comp_primary: only meaningful when it points to a different star
      if (r.comp_primary && r.comp_primary !== id) star.comp_primary = r.comp_primary;
      return star;
    });

  fs.writeFileSync(CACHE_FILE, JSON.stringify(stars));
  console.log(`Cached ${stars.length} stars`);

  return stars;
}

module.exports = { getStars };
