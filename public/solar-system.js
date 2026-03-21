import * as THREE from 'three';
import { camera, controls, toScreenPx, flyToPosition } from './camera.js';

// ---- Kepler equation solver (Newton-Raphson) ----
function solveKepler(M, e) {
  // Normalise M to [0, 2π)
  M = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  let E = M;
  for (let i = 0; i < 100; i++) {
    const dE = (M - E + e * Math.sin(E)) / (1 - e * Math.cos(E));
    E += dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  return E;
}

// ---- Full 6-element Keplerian transform → Three.js world coordinates ----
// Ecliptic reference plane = Three.js XZ plane, ecliptic north = Three.js +Y
// i   = inclination (rad)
// Omega = longitude of ascending node (rad)
// omega = argument of periapsis (rad)
// E   = eccentric anomaly (rad)
function keplerToWorld(a_disp, e, i, Omega, omega, E) {
  // Position in the orbital plane (periapsis along +x)
  const xOrb = a_disp * (Math.cos(E) - e);
  const yOrb = a_disp * Math.sqrt(1 - e * e) * Math.sin(E);

  // Rotate by argument of periapsis ω (in orbital plane)
  const cosW = Math.cos(omega), sinW = Math.sin(omega);
  const x1 = xOrb * cosW - yOrb * sinW;
  const y1 = xOrb * sinW + yOrb * cosW;

  // Rotate by inclination i (tilt out of ecliptic)
  const cosI = Math.cos(i), sinI = Math.sin(i);
  const x2  = x1;
  const y2  = y1 * cosI;   // component stays in ecliptic
  const zEc = y1 * sinI;   // component out of ecliptic = ecliptic north = Three.js Y

  // Rotate by longitude of ascending node Ω (around ecliptic north)
  const cosN = Math.cos(Omega), sinN = Math.sin(Omega);
  const xEc = x2 * cosN - y2 * sinN;
  const yEc = x2 * sinN + y2 * cosN;

  // Map ecliptic (X_ecl, Y_ecl, Z_north) to Three.js (X, Y_up, Z)
  // X_ecl → X,  Y_ecl → -Z,  Z_ecl(north) → Y
  return new THREE.Vector3(xEc, zEc, -yEc);
}

// ---- Display scale: AU → scene units (power scale for outer-planet visibility) ----
function displayR(au) {
  return Math.pow(au, 0.55) * 8;
}

function _scaledR(r_earth) {
  return Math.max(0.015, r_earth * 0.10);
}

// ---- Planet colour by equilibrium temperature ----
function tempToHex(tempK) {
  if (tempK == null) return 0x888888;
  if (tempK > 1200) return 0xff3300;
  if (tempK > 700)  return 0xff8833;
  if (tempK > 400)  return 0xddaa55;
  if (tempK > 250)  return 0x55cc66;
  if (tempK > 150)  return 0x6688dd;
  return 0xaaddff;
}

// ---- Moon orbital data (JPL Planetary Satellite Mean Elements, J2000) ----
// sma_km: semi-major axis in km | e: eccentricity | i_deg: inclination
// period: days | omega/Omega/M0: degrees | r_earth: radius relative to Earth
// Source: https://ssd.jpl.nasa.gov/sats/elem/
const AU_KM = 149597870.7;

const MOONS = {
  Earth:   [{ name: 'Moon',      sma_km: 384400,   e: 0.0554, i_deg: 5.16,  period: 27.3217, omega_deg: 318.15, Omega_deg: 125.08, M0_deg: 135.27, r_earth: 0.273 }],
  Mars:    [
    { name: 'Phobos', sma_km: 9375,   e: 0.015, i_deg: 1.1,  period: 0.3187,  omega_deg: 216.3, Omega_deg: 169.2, M0_deg: 189.7, r_earth: 0.004 },
    { name: 'Deimos', sma_km: 23457,  e: 0.000, i_deg: 1.8,  period: 1.2625,  omega_deg: 0.0,   Omega_deg: 54.3,  M0_deg: 205.0, r_earth: 0.002 },
  ],
  Jupiter: [
    { name: 'Io',       sma_km: 421800,  e: 0.004, i_deg: 0.04, period: 1.7632,  omega_deg: 49.1,  Omega_deg: 0.0,   M0_deg: 330.9, r_earth: 0.286 },
    { name: 'Europa',   sma_km: 671100,  e: 0.009, i_deg: 0.47, period: 3.5252,  omega_deg: 45.0,  Omega_deg: 184.0, M0_deg: 345.4, r_earth: 0.245 },
    { name: 'Ganymede', sma_km: 1070400, e: 0.001, i_deg: 0.18, period: 7.1546,  omega_deg: 198.3, Omega_deg: 58.5,  M0_deg: 324.8, r_earth: 0.413 },
    { name: 'Callisto', sma_km: 1882700, e: 0.007, i_deg: 0.19, period: 16.6890, omega_deg: 43.8,  Omega_deg: 309.1, M0_deg: 87.4,  r_earth: 0.378 },
  ],
  Saturn: [
    { name: 'Mimas',     sma_km: 186000,  e: 0.020, i_deg: 1.6,  period: 0.9424,  omega_deg: 160.4, Omega_deg: 66.2,  M0_deg: 275.3, r_earth: 0.031 },
    { name: 'Enceladus', sma_km: 238400,  e: 0.005, i_deg: 0.0,  period: 1.3702,  omega_deg: 119.5, Omega_deg: 0.0,   M0_deg: 57.0,  r_earth: 0.040 },
    { name: 'Tethys',    sma_km: 295000,  e: 0.001, i_deg: 1.1,  period: 1.8878,  omega_deg: 335.3, Omega_deg: 273.0, M0_deg: 0.0,   r_earth: 0.084 },
    { name: 'Dione',     sma_km: 377700,  e: 0.002, i_deg: 0.0,  period: 2.7369,  omega_deg: 116.0, Omega_deg: 0.0,   M0_deg: 212.0, r_earth: 0.088 },
    { name: 'Rhea',      sma_km: 527200,  e: 0.001, i_deg: 0.3,  period: 4.5175,  omega_deg: 44.3,  Omega_deg: 133.7, M0_deg: 31.5,  r_earth: 0.120 },
    { name: 'Titan',     sma_km: 1221900, e: 0.029, i_deg: 0.3,  period: 15.9454, omega_deg: 78.3,  Omega_deg: 78.6,  M0_deg: 11.7,  r_earth: 0.404 },
  ],
  Uranus: [
    { name: 'Miranda', sma_km: 129846,  e: 0.001, i_deg: 4.4,  period: 1.4135,  omega_deg: 154.8, Omega_deg: 100.9, M0_deg: 73.0,  r_earth: 0.037 },
    { name: 'Ariel',   sma_km: 190929,  e: 0.001, i_deg: 0.0,  period: 2.5204,  omega_deg: 9.6,   Omega_deg: 0.0,   M0_deg: 193.5, r_earth: 0.091 },
    { name: 'Umbriel', sma_km: 265986,  e: 0.004, i_deg: 0.1,  period: 4.1442,  omega_deg: 183.4, Omega_deg: 174.8, M0_deg: 253.0, r_earth: 0.092 },
    { name: 'Titania', sma_km: 436298,  e: 0.002, i_deg: 0.1,  period: 8.7059,  omega_deg: 184.0, Omega_deg: 29.5,  M0_deg: 68.1,  r_earth: 0.123 },
    { name: 'Oberon',  sma_km: 583511,  e: 0.002, i_deg: 0.1,  period: 13.4632, omega_deg: 132.2, Omega_deg: 76.8,  M0_deg: 143.6, r_earth: 0.119 },
  ],
  Neptune: [
    { name: 'Triton', sma_km: 354800, e: 0.000, i_deg: 157.3, period: 5.8769, omega_deg: 0.0, Omega_deg: 178.1, M0_deg: 63.0, r_earth: 0.212 },
  ],
};

// ---- Planetary ring systems ----
// Radii from NASA Ring-Moon Systems Node (pds-rings.seti.org); planet radii from JPL SSD
// Ring coords in units of planet equatorial radius — applied as children of the planet mesh
// so they inherit the planet's proportional display scale automatically.
const RINGS = {
  Jupiter: { tilt_deg: 3.13, r_eq_km: 71492, bands: [
    { inner_km: 100000, outer_km: 122400, color: 0x443322, opacity: 0.12 }, // Halo
    { inner_km: 122400, outer_km: 129100, color: 0x554433, opacity: 0.25 }, // Main Ring
  ]},
  Saturn: { tilt_deg: 26.73, r_eq_km: 60268, bands: [
    { inner_km:  66900, outer_km:  74491, color: 0x887766, opacity: 0.20 }, // D Ring
    { inner_km:  74491, outer_km:  91975, color: 0xaa9977, opacity: 0.55 }, // C Ring
    { inner_km:  91975, outer_km: 117570, color: 0xddd0bb, opacity: 0.90 }, // B Ring (brightest)
    { inner_km: 117500, outer_km: 122050, color: 0x443322, opacity: 0.25 }, // Cassini Division
    { inner_km: 122050, outer_km: 136770, color: 0xccbba0, opacity: 0.75 }, // A Ring
    { inner_km: 139826, outer_km: 140612, color: 0xaaaaaa, opacity: 0.40 }, // F Ring
  ]},
  Uranus: { tilt_deg: 97.77, r_eq_km: 25559, bands: [
    { inner_km: 37850, outer_km: 51178, color: 0x778899, opacity: 0.45 }, // Main ring system (Six→Epsilon)
  ]},
  Neptune: { tilt_deg: 28.32, r_eq_km: 24764, bands: [
    { inner_km: 41000, outer_km: 43000, color: 0x446688, opacity: 0.30 }, // Galle (diffuse)
    { inner_km: 53150, outer_km: 57200, color: 0x5577aa, opacity: 0.40 }, // Le Verrier + Lassell
    { inner_km: 62926, outer_km: 62941, color: 0x6688bb, opacity: 0.65 }, // Adams Ring
  ]},
};

function getMoonPos(moon, planetPos, simTime, scale) {
  const n   = (2 * Math.PI) / moon.period;
  const M   = ((moon.M0_deg * Math.PI / 180) + n * simTime);
  const E   = solveKepler(M, moon.e);
  const a   = (moon.sma_km / AU_KM) * scale;
  const i   = moon.i_deg   * Math.PI / 180;
  const Omega = moon.Omega_deg * Math.PI / 180;
  const omega = moon.omega_deg * Math.PI / 180;
  return keplerToWorld(a, moon.e, i, Omega, omega, E).add(planetPos);
}

// ---- Star glow sprite ----
const SPECT_GLOW = {
  O: 'rgba(155,176,255,1)', B: 'rgba(170,191,255,1)', A: 'rgba(202,215,255,1)',
  F: 'rgba(248,247,255,1)', G: 'rgba(255,244,234,1)', K: 'rgba(255,210,161,1)',
  M: 'rgba(255,204,111,1)',
};

function makeStarSprite(spect) {
  const col = (spect && SPECT_GLOW[spect[0].toUpperCase()]) || SPECT_GLOW.G;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0,    col);
  grad.addColorStop(0.12, col.replace(',1)', ',0.7)'));
  grad.addColorStop(0.4,  col.replace(',1)', ',0.15)'));
  grad.addColorStop(1,    'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const mat = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(c),
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const s = new THREE.Sprite(mat);
  s.scale.setScalar(2.5);
  return s;
}

// ---- Known debris belts keyed by HIP number (or 'sol') ----
// Sources: JPL, Herschel Space Observatory, Spitzer surveys, published literature
const _SOL   = [
  { name: 'Asteroid Belt', inner_au: 2.2,  outer_au: 3.2,  color: 0xa08060, opacity: 0.35, incl: 1.8 },
  { name: 'Kuiper Belt',   inner_au: 30,   outer_au: 55,   color: 0x6688aa, opacity: 0.18, incl: 1.9 },
];
const _EPS_ERI = [  // HIP 16537 — Ran (Backman et al. 2009, Spitzer)
  { name: 'Inner Belt',   inner_au: 1.5,  outer_au: 4.0,  color: 0xa08060, opacity: 0.28, incl: 0 },
  { name: 'Outer Disk',   inner_au: 35,   outer_au: 90,   color: 0x6688aa, opacity: 0.15, incl: 0 },
];
const _BET_PIC = [  // HIP 27321 — Beta Pictoris (Smith & Terrile 1984; Golimowski et al. 2006)
  { name: 'Debris Disk',  inner_au: 50,   outer_au: 450,  color: 0x9999bb, opacity: 0.22, incl: 87 },
];
const _TAU_CET = [  // HIP 8102 — Tau Ceti (Greaves et al. 2004; ~10× Sol Kuiper density)
  { name: 'Debris Disk',  inner_au: 1,    outer_au: 55,   color: 0xaa8855, opacity: 0.25, incl: 0 },
];
const _FOMALHAUT = [  // HIP 113368 — Fomalhaut (Kalas et al. 2005; Herschel; ring width ~25 AU)
  { name: 'Debris Ring',  inner_au: 133,  outer_au: 158,  color: 0xaaaaaa, opacity: 0.30, incl: 24 },
];
const _VEGA = [  // HIP 91262 — Vega (Su et al. 2005; warm dust + cold extended ring)
  { name: 'Warm Dust',    inner_au: 0.17, outer_au: 0.3,  color: 0xcc9966, opacity: 0.35, incl: 0 },
  { name: 'Cold Ring',    inner_au: 86,   outer_au: 194,  color: 0x7799bb, opacity: 0.18, incl: 0 },
];
const KNOWN_BELTS = {
  sol:    _SOL,       // Sol special key
  16537:  _EPS_ERI,   // Epsilon Eridani / Ran
  27321:  _BET_PIC,   // Beta Pictoris
  8102:   _TAU_CET,   // Tau Ceti
  113368: _FOMALHAUT, // Fomalhaut
  91262:  _VEGA,      // Vega
};

// ---- Debris belt ring (annular disc, optionally inclined) ----
function makeDebrisBelt(innerAU, outerAU, color, opacity, inclDeg) {
  const innerR = displayR(innerAU);
  const outerR = displayR(outerAU);
  const segs = 128;
  const shape = new THREE.Shape();
  for (let k = 0; k <= segs; k++) {
    const a = (k / segs) * Math.PI * 2;
    if (k === 0) shape.moveTo(outerR * Math.cos(a), outerR * Math.sin(a));
    else         shape.lineTo(outerR * Math.cos(a), outerR * Math.sin(a));
  }
  const hole = new THREE.Path();
  for (let k = 0; k <= segs; k++) {
    const a = (k / segs) * Math.PI * 2;
    if (k === 0) hole.moveTo(innerR * Math.cos(a), innerR * Math.sin(a));
    else         hole.lineTo(innerR * Math.cos(a), innerR * Math.sin(a));
  }
  shape.holes.push(hole);
  const geom = new THREE.ShapeGeometry(shape, segs);
  const mat  = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.rotation.x = -Math.PI / 2 + ((inclDeg || 0) * Math.PI / 180);
  return mesh;
}

// ---- Habitable zone ring (Kopparapu et al. 2013) ----
function makeHZRing(innerAU, outerAU) {
  const innerR = displayR(innerAU);
  const outerR = displayR(outerAU);
  const segs = 128;
  const shape = new THREE.Shape();
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    if (i === 0) shape.moveTo(outerR * Math.cos(a), outerR * Math.sin(a));
    else         shape.lineTo(outerR * Math.cos(a), outerR * Math.sin(a));
  }
  const hole = new THREE.Path();
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    if (i === 0) hole.moveTo(innerR * Math.cos(a), innerR * Math.sin(a));
    else         hole.lineTo(innerR * Math.cos(a), innerR * Math.sin(a));
  }
  shape.holes.push(hole);
  const geom = new THREE.ShapeGeometry(shape, segs);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x00aa44, transparent: true, opacity: 0.12,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.rotation.x = -Math.PI / 2; // HZ ring lies in the ecliptic reference plane
  return mesh;
}

