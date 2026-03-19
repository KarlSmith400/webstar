# WebStar

A bespoke interactive 3D star map web application built with Node.js, Express and Three.js.

## Concept

Renders a live 3D star map centred on Sol, pulling from the HYG astronomical database. Built as a portfolio piece to demonstrate custom web development beyond standard CMS work.

## Tech Stack

- **Backend:** Node.js + Express + compression (gzip)
- **Frontend:** Three.js (3D rendering), Vanilla JS
- **Data Source:** HYG Star Database v41 (119,000+ stars), filtered to 1000 LY radius
- **Hosting:** Netlify (planned)

## Architecture

```
HYG Star Data v41 (GitHub)          NASA Exoplanet Archive (TAP API)
        ↓                                        ↓
Express API -fetches, filters,         fetches pscomppars table,
caches as hygdata_1000ly_v3.json        caches as planets.json
        ↓                                        ↓
/api/stars endpoint                  /api/planets endpoint
        ↓                                        ↓
              Three.js 3D scene
     (OrbitControls, Points, LineSegments)
```

## Getting Started

```bash
npm install
node server.js
```

Open `http://localhost:3000`

Star data is fetched from GitHub on first run and cached locally. Subsequent loads are instant.

## Project Structure

```
WebStar/
├── server.js                    ← Express server + API routes
├── data/
│   ├── stars.js                 ← HYG fetch, filter, cache logic
│   ├── planets.js               ← NASA Exoplanet Archive fetch + cache logic
│   ├── hygdata_1000ly_v3.json   ← Star cache, 1000 LY radius (git-ignored)
│   └── planets.json             ← Planet cache (git-ignored)
├── public/
│   ├── index.html               ← Front end entry point + UI panels
│   ├── app.js                   ← Star map scene + all interactions
│   ├── camera.js                ← Shared camera, renderer, controls, flyTo, toScreenPx
│   ├── solar-system.js          ← Solar system view (in development)
│   └── constellations.js        ← Constellation line data
├── README.md
├── CHANGELOG.md
└── package.json
```

## Features

- **3D star map** -Sol at origin, stars at real parsec coordinates
- **Orbit / zoom / pan** -mouse controls via OrbitControls
- **Click to inspect** -info panel with constellation, magnitude, absolute magnitude, luminosity, distance, spectral type, Bayer designation, HIP number
- **Planetary systems** -confirmed exoplanet data from NASA Exoplanet Archive displayed per star; Sol shows all 8 planets with verified JPL/NASA data
- **Planet host filter** -highlights ~554 stars with confirmed exoplanets in amber, dims all others
- **Double-click to fly** -smooth camera animation to any star
- **Star search** -type a name, fly to it
- **Labels** -brightest named stars always labelled; named stars within 5 LY always labelled regardless of apparent magnitude; companions stacked below primary
- **Spectral colour coding** -O (blue) through M (orange-red)
- **Jump planner** -set jump range (LY) and max hops, visualises reachable network from any star with hop-count badge and star highlighting; spatial grid index keeps BFS fast at 1000 LY scale
- **Route finder** -Shift+click two stars for shortest BFS jump path
- **Constellation lines** -40 constellations with IAU proper names; toggling locks camera to Sol at minimum distance (Earth viewpoint) with free sky rotation; constellation names labelled in real time
- **Binary companion links** -amber lines between confirmed close companion pairs (< 0.1 LY, Gliese catalog stars)
- **Screenshot** -📷 button saves current view as PNG
- **Keyboard shortcuts** -C / P / J / R / D / Esc for all major controls; hint displayed bottom-right
- **Hover tooltip** -named star label appears on mouseover
- **Distance ruler** -click Ruler then two stars to measure LY distance; chains from last point
- **Exoplanet type sub-filter** -when planet host filter is active, refine by planet type: terrestrial / super-Earth / Neptune-like / gas giant
- **Nebulae & clusters** -12 deep-sky objects (Orion Nebula, Pleiades, Hyades, Crab Nebula, Eagle Nebula, and more) at correct 3D positions with labels
- **Touch support** -tap to select stars on mobile

## Data Sources & Licensing

