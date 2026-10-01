import * as THREE from 'three';

const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canvas = document.getElementById('webgl');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // perf budget: cap DPR
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x070b16, 0.045);

/* ---- Lights ---- */
scene.add(new THREE.AmbientLight(0x334, 1.2));
const keyLight = new THREE.PointLight(0x6ee7ff, 60, 40); keyLight.position.set(4, 3, 4);
const rimLight = new THREE.PointLight(0xa78bfa, 45, 40); rimLight.position.set(-4, -2, 3);
scene.add(keyLight, rimLight);

/* ---- Hero object: torus knot + wireframe shell ---- */
const group = new THREE.Group();
const knot = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1.35, 0.38, 180, 28),
  new THREE.MeshStandardMaterial({ color: 0x101a33, metalness: 0.85, roughness: 0.25 })
);
const shell = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1.37, 0.40, 100, 16),
  new THREE.MeshBasicMaterial({ color: 0x6ee7ff, wireframe: true, transparent: true, opacity: 0.10 })
);
group.add(knot, shell);
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
  color: 0x6ee7ff, size: 0.035, transparent: true, opacity: 0.55, sizeAttenuation: true
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
const scrollState = { progress: 0 };
function updateScroll() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  scrollState.progress = max > 0 ? window.scrollY / max : 0;
  // Fade canvas slightly as user leaves the hero
  canvas.style.opacity = Math.max(0.15, 1 - scrollState.progress * 1.6);
}

/* ---- Render loop ---- */
const clock = new THREE.Clock();
function animate() {
  const t = clock.getElapsedTime();

  // Mouse parallax with lerp (smooth)
  targetX += (mouseX - targetX) * 0.05;
  targetY += (mouseY - targetY) * 0.05;

  group.rotation.y = t * 0.12 + targetX * 0.5;           // idle spin + parallax
  group.rotation.x = Math.sin(t * 0.2) * 0.15 + targetY * 0.3;
  group.position.y = Math.sin(t * 0.6) * 0.15;           // gentle float

  particles.rotation.y = t * 0.015;
  camera.position.z = 7 - scrollState.progress * 1.5;    // subtle dolly on scroll
  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
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
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ---- UI logic ---- */
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Loader */
window.addEventListener('load', () => {
  setTimeout(() => document.getElementById('loader').classList.add('done'), 400);
});

/* Nav glass on scroll */
const nav = document.getElementById('nav');
const progress = document.getElementById('progress');
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 50);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + '%';
}, { passive: true });

/* Mobile menu */
const menuBtn = document.getElementById('menu-btn');
const navLinks = document.getElementById('nav-links');
menuBtn.addEventListener('click', () => navLinks.classList.toggle('open'));
navLinks.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => navLinks.classList.remove('open')));

/* Reveal on scroll */
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

/* 3D tilt on project cards */
if (!reduced && window.matchMedia('(hover: hover)').matches) {
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform =
        `perspective(800px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-4px)`;
    });
    card.addEventListener('pointerleave', () => {
      card.style.transform = 'perspective(800px) rotateY(0) rotateX(0)';
    });
  });
}

/* Timeline fill follows scroll */
const tl = document.querySelector('.timeline');
const fill = document.getElementById('tl-fill');
function updateTimeline() {
  const r = tl.getBoundingClientRect();
  const visible = Math.min(Math.max(window.innerHeight * 0.65 - r.top, 0), r.height);
  fill.style.height = visible + 'px';
}
window.addEventListener('scroll', updateTimeline, { passive: true });
updateTimeline();
