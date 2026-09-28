import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const canvas = document.getElementById('bg');
const isMobile = window.innerWidth < 768;

// Renderer & scene
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05050d, 0.035);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 0, 12);

// Lights
scene.add(new THREE.AmbientLight(0x404080, 0.6));
const keyLight = new THREE.PointLight(0x7c5cff, 80, 50);
keyLight.position.set(5, 5, 8);
scene.add(keyLight);
const rimLight = new THREE.PointLight(0x00d4ff, 60, 50);
rimLight.position.set(-6, -3, 4);
scene.add(rimLight);
const pinkLight = new THREE.PointLight(0xff4fd8, 40, 40);
pinkLight.position.set(0, 6, -4);
scene.add(pinkLight);

// Hero object: metallic torus knot with wireframe shell
const hero = new THREE.Group();
hero.position.set(isMobile ? 0 : 4.2, isMobile ? 1.5 : 0, 0);
scene.add(hero);

const knot = new THREE.Mesh(
  new THREE.TorusKnotGeometry(1.6, 0.5, 256, 48),
  new THREE.MeshPhysicalMaterial({
    color: 0x1a1040, metalness: 0.9, roughness: 0.15,
    clearcoat: 1, clearcoatRoughness: 0.1, iridescence: 1, iridescenceIOR: 1.6,
    emissive: 0x220a55, emissiveIntensity: 0.4,
  })
);
hero.add(knot);

const shell = new THREE.Mesh(
  new THREE.IcosahedronGeometry(3.2, 1),
  new THREE.MeshBasicMaterial({ color: 0x00d4ff, wireframe: true, transparent: true, opacity: 0.12 })
);
hero.add(shell);

// Orbiting rings
const rings = [];
[[3.8, 0x7c5cff], [4.4, 0x00d4ff], [5.0, 0xff4fd8]].forEach(([r, c], i) => {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(r, 0.012, 16, 200),
    new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.6 })
  );
  ring.rotation.x = Math.PI / 2 + i * 0.35;
  ring.rotation.y = i * 0.5;
  hero.add(ring);
  rings.push(ring);
});

// Floating geometric shapes scattered through depth
const shapes = [];
const shapeGeos = [
  new THREE.OctahedronGeometry(0.4),
  new THREE.TetrahedronGeometry(0.45),
  new THREE.IcosahedronGeometry(0.35),
  new THREE.BoxGeometry(0.5, 0.5, 0.5),
];
const palette = [0x7c5cff, 0x00d4ff, 0xff4fd8, 0x3dffa8];
for (let i = 0; i < (isMobile ? 18 : 36); i++) {
  const mesh = new THREE.Mesh(
    shapeGeos[i % shapeGeos.length],
    new THREE.MeshStandardMaterial({
      color: palette[i % palette.length], metalness: 0.7, roughness: 0.25,
      emissive: palette[i % palette.length], emissiveIntensity: 0.25,
    })
  );
  mesh.position.set((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 20, -Math.random() * 40 - 2);
  mesh.userData = {
    speed: 0.2 + Math.random() * 0.6,
    offset: Math.random() * Math.PI * 2,
    rot: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(0.01),
  };
  scene.add(mesh);
  shapes.push(mesh);
}

// Particle starfield
const particleCount = isMobile ? 1500 : 4000;
const positions = new Float32Array(particleCount * 3);
const colors = new Float32Array(particleCount * 3);
const tmpColor = new THREE.Color();
for (let i = 0; i < particleCount; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 80;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
  positions[i * 3 + 2] = -Math.random() * 80 + 10;
  tmpColor.setHex(palette[i % 3]).lerp(new THREE.Color(0xffffff), Math.random() * 0.6);
  colors.set([tmpColor.r, tmpColor.g, tmpColor.b], i * 3);
}
const particleGeo = new THREE.BufferGeometry();
particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
const particles = new THREE.Points(
  particleGeo,
  new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })
);
scene.add(particles);

// Post-processing bloom
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.9, 0.6, 0.15);
composer.addPass(bloom);

