const express = require('express');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
const { getStars, getStarsPath } = require('./data/stars');
const { getPlanets } = require('./data/planets');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(compression()); // gzip all responses
app.use(express.static(path.join(__dirname, 'public')));

// Pre-warm: start fetching/caching star data immediately on startup
// so the first browser request doesn't wait for a cold GitHub download
const starsReady = getStarsPath().catch(err => console.error('Star pre-fetch failed:', err.message));

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

app.get('/api/stars', async (req, res) => {
  try {
    await starsReady; // wait for pre-warm
    const { path: file, source } = await getStarsPath();
    res.set('X-Data-Source', source);
    res.set('Access-Control-Expose-Headers', 'X-Data-Source');
    if (source === 'fresh' || source === 'cache') {
      const etag = cacheHeaders(file, res);
      if (etag && req.headers['if-none-match'] === etag) return res.sendStatus(304);
    } else {
      res.set('Cache-Control', 'no-store'); // stale/fallback — don't let browsers stick on it
    }
    res.setHeader('Content-Type', 'application/json');
    fs.createReadStream(file).pipe(res); // stream directly — avoids parse+re-stringify
  } catch (err) {
    console.error('Failed to load star data:', err.message);
    res.status(500).json({ error: 'Could not load star data' });
  }
});

app.get('/api/planets', async (req, res) => {
  try {
    const { data: planets, source } = await getPlanets();
    res.set('X-Data-Source', source);
    res.set('Access-Control-Expose-Headers', 'X-Data-Source');
    if (source === 'fresh' || source === 'cache') {
      const cacheFile = path.join(__dirname, 'data', 'planets.json');
      const etag = cacheHeaders(cacheFile, res);
      if (etag && req.headers['if-none-match'] === etag) return res.sendStatus(304);
    } else {
      res.set('Cache-Control', 'no-store'); // stale — don't let browsers stick on it
    }
    res.json(planets);
  } catch (err) {
    console.error('Failed to load planet data:', err.message);
    res.status(500).json({ error: 'Could not load planet data' });
  }
});

app.listen(PORT, () => {
  console.log(`WebStar running at http://localhost:${PORT}`);
});
