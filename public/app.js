import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONSTELLATIONS } from './constellations.js';

// --- Scene setup ---
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 100000);
camera.position.set(0, 0, 80);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('scene').appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.1;
controls.maxDistance = 5000;
controls.target.set(0, 0, 0); // Always orbit Sol

// --- Sol marker (invisible sphere just for raycasting) ---
const sunGeom = new THREE.SphereGeometry(0.5, 8, 8);
const sunMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
const sun = new THREE.Mesh(sunGeom, sunMat);
scene.add(sun);

// Reference grid ring so you know where the galactic plane is
const gridHelper = new THREE.GridHelper(500, 20, 0x111133, 0x111133);
scene.add(gridHelper);

// --- Spectral colour map ---
const spectralColors = {
  O: 0x9bb0ff,
  B: 0xaabfff,
  A: 0xcad7ff,
  F: 0xf8f7ff,
  G: 0xfff4ea,
  K: 0xffd2a1,
  M: 0xffcc6f,
};

function spectToHex(spect) {
  if (!spect) return 0xffffff;
  return spectralColors[spect[0].toUpperCase()] || 0xffffff;
}

// --- Build star field ---
let starDataArray = [];
let pointsMesh = null;

function buildStarField(stars) {
  starDataArray = stars;

  const positions = new Float32Array(stars.length * 3);
  const colors = new Float32Array(stars.length * 3);
  const color = new THREE.Color();

  for (let i = 0; i < stars.length; i++) {
    const s = stars[i];
    positions[i * 3]     = s.x;
    positions[i * 3 + 1] = s.y;
    positions[i * 3 + 2] = s.z;

    color.setHex(spectToHex(s.spect));
    // Boost brightness based on magnitude
    const brightness = Math.min(1, (7 - s.mag) / 5);
    colors[i * 3]     = color.r * brightness;
    colors[i * 3 + 1] = color.g * brightness;
    colors[i * 3 + 2] = color.b * brightness;
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const mat = new THREE.PointsMaterial({
    vertexColors: true,
    sizeAttenuation: false,
    size: 3,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  pointsMesh = new THREE.Points(geom, mat);
  scene.add(pointsMesh);
}

// --- Binary / companion star links ---
let binaryLines = null;
const companionCount = new Map(); // starId -> number of companions

function buildBinaryLinks(stars) {
  const idMap = new Map(stars.map(s => [s.id, s]));
  const positions = [];
  const drawn = new Set();

  // Method 1: comp_primary field (Gliese catalog stars only)
  for (const star of stars) {
    if (!star.comp_primary || star.comp_primary === star.id) continue;
    const primary = idMap.get(star.comp_primary);
    if (!primary) continue;
    const d = Math.hypot(star.x - primary.x, star.y - primary.y, star.z - primary.z) * 3.26156;
    if (d > 0.1) continue;
    const key = [star.comp_primary, star.id].sort().join('-');
    if (drawn.has(key)) continue;
    positions.push(primary.x, primary.y, primary.z, star.x, star.y, star.z);
    drawn.add(key);
    companionCount.set(star.id, (companionCount.get(star.id) || 0) + 1);
    companionCount.set(primary.id, (companionCount.get(primary.id) || 0) + 1);
  }

  // Method 2: proximity-based — sorted by x, sliding window
  const THRESHOLD_PC = 0.01 / 3.26156;
  const sorted = [...stars].sort((a, b) => a.x - b.x);

  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j];
      if (b.x - a.x > THRESHOLD_PC) break;
      const dist = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
      if (dist > THRESHOLD_PC) continue;
      const key = [a.id, b.id].sort().join('-');
      if (drawn.has(key)) continue;
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      drawn.add(key);
      companionCount.set(a.id, (companionCount.get(a.id) || 0) + 1);
      companionCount.set(b.id, (companionCount.get(b.id) || 0) + 1);
    }
  }

  if (positions.length === 0) return;

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  const mat = new THREE.LineBasicMaterial({ color: 0x886600, transparent: true, opacity: 0.5 });
  binaryLines = new THREE.LineSegments(geom, mat);
  binaryLines.visible = true;
  scene.add(binaryLines);
}

// --- Labels for brightest named stars ---
const labelPool = [];

const NEARBY_LY = 5 / 3.26156; // 5 LY in parsecs (~1.53 pc)

function addLabels(stars) {
  const seen = new Set();

  const bright = stars.filter(s => {
    if (!s.name || s.mag >= 2.5) return false;
    if (seen.has(s.name)) return false;
    seen.add(s.name);
    return true;
  }).sort((a, b) => a.mag - b.mag).slice(0, 60);

  const nearby = stars.filter(s => {
    if (!s.name || s.dist > NEARBY_LY) return false;
    if (seen.has(s.name)) return false; // already in bright list
    seen.add(s.name);
    return true;
  }).sort((a, b) => a.dist - b.dist);

  for (const s of [...bright, ...nearby]) {
    const div = document.createElement('div');
    div.className = 'star-label';
    const companions = companionCount.get(s.id) || 0;
    div.textContent = companions > 0 ? `${s.name}  ${companions + 1}★` : s.name;
    document.body.appendChild(div);
    labelPool.push({ el: div, star: s });
  }
}

const labelLinesSVG = document.getElementById('label-lines');