### HYG Star Database v41
- **Source:** [github.com/astronexus/HYG-Database](https://github.com/astronexus/HYG-Database) by David Nash (astronexus.com)
- **Licence:** [Creative Commons Attribution-ShareAlike 4.0 (CC BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/)
- **Use here:** ✅ Free to use with attribution. The raw CSV is fetched at runtime and cached locally -it is not bundled or redistributed with the project. The CC BY-SA share-alike condition applies to redistribution of the data itself, not to applications that read it.
- **Attribution required:** "Star data: HYG Database v41 by David Nash / astronexus.com, CC BY-SA 4.0"
- **Underlying catalogs within HYG:**
  - *Hipparcos (HIP)* -ESA mission catalog, freely available with attribution
  - *Yale Bright Star Catalog* -public domain
  - *Gliese/Jahreiss Nearby Stars Catalog* -freely available for research use

### Commercialisation note
WebStar is a **data visualisation tool** -it does not sell or redistribute raw datasets. All source data is fetched at runtime from public APIs and cached server-side; end users interact with the rendered 3D application only. Under this model:
- CC BY-SA share-alike does not apply (no redistribution of the HYG data itself)
- Commercial use of the application (SaaS, portfolio, licensed tool) is permitted provided attribution remains displayed
- All npm dependencies are MIT licensed -no commercial restrictions
- NASA/JPL data is US government public domain

*This is a good-faith interpretation. Seek independent legal advice before any significant commercial deployment.*

### NASA Exoplanet Archive
- **Source:** [exoplanetarchive.ipac.caltech.edu](https://exoplanetarchive.ipac.caltech.edu/) -operated by Caltech/IPAC under contract with NASA
- **Licence:** Public domain / freely available. NASA-funded data is not subject to copyright under 17 U.S.C. § 105. The archive's own terms state data is "freely available for use by the astronomical research community and the general public."
- **Use here:** ✅ Free to use with attribution. Fetched via TAP API at runtime, cached locally, not redistributed.
- **Attribution:** "Exoplanet data: NASA Exoplanet Archive, operated by Caltech/IPAC under the Exoplanet Exploration Program"

### Sol System Data (hard-coded)
- **Orbital periods, radii, masses:** [JPL Solar System Dynamics](https://ssd.jpl.nasa.gov/planets/phys_par.html) -NASA/JPL public domain
- **Mean surface temperatures:** [NASA Science Solar System Temperatures](https://science.nasa.gov/solar-system/temperatures-across-our-solar-system/) -NASA public domain

## Data Notes

- Star data filtered to **1000 LY radius** from the full HYG v41 dataset -captures all major constellation stars including Orion belt, Antares, Rigel
- Star cache (`hygdata_1000ly_v3.json`) includes: coordinates, magnitude, absolute magnitude, luminosity, spectral type, Bayer designation, constellation, HIP number, binary companion fields; null fields omitted, coordinates rounded to 4dp
- Planet data from **NASA Exoplanet Archive** `pscomppars` table -one row per planet, controversial planets excluded (`pl_controv_flag=0`)
- Sol's planets hard-coded from JPL and NASA Science; not in the exoplanet archive (it covers other stars only)
- `comp_primary` is **only populated for Gliese catalog stars** per HYG documentation; binary links further validated by requiring companions to be < 0.1 LY apart physically
- Both caches auto-refresh every 7 days

## Performance

- Star data: **17MB raw → 2.9MB gzipped** on first load; **0B on repeat visits** (browser HTTP cache, 7-day TTL with ETag validation)
- Jump planner capped at 15 LY range and 6,000 line segments to keep interaction latency under 300ms
- `/api/stars` streams the cache file directly -no server-side JSON parse/re-stringify overhead
- CSV parsed as a stream on first run -peak server memory ~60MB (fits Render 512MB free tier)

## Live Demo

https://webstar-r7fc.onrender.com

Hosted on Render free tier. First visit after a period of inactivity may take ~30 seconds to spin up. Subsequent visits are instant.

## Planned

- [ ] Solar system zoom - click a planet-hosting star to enter a local system view
- [ ] Proximity-based binary detection for non-Gliese stars
