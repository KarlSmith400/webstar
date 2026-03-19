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
│   ├── solar-system.js          ← Solar system view - Kepler mechanics, orbits, HZ, planet detail
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
- **Star search** -type a name or Bayer designation (e.g. "eps Eri", "beta Pic"); Greek letter expansion means "epsilon" finds all eps-X stars; results show both proper name and Bayer designation
- **Labels** -brightest named stars always labelled; named stars within 5 LY always labelled regardless of apparent magnitude; companions stacked below primary
- **Spectral colour coding** -O (blue) through M (orange-red)
- **Jump planner** -set jump range (LY) and max hops, visualises reachable network from any star with hop-count badge and star highlighting; spatial grid index keeps BFS fast at 1000 LY scale
- **Route finder** -Shift+click two stars for shortest BFS jump path
- **Constellation lines** -88 constellations with complete outlines from Stellarium's western sky culture HIP-pair data; toggling locks camera to Sol at minimum distance (Earth viewpoint) with free sky rotation; constellation names labelled in real time
- **Binary companion links** -amber lines between confirmed close companion pairs (< 0.1 LY, Gliese catalog stars)
- **Screenshot** -📷 button saves current view as PNG
- **Keyboard shortcuts** -C / P / J / R / D / Esc for all major controls; hint displayed bottom-right
- **Hover tooltip** -named star label appears on mouseover
- **Distance ruler** -click Ruler then two stars to measure LY distance; chains from last point
- **Exoplanet type sub-filter** -when planet host filter is active, refine by planet type: terrestrial / super-Earth / Neptune-like / gas giant
- **Nebulae & clusters** -12 deep-sky objects (Orion Nebula, Pleiades, Hyades, Crab Nebula, Eagle Nebula, and more) at correct 3D positions with labels
- **Touch support** -tap to select stars on mobile
- **Solar system view** -double-click any planet-host star (or tap then press View System Map on mobile) to enter a live 3D system view; full 6-element Keplerian mechanics (a, e, i, Ω, ω, M₀) with Newton-Raphson solver; Sol opens at real current planetary positions (epoch J2000); habitable zone ring (Kopparapu 2013); planet meshes colour-coded by equilibrium temperature; orbit rings with correct 3D orientation; time controls (1d/s to 1yr/s + pause); planet detail panel on click; data-quality tags distinguish observed vs derived orbital elements; orbital distances scaled for visibility
- **Spectral colour modes** -toggle between True (photometric blackbody colours, realistic) and Enhanced (saturated, high-contrast) via the spectral legend
- **Debris belts and rings** -known asteroid belts, Kuiper belts, and debris disks rendered in the system view; Sol shows Asteroid Belt and Kuiper Belt; six further systems show published disk data: Epsilon Eridani, Beta Pictoris (near-edge-on at 87 deg), Tau Ceti, Fomalhaut, Vega; belt extents listed in the system panel

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
- **Orbital periods, semi-major axes, eccentricities, inclinations, radii, masses:** [JPL Solar System Dynamics](https://ssd.jpl.nasa.gov/planets/phys_par.html) -NASA/JPL public domain
- **Mean surface temperatures:** [NASA Science Solar System Temperatures](https://science.nasa.gov/solar-system/temperatures-across-our-solar-system/) -NASA public domain

### Constellation Line Data
- **Source:** Stellarium western sky culture `constellationship.fab` (v0.21.3) - [github.com/Stellarium/stellarium](https://github.com/Stellarium/stellarium)
- **Author:** Fabien Chereau ([@xalioth](https://github.com/xalioth)), founder and original developer of Stellarium. Copyright (C) 2004-2026 Fabien Chereau et al.
- **Licence:** GPL-2.0+ (Stellarium project). The current equivalent (`skycultures/modern/`) is CC BY-SA 4.0.
- **Use here:** ⚠️ The HIP-pair line data is embedded in `public/constellations.js` and distributed to browsers, which differs from the runtime-fetch model used for HYG/NASA data. Strictly speaking, GPL-2.0+ or CC BY-SA ShareAlike applies to this derived file. For a fully clean commercial deployment, consider replacing with the [MarcvdSluys/ConstellationLines](https://github.com/MarcvdSluys/ConstellationLines) dataset (CC BY 4.0, no ShareAlike).
- **Attribution:** "Constellation line data from Stellarium by Fabien Chereau et al., GPL-2.0+ — [stellarium.org](https://stellarium.org)"
- **What this covers:** 88 constellation outlines as Hipparcos catalog number pairs defining which stars to connect. The underlying IAU constellation definitions are public domain; the specific line patterns are Stellarium's editorial work.

### Habitable Zone Formula
- **Kopparapu et al. 2013** -inner edge 0.95*sqrt(L) AU, outer edge 1.37*sqrt(L) AU; freely available published research

## Data Notes

- Star data filtered to **1000 LY radius** from the full HYG v41 dataset -captures all major constellation stars including Orion belt, Antares, Rigel
- Star cache (`hygdata_1000ly_v5.json`) includes: coordinates, magnitude, absolute magnitude, luminosity, spectral type, Bayer designation, constellation, HIP number, binary companion fields; null fields omitted, coordinates rounded to 4dp
- Planet data from **NASA Exoplanet Archive** `pscomppars` table -one row per planet, controversial planets excluded (`pl_controv_flag=0`); orbital fields: `pl_orbper`, `pl_orbsmax`, `pl_orbeccen`, `pl_orbincl`, `pl_orblper` (argument of periastron), `pl_orbtper` (time of periastron, BJD)
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

- [ ] Proximity-based binary detection for non-Gliese stars