function updateLabels() {
  const vec = new THREE.Vector3();
  const placed = [];
  labelLinesSVG.innerHTML = '';

  for (const { el, star } of labelPool) {
    vec.set(star.x, star.y, star.z);
    vec.project(camera);
    const sx = (vec.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-vec.y * 0.5 + 0.5) * window.innerHeight;

    if (vec.z < 1) {
      const nearby = placed.find(p => Math.hypot(p.x - sx, p.y - sy) < 40);
      let lx, ly;

      if (nearby) {
        lx = Math.round(nearby.x + 8);
        ly = Math.round(nearby.nextOffsetY);
        el.style.color = 'rgba(255,255,255,0.45)';
        el.style.fontSize = '10px';
        nearby.nextOffsetY += 13;
      } else {
        lx = Math.round(sx + 8);
        ly = Math.round(sy - 6);
        el.style.color = 'rgba(255,255,255,0.85)';
        el.style.fontSize = '11px';
        placed.push({ x: sx, y: sy, nextOffsetY: sy + 8 });
      }

      el.style.display = 'block';
      el.style.left = lx + 'px';
      el.style.top = ly + 'px';

      // Draw connector line if label is far enough from star
      const dist = Math.hypot(lx - sx, ly - sy);
      if (dist > 14) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', Math.round(sx));
        line.setAttribute('y1', Math.round(sy));
        line.setAttribute('x2', lx - 2);
        line.setAttribute('y2', ly + 5);
        line.setAttribute('stroke', 'rgba(255,255,255,0.2)');
        line.setAttribute('stroke-width', '0.5');
        labelLinesSVG.appendChild(line);
      }
    } else {
      el.style.display = 'none';
    }
  }
}

// --- Click detection ---
const _vec = new THREE.Vector3();
let selectedMarker = null;
let dragMoved = false;
const HIT_RADIUS_PX = 18; // pixels

renderer.domElement.addEventListener('mousedown', () => { dragMoved = false; });
renderer.domElement.addEventListener('mousemove', () => { dragMoved = true; });
renderer.domElement.addEventListener('mouseup', (e) => {
  if (!dragMoved) onMouseClick(e);
});

function toScreenPx(worldPos) {
  _vec.copy(worldPos).project(camera);
  return {
    x: (_vec.x * 0.5 + 0.5) * window.innerWidth,
    y: (-_vec.y * 0.5 + 0.5) * window.innerHeight,
    behind: _vec.z > 1
  };
}

function onMouseClick(e) {
  const mx = e.clientX;
  const my = e.clientY;

  // Check Sol first
  const solStar = { id: 'sol', name: 'Sol (The Sun)', mag: -26.74, absmag: 4.83, lum: 1.0, dist: 0, spect: 'G2V', x: 0, y: 0, z: 0 };
  const solScreen = toScreenPx(new THREE.Vector3(0, 0, 0));
  if (!solScreen.behind) {
    const d = Math.hypot(mx - solScreen.x, my - solScreen.y);
    if (d < HIT_RADIUS_PX) {
      if (rulerClick(solStar)) return;
      showInfo(solStar);
      removeMarker();
      if (jumpPlannerActive) setJumpOrigin(solStar);
      return;
    }
  }

  // Find candidates within hit radius, prefer named then brightest
  const candidates = [];

  for (const star of starDataArray) {
    const s = toScreenPx(new THREE.Vector3(star.x, star.y, star.z));
    if (s.behind) continue;
    const d = Math.hypot(mx - s.x, my - s.y);
    if (d < HIT_RADIUS_PX) candidates.push({ star, d });
  }

  candidates.sort((a, b) => {
    // When planet filter is active, prefer planet hosts
    if (planetFilterActive) {
      const aHost = planetHostIds.has(a.star.id) ? 0 : 1;
      const bHost = planetHostIds.has(b.star.id) ? 0 : 1;
      if (aHost !== bHost) return aHost - bHost;
    }
    const aName = a.star.name ? 0 : 1;
    const bName = b.star.name ? 0 : 1;
    if (aName !== bName) return aName - bName; // named first
    return a.star.mag - b.star.mag;            // then brightest
  });

  const closest = candidates.length > 0 ? candidates[0].star : null;

  if (closest) {
    if (rulerClick(closest)) return; // ruler mode intercepts click
    showInfo(closest);
    placeMarker(closest);
    if (jumpPlannerActive) setJumpOrigin(closest);

    // Route finder: shift+click sets origin then destination
    if (e.shiftKey) {
      if (!routeOrigin) {
        routeOrigin = closest;
        document.getElementById('route-panel').style.display = 'block';
        document.getElementById('route-info').innerHTML = `Origin: <b>${closest.name || 'Unnamed'}</b><br>Shift+click a destination star.`;
      } else {
        const path = findRoute(routeOrigin, closest);
        if (path) {
          drawRoute(path);
        } else {
          document.getElementById('route-info').innerHTML = `No route found within jump range.<br>Try increasing jump range.`;
          document.getElementById('route-panel').style.display = 'block';
        }
        routeOrigin = null;
      }
    }
  } else {
    hideInfo();
    removeMarker();
  }
}

let selectedMarkerStar = null;
let selectedLabel = null;

function placeMarker(star) {
  removeMarker();
  selectedMarkerStar = star;

  // Persistent label at the star's 3D position
  selectedLabel = document.createElement('div');
  selectedLabel.style.cssText = 'position:fixed;pointer-events:none;font-size:12px;color:#fff;white-space:nowrap;text-shadow:1px 1px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000;background:rgba(0,0,0,0.5);padding:1px 5px;border-radius:3px;border:1px solid rgba(255,255,255,0.2);';
  const display = star.name || (star.bayer ? star.bayer : null) || (star.hip ? `HIP ${star.hip}` : 'Star');
  selectedLabel.textContent = display;
  document.body.appendChild(selectedLabel);
  const points = [];
  const segments = 48;
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0));
  }
  const geom = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff });
  selectedMarker = new THREE.LineLoop(geom, mat);
  selectedMarker.position.set(star.x, star.y, star.z);
  scene.add(selectedMarker);
}

