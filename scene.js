// Optional WebGL enhancement; portfolio navigation works independently.
(async () => {
try {
const THREE = await import("https://unpkg.com/three@0.160.0/build/three.module.js");
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('webgl');
let contextLost = false;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // perf budget: cap DPR
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x070b16, 0.045);

/* ---- Lights ---- */
scene.add(new THREE.AmbientLight(0x334, 1.2));
const keyLight = new THREE.PointLight(0x82ddc8, 60, 40); keyLight.position.set(4, 3, 4);
const rimLight = new THREE.PointLight(0xaaa5f5, 45, 40); rimLight.position.set(-4, -2, 3);
scene.add(keyLight, rimLight);

/* ---- Hero object: torus knot + wireframe shell ---- */
const group = new THREE.Group();
const knot = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1.35, 0.38, 180, 28),
  new THREE.MeshStandardMaterial({ color: 0x283655, metalness: 0.85, roughness: 0.25 })
);
const shell = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1.37, 0.40, 100, 16),
  new THREE.MeshBasicMaterial({ color: 0x82ddc8, wireframe: true, transparent: true, opacity: 0.10 })
);
group.add(knot, shell);
// Two slim orbital paths and a satellite give the sculpture more depth.
const orbits = new THREE.Group();
const orbitGeometry = new THREE.TorusGeometry(2.35, 0.018, 8, 160);
const orbitA = new THREE.Mesh(orbitGeometry, new THREE.MeshBasicMaterial({ color: 0x82ddc8, transparent: true, opacity: 0.45 }));
const orbitB = new THREE.Mesh(orbitGeometry, new THREE.MeshBasicMaterial({ color: 0xaaa5f5, transparent: true, opacity: 0.3 }));
orbitA.rotation.set(1.1, 0.25, 0.25);
orbitB.rotation.set(-0.8, 0.65, -0.4);
orbits.add(orbitA, orbitB);
const satellite = new THREE.Mesh(new THREE.SphereGeometry(0.075, 16, 12), new THREE.MeshBasicMaterial({ color: 0xc9fff2 }));
orbits.add(satellite);
scene.add(orbits);
function fitSculpture() {
  const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 7;
  const scale = Math.min(1, halfHeight * camera.aspect * 0.85 / 2.45);
  group.scale.setScalar(scale);
  orbits.scale.setScalar(scale);
}

group.position.x = 0;
scene.add(group);

/* ---- Ambient particles ---- */
const COUNT = window.innerWidth < 640 ? 250 : 700; // fewer particles on mobile
const positions = new Float32Array(COUNT * 3);
for (let i = 0; i < COUNT; i++) {
  const r = 5 + Math.random() * 9;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  positions[i*3]   = r * Math.sin(phi) * Math.cos(theta);
  positions[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
  positions[i*3+2] = r * Math.cos(phi);
}
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
  color: 0x82ddc8, size: 0.035, transparent: true, opacity: 0.55, sizeAttenuation: true
}));
scene.add(particles);

/* ---- Interaction state ---- */
let mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
window.addEventListener('pointermove', (e) => {
  mouseX = (e.clientX / window.innerWidth) * 2 - 1;
  mouseY = (e.clientY / window.innerHeight) * 2 - 1;
});

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 7);
fitSculpture();
const scrollState = { progress: 0 };
function updateScroll() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  scrollState.progress = max > 0 ? window.scrollY / max : 0;
  // Fade canvas slightly as user leaves the hero
  canvas.style.opacity = Math.max(0.15, 1 - scrollState.progress * 1.6);
}

/* ---- Render loop ---- */
let paused = prefersReduced;
let frame = 0;
const clock = new THREE.Clock();
function animate() {
  if (paused || document.hidden || contextLost) { frame = 0; return; }
  const t = clock.getElapsedTime();

  // Mouse parallax with lerp (smooth)
  targetX += (mouseX - targetX) * 0.05;
  targetY += (mouseY - targetY) * 0.05;

  group.rotation.y = t * 0.12 + targetX * 0.5;           // idle spin + parallax
  group.rotation.x = Math.sin(t * 0.2) * 0.15 + targetY * 0.3;
  group.position.y = 0;           // gentle float

  particles.rotation.y = t * 0.015;
  orbits.rotation.z = t * 0.05;
  orbits.rotation.y = targetX * 0.15;
  satellite.position.set(Math.cos(t * 0.5) * 2.35, Math.sin(t * 0.5) * 1.15, Math.sin(t * 0.5) * 2.05);
  camera.position.z = 7;    // subtle dolly on scroll
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
  frame = requestAnimationFrame(animate);
}

if (prefersReduced) {
  // Static frame for reduced motion: render once, no loop
  renderer.render(scene, camera);
  canvas.style.opacity = 0.35;
} else {
  animate();
}

window.addEventListener('scroll', updateScroll, { passive: true });
updateScroll();

window.addEventListener('resize', () => {
  group.position.x = 0;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  fitSculpture();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.render(scene, camera);
});


const toggle = document.getElementById("scene-toggle");
toggle.hidden = false;
function syncAnimation() {
  cancelAnimationFrame(frame); frame = 0;
  toggle.textContent = paused ? "Play animation" : "Pause animation";
  toggle.setAttribute("aria-pressed", String(paused));
  renderer.render(scene, camera);
  if (!paused && !document.hidden && !contextLost) animate();
}
toggle.addEventListener("click", () => { paused = !paused; syncAnimation(); });
document.addEventListener("visibilitychange", syncAnimation);
window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", event => { paused = event.matches; syncAnimation(); });
canvas.addEventListener("webglcontextlost", event => {
  event.preventDefault(); contextLost = true; cancelAnimationFrame(frame); frame = 0;
  document.getElementById("scene-status").textContent = "3D paused: graphics context lost.";
});
canvas.addEventListener("webglcontextrestored", () => { contextLost = false; syncAnimation(); document.getElementById("scene-status").textContent = "Move your pointer to explore"; });
syncAnimation();
document.getElementById("scene-status").textContent = "Move your pointer to explore";

} catch (error) {
document.getElementById("webgl").hidden = true;
document.getElementById("scene-status").textContent = "3D unavailable ? check internet access and WebGL support.";
console.warn("3D scene unavailable:", error);
}
})();
