const express = require('express');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const { getStars } = require('./data/stars');
const { getPlanets } = require('./data/planets');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression()); // gzip all responses
app.use(express.static(path.join(__dirname, 'public')));

// Pre-warm: start fetching/caching star data immediately on startup
// so the first browser request doesn't wait for a cold GitHub download
const starsReady = getStars().catch(err => console.error('Star pre-fetch failed:', err.message));

const CACHE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

function cacheHeaders(cacheFile, res) {
  try {
    const mtime = fs.statSync(cacheFile).mtimeMs;
    const etag = `"${mtime.toString(16)}"`;
    res.set('Cache-Control', `public, max-age=${CACHE_MAX_AGE}`);
    res.set('ETag', etag);
    return etag;
  } catch {
    res.set('Cache-Control', 'no-store');
    return null;
  }
}

const STARS_CACHE = path.join(__dirname, 'data', 'hygdata_1000ly_v5.json');

app.get('/api/stars', async (req, res) => {
  try {
    await starsReady; // wait for pre-warm, then ensure cache is fresh
    await getStars();
    const etag = cacheHeaders(STARS_CACHE, res);
    if (etag && req.headers['if-none-match'] === etag) return res.sendStatus(304);
    res.setHeader('Content-Type', 'application/json');
    fs.createReadStream(STARS_CACHE).pipe(res); // stream directly — avoids parse+re-stringify
  } catch (err) {
    console.error('Failed to load star data:', err.message);
    res.status(500).json({ error: 'Could not load star data' });
  }
});

app.get('/api/planets', async (req, res) => {
  try {
    const cacheFile = path.join(__dirname, 'data', 'planets.json');
    const etag = cacheHeaders(cacheFile, res);
    if (etag && req.headers['if-none-match'] === etag) return res.sendStatus(304);
    const planets = await getPlanets();
    res.json(planets);
  } catch (err) {
    console.error('Failed to load planet data:', err.message);
    res.status(500).json({ error: 'Could not load planet data' });
  }
});

app.listen(PORT, () => {
  console.log(`WebStar running at http://localhost:${PORT}`);
});