function updateMarkerScale() {
  if (!selectedMarker || !selectedMarkerStar) return;
  const dist = camera.position.distanceTo(selectedMarker.position);
  const r = dist * 0.015;
  selectedMarker.scale.setScalar(r);
  selectedMarker.lookAt(camera.position);

  if (selectedLabel) {
    const s = toScreenPx(new THREE.Vector3(selectedMarkerStar.x, selectedMarkerStar.y, selectedMarkerStar.z));
    if (s.behind) { selectedLabel.style.display = 'none'; }
    else {
      selectedLabel.style.display = 'block';
      selectedLabel.style.left = Math.round(s.x + 12) + 'px';
      selectedLabel.style.top  = Math.round(s.y - 8) + 'px';
    }
  }
}

function removeMarker() {
  if (selectedMarker) { scene.remove(selectedMarker); selectedMarker = null; }
  if (selectedLabel) { selectedLabel.remove(); selectedLabel = null; }
  selectedMarkerStar = null;
}

// Planetary system data keyed by HIP number and hostname
let planetsByHip = {};

function showInfo(star) {
  document.getElementById('star-name').textContent = star.name || 'Unnamed Star';

  // Designation line
  const parts = [];
  if (star.bayer && star.con) parts.push(`${star.bayer} ${star.con}`);
  else if (star.con) parts.push(star.con);
  if (star.hip) parts.push(`HIP ${star.hip}`);
  document.getElementById('star-designation').textContent = parts.join('  ·  ');

  // Constellation name lookup
  const conNames = {
    And:'Andromeda',Ant:'Antlia',Aps:'Apus',Aql:'Aquila',Aqr:'Aquarius',
    Ara:'Ara',Ari:'Aries',Aur:'Auriga',Boo:'Boötes',CMa:'Canis Major',
    CMi:'Canis Minor',Cap:'Capricornus',Car:'Carina',Cas:'Cassiopeia',
    Cen:'Centaurus',Cep:'Cepheus',Cet:'Cetus',Col:'Columba',Com:'Coma Berenices',
    CrA:'Corona Australis',CrB:'Corona Borealis',Cru:'Crux',Crv:'Corvus',
    Cyg:'Cygnus',Del:'Delphinus',Dra:'Draco',Eri:'Eridanus',For:'Fornax',
    Gem:'Gemini',Gru:'Grus',Her:'Hercules',Hya:'Hydra',Ind:'Indus',
    Lac:'Lacerta',Leo:'Leo',Lep:'Lepus',Lib:'Libra',Lup:'Lupus',
    Lyn:'Lynx',Lyr:'Lyra',Men:'Mensa',Mic:'Microscopium',Mon:'Monoceros',
    Mus:'Musca',Nor:'Norma',Oct:'Octans',Oph:'Ophiuchus',Ori:'Orion',
    Pav:'Pavo',Peg:'Pegasus',Per:'Perseus',Phe:'Phoenix',Pic:'Pictor',
    PsA:'Piscis Austrinus',Psc:'Pisces',Pup:'Puppis',Pyx:'Pyxis',
    Ret:'Reticulum',Scl:'Sculptor',Sco:'Scorpius',Sct:'Scutum',
    Ser:'Serpens',Sex:'Sextans',Sge:'Sagitta',Sgr:'Sagittarius',
    Tau:'Taurus',Tel:'Telescopium',TrA:'Triangulum Australe',Tri:'Triangulum',
    Tuc:'Tucana',UMa:'Ursa Major',UMi:'Ursa Minor',Vel:'Vela',
    Vir:'Virgo',Vol:'Volans',Vul:'Vulpecula'
  };

  const distLY = star.dist > 0 ? (star.dist * 3.26156).toFixed(2) + ' ly' : 'Here (Sol)';
  const conFull = star.con ? (conNames[star.con] || star.con) : null;
  const lumSol = star.lum ? (star.lum < 0.001 ? star.lum.toExponential(2) : star.lum.toFixed(3)) + ' L☉' : null;

  const rows = [
    ['Constellation', conFull],
    ['Distance', distLY],
    ['Apparent mag', star.mag != null ? star.mag.toFixed(2) : null],
    ['Absolute mag', star.absmag != null ? star.absmag.toFixed(2) : null],
    ['Luminosity', lumSol],
    ['Spectral type', star.spect],
  ].filter(([, v]) => v != null);

  document.getElementById('star-details').innerHTML = rows
    .map(([k, v]) => `<span style="color:#666">${k}:</span> ${v}`)
    .join('<br>');

  // Planet data — match by HIP first, then by star name
  const hipKey = star.hip ? String(star.hip).trim() : null;
  const system = (hipKey && planetsByHip[hipKey])
    || (star.name && planetsByHip[star.name])
    || null;
  const planetSection = document.getElementById('planet-section');

  if (system && system.planets.length > 0) {
    document.getElementById('planet-header').textContent =
      `⬡ ${system.planets.length} KNOWN PLANET${system.planets.length > 1 ? 'S' : ''}`;
    document.getElementById('planet-list').innerHTML = system.planets
      .sort((a, b) => (a.period_days || 999999) - (b.period_days || 999999))
      .map(p => {
        const details = [
          p.period_days ? `${p.period_days.toFixed(1)}d orbit` : null,
          p.radius_earth ? `${p.radius_earth.toFixed(1)} R⊕` : null,
          p.temp_k ? `${Math.round(p.temp_k)} K` : null,
          p.method ? p.method : null,
          p.year ? `${p.year}` : null,
        ].filter(Boolean).join(' · ');
        return `<b>${p.name}</b><br><span style="color:#888">${details}</span>`;
      }).join('<br>');
    planetSection.style.display = 'block';
  } else {
    planetSection.style.display = 'none';
  }

  document.getElementById('info-panel').style.display = 'block';
}

function hideInfo() {
  document.getElementById('info-panel').style.display = 'none';
}

// --- Jump Planner ---
const PC_TO_LY = 3.26156;
let jumpPlannerActive = false;
let jumpLines = null;

const hopColors = [
  new THREE.Color(0x00ffff), // hop 1 - bright cyan
  new THREE.Color(0x00aaff), // hop 2 - sky blue
  new THREE.Color(0x0055ff), // hop 3 - blue
  new THREE.Color(0x0033aa), // hop 4
  new THREE.Color(0x002277), // hop 5
  new THREE.Color(0x001144), // hop 6
];