// ---- Orbit ring using full Keplerian transform ----
function makeOrbitLine(a_disp, e, i, Omega, omega) {
  const pts = [];
  const segs = 360;
  for (let k = 0; k <= segs; k++) {
    const E = (k / segs) * Math.PI * 2;
    pts.push(keplerToWorld(a_disp, e, i, Omega, omega, E));
  }
  const geom = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color: 0x223344, transparent: true, opacity: 0.55 });
  return new THREE.LineLoop(geom, mat);
}

// ---- Mean anomaly at time t (days from J2000) ----
// BJD convention used by NASA archive: BJD - 2454833 (Kepler mission epoch)
const BJD_TO_JD  = 2454833.0;
const J2000_JD   = 2451545.0;

function getMeanAnomaly(planet, t_days) {
  const P = planet.period_days;
  if (!P) return 0;

  if (planet.t_peri_bjd != null) {
    // Convert periastron time from BJD to days-from-J2000
    const t_peri = (planet.t_peri_bjd + BJD_TO_JD) - J2000_JD;
    return (2 * Math.PI * (t_days - t_peri)) / P;
  }

  // Use mean anomaly at J2000 epoch
  const M0 = ((planet.M0_deg || 0) * Math.PI) / 180;
  return M0 + (2 * Math.PI * t_days) / P;
}

