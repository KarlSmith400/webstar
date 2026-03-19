# Changelog

All notable changes to WebStar will be documented here.

---

## [0.13.0] - 2026-03-19

### Added
- **Deployed to Render** - live at https://webstar-r7fc.onrender.com (free tier, auto-deploys on push)

### Fixed
- **OOM crash on Render free tier** - replaced synchronous CSV parse (loaded full 32MB into memory) with streaming pipeline; peak memory dropped from ~300MB to ~60MB
- **PORT binding** - server now uses `process.env.PORT` so Render can assign the correct port
- **Star pre-warm** - server begins fetching/caching star data on startup rather than waiting for the first browser request

---

## [0.12.0] - 2026-03-18

### Added
- **Favicon & touch icons** -favicon.ico, 16×16, 32×32, Apple touch icon, Android Chrome 192×192 and 512×512 from KS400 brand assets
- **karlsmith.design credit link** -displayed in bottom-right UI panel

### Changed
- **Jump planner range capped at 15 LY** (was 50 LY) -prevents generating tens of thousands of line segments that froze the browser (INP went from 7,720ms to <300ms)
- **Jump network line cap** -BFS stops at 6,000 segments and shows "Network too dense" warning instead of freezing

### Performance
- **Gzip compression** -`compression` middleware added; star payload drops from 17MB to ~2.9MB on first load
- **HTTP caching** -`Cache-Control: public, max-age=604800` + ETag on both API endpoints; repeat visits serve 0B from browser disk cache
- **Null field stripping** -star cache no longer stores `null` for the 99% of stars with no proper name or Bayer designation; `comp` field removed (unused by client)
- **Coordinate rounding** -positions/magnitudes rounded to 4 decimal places (0.0001 pc precision is more than sufficient); saves ~1.4MB raw
- **File streaming** -`/api/stars` streams the cache file directly instead of parse → JSON.stringify round-trip

---

## [0.11.0] - 2026-03-18

### Added
- **Screenshot button** -📷 button saves current view as PNG; uses `preserveDrawingBuffer: true` on WebGLRenderer
- **Keyboard shortcuts** -C (constellations), P (planet filter), J (jump planner toggle), R (reset view), D (ruler), Esc (close panel); displayed in bottom-right hint overlay
- **Spectral type legend** -fixed panel showing O→M spectral class colours
- **Hover tooltip** -star name appears on mouseover for any named star or Sol
- **Distance ruler** -click Ruler button then two stars to measure distance in LY; chaining clicks extends measurement from last point
- **Exoplanet type sub-filter** -when planet host filter is active, filter panel appears with: All hosts / Terrestrial (<1.6 R⊕) / Super-Earth (1.6–4 R⊕) / Neptune-like (4–10 R⊕) / Gas Giant (>10 R⊕)
- **Nebulae / notable objects** -12 deep-sky objects (Orion Nebula, Pleiades, Hyades, Helix, Beehive, Crab, Butterfly, Lagoon, Eagle, Witch Head, California, Rosette) rendered as green wireframe octahedra with labels at correct RA/Dec/distance coordinates
- **Touch support** -single tap fires star selection on mobile/tablet (movement threshold 8px to distinguish from drag)

### Fixed
- Planet type sub-filter panel now shows/hides correctly when planet host filter is toggled
- `rebuildPlanetHostIds()` called on filter activation so type sub-filter applies immediately
- Hover tooltip no longer tracks a dead `lastHoverStar` variable

---

## [0.10.0] - 2026-03-18

### Added
- **Expanded constellations** -40 constellations total (up from 16), covering all major IAU groupings: northern, zodiac, and southern sky using verified HYG v41 IAU proper names
- **Constellation labels** -each constellation displays its name in dim blue at the pattern centroid, updating in real time as you orbit
- **Earth viewpoint lock** -toggling constellations flies camera to minimum distance from Sol (0.1 pc), locks orbit target to Sol, disables pan and zoom-out so you can freely rotate and scan the full sky as if standing on Earth
- **Star range increased to 1000 LY** -captures Orion belt stars (Rigel ~863 LY, Betelgeuse ~724 LY), Antares (~604 LY), and other deep constellation stars; cache renamed to `hygdata_1000ly_v3.json`
- **Spatial grid index** -3D grid (10 LY cells) for jump planner BFS and route finder; keeps performance fast at the larger star count

### Fixed
- Nearby star label threshold had inverted unit conversion (multiplied instead of divided by 3.26156), showing stars within 53 LY instead of 5 LY -corrected to proper 5 LY cutoff

### Changed
- Constellation toggle restores full free navigation (pan, zoom) when hidden

---

## [0.9.0] - 2026-03-18