function starDistLY(a, b) {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx*dx + dy*dy + dz*dz) * PC_TO_LY;
}

function setJumpOrigin(star) {
  clearJumpLines();
  const rangeLY = parseFloat(document.getElementById('jump-range').value);
  const maxHops = parseInt(document.getElementById('jump-hops').value);
  document.getElementById('jump-origin').textContent = `Origin: ${star.name || 'Unnamed'}`;
  drawJumpNetwork(star, rangeLY, maxHops);
}

// --- Spatial grid for fast neighbour lookup ---
const GRID_CELL_PC = 10 / 3.26156; // 10 LY cell size
let spatialGrid = new Map();

function buildSpatialGrid(stars) {
  spatialGrid = new Map();
  for (const star of stars) {
    const key = `${Math.floor(star.x / GRID_CELL_PC)},${Math.floor(star.y / GRID_CELL_PC)},${Math.floor(star.z / GRID_CELL_PC)}`;
    if (!spatialGrid.has(key)) spatialGrid.set(key, []);
    spatialGrid.get(key).push(star);
  }
}

function getNeighbours(star, rangeLY) {
  const rangePC = rangeLY / 3.26156;
  const cells = Math.ceil(rangePC / GRID_CELL_PC) + 1;
  const cx = Math.floor(star.x / GRID_CELL_PC);
  const cy = Math.floor(star.y / GRID_CELL_PC);
  const cz = Math.floor(star.z / GRID_CELL_PC);
  const result = [];
  for (let dx = -cells; dx <= cells; dx++)
    for (let dy = -cells; dy <= cells; dy++)
      for (let dz = -cells; dz <= cells; dz++) {
        const cell = spatialGrid.get(`${cx+dx},${cy+dy},${cz+dz}`);
        if (cell) result.push(...cell);
      }
  return result;
}

// hopStarMap: id -> hop number, for star highlighting
let hopStarMap = new Map();

const MAX_JUMP_SEGMENTS = 6000; // lines; beyond this the network is unreadable and slow

function drawJumpNetwork(origin, rangeLY, maxHops) {
  const positions = [];
  const colors = [];
  hopStarMap = new Map();
  hopStarMap.set(origin.id, 0);

  const visited = new Set([origin.id]);
  let frontier = [origin];
  const hopCounts = [];
  let capped = false;

  outer:
  for (let hop = 0; hop < maxHops; hop++) {
    const nextFrontier = [];
    const col = hopColors[Math.min(hop, hopColors.length - 1)];

    for (const from of frontier) {
      for (const to of getNeighbours(from, rangeLY)) {
        if (visited.has(to.id)) continue;
        const d = starDistLY(from, to);
        if (d <= rangeLY) {
          positions.push(from.x, from.y, from.z, to.x, to.y, to.z);
          colors.push(col.r, col.g, col.b, col.r, col.g, col.b);
          visited.add(to.id);
          hopStarMap.set(to.id, hop + 1);
          nextFrontier.push(to);
          if (positions.length / 6 >= MAX_JUMP_SEGMENTS) { capped = true; break outer; }
        }
      }
    }
    hopCounts.push(nextFrontier.length);
    frontier = nextFrontier;
    if (frontier.length === 0) break;
  }

  // Update badge in panel
  const badge = hopCounts.map((n, i) => `Hop ${i+1}: <b>${n}</b> stars`).join('<br>');
  const capNote = capped ? `<br><span style="color:#f84">Network too dense — reduce range or hops</span>` : '';
  document.getElementById('jump-counts').innerHTML = (badge || 'No reachable stars') + capNote;

  if (positions.length === 0) return;

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  geom.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));

  const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
  jumpLines = new THREE.LineSegments(geom, mat);
  scene.add(jumpLines);

  updateStarColors();
}

// --- Planet host filter ---
let planetFilterActive = false;
const planetHostIds = new Set();

document.getElementById('freelook-btn').addEventListener('click', () => {
  controls.enablePan = true;
  controls.maxDistance = 5000;
  document.getElementById('freelook-btn').style.display = 'none';
});

document.getElementById('planet-filter').addEventListener('click', () => {
  planetFilterActive = !planetFilterActive;
  const btn = document.getElementById('planet-filter');
  btn.textContent = planetFilterActive ? 'All Stars' : 'Show Planet Hosts';
  btn.style.background = planetFilterActive ? 'rgba(255,180,50,0.3)' : 'rgba(255,255,255,0.1)';
  btn.style.borderColor = planetFilterActive ? 'rgba(255,180,50,0.5)' : 'rgba(255,255,255,0.2)';
  btn.style.color = planetFilterActive ? '#fda' : '#fff';
  document.getElementById('planet-type-panel').style.display = planetFilterActive ? 'flex' : 'none';
  if (planetFilterActive) rebuildPlanetHostIds();
  updateStarColors();
});

function updateStarColors() {
  if (!pointsMesh) return;
  const colAttr = pointsMesh.geometry.attributes.color;
  const col = new THREE.Color();
  const dimCol = new THREE.Color(0x111111);
  const planetCol = new THREE.Color(0xffaa33);

  for (let i = 0; i < starDataArray.length; i++) {
    const star = starDataArray[i];
    if (hopStarMap.size > 0) {
      const hop = hopStarMap.get(star.id);
      if (hop === 0) {
        col.setHex(0xffffff); // origin
      } else if (hop !== undefined) {
        col.copy(hopColors[Math.min(hop - 1, hopColors.length - 1)]);
      } else {
        col.copy(dimCol);
      }
    } else if (planetFilterActive) {
      if (planetHostIds.has(star.id)) {
        col.copy(planetCol);
      } else {
        col.copy(dimCol);
      }
    } else {
      // Restore original spectral colour
      col.setHex(spectToHex(star.spect));
      const brightness = Math.min(1, (7 - star.mag) / 5);
      col.multiplyScalar(brightness);
    }
    colAttr.setXYZ(i, col.r, col.g, col.b);
  }
  colAttr.needsUpdate = true;
}