// Interaction state
const mouse = new THREE.Vector2();
const targetMouse = new THREE.Vector2();
let scrollProgress = 0;

window.addEventListener('pointermove', (e) => {
  targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  targetMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  const glow = document.getElementById('cursorGlow');
  glow.style.left = e.clientX + 'px';
  glow.style.top = e.clientY + 'px';
});

window.addEventListener('scroll', () => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  scrollProgress = max > 0 ? window.scrollY / max : 0;
  document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
const clock = new THREE.Clock();
function animate() {
  const t = clock.getElapsedTime();
  mouse.lerp(targetMouse, 0.05);

  knot.rotation.x = t * 0.15 + scrollProgress * Math.PI * 2;
  knot.rotation.y = t * 0.25;
  shell.rotation.y = -t * 0.1;
  shell.rotation.x = t * 0.05;
  rings.forEach((r, i) => { r.rotation.z = t * (0.2 + i * 0.1) * (i % 2 ? -1 : 1); });

  // Scroll choreography: hero swings across and recedes, camera glides through the field
  const swing = Math.sin(scrollProgress * Math.PI);
  hero.position.x = (isMobile ? 0 : 4.2) - swing * (isMobile ? 0 : 1.5) - scrollProgress * (isMobile ? 0 : 1);
  hero.position.y = (isMobile ? 1.5 : 0) + Math.sin(t * 0.8) * 0.2 - scrollProgress * 2;
  hero.position.z = -scrollProgress * 16;
  hero.scale.setScalar(1 - scrollProgress * 0.2);
  camera.position.z = 12 - scrollProgress * 6;
  camera.position.x += (mouse.x * 1.5 - camera.position.x) * 0.05;
  camera.position.y += (mouse.y * 1.0 - scrollProgress * 2 - camera.position.y) * 0.05;
  camera.lookAt(0, -scrollProgress * 2, camera.position.z - 12);

  keyLight.position.x = 5 + mouse.x * 6;
  keyLight.position.y = 5 + mouse.y * 6;

  shapes.forEach((s) => {
    const d = s.userData;
    s.rotation.x += d.rot.x;
    s.rotation.y += d.rot.y;
    s.position.y += Math.sin(t * d.speed + d.offset) * 0.004;
  });

  particles.rotation.y = t * 0.01;
  particles.rotation.x = mouse.y * 0.05;

  composer.render();
  requestAnimationFrame(animate);
}
animate();

// Hide loader once the first frames are rendered
window.addEventListener('load', () => setTimeout(() => document.getElementById('loader').classList.add('hidden'), 400));

// Reveal on scroll
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('visible');
    entry.target.querySelectorAll?.('[data-count]').forEach(animateCount);
    if (entry.target.matches('[data-count]')) animateCount(entry.target);
    io.unobserve(entry.target);
  });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach((el, i) => {
  el.style.transitionDelay = `${(i % 3) * 0.1}s`;
  io.observe(el);
});

function animateCount(el) {
  if (el.dataset.done) return;
  el.dataset.done = '1';
  const target = +el.dataset.count;
  const suffix = el.dataset.suffix || '';
  const start = performance.now();
  const step = (now) => {
    const p = Math.min((now - start) / 1600, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// 3D tilt on cards
document.querySelectorAll('.tilt').forEach((el) => {
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${-y * 12}deg) rotateY(${x * 12}deg) translateZ(10px)`;
  });
  el.addEventListener('pointerleave', () => { el.style.transform = ''; });
});

// Mobile menu
document.getElementById('menuToggle').addEventListener('click', () => {
  document.getElementById('nav').classList.toggle('open');
});
document.querySelectorAll('.nav-links a').forEach((a) =>
  a.addEventListener('click', () => document.getElementById('nav').classList.remove('open'))
);

// CTA form
document.getElementById('ctaForm').addEventListener('submit', (e) => {
  e.preventDefault();
  document.getElementById('formMsg').textContent = "🚀 You're on the list! We'll be in touch soon.";
  e.target.reset();
});