### Added
- **Planetary system data** -NASA Exoplanet Archive (`pscomppars` table) fetched on startup, cached for 7 days as `data/planets.json`
- **Sol planets hard-coded** -all 8 planets with verified data from JPL (orbital period, radius, mass) and NASA Science (mean surface temperature); source cited in code
- **Planet host filter** -"Show Planet Hosts" button highlights the 554 stars with confirmed exoplanet data in amber, dims all others
- **Richer info panel** -now shows constellation (full name), absolute magnitude, luminosity (L☉), Bayer designation, HIP number, and known planetary systems
- **Nearby star labels** -named stars within 5 LY are always labelled regardless of apparent magnitude (e.g. Proxima Centauri, Barnard's Star)
- Planet data indexed by HIP number and hostname for reliable matching across catalog name variations

### Fixed
- Planet lookup now falls back from HIP to hostname so stars without HIP entries (e.g. Tau Ceti host names) still match
- Sol info panel now shows absolute magnitude (4.83) and luminosity (1.0 L☉)
- Distance-based planet matching removed -was causing false positives (e.g. Gacrux showing BD-11 4672's planets)

### Changed
- Star cache bumped to `hygdata_250ly_v3.json` -adds `bayer`, `con`, `absmag`, `lum` fields
- NASA query uses `pscomppars` table (one row per planet) instead of `ps` (one row per publication) -eliminates duplicate planet entries

---

## [0.8.0] - 2026-03-18

### Added
- Binary companion links -amber lines between close companion pairs using two methods: comp_primary field (Gliese stars, < 0.1 LY) and proximity detection (any stars < 0.01 LY apart, sliding window sort for performance)
- Companion data (`comp`, `comp_primary`) added to cache (v2) -note: only populated for Gliese catalog stars per HYG documentation
- Label stacking -companion star names offset below primary label, dimmed and smaller
- Double-click to fly -smooth eased camera animation to any star
- Star selection prefers named/brightest star within hit radius over unnamed dim neighbours
- Spatial label deduplication replaced with stacking to show all companions

### Fixed
- Binary lines previously drew to companions outside 250 LY range causing map-wide streaks -now validated by physical distance (< 0.1 LY) not just comp_primary field
- Sol click now correctly triggers jump planner origin
- Invisible Sol sphere no longer writes to depth buffer (black void fixed)
- Label text rendered sharply with hard outline shadow and rounded pixel positions

### Changed
- Data filter switched from apparent magnitude (≤ 6.5) to distance-based (≤ 250 LY) -16,779 stars vs 8,921
- Cache renamed to `hygdata_250ly_v2.json` to include companion fields

---

## [0.7.0] - 2026-03-18

### Added
- Jump count badge -hop-by-hop reachable star counts shown in the jump panel
- Star hop highlighting -dots colour-coded by hop number when jump planner is active, dimmed if unreachable
- Star search -type a name, click a result, camera flies to that star
- Route finder -Shift+click origin then destination, draws shortest BFS jump path in orange
- Constellation lines toggle -classic outlines for 16 constellations (Show/Hide Constellations button)

---

## [0.6.0] - 2026-03-18

### Added
- Jump planner panel (top left) with jump range (LY) and max hops sliders
- Draws colour-coded jump network from selected star (cyan = hop 1, fading blue per hop)
- Live updates when sliders change
- Screen-space star click detection (works at any zoom level)
- Fixed Sol invisible sphere depth writing blocking stars behind it

---

## [0.5.0] - 2026-03-18

### Changed
- Switched from 2D canvas equirectangular map to full 3D Three.js scene
- Star data now uses x/y/z parsec coordinates from HYG database (Earth/Sol at origin)
- Cache updated to `hygdata_3d.json` with 3D coordinates

### Added
- Three.js + OrbitControls (mouse drag to orbit, scroll to zoom, damped movement)
- Sun/Earth marker at origin with point light
- Star field built as BufferGeometry Points for performance
- Raycasting for click-to-select in 3D space
- Wireframe sphere marker on selected star
- Info panel shows name, magnitude, distance, spectral type, 3D position

---

## [0.4.0] - 2026-03-18

### Added
- Mouse wheel zoom -zooms toward cursor position
- Click and drag to pan the map
- Click a star to select it -shows info panel (name, magnitude, distance, spectral type, coordinates)
- Selected star highlighted with a white ring
- Stars outside viewport culled for performance
- Crosshair cursor, grabbing cursor while dragging

---

## [0.3.0] - 2026-03-18

### Added
- Canvas star renderer in `public/app.js`
- Equirectangular projection (RA/Dec → screen coordinates)
- Magnitude-based dot sizing (brighter = larger)
- Spectral type colour coding (O=blue through M=orange-red)
- Glow effect on brightest stars (mag < 2)
- Loading message while data fetches

---

## [0.2.0] - 2026-03-18

### Added
- `data/stars.js` -fetches HYG star database from GitHub, parses CSV, caches locally as JSON
- Cache auto-refreshes after 7 days
- Falls back to cache if GitHub is unreachable
- `/api/stars` endpoint now returns real filtered star data (~9,000 stars mag ≤ 6.5)
- `.gitignore` to exclude node_modules and cached data file

---

## [0.1.0] - 2026-03-18

### Added
- Initial project scaffold
- Express server (`server.js`) serving static files
- Placeholder `/api/stars` endpoint
- Basic HTML canvas page (`public/index.html`, `public/app.js`)
- README with project overview and planned features