// ---- Planet world position at t (days from J2000) ----
function getPlanetPos(planet, a_disp) {
  return (t_days) => {
    const e     = planet.eccentricity || 0;
    const i     = ((planet.inclination || 0) * Math.PI) / 180;
    const Omega = ((planet.Omega_deg  || 0) * Math.PI) / 180;
    const omega = ((planet.omega_deg  || 0) * Math.PI) / 180;
    const M     = getMeanAnomaly(planet, t_days);
    const E     = solveKepler(M, e);
    return keplerToWorld(a_disp, e, i, Omega, omega, E);
  };
}

// ---- Days from J2000 at page load ----
const J2000_DATE = new Date('2000-01-01T12:00:00Z');

// ---- Module state ----
export const scene = new THREE.Scene();
let active   = false;
let simTime  = 0;      // days from J2000
let timeScale = 10;    // days per second
let paused   = false;
let meshEntries = [];  // { mesh, getPos, planet, sma_au, smaTag, eccTag, label }
let _hostStar = null;
let _starHitMesh = null;
let _focusedEntry = null; // planet currently zoomed into
let moonEntries   = [];   // { mesh, moon, label } for focused planet's moons
let _systemObjects = [];  // HZ ring + orbit lines hidden during planet focus

// ---- Raycaster ----
const _ray   = new THREE.Raycaster();
const _mouse = new THREE.Vector2();

