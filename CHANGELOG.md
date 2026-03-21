# Changelog

All notable changes to WebStar will be documented here.

---

## [0.27.0] - 2026-03-21

### Added
- **Moon system view** - double-click any planet (or tap "View Moon Orbits" in its info panel) to zoom the camera to that planet and watch its moons orbit in real time; 20 major moons across 6 planets using JPL mean orbital elements at J2000 epoch: Earth's Moon, Mars' Phobos and Deimos, Jupiter's Galilean moons (Io, Europa, Ganymede, Callisto), Saturn's six moons (Mimas, Enceladus, Tethys, Dione, Rhea, Titan), Uranus' five major moons (Miranda, Ariel, Umbriel, Titania, Oberon), Neptune's Triton
- **Planet zoom** - camera locks onto and tracks a planet as it orbits; HZ ring and planet orbit lines hidden during planet focus to avoid visual clutter; "← System view" button returns to full system view
- **Moon info panel** - clicking a moon shows its orbital period, semi-major axis, eccentricity, inclination and radius
- **Host star info in system view** - clicking the central star shows spectral type, luminosity, estimated mass, distance and magnitude; includes "← Back to Star Map" button
- **"View Moon Orbits" button** - appears in planet detail panel for any planet with known moons
- **Spectral colours matched** - system view star sprite M-type colour corrected to match main star field (`#ffcc6f`)

### Fixed
- Planet detail panel (system view) no longer forces full width on mobile - sits compact bottom-left, expands only as wide as content needs; max-width 260px
- Star info panel on desktop now compact card (300px max-width) bottom-left rather than stretching across the screen; mobile retains full-width bottom sheet with drag handle
- System view "← System view" button repositioned below the sys-panel info box so it is no longer hidden behind it
- Moon orbit display scale computed per-planet so Phobos/Deimos are visible around Mars (fixed-scale 300 placed them inside the planet sphere)
- HZ ring and orbit lines hidden when zoomed into a planet so they no longer fill the screen
- Moon click info panel wired up

---

## [0.26.0] - 2026-03-21

### Added
- **Progressive star loading** - stars render in batches of 8,000 as soon as data arrives; the loading overlay shows a live count so the map is usable within seconds rather than waiting for all 120,000 stars to process
- **Reset button in nav bar** - always-accessible reset sits alongside Sky / Planets / Jump / More so the view can be restored in one tap from any state

### Fixed
- Hover tooltip now works immediately after rotating the view - `dragMoved` was never reset after a drag so the tooltip was suppressed until the next click; fixed by resetting on `mouseup` and `mouseleave`
- Hover tooltip no longer shows for the currently selected star - the selection label already displays the name so the tooltip was redundant
- Named star label (from labelPool) hidden while a star is selected to prevent two identical labels stacking on the same star; restored when deselected
- Browser drag-select on the canvas no longer interferes with navigation (`user-select: none` + `dragstart` prevention)
- Support nav button colour updated to phosphor green (`#39FF14`) matching KS brand

---

## [0.25.0] - 2026-03-20

### Added
- **Karl Smith branding in top bar** - CRT-animated KS logo links to karlsmith.design; sits right-aligned in the top bar with phosphor-green glow matching the brand aesthetic
- **30 deep-sky objects** - nebulae, planetary nebulae, supernova remnants, and open clusters at correct 3D positions; type-coded wireframe markers (green=nebula, cyan=planetary, orange=remnant, amber=cluster); toggle via More panel
- **Nebulae visibility toggle** - More panel button shows/hides all deep-sky markers and labels

### Fixed
- All deep-sky object distances corrected to light-years - 12 entries were stored in parsecs, placing them 3.26x too close (Orion Nebula was at 412 LY instead of 1,344 LY; Pleiades at 136 LY instead of 444 LY; Crab Nebula at 1,930 LY instead of 6,500 LY)
- Nebula labels no longer repeat the type word (e.g. "California Nebula · Nebula" reduced to "California Nebula")
- Nebula labels clamped so they never clip off the right edge of the screen on narrow viewports

---

## [0.24.0] - 2026-03-20

### Added
- **Hover tooltip on all stars** - moving the cursor near any star shows its name, Bayer designation, or HIP number before clicking; cursor changes to pointer to confirm the target; previously only named stars triggered a tooltip
- **Soft star sprites** - stars rendered with a radial-gradient canvas texture so they appear as smooth glowing discs instead of hard square pixels; especially noticeable on high-DPI mobile screens
- **Accurate photometric brightness** - star luminance now uses Pogson's logarithmic magnitude scale (each magnitude step = 2.512× brightness); Sirius and Canopus properly dominate while dim background stars fade to subtle points; old linear formula made mag 0 and mag 3 stars look nearly identical