function clearJumpLines() {
  if (jumpLines) { scene.remove(jumpLines); jumpLines = null; }
  document.getElementById('jump-origin').textContent = '';
  document.getElementById('jump-counts').innerHTML = '';
  hopStarMap = new Map();
  updateStarColors();
}

document.getElementById('jump-toggle').addEventListener('click', () => {
  jumpPlannerActive = !jumpPlannerActive;
  const btn = document.getElementById('jump-toggle');
  btn.textContent = jumpPlannerActive ? 'Disable Jump Planner' : 'Enable Jump Planner';
  btn.classList.toggle('active', jumpPlannerActive);
  if (!jumpPlannerActive) clearJumpLines();
});

// Live update when sliders change
['jump-range', 'jump-hops'].forEach(id => {
  const el = document.getElementById(id);
  const valEl = document.getElementById(id + '-val');
  el.addEventListener('input', () => {
    valEl.textContent = el.value;
    // Re-draw if we have an active origin
    if (jumpPlannerActive && jumpLines) {
      // Find current origin from the marker position
      if (selectedMarker) {
        const pos = selectedMarker.position;
        const origin = starDataArray.find(s => s.x === pos.x && s.y === pos.y && s.z === pos.z);
        if (origin) setJumpOrigin(origin);
      }
    }
  });
});

// --- Search ---
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim().toLowerCase();
  searchResults.innerHTML = '';
  if (q.length < 2) { searchResults.style.display = 'none'; return; }

  const matches = starDataArray.filter(s => s.name && s.name.toLowerCase().includes(q)).slice(0, 8);
  if (matches.length === 0) { searchResults.style.display = 'none'; return; }

  matches.forEach(star => {
    const div = document.createElement('div');
    div.className = 'search-result';
    div.textContent = `${star.name}  (${star.dist > 0 ? star.dist.toFixed(1) + ' pc' : 'Sol'})`;
    div.addEventListener('click', () => {
      flyTo(star);
      searchInput.value = '';
      searchResults.style.display = 'none';
    });
    searchResults.appendChild(div);
  });
  searchResults.style.display = 'block';
});

document.addEventListener('click', (e) => {
  if (!searchInput.contains(e.target)) searchResults.style.display = 'none';
});

// Smooth fly-to animation state
let flyTarget = null;
let flyFrom = null;
let flyT = 1;
const FLY_DURATION = 60; // frames

function flyTo(star) {
  flyFrom = { pos: camera.position.clone(), target: controls.target.clone() };
  const dest = new THREE.Vector3(star.x, star.y, star.z);
  const dir = camera.position.clone().sub(dest).normalize();
  flyTarget = { pos: dest.clone().addScaledVector(dir, 5), target: dest };
  flyT = 0;
  showInfo(star);
  placeMarker(star);
}

renderer.domElement.addEventListener('dblclick', (e) => {
  const mx = e.clientX, my = e.clientY;

  // Check Sol
  const solScreen = toScreenPx(new THREE.Vector3(0, 0, 0));
  if (!solScreen.behind && Math.hypot(mx - solScreen.x, my - solScreen.y) < HIT_RADIUS_PX) {
    flyTo({ id: 'sol', name: 'Sol (The Sun)', mag: -26.74, absmag: 4.83, lum: 1.0, dist: 0, spect: 'G2V', x: 0, y: 0, z: 0 });
    return;
  }

  const dblCandidates = [];
  for (const star of starDataArray) {
    const s = toScreenPx(new THREE.Vector3(star.x, star.y, star.z));
    if (s.behind) continue;
    const d = Math.hypot(mx - s.x, my - s.y);
    if (d < HIT_RADIUS_PX) dblCandidates.push({ star, d });
  }
  dblCandidates.sort((a, b) => {
    const aName = a.star.name ? 0 : 1;
    const bName = b.star.name ? 0 : 1;
    if (aName !== bName) return aName - bName;
    return a.star.mag - b.star.mag;
  });
  if (dblCandidates.length > 0) flyTo(dblCandidates[0].star);
});

// --- Route Finder ---
let routeOrigin = null;
let routeLines = null;

document.getElementById('route-clear').addEventListener('click', clearRoute);

function clearRoute() {
  routeOrigin = null;
  if (routeLines) { scene.remove(routeLines); routeLines = null; }
  document.getElementById('route-panel').style.display = 'none';
}

function findRoute(from, to) {
  const rangeLY = parseFloat(document.getElementById('jump-range').value);
  // BFS shortest path
  const queue = [[from]];
  const visited = new Set([from.id]);

  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];

    const neighbours = getNeighbours(current, rangeLY).filter(s => !visited.has(s.id) && starDistLY(current, s) <= rangeLY);
    for (const nb of neighbours) {
      const newPath = [...path, nb];
      if (nb.id === to.id) return newPath;
      visited.add(nb.id);
      queue.push(newPath);
    }
    if (path.length > 20) break; // safety cap
  }
  return null;
}

function drawRoute(path) {
  if (routeLines) { scene.remove(routeLines); routeLines = null; }
  const positions = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i], b = path[i + 1];
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  const mat = new THREE.LineBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  routeLines = new THREE.LineSegments(geom, mat);
  scene.add(routeLines);

  const panel = document.getElementById('route-panel');
  panel.style.display = 'block';
  document.getElementById('route-info').innerHTML =
    `<b>${path[0].name || 'Unnamed'}</b> → <b>${path[path.length-1].name || 'Unnamed'}</b><br>` +
    `${path.length - 1} jump${path.length - 1 !== 1 ? 's' : ''}<br>` +
    path.map(s => s.name || '·').join(' → ');
}

