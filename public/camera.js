import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Renderer ---
export const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('scene').appendChild(renderer.domElement);

// --- Camera ---
export const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 100000);
camera.position.set(0, 0, 80);

// --- Controls ---
export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.1;
controls.maxDistance = 5000;
controls.target.set(0, 0, 0);

// --- Fly-to animation ---
let flyFrom = null;
let flyTarget = null;
let flyT = 1;
const FLY_DURATION = 60;

export function flyToPosition(toPos, toTarget) {
  flyFrom = { pos: camera.position.clone(), target: controls.target.clone() };
  flyTarget = { pos: toPos.clone(), target: toTarget.clone() };
  flyT = 0;
}

// --- Screen projection ---
const _v = new THREE.Vector3();
export function toScreenPx(worldPos) {
  _v.copy(worldPos).project(camera);
  return {
    x: (_v.x * 0.5 + 0.5) * window.innerWidth,
    y: (-_v.y * 0.5 + 0.5) * window.innerHeight,
    behind: _v.z > 1,
  };
}

// --- Viewpoint helpers ---
export function lockToEarth() {
  controls.enablePan = false;
  controls.maxDistance = controls.minDistance * 1.5;
  controls.target.set(0, 0, 0);
}

export function freeLook() {
  controls.enablePan = true;
  controls.maxDistance = 5000;
}

export function resetCamera() {
  camera.position.set(0, 0, 80);
  controls.target.set(0, 0, 0);
  controls.update();
}

// --- Per-frame update (call once in animate loop) ---
export function updateCamera() {
  if (flyT < 1) {
    flyT = Math.min(1, flyT + 1 / FLY_DURATION);
    const t = flyT < 0.5 ? 2 * flyT * flyT : -1 + (4 - 2 * flyT) * flyT; // ease in-out
    camera.position.lerpVectors(flyFrom.pos, flyTarget.pos, t);
    controls.target.lerpVectors(flyFrom.target, flyTarget.target, t);
  }
  controls.update();
}

// --- Resize ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