// ---- Enter system view ----
export function enter(star, system) {
  _cleanup();
  active = true;

  // Start at current real date so Sol positions are accurate
  simTime = (Date.now() - J2000_DATE.getTime()) / 86400000;

  const lum      = star.lum || 1.0;
  const starMass = Math.pow(lum, 0.25); // mass-luminosity M ~ L^0.25
  const hzInner  = 0.95 * Math.sqrt(lum);
  const hzOuter  = 1.37 * Math.sqrt(lum);

  _hostStar = star;
  scene.add(new THREE.PointLight(0xffffff, 2, 0));
  scene.add(new THREE.AmbientLight(0x1a1a2e));
  scene.add(makeStarSprite(star.spect));
  const hzRing = makeHZRing(hzInner, hzOuter);
  scene.add(hzRing);
  _systemObjects.push(hzRing);

  // Invisible hit sphere for clicking the star
  _starHitMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 8, 8),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 })
  );
  scene.add(_starHitMesh);

  // Debris belts
  const beltKey = star.id === 'sol' ? 'sol' : star.hip;
  const belts = KNOWN_BELTS[beltKey] || [];
  for (const b of belts) scene.add(makeDebrisBelt(b.inner_au, b.outer_au, b.color, b.opacity, b.incl));
  const beltsEl = document.getElementById('sys-panel-belts');
  if (beltsEl) beltsEl.textContent = belts.length
    ? belts.map(b => `${b.name} (${b.inner_au}–${b.outer_au} AU)`).join('  ·  ')
    : '';

  const sorted = [...system.planets].sort((a, b) => (a.period_days || 999999) - (b.period_days || 999999));

  for (const planet of sorted) {
    // Semi-major axis
    let sma_au = planet.sma_au != null ? planet.sma_au : null;
    let smaTag = null;
    if (sma_au == null && planet.period_days != null) {
      const P = planet.period_days / 365.25;
      sma_au = Math.cbrt(starMass * P * P);
      smaTag = 'Derived (Kepler III)';
    }
    if (sma_au == null || sma_au <= 0) continue;

    const a_disp   = displayR(sma_au);
    const e        = planet.eccentricity != null ? planet.eccentricity : 0;
    const i        = ((planet.inclination || 0) * Math.PI) / 180;
    const Omega    = ((planet.Omega_deg  || 0) * Math.PI) / 180;
    const omega    = ((planet.omega_deg  || 0) * Math.PI) / 180;
    const eccTag   = planet.eccentricity == null ? 'e=0 assumed' : null;
    const omegaTag = planet.omega_deg    == null ? 'ω unknown'   : null;
    const OmegaTag = planet.Omega_deg    == null ? 'Ω unknown'   : null;

    // Orbit ring — full 3D Keplerian geometry
    const orbitLine = makeOrbitLine(a_disp, e, i, Omega, omega);
    scene.add(orbitLine);
    _systemObjects.push(orbitLine);

    // Planet sphere — unit sphere scaled so scale can be updated without geometry rebuild
    const r_earth = planet.radius_earth || 1;
    const mesh    = new THREE.Mesh(
      new THREE.SphereGeometry(1, 16, 8),
      new THREE.MeshLambertMaterial({ color: tempToHex(planet.temp_k) })
    );
    mesh.scale.setScalar(_scaledR(r_earth));
    scene.add(mesh);

    // Planetary rings — added as children so they follow the planet automatically
    const ringData = RINGS[planet.name];
    if (ringData) {
      const tilt = (ringData.tilt_deg * Math.PI) / 180;
      for (const band of ringData.bands) {
        const inner = band.inner_km / ringData.r_eq_km;
        const outer = band.outer_km / ringData.r_eq_km;
        const geo = new THREE.RingGeometry(inner, outer, 128);
        const mat = new THREE.MeshBasicMaterial({ color: band.color, opacity: band.opacity, transparent: true, side: THREE.DoubleSide });
        const ringMesh = new THREE.Mesh(geo, mat);
        ringMesh.rotation.x = Math.PI / 2 + tilt;
        mesh.add(ringMesh);
      }
    }

    // Label
    const label = document.createElement('div');
    label.className = 'sys-label';
    const tags = [smaTag, eccTag, omegaTag, OmegaTag].filter(Boolean);
    label.innerHTML = `<span class="sys-name">${planet.name}</span>`
      + (tags.length ? `<br><span class="sys-tag">${tags.join(' · ')}</span>` : '');
    label.style.cssText = 'position:fixed;pointer-events:auto;display:none;cursor:pointer;';
    document.body.appendChild(label);

    const entry = { mesh, getPos: getPlanetPos(planet, a_disp), planet, sma_au, smaTag, eccTag, label, r_earth };
    label.addEventListener('click', () => { focusPlanet(entry); _showDetail(entry); });
    meshEntries.push(entry);
  }

  // Camera above the ecliptic plane looking toward the system
  const maxR = meshEntries.length
    ? displayR(meshEntries[meshEntries.length - 1].sma_au) : 30;
  camera.position.set(0, maxR * 0.9, maxR * 1.2);
  controls.target.set(0, 0, 0);
  controls.minDistance = 0.5;
  controls.maxDistance = maxR * 20;
  controls.enablePan = true;
  controls.update();

  document.body.classList.add('sys-active');
  document.getElementById('sys-back-btn').style.display = 'block';
  document.getElementById('sys-panel').style.display = 'block';
  document.getElementById('sys-panel-name').textContent = star.name || 'Unknown Star';
  document.getElementById('sys-panel-lum').textContent =
    `Luminosity: ${lum < 0.001 ? lum.toExponential(2) : lum.toFixed(3)} L\u2609  |  Est. mass: ~${starMass.toFixed(2)} M\u2609`;
  document.getElementById('sys-panel-hz').textContent =
    `Habitable zone: ${hzInner.toFixed(2)} \u2013 ${hzOuter.toFixed(2)} AU  (Kopparapu 2013)`;
}