### Fixed
- Constellation lines brightness increased (colour `0x334466` → `0x5577bb`, opacity 0.6 → 0.85) so they are clearly visible on OLED mobile displays
- Hover tooltip never showed because `dragMoved` was set on every `mousemove` regardless of mouse button state; now only set while button is held, so tooltip fires freely during normal movement
- Jump planner panel / info panel / planet filter no longer fight for the same screen space - opening one closes any conflicting panel; clicking a star while jump planner is active sets the origin without dismissing the planner
- Jump planner auto-enables when the nav panel opens and disables when it closes; internal Enable button hidden as redundant
- Slider tick marks added to jump range and max hops sliders

---

## [0.23.0] - 2026-03-20

### Added
- **Ko-fi button in nav bar** - Support link sits to the right of the main nav buttons, separated by a thin divider; amber colour distinguishes it from functional nav items

### Fixed
- Drag handle hit area expanded to full panel width with 10 px top/bottom padding - visual pill unchanged, but the grab target is much easier to hit on touch

---

## [0.22.0] - 2026-03-20

### Added
- **Spectral key drawer** - fixed interaction regression where the entire drawer (including the tab) was translated off-screen when closed; tab now stays fixed at right edge and only the legend panel slides in/out

### Fixed
- Info panel drag handle now stays pinned at the top regardless of scroll position - panel content scrolls inside a flex child while the handle stays outside the scroll area
- Thin styled scrollbar (3 px, translucent thumb) replaces the default browser scrollbar in the info panel
- Jump planner, info panel, route panel, more panel, and planet type filter all constrained to 90% width (5% side margins) so they do not stretch edge-to-edge on wide screens
- More panel action buttons reduced in height; panel gains side borders for a cleaner floating appearance
- Solar system back button no longer obscured - sys-panel uses `max-width: 94vw` instead of forced `width: 94%` so it auto-sizes on desktop

---

## [0.21.0] - 2026-03-20

### Changed
- **Mobile-first universal UI** - bottom navigation bar (Sky / Planets / Jump / More) replaces all desktop toolbar buttons on every device; top bar with WEBSTAR title; all panels anchored as bottom sheets above the nav bar with drag-to-resize handle and snap points (collapsed / mid / expanded); search bar always visible below the top bar; eliminates separate desktop vs mobile layouts

### Added
- **Spectral key drawer** - right-side pull-out tab exposes the spectral type legend and star colour mode toggle on any screen size without occupying fixed screen space; tap the vertical SPECTRAL KEY tab to open/close
- **Data sources in More panel** - star data, exoplanet, solar system, and constellation attributions now accessible via the More menu on all devices
- **Ko-fi and portfolio links** in More panel footer

### Fixed
- More panel footer link colour was nearly invisible (`#445` near-black) - corrected to readable `#889`
- Bottom nav buttons capped at 90 px wide and centred so they are not excessively stretched on large screens
- Search tab removed from bottom nav (redundant with always-visible search bar)

---

## [0.20.0] - 2026-03-20

### Added
- **Loading overlay** - full-screen splash shown on cold start while star catalogue fetches; live status messages update through each stage (connecting, loading, parsing, mapping stars, drawing constellations); fades out smoothly once the scene is ready; prevents the broken blank-canvas appearance on Render free-tier spin-up

---

## [0.19.0] - 2026-03-19

### Added
- **Ko-fi funding** - Support link in app footer; `package.json` funding field; `.github/FUNDING.yml` for GitHub Sponsor button

---

## [0.18.0] - 2026-03-19

### Changed
- **Constellation lines rebuilt from Stellarium HIP data** - replaced hand-authored name-based line data with complete HIP-pair data from Stellarium's western sky culture (`constellationship.fab`); all 88 constellations now fully drawn with accurate multi-segment outlines (e.g. Pisces goes from 4 segments to 19, both fish loops complete)
- **Constellation lookup switched to HIP numbers** - `buildConstellationLines` now indexes stars by Hipparcos catalog number rather than IAU proper name; stars without proper names (the majority of constellation outline stars) are now correctly resolved
- **All 693 constellation stars whitelisted by HIP** - `data/stars.js` now uses a HIP-number whitelist instead of a proper-name whitelist, guaranteeing every star referenced in any constellation line is present in the cache regardless of distance or whether it has a proper name; 33 additional stars captured (78,846 total, up from 78,813)
- Star cache bumped to `hygdata_1000ly_v5.json`

---

## [0.17.0] - 2026-03-19

### Added
- **Debris belts and rings** - known asteroid belts, Kuiper belts, and debris disks rendered as semi-transparent annular rings in the system view; Sol shows Asteroid Belt (2.2-3.2 AU) and Kuiper Belt (30-55 AU); six other well-documented systems show published disk data: Epsilon Eridani (inner belt + outer Kuiper analog), Beta Pictoris (near-edge-on disk at 87 deg, 50-450 AU), Tau Ceti (dense debris disk), Fomalhaut (narrow cold ring at 133-158 AU, 24 deg inclined), Vega (warm inner dust + cold outer ring); belt names and AU ranges shown in system panel
- **Bayer designation search** - star search now matches against Bayer+constellation (e.g. "eps Eri", "bet Pic", "tau Cet") in addition to IAU proper names; Greek letter abbreviations expand so typing "epsilon" finds all eps-X stars; results display both proper name and Bayer designation where available