// --- Constellations ---
let constellationLines = null;
let constellationsVisible = false;
const constellationCentroids = []; // { name, pos: THREE.Vector3 }
const constellationLabelEls = [];  // parallel array of divs

function buildConstellationLines(stars) {
  const nameMap = new Map();
  for (const s of stars) {
    if (s.name) nameMap.set(s.name.toLowerCase(), s);
  }

  const positions = [];

  for (const con of CONSTELLATIONS) {
    const found = new Set();
    for (const [nameA, nameB] of con.lines) {
      const a = nameMap.get(nameA.toLowerCase());
      const b = nameMap.get(nameB.toLowerCase());
      if (!a || !b) continue;
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
      found.add(a); found.add(b);
    }
    if (found.size === 0) continue;

    // Compute centroid of found stars for label placement
    const cx = [...found].reduce((s, x) => s + x.x, 0) / found.size;
    const cy = [...found].reduce((s, x) => s + x.y, 0) / found.size;
    const cz = [...found].reduce((s, x) => s + x.z, 0) / found.size;
    constellationCentroids.push({ name: con.name, pos: new THREE.Vector3(cx, cy, cz) });

    const div = document.createElement('div');
    div.className = 'con-label';
    div.textContent = con.name.toUpperCase();
    div.style.display = 'none';
    document.body.appendChild(div);
    constellationLabelEls.push(div);
  }

  if (positions.length === 0) return;

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
  const mat = new THREE.LineBasicMaterial({ color: 0x334466, transparent: true, opacity: 0.6 });
  constellationLines = new THREE.LineSegments(geom, mat);
  constellationLines.visible = false;
  scene.add(constellationLines);
}

function updateConstellationLabels() {
  if (!constellationsVisible) return;
  const v = new THREE.Vector3();
  for (let i = 0; i < constellationCentroids.length; i++) {
    const { pos } = constellationCentroids[i];
    const el = constellationLabelEls[i];
    v.copy(pos).project(camera);
    if (v.z > 1) { el.style.display = 'none'; continue; }
    el.style.display = 'block';
    el.style.left = Math.round((v.x * 0.5 + 0.5) * window.innerWidth) + 'px';
    el.style.top  = Math.round((-v.y * 0.5 + 0.5) * window.innerHeight) + 'px';
  }
}

document.getElementById('constellation-toggle').addEventListener('click', () => {
  constellationsVisible = !constellationsVisible;
  if (constellationLines) constellationLines.visible = constellationsVisible;
  constellationLabelEls.forEach(el => el.style.display = constellationsVisible ? 'block' : 'none');
  const btn = document.getElementById('constellation-toggle');
  btn.textContent = constellationsVisible ? 'Hide Constellations' : 'Show Constellations';
  btn.classList.toggle('active', constellationsVisible);

  if (constellationsVisible) {
    // Fly to minimum distance from Sol — Earth viewpoint
    flyFrom = { pos: camera.position.clone(), target: controls.target.clone() };
    const dir = camera.position.clone().normalize();
    if (dir.length() < 0.001) dir.set(0, 0, 1);
    flyTarget = { pos: dir.multiplyScalar(controls.minDistance), target: new THREE.Vector3(0, 0, 0) };
    flyT = 0;
    // Lock to Sol: orbit only, no pan, no zoom out
    controls.enablePan = false;
    controls.maxDistance = controls.minDistance * 1.5;
    controls.target.set(0, 0, 0);
    document.getElementById('freelook-btn').style.display = 'block';
  } else {
    // Restore free navigation
    controls.enablePan = true;
    controls.maxDistance = 5000;
    document.getElementById('freelook-btn').style.display = 'none';
  }
});

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animate ---
function animate() {
  requestAnimationFrame(animate);

  // Smooth fly-to
  if (flyT < 1) {
    flyT = Math.min(1, flyT + 1 / FLY_DURATION);
    const t = flyT < 0.5 ? 2 * flyT * flyT : -1 + (4 - 2 * flyT) * flyT; // ease in-out
    camera.position.lerpVectors(flyFrom.pos, flyTarget.pos, t);
    controls.target.lerpVectors(flyFrom.target, flyTarget.target, t);
    controls.update();
  }

  controls.update();
  updateMarkerScale();
  updateLabels();
  updateConstellationLabels();
  updateNebulaLabels();
  renderer.render(scene, camera);
}

// --- Reset ---
function resetView() {
  camera.position.set(0, 0, 80);
  controls.target.set(0, 0, 0);
  controls.update();
  hideInfo();
  removeMarker();
}
document.getElementById('reset-btn').addEventListener('click', resetView);

// --- Screenshot ---
document.getElementById('screenshot-btn').addEventListener('click', () => {
  renderer.render(scene, camera); // ensure fresh frame
  const link = document.createElement('a');
  link.download = `webstar-${Date.now()}.png`;
  link.href = renderer.domElement.toDataURL('image/png');
  link.click();
});

// --- Keyboard shortcuts ---
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return; // don't fire in search box
  switch (e.key.toLowerCase()) {
    case 'r': resetView(); break;
    case 'escape': hideInfo(); removeMarker(); break;
    case 'c': document.getElementById('constellation-toggle').click(); break;
    case 'p': document.getElementById('planet-filter').click(); break;
    case 'j': document.getElementById('jump-toggle').click(); break;
    case 'd': document.getElementById('ruler-btn').click(); break;
  }
});

// --- Hover tooltip ---
const tooltip = document.getElementById('star-tooltip');