// ---- Exit ----
export function exit() {
  _cleanup();
  document.body.classList.remove('sys-active');
  document.getElementById('sys-back-btn').style.display = 'none';
  document.getElementById('sys-panel').style.display = 'none';
  document.getElementById('sys-planet-detail').style.display = 'none';
}

function _cleanup() {
  active = false;
  while (scene.children.length) scene.remove(scene.children[0]);
  meshEntries.forEach(e => e.label.remove());
  meshEntries = [];
  _hostStar = null;
  _starHitMesh = null;
  _focusedEntry = null;
  _systemObjects = [];
  clearMoons();
  document.getElementById('sys-zoom-back')?.remove();
}

export function isActive() { return active; }

// ---- Per-frame update ----
export function update(dt_ms) {
  if (!active) return;
  if (!paused) simTime += (dt_ms / 1000) * timeScale;

  for (const entry of meshEntries) {
    const pos = entry.getPos(simTime);
    entry.mesh.position.copy(pos);

    const sp = toScreenPx(pos);
    if (sp.behind) {
      entry.label.style.display = 'none';
    } else {
      entry.label.style.display = 'block';
      entry.label.style.left = Math.round(sp.x + 8) + 'px';
      entry.label.style.top  = Math.round(sp.y - 16) + 'px';
    }
  }

  // Keep camera locked onto focused planet as it moves
  if (_focusedEntry) {
    const pos = _focusedEntry.getPos(simTime);
    const offset = camera.position.clone().sub(controls.target);
    controls.target.copy(pos);
    camera.position.copy(pos).add(offset);

    // Update moon positions and orbit rings relative to the moving planet
    for (const m of moonEntries) {
      m.ring.position.copy(pos);
      const mpos = getMoonPos(m.moon, pos, simTime, m.moonDisplayScale);
      m.mesh.position.copy(mpos);
      const sp = toScreenPx(mpos);
      if (sp.behind) { m.label.style.display = 'none'; }
      else {
        m.label.style.display = 'block';
        m.label.style.left = Math.round(sp.x + 6) + 'px';
        m.label.style.top  = Math.round(sp.y - 12) + 'px';
      }
    }
  }
}

