import * as THREE from 'three';
import { camera, controls, toScreenPx } from './camera.js';

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

// ---- Star glow sprite ----
const SPECT_GLOW = {
  O: 'rgba(155,176,255,1)', B: 'rgba(170,191,255,1)', A: 'rgba(202,215,255,1)',
  F: 'rgba(248,247,255,1)', G: 'rgba(255,244,234,1)', K: 'rgba(255,210,161,1)',
  M: 'rgba(255,180,111,1)',
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

  scene.add(new THREE.PointLight(0xffffff, 2, 0));
  scene.add(new THREE.AmbientLight(0x1a1a2e));
  scene.add(makeStarSprite(star.spect));
  scene.add(makeHZRing(hzInner, hzOuter));

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
    scene.add(makeOrbitLine(a_disp, e, i, Omega, omega));

    // Planet sphere
    const r_disp = Math.max(0.18, Math.min(0.9, (planet.radius_earth || 1) * 0.12));
    const mesh   = new THREE.Mesh(
      new THREE.SphereGeometry(r_disp, 16, 8),
      new THREE.MeshLambertMaterial({ color: tempToHex(planet.temp_k) })
    );
    scene.add(mesh);

    // Label
    const label = document.createElement('div');
    label.className = 'sys-label';
    const tags = [smaTag, eccTag, omegaTag, OmegaTag].filter(Boolean);
    label.innerHTML = `<span class="sys-name">${planet.name}</span>`
      + (tags.length ? `<br><span class="sys-tag">${tags.join(' · ')}</span>` : '');
    label.style.cssText = 'position:fixed;pointer-events:none;display:none;';
    document.body.appendChild(label);

    meshEntries.push({ mesh, getPos: getPlanetPos(planet, a_disp), planet, sma_au, smaTag, eccTag, label });
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
}

// ---- Planet click ----
export function handleClick(event) {
  if (!active) return;
  _mouse.x =  (event.clientX / window.innerWidth)  * 2 - 1;
  _mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  _ray.setFromCamera(_mouse, camera);
  const hits = _ray.intersectObjects(meshEntries.map(e => e.mesh));
  if (!hits.length) { document.getElementById('sys-planet-detail').style.display = 'none'; return; }
  const entry = meshEntries.find(e => e.mesh === hits[0].object);
  if (entry) _showDetail(entry);
}

function _showDetail(entry) {
  const { planet, sma_au, smaTag, eccTag } = entry;
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
  `;
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