renderer.domElement.addEventListener('mousemove', e => {
  if (dragMoved) return;
  const mx = e.clientX, my = e.clientY;
  let closest = null, closestD = HIT_RADIUS_PX;

  // Check Sol
  const solScreen = toScreenPx(new THREE.Vector3(0, 0, 0));
  if (!solScreen.behind) {
    const d = Math.hypot(mx - solScreen.x, my - solScreen.y);
    if (d < closestD) { closest = { name: 'Sol' }; closestD = d; }
  }

  // Named stars always checked; planet hosts also checked when filter is active
  const hoverPool = planetFilterActive
    ? starDataArray // check all so planet hosts without names still show
    : starDataArray.filter(s => s.name);

  for (const star of hoverPool) {
    if (!planetFilterActive && !star.name) continue;
    const s = toScreenPx(new THREE.Vector3(star.x, star.y, star.z));
    if (s.behind) continue;
    const d = Math.hypot(mx - s.x, my - s.y);
    if (d < closestD) { closest = star; closestD = d; }
  }

  if (closest) {
    const label = closest.name || closest.bayer
      ? (closest.name || closest.bayer)
      : (closest.hip ? `HIP ${closest.hip}` : 'Star');
    tooltip.style.display = 'block';
    tooltip.style.left = (mx + 14) + 'px';
    tooltip.style.top  = (my - 8) + 'px';
    tooltip.textContent = label;
    renderer.domElement.style.cursor = 'pointer';
  } else {
    tooltip.style.display = 'none';
    renderer.domElement.style.cursor = 'default';
  }
});
renderer.domElement.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });

// --- Distance ruler ---
let rulerActive = false;
let rulerOrigin = null;
let rulerLine = null;

document.getElementById('ruler-btn').addEventListener('click', () => {
  rulerActive = !rulerActive;
  const btn = document.getElementById('ruler-btn');
  btn.style.background = rulerActive ? 'rgba(100,200,255,0.25)' : 'rgba(255,255,255,0.1)';
  btn.style.color = rulerActive ? '#7df' : '#fff';
  btn.style.borderColor = rulerActive ? 'rgba(100,200,255,0.4)' : 'rgba(255,255,255,0.2)';
  if (!rulerActive) {
    rulerOrigin = null;
    if (rulerLine) { scene.remove(rulerLine); rulerLine = null; }
    document.getElementById('ruler-panel').style.display = 'none';
  } else {
    document.getElementById('ruler-panel').style.display = 'block';
    document.getElementById('ruler-text').textContent = 'Click a star to set ruler origin';
  }
});

function rulerClick(star) {
  if (!rulerActive) return false;
  if (!rulerOrigin) {
    rulerOrigin = star;
    document.getElementById('ruler-text').innerHTML =
      `Origin: <b>${star.name || 'Unnamed'}</b> — now click destination`;
    return true;
  }
  const distLY = starDistLY(rulerOrigin, star);
  document.getElementById('ruler-text').innerHTML =
    `<b>${rulerOrigin.name || '?'}</b> → <b>${star.name || '?'}</b>: <b>${distLY.toFixed(2)} LY</b>`;
  if (rulerLine) scene.remove(rulerLine);
  const geom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(rulerOrigin.x, rulerOrigin.y, rulerOrigin.z),
    new THREE.Vector3(star.x, star.y, star.z)
  ]);
  rulerLine = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: 0x44ccff, transparent: true, opacity: 0.8 }));
  scene.add(rulerLine);
  rulerOrigin = star; // chain — next click extends from here
  return true;
}

// --- Touch support ---
let touchStartPos = null;
renderer.domElement.addEventListener('touchstart', e => {
  if (e.touches.length === 1)
    touchStartPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
}, { passive: true });
renderer.domElement.addEventListener('touchend', e => {
  if (!touchStartPos) return;
  const t = e.changedTouches[0];
  if (Math.hypot(t.clientX - touchStartPos.x, t.clientY - touchStartPos.y) < 8)
    onMouseClick({ clientX: t.clientX, clientY: t.clientY, shiftKey: false });
  touchStartPos = null;
}, { passive: true });

// --- Exoplanet type sub-filter ---
let planetTypeFilter = 'all';
const PLANET_TYPES = {
  all:         () => true,
  terrestrial: p => p.radius_earth && p.radius_earth < 1.6,
  superearth:  p => p.radius_earth && p.radius_earth >= 1.6 && p.radius_earth < 4,
  neptune:     p => p.radius_earth && p.radius_earth >= 4  && p.radius_earth < 10,
  gasgiant:    p => p.radius_earth && p.radius_earth >= 10,
};

document.querySelectorAll('.ptype-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    planetTypeFilter = btn.dataset.type;
    document.querySelectorAll('.ptype-btn').forEach(b => b.classList.toggle('active', b === btn));
    rebuildPlanetHostIds();
    updateStarColors();
  });
});

function rebuildPlanetHostIds() {
  planetHostIds.clear();
  const predicate = PLANET_TYPES[planetTypeFilter] || PLANET_TYPES.all;
  for (const star of starDataArray) {
    const hipKey = star.hip ? String(star.hip).trim() : null;
    const sys = (hipKey && planetsByHip[hipKey]) || (star.name && planetsByHip[star.name]) || null;
    if (sys && sys.planets.some(predicate)) planetHostIds.add(star.id);
  }
  // Always include Sol
  const solSys = planetsByHip['Sol'];
  if (solSys && solSys.planets.some(predicate)) planetHostIds.add('sol');
}

// --- Nebulae / notable objects ---
function raDecDistToXYZ(raDeg, decDeg, distPc) {
  const ra = raDeg * Math.PI / 180;
  const dec = decDeg * Math.PI / 180;
  return new THREE.Vector3(
    distPc * Math.cos(dec) * Math.cos(ra),
    distPc * Math.cos(dec) * Math.sin(ra),
    distPc * Math.sin(dec)
  );
}