function buildMoons(entry) {
  clearMoons();
  const moons = MOONS[entry.planet.name];
  if (!moons || !moons.length) return 0;
  const planetR = entry.mesh.scale.x;

  // Scale so innermost moon sits just outside the planet (2× radius), capped so outermost ≤ 20× radius
  const minSmaKm = Math.min(...moons.map(m => m.sma_km));
  const maxSmaKm = Math.max(...moons.map(m => m.sma_km));
  const scaleFromInner = (planetR * 2) / (minSmaKm / AU_KM);
  const scaleFromOuter = (planetR * 20) / (maxSmaKm / AU_KM);
  const moonDisplayScale = Math.min(scaleFromInner, scaleFromOuter);

  for (const moon of moons) {
    const a = (moon.sma_km / AU_KM) * moonDisplayScale;
    const r = _scaledR(moon.r_earth || 0.1);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(r, 10, 6),
      new THREE.MeshLambertMaterial({ color: 0xaaaaaa })
    );
    scene.add(mesh);

    // Orbit ring - sample the Keplerian ellipse at 64 points
    const ringPts = [];
    const i_r = moon.i_deg   * Math.PI / 180;
    const O_r = moon.Omega_deg * Math.PI / 180;
    const w_r = moon.omega_deg * Math.PI / 180;
    for (let j = 0; j <= 64; j++) {
      const E_sample = (j / 64) * Math.PI * 2;
      ringPts.push(keplerToWorld(a, moon.e, i_r, O_r, w_r, E_sample));
    }
    const ring = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(ringPts),
      new THREE.LineBasicMaterial({ color: 0x444466, opacity: 0.5, transparent: true })
    );
    scene.add(ring);

    const label = document.createElement('div');
    label.className = 'sys-label';
    label.innerHTML = `<span class="sys-name" style="font-size:9px">${moon.name}</span>`;
    label.style.cssText = 'position:fixed;pointer-events:none;display:none;';
    document.body.appendChild(label);

    moonEntries.push({ mesh, moon, label, ring, parentEntry: entry, moonDisplayScale });
  }
  return (maxSmaKm / AU_KM) * moonDisplayScale; // outer moon display radius
}