### Fixed
- Planet host lookup now also tries Bayer+constellation as a hostname key, fixing stars whose NASA archive hostname matches their Bayer designation (e.g. tau Cet, bet Pic, eps Eri) but who have no IAU proper name stored in HYG - these stars now correctly show the View System Map button and amber planet-host highlight
- Canvas did not resize correctly on device orientation change - synchronous resize retained for desktop; 300 ms delayed resize added for `orientationchange` to let iOS viewport dimensions settle before updating renderer
- Info panel closed immediately after opening on touch devices due to synthetic mouse events firing after touchend; `hideInfo` now ignores calls made within 150 ms of `showInfo`, and suppresses calls made during or within 800 ms of an orientation change

## [0.16.0] - 2026-03-19

### Added
- **View System Map button** - appears in the info panel whenever a planet-host star is selected; provides a tap-friendly entry into the system view on mobile where double-tap is blocked by the info panel
- **Spectral colour mode toggle** - button in the spectral legend switches between True (photometric, realistic blackbody colours) and Enhanced (saturated, visually distinct colours for easy spectral-type identification); legend dots update to match
- **Scale note** - small label in the system panel notes that orbital distances are scaled for visibility
- **karlsmith.design credit** - added to the system map panel alongside the scale note

### Fixed
- Star labels (`.star-label`) were not hidden when entering the system view - added to `body.sys-active` CSS rule
- Planet spheres were too small to see clearly at normal zoom; increased minimum radius from 0.07 to 0.18 display units
- Star glow sprite was oversized (scale 6), covering Mercury and Venus orbits entirely; reduced to 2.5
- Inclination sign mismatch between orbit ring rotation and planet position formula corrected

---

## [0.15.0] - 2026-03-19

### Changed
- **Full 6-element Keplerian mechanics** - replaced simplified inclination-rotation hack with proper `keplerToWorld()` transform applying all three rotations in sequence: argument of periapsis (ω), inclination (i), longitude of ascending node (Ω); orbit rings and planet positions now use identical transformation so planets sit exactly on their rings
- **Sol planet data upgraded to JPL J2000 precision** - all 8 planets now carry Ω, ω, M₀ from JPL Solar System Dynamics approx_pos table; periods and physical parameters updated to match current JPL values
- **Epoch-correct starting positions** - `simTime` initialised to current days from J2000 (2000-Jan-1.5 UTC); Sol system opens showing real planetary positions for today's date
- **NASA orbital data expanded** - `pl_orblper` (argument of periastron) and `pl_orbtper` (time of periastron, BJD) added to archive query; periastron time used to set correct starting phase for exoplanets where available
- **Newton-Raphson precision tightened** - tolerance 1e-10 → 1e-12, iterations 50 → 100

---

## [0.14.0] - 2026-03-19

### Added
- **Solar system view** - double-click any planet-host star (or Sol) to enter a live 3D system view; animated orbits use real Kepler mechanics (Newton-Raphson eccentric anomaly solver)
- **Habitable zone ring** - green shaded band computed from Kopparapu et al. 2013 formula (0.95*sqrt(L) to 1.37*sqrt(L) AU), scales with star luminosity
- **Planet meshes** - colour-coded by equilibrium temperature (lava/hot/warm/habitable/cold/icy); radius scaled by Earth radii
- **Orbit rings** - drawn by sampling eccentric anomaly for even visual spacing; eccentricity and inclination from NASA data where available
- **Planet labels** - HTML overlay labels with data-quality tags: "Derived (Kepler III)" when semi-major axis is calculated from period and star mass, "e=0 assumed" when eccentricity is not in the archive
- **Planet detail panel** - click a planet to see full data: orbital period, semi-major axis, eccentricity, inclination, radius, mass, equilibrium temperature, discovery method and year
- **Time controls** - 1d/s / 10d/s / 100d/s / 1yr/s speed buttons + Pause; default 10 days per second
- **Star glow sprite** - radial gradient sprite colour-matched to spectral type (O blue through M orange)
- **NASA orbital data** - `pl_orbsmax`, `pl_orbeccen`, `pl_orbincl` added to NASA Exoplanet Archive query; planets cache refreshed
- **Sol planet orbital elements** - full JPL data (sma_au, eccentricity, inclination) added to all 8 Sol planets
- **Back to Star Map** - button and Escape key return to the star map and reset camera

### Fixed
- Selected star label and marker ring from the star map no longer show through when the system view is active
- Star map mouse/keyboard events blocked while system view is open

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