const NEBULAE = [
  { name: 'Orion Nebula',    ra: 83.82,  dec: -5.39,  dist: 412,  type: 'Nebula'  },
  { name: 'Pleiades',        ra: 56.75,  dec: 24.11,  dist: 136,  type: 'Cluster' },
  { name: 'Hyades',          ra: 66.75,  dec: 15.87,  dist: 46,   type: 'Cluster' },
  { name: 'Helix Nebula',    ra: 337.41, dec: -20.84, dist: 200,  type: 'Nebula'  },
  { name: 'Beehive (M44)',   ra: 130.05, dec: 19.98,  dist: 187,  type: 'Cluster' },
  { name: 'Crab Nebula',     ra: 83.63,  dec: 22.01,  dist: 1930, type: 'Remnant' },
  { name: 'Butterfly Nebula',ra: 273.75, dec: -37.10, dist: 1300, type: 'Nebula'  },
  { name: 'Lagoon Nebula',   ra: 270.92, dec: -24.38, dist: 1250, type: 'Nebula'  },
  { name: 'Eagle Nebula',    ra: 274.70, dec: -13.81, dist: 2000, type: 'Nebula'  },
  { name: 'Witch Head',      ra: 77.40,  dec: -7.23,  dist: 300,  type: 'Nebula'  },
  { name: 'California Neb.', ra: 60.55,  dec: 36.42,  dist: 460,  type: 'Nebula'  },
  { name: 'Rosette Nebula',  ra: 97.95,  dec: 4.95,   dist: 1600, type: 'Nebula'  },
];

const nebulaLabelEls = [];

function buildNebulae() {
  for (const neb of NEBULAE) {
    neb.pos = raDecDistToXYZ(neb.ra, neb.dec, neb.dist);
    // Marker: small tetrahedron
    const geom = new THREE.OctahedronGeometry(0.3, 0);
    const mat  = new THREE.MeshBasicMaterial({ color: 0x44ff88, wireframe: true, transparent: true, opacity: 0.6 });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.copy(neb.pos);
    scene.add(mesh);
    neb.mesh = mesh;

    const div = document.createElement('div');
    div.className = 'nebula-label';
    div.textContent = neb.name;
    div.style.display = 'none';
    document.body.appendChild(div);
    nebulaLabelEls.push({ el: div, neb });
  }
}

function updateNebulaLabels() {
  const v = new THREE.Vector3();
  for (const { el, neb } of nebulaLabelEls) {
    v.copy(neb.pos).project(camera);
    if (v.z > 1) { el.style.display = 'none'; continue; }
    el.style.display = 'block';
    el.style.left = Math.round((v.x * 0.5 + 0.5) * window.innerWidth + 8) + 'px';
    el.style.top  = Math.round((-v.y * 0.5 + 0.5) * window.innerHeight - 6) + 'px';
  }
}

// --- Init ---
async function init() {
  const [starsRes, planetsRes] = await Promise.all([
    fetch('/api/stars'),
    fetch('/api/planets')
  ]);
  const stars = await starsRes.json();
  const planetsArr = await planetsRes.json();
  // Index planets by HIP number and hostname for fast lookup
  for (const sys of planetsArr) {
    if (sys.hip) planetsByHip[String(sys.hip).trim()] = sys;
    if (sys.hostname) planetsByHip[sys.hostname] = sys;
  }
  // Build distance-sorted array for positional fallback matching

  // Sol's planets — not in NASA Exoplanet Archive (exoplanets only)
  // Data: JPL ssd.jpl.nasa.gov/planets/phys_par.html (period/radius/mass)
  //       NASA science.nasa.gov/solar-system/temperatures-across-our-solar-system/ (temp)
  const solSystem = {
    hostname: 'Sol', dist_pc: 0,
    planets: [
      { name: 'Mercury', period_days: 87.97,    radius_earth: 0.383, mass_earth: 0.0553, temp_k: 440, method: 'Known', year: null },
      { name: 'Venus',   period_days: 224.70,   radius_earth: 0.950, mass_earth: 0.815,  temp_k: 737, method: 'Known', year: null },
      { name: 'Earth',   period_days: 365.25,   radius_earth: 1.000, mass_earth: 1.000,  temp_k: 288, method: 'Known', year: null },
      { name: 'Mars',    period_days: 686.97,   radius_earth: 0.532, mass_earth: 0.107,  temp_k: 208, method: 'Known', year: null },
      { name: 'Jupiter', period_days: 4332.59,  radius_earth: 10.97, mass_earth: 317.83, temp_k: 163, method: 'Known', year: null },
      { name: 'Saturn',  period_days: 10759.22, radius_earth: 9.14,  mass_earth: 95.16,  temp_k: 133, method: 'Known', year: null },
      { name: 'Uranus',  period_days: 30688.5,  radius_earth: 3.98,  mass_earth: 14.54,  temp_k: 78,  method: 'Known', year: null },
      { name: 'Neptune', period_days: 60182,    radius_earth: 3.86,  mass_earth: 17.15,  temp_k: 73,  method: 'Known', year: null },
    ]
  };
  planetsByHip['Sol'] = solSystem;
  planetsByHip['Sol (The Sun)'] = solSystem;

  // Build set of star IDs that have planet data (for filter highlight)
  for (const star of [...stars, { id: 'sol', name: 'Sol', hip: null, dist: 0 }]) {
    const hipKey = star.hip ? String(star.hip).trim() : null;
    if ((hipKey && planetsByHip[hipKey]) || (star.name && planetsByHip[star.name])) {
      planetHostIds.add(star.id);
    }
  }

  // Add Sol into the star field as a regular point
  const solData = [{ id: 'sol', name: 'Sol', x: 0, y: 0, z: 0, mag: -26.74, absmag: 4.83, lum: 1.0, dist: 0, spect: 'G2V' }];
  const allStars = [...solData, ...stars];
  buildStarField(allStars);
  buildSpatialGrid(allStars);
  buildBinaryLinks(allStars); // must run before addLabels so companionCount is populated
  addLabels(allStars);
  buildConstellationLines(allStars);
  buildNebulae();
  animate();
}

init();