function clearMoons() {
  for (const m of moonEntries) {
    scene.remove(m.mesh);
    scene.remove(m.ring);
    m.label.remove();
  }
  moonEntries = [];
}

export function unfocusPlanet() {
  if (!_focusedEntry) return;
  _focusedEntry = null;
  clearMoons();
  _systemObjects.forEach(o => { o.visible = true; });
  const maxR = meshEntries.length ? displayR(meshEntries[meshEntries.length - 1].sma_au) : 30;
  flyToPosition(new THREE.Vector3(0, maxR * 0.9, maxR * 1.2), new THREE.Vector3(0, 0, 0));
  controls.minDistance = 0.5;
  controls.maxDistance = maxR * 20;
  document.getElementById('sys-zoom-back')?.remove();
}

function focusPlanet(entry) {
  _focusedEntry = entry;
  _systemObjects.forEach(o => { o.visible = false; });
  const outerR = buildMoons(entry) || 0;
  const planetPos = entry.getPos(simTime);
  const r = entry.mesh.scale.x;
  const viewDist = Math.max(r * 8, outerR * 2.5);
  flyToPosition(planetPos.clone().add(new THREE.Vector3(0, viewDist * 0.5, viewDist)), planetPos.clone());
  controls.minDistance = r * 2;
  controls.maxDistance = Math.max(r * 80, outerR * 10);
  document.getElementById('sys-planet-detail').style.display = 'none';
  document.getElementById('sys-zoom-back')?.remove();
  const btn = document.createElement('button');
  btn.id = 'sys-zoom-back';
  btn.textContent = '← System view';
  btn.style.cssText = 'position:fixed;top:160px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);border:1px solid rgba(255,255,255,0.2);color:#aaa;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:12px;z-index:200;';
  btn.addEventListener('click', unfocusPlanet);
  document.body.appendChild(btn);
}

// ---- Planet double-click (zoom in) - kept for API compat ----
export function handleDblClick(event) {
  if (!active) return;
  _mouse.x =  (event.clientX / window.innerWidth)  * 2 - 1;
  _mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  _ray.setFromCamera(_mouse, camera);
  const hits = _ray.intersectObjects(meshEntries.map(e => e.mesh));
  if (!hits.length) return;
  const entry = meshEntries.find(e => e.mesh === hits[0].object);
  if (entry) focusPlanet(entry);
}

// ---- Planet click ----
export function handleClick(event) {
  if (!active) return;
  _mouse.x =  (event.clientX / window.innerWidth)  * 2 - 1;
  _mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  _ray.setFromCamera(_mouse, camera);

  // Check star first
  if (_starHitMesh) {
    const starHits = _ray.intersectObject(_starHitMesh);
    if (starHits.length) { _showStarDetail(); return; }
  }

  // Check moons
  if (moonEntries.length) {
    const moonHits = _ray.intersectObjects(moonEntries.map(m => m.mesh));
    if (moonHits.length) {
      const entry = moonEntries.find(m => m.mesh === moonHits[0].object);
      if (entry) { _showMoonDetail(entry.moon); return; }
    }
  }

  const hits = _ray.intersectObjects(meshEntries.map(e => e.mesh));
  if (!hits.length) { document.getElementById('sys-planet-detail').style.display = 'none'; return; }
  const entry = meshEntries.find(e => e.mesh === hits[0].object);
  if (entry) _showDetail(entry);
}

function _showStarDetail() {
  const s = _hostStar;
  const lum = s.lum || 1.0;
  const mass = Math.pow(lum, 0.25).toFixed(2);
  const panel = document.getElementById('sys-planet-detail');
  const rows = [
    ['Spectral type', s.spect || 'Unknown'],
    ['Luminosity',    `${lum < 0.001 ? lum.toExponential(2) : lum.toFixed(3)} L\u2609`],
    ['Est. mass',     `~${mass} M\u2609`],
    ['Distance',      s.dist ? `${s.dist.toFixed(2)} ly` : 'Sol'],
    ['Magnitude',     s.mag != null ? s.mag.toFixed(2) : null],
    ['Abs. magnitude',s.absmag != null ? s.absmag.toFixed(2) : null],
    ['HIP',           s.hip ? `HIP ${s.hip}` : null],
  ].filter(([, v]) => v != null);

  panel.innerHTML = `
    <div style="font-size:13px;color:#fff;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.1);">${s.name || 'Host Star'}</div>
    ${rows.map(([k, v]) => `<div style="font-size:11px;line-height:1.9;"><span style="color:#555;">${k}:</span> ${v}</div>`).join('')}
    <button id="sys-exit-btn" style="margin-top:8px;width:100%;padding:5px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);border-radius:5px;color:#aaa;font-size:11px;cursor:pointer;">← Back to Star Map</button>
  `;
  document.getElementById('sys-exit-btn').addEventListener('click', () => {
    panel.style.display = 'none';
    document.getElementById('sys-back-btn').click();
  });
  panel.style.display = 'block';
}

function _showMoonDetail(moon) {
  const panel = document.getElementById('sys-planet-detail');
  const rows = [
    ['Orbital period', `${moon.period.toFixed(4)} days`],
    ['Semi-major axis', `${moon.sma_km.toLocaleString()} km`],
    ['Eccentricity',   moon.e.toFixed(4)],
    ['Inclination',    `${moon.i_deg.toFixed(2)}\u00b0`],
    ['Radius',         moon.r_earth ? `${moon.r_earth.toFixed(3)} R\u2295` : null],
  ].filter(([, v]) => v != null);
  panel.innerHTML = `
    <div style="font-size:13px;color:#fff;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.1);">${moon.name}</div>
    ${rows.map(([k, v]) => `<div style="font-size:11px;line-height:1.9;"><span style="color:#555;">${k}:</span> ${v}</div>`).join('')}
  `;
  panel.style.display = 'block';
}

function _showDetail(entry) {
  const { planet, sma_au, smaTag, eccTag } = entry;
  const hasMoons = MOONS[planet.name] && MOONS[planet.name].length > 0;
  const panel = document.getElementById('sys-planet-detail');

  const smaStr = planet.sma_au != null
    ? `${planet.sma_au.toFixed(4)} AU`
    : (smaTag ? `${sma_au.toFixed(4)} AU (${smaTag})` : null);

  const omegaStr = planet.omega_deg != null
    ? `${planet.omega_deg.toFixed(2)}\u00b0`
    : 'Not available';
  const OmegaStr = planet.Omega_deg != null
    ? `${planet.Omega_deg.toFixed(2)}\u00b0`
    : 'Not available';
  const M0Str = planet.M0_deg != null
    ? `${planet.M0_deg.toFixed(2)}\u00b0  (J2000)`
    : (planet.t_peri_bjd != null ? `from T\u209a = BJD ${planet.t_peri_bjd.toFixed(4)}` : 'Not available');

  const rows = [
    ['Orbital period',     planet.period_days != null ? `${planet.period_days.toFixed(5)} days` : null],
    ['Semi-major axis',    smaStr],
    ['Eccentricity',       planet.eccentricity != null ? planet.eccentricity.toFixed(6) : `0 (${eccTag})`],
    ['Inclination',        planet.inclination  != null ? `${planet.inclination.toFixed(5)}\u00b0` : null],
    ['Arg. of periapsis',  omegaStr],
    ['Ascending node',     OmegaStr],
    ['Mean anomaly J2000', M0Str],
    ['Radius',             planet.radius_earth != null ? `${planet.radius_earth.toFixed(3)} R\u2295` : null],
    ['Mass',               planet.mass_earth   != null ? `${planet.mass_earth.toFixed(4)} M\u2295` : null],
    ['Eq. temperature',    planet.temp_k != null ? `${Math.round(planet.temp_k)} K` : null],
    ['Discovery',          planet.method ? `${planet.method}${planet.year ? ', ' + planet.year : ''}` : null],
  ].filter(([, v]) => v != null);

  panel.innerHTML = `
    <div style="font-size:13px;color:#fff;margin-bottom:6px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.1);">${planet.name}</div>
    ${rows.map(([k, v]) => `<div style="font-size:11px;line-height:1.9;"><span style="color:#555;">${k}:</span> ${v}</div>`).join('')}
    ${hasMoons ? `<button id="view-moons-btn" style="margin-top:8px;width:100%;padding:5px;background:rgba(100,180,255,0.15);border:1px solid rgba(100,180,255,0.3);border-radius:5px;color:#7af;font-size:11px;cursor:pointer;">View Moon Orbits</button>` : ''}
  `;
  if (hasMoons) {
    document.getElementById('view-moons-btn').addEventListener('click', () => focusPlanet(entry));
  }
  panel.style.display = 'block';
}

// ---- Time controls ----
export function setTimeScale(s) { timeScale = s; }
export function togglePause() {
  paused = !paused;
  const btn = document.getElementById('sys-pause-btn');
  btn.textContent = paused ? 'Resume' : 'Pause';
  btn.classList.toggle('paused', paused);
}
