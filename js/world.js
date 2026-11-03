// Monde : île principale, lac, quai, érables, établi, magasin, îlots, ciel et moments de la journée.
import * as THREE from '../vendor/three.module.min.js';
import { makeRng } from './math/rng.js';

// ---------- Monde courbé (effet « petite planète ») : on abaisse les sommets selon la distance au joueur.
export const curve = { uCurve: { value: 0.0022 }, uCenter: { value: new THREE.Vector2() } };
export function curved(material) {
  material.onBeforeCompile = sh => {
    sh.uniforms.uCurve = curve.uCurve; sh.uniforms.uCenter = curve.uCenter;
    sh.vertexShader = 'uniform float uCurve; uniform vec2 uCenter;\n' + sh.vertexShader.replace('#include <project_vertex>', `
      vec4 wp = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        wp = instanceMatrix * wp;
      #endif
      wp = modelMatrix * wp;
      vec2 dd = wp.xz - uCenter; wp.y -= dot(dd, dd) * uCurve;
      vec4 mvPosition = viewMatrix * wp;
      gl_Position = projectionMatrix * mvPosition;`);
  };
  material.customProgramCacheKey = () => 'curved';
  return material;
}
export const curveDrop = (x, z) => { const dx = x - curve.uCenter.value.x, dz = z - curve.uCenter.value.y; return (dx * dx + dz * dz) * curve.uCurve.value; };
const MATS = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!MATS.has(key)) MATS.set(key, curved(new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts })));
  return MATS.get(key);
}
export function mesh(geo, color, opts) { const m = new THREE.Mesh(geo, mat(color, opts)); return m; }
export function at(obj, x, y, z, ry = 0) { obj.position.set(x, y, z); obj.rotation.y = ry; return obj; }

// Étiquette texte en sprite (panneaux, noms)
export function label(text, { size = 36, color = '#3b2a1a', bg = 'rgba(255,248,235,0.92)', scale = 1 } = {}) {
  const c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = `700 ${size}px Nunito, "Trebuchet MS", sans-serif`;
  const w = Math.ceil(g.measureText(text).width) + 28, h = size + 22; c.width = w; c.height = h;
  g.font = `700 ${size}px Nunito, "Trebuchet MS", sans-serif`;
  g.fillStyle = bg; g.beginPath(); g.roundRect(2, 2, w - 4, h - 4, h / 2.4); g.fill();
  g.fillStyle = color; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillText(text, w / 2, h / 2 + 1);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  s.scale.set(w / h * 0.55 * scale, 0.55 * scale, 1); s.renderOrder = 5; LABELS.push(s); return s;
}
// Les sprites ne passent pas par le shader courbé : on les abaisse à la main chaque image.
export const LABELS = [];
const _v = new THREE.Vector3();
export function updateLabels() {
  for (const s of LABELS) { if (s.userData.baseY == null) s.userData.baseY = s.position.y; s.position.y = s.userData.baseY; s.getWorldPosition(_v); s.position.y = s.userData.baseY - curveDrop(_v.x, _v.z); }
}
// Ombre douce (disque) sous les objets
const blobTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 2, 32, 32, 31); gr.addColorStop(0, 'rgba(40,30,20,0.45)'); gr.addColorStop(1, 'rgba(40,30,20,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();
const blobMat = curved(new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false }));
export function blob(r) { const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), blobMat); m.rotation.x = -Math.PI / 2; m.position.y = 0.03; m.renderOrder = 1; return m; }

// ---------- Palettes des 4 moments de la journée
export const TIMES = {
  matin: { sky: ['#bfe3f2', '#ffe2c4'], fog: '#f4dcc8', sun: '#ffe0b8', sunI: 1.6, hemi: ['#e9f3ff', '#c9b28a'], hemiI: 1.25, water: '#7fc4cf', sunPos: [-30, 22, 18] },
  midi: { sky: ['#8fd0f0', '#e6f6ff'], fog: '#dff0f5', sun: '#fff6e6', sunI: 2.0, hemi: ['#f2fbff', '#b9b07a'], hemiI: 1.35, water: '#5fb6cc', sunPos: [10, 40, 12] },
  doree: { sky: ['#f6b48a', '#ffe5a8'], fog: '#f7c99c', sun: '#ffc27a', sunI: 1.9, hemi: ['#ffd9b0', '#b3876a'], hemiI: 1.15, water: '#e3a57e', sunPos: [32, 14, 10] },
  nuit: { sky: ['#1d2550', '#5b4b7c'], fog: '#3a3a66', sun: '#a9b8ff', sunI: 0.55, hemi: ['#6f7fc0', '#2c2440'], hemiI: 0.75, water: '#2f4f7a', sunPos: [-12, 30, -10] },
};
export const TIME_ORDER = ['matin', 'midi', 'doree', 'nuit'];
export const TIME_NOMS = { matin: 'Matin', midi: 'Midi', doree: 'Heure dorée', nuit: 'Nuit' };
export const phaseOf = clock => TIME_ORDER[Math.floor(((clock % 1) + 1) % 1 * 4)];

// ---------- Géométrie des lieux
export const ISLANDS = [
  { id: 'main', x: 0, z: 0, r: 30 },
  { id: 'bleuets', x: 46, z: 4, r: 10 },
  { id: 'erables', x: -4, z: -47, r: 11 },
];
export const BRIDGES = {
  bleuets: { x0: 28, x1: 37.5, z0: 2.6, z1: 5.4 },
  erables: { x0: -5.4, x1: -2.6, z0: -37.5, z1: -28 },
};
export const DOCK = { x0: 4.8, x1: 7.2, z0: 27, z1: 38 };
// Quai du traversier : même endroit (côte ouest) sur les deux îles.
export const FERRY = { x0: -40, x1: -29.2, z0: 2.8, z1: 5.2, boatX: -43, arrive: [-34, 4] };
export const onFerryDock = (x, z) => x > FERRY.x0 + 0.2 && x < FERRY.x1 + 0.4 && z > FERRY.z0 + 0.2 && z < FERRY.z1 - 0.2;
// Quai + bateau du traversier (île 1 et île 2). Retourne { group, setLocked(bool) }.
export function makeFerry(parent, lockable) {
  const g = new THREE.Group(); const len = FERRY.x1 - FERRY.x0, cz = (FERRY.z0 + FERRY.z1) / 2;
  for (let i = 0; i < len / 0.6; i++) g.add(at(mesh(new THREE.BoxGeometry(0.52, 0.16, 2.6), i % 3 ? '#b88a5c' : '#a77a4f'), FERRY.x0 + 0.3 + i * 0.6, 0.05, cz));
  for (let i = 0; i <= 3; i++) for (const pz of [FERRY.z0 - 0.05, FERRY.z1 + 0.05]) g.add(at(mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.8, 6), '#7a5236'), FERRY.x0 + 0.6 + i * (len - 2) / 3, -0.5, pz));
  // le bateau : coque, cabine, cheminée
  const boat = new THREE.Group();
  boat.add(at(mesh(new THREE.BoxGeometry(5.2, 1, 3), '#f3efe6'), 0, -0.2, 0));
  boat.add(at(mesh(new THREE.BoxGeometry(5.3, 0.3, 3.1), '#2f5d8a'), 0, -0.55, 0));
  boat.add(at(mesh(new THREE.BoxGeometry(2.2, 1.2, 2.2), '#d64545'), -0.6, 0.9, 0));
  for (const wz of [-1.12, 1.12]) boat.add(at(mesh(new THREE.BoxGeometry(1.6, 0.45, 0.05), '#bfe3f2'), -0.6, 1.05, wz));
  boat.add(at(mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.9, 8), '#2b2b33'), -1.2, 1.9, 0));
  boat.add(at(mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.2, 4), '#7a5236'), 1.6, 1.1, 0));
  const flag = at(mesh(new THREE.BoxGeometry(0.05, 0.5, 0.8), '#e2572e'), 1.6, 2, 0.42); boat.add(flag);
  boat.position.set(FERRY.boatX, 0, cz); g.add(boat);
  // panneau
  const sign = new THREE.Group(); sign.add(at(mesh(new THREE.BoxGeometry(0.12, 1.4, 0.12), '#7a5236'), 0, 0.7, 0)); sign.add(at(mesh(new THREE.BoxGeometry(1.4, 0.7, 0.1), '#f3e3c3'), 0, 1.4, 0));
  const open = label('⛴️ Traversier', { size: 26 }), shut = label('⛴️ Traversier 🔒', { size: 26 }); for (const l of [open, shut]) { l.position.set(0, 2.3, 0); sign.add(l); }
  sign.position.set(FERRY.x1 + 1.4, 0, FERRY.z1 + 1.2); g.add(sign);
  const chain = new THREE.Group(); for (const pz of [FERRY.z0 + 0.2, FERRY.z1 - 0.2]) chain.add(at(mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.1, 5), '#4a4a50'), FERRY.x1 - 1.5, 0.6, pz));
  const bar = at(mesh(new THREE.BoxGeometry(0.1, 0.14, 2.2), '#f2c230'), FERRY.x1 - 1.5, 0.95, cz); chain.add(bar); g.add(chain);
  parent.add(g);
  const api = { group: g, boat, setLocked(on) { shut.visible = on && lockable; open.visible = !(on && lockable); chain.visible = on && lockable; } };
  api.setLocked(!!lockable); return api;
}
export const PLACES = {
  etabli: [-12, -3], magasin: [12, -9], erable: [-2, -16], quai: [6, 37.2], plates: [17, 7],
};
const DECOR_SPOTS = { nichoir: [-6, 5], lupins: [3, 11], lanterne: [8.8, 27], banc: [0, 3], feu: [-14, 12], adirondack: [-11, 14.5] };

export function buildWorld(scene, G) {
  const rng = makeRng(G.state.seed ^ 0x51ed);
  const root = new THREE.Group(); scene.add(root);
  const interactables = [], obstacles = [], anims = [];

  // Ciel (dégradé) et brouillard
  const skyU = { top: { value: new THREE.Color() }, bot: { value: new THREE.Color() } };
  const sky = new THREE.Mesh(new THREE.SphereGeometry(400, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: skyU,
    vertexShader: 'varying float h; void main(){ h = normalize(position).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bot; varying float h; void main(){ gl_FragColor = vec4(mix(bot, top, smoothstep(-0.05, 0.6, h)), 1.0); }' }));
  sky.renderOrder = -1; scene.add(sky);
  scene.fog = new THREE.Fog(0xffffff, 60, 170);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x887766, 1.2); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.5); scene.add(sun);
  // Étoiles (nuit)
  const starGeo = new THREE.BufferGeometry(); const sp = [];
  for (let i = 0; i < 300; i++) { const a = rng.next() * Math.PI * 2, e = 0.15 + rng.next() * 1.2; sp.push(Math.cos(a) * Math.cos(e) * 300, Math.sin(e) * 300, Math.sin(a) * Math.cos(e) * 300); }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xfff8e0, size: 1.6, sizeAttenuation: false, transparent: true, fog: false })); scene.add(stars);

  // Lac
  const waterGeo = new THREE.PlaneGeometry(260, 260, 52, 52); waterGeo.rotateX(-Math.PI / 2);
  const water = new THREE.Mesh(waterGeo, curved(new THREE.MeshLambertMaterial({ color: 0x5fb6cc, flatShading: true }))); water.position.y = -0.7; scene.add(water); // partagée par les deux îles
  const wp = waterGeo.attributes.position, wbase = Float32Array.from(wp.array);

  // Îles : sable + gazon, bord irrégulier
  for (const isl of ISLANDS) {
    const seg = Math.round(isl.r * 1.4);
    const sand = new THREE.CylinderGeometry(isl.r + 1.6, isl.r + 2.6, 1.6, seg, 1);
    const grass = new THREE.CylinderGeometry(isl.r, isl.r + 0.4, 0.8, seg, 1);
    for (const [g, j] of [[sand, 0.7], [grass, 0.5]]) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x); const k = 1 + (Math.sin(a * 3 + isl.r) * 0.03 + Math.sin(a * 7) * 0.02) * j; if (Math.hypot(x, z) > 0.5) { p.setX(i, x * k); p.setZ(i, z * k); } } g.computeVertexNormals(); }
    root.add(at(mesh(sand, '#f1d9a6'), isl.x, -0.85, isl.z));
    root.add(at(mesh(grass, isl.id === 'bleuets' ? '#9fcf86' : isl.id === 'erables' ? '#b6c979' : '#a9d68b'), isl.x, -0.4, isl.z));
    // touffes d’herbe et cailloux
    for (let i = 0; i < isl.r * 1.6; i++) { const a = rng.next() * 6.283, d = Math.sqrt(rng.next()) * (isl.r - 1.5); const x = isl.x + Math.cos(a) * d, z = isl.z + Math.sin(a) * d; if (nearPlace(x, z, 4)) continue;
      if (rng.chance(0.75)) root.add(at(mesh(new THREE.ConeGeometry(0.18, 0.45, 4), '#7fb86a'), x, 0.2, z, rng.next()));
      else root.add(at(mesh(new THREE.DodecahedronGeometry(0.35 + rng.next() * 0.3, 0), '#c8c2b4'), x, 0.05, z, rng.next() * 3)); }
    // quenouilles au bord
    for (let i = 0; i < isl.r / 2; i++) { const a = rng.next() * 6.283, d = isl.r + 1.2; const g = new THREE.Group(); g.add(at(mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.3, 4), '#6f9a52'), 0, 0.65, 0)); g.add(at(mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.35, 5), '#7a4d2b'), 0, 1.2, 0)); root.add(at(g, isl.x + Math.cos(a) * d, -0.3, isl.z + Math.sin(a) * d)); }
  }
  function nearPlace(x, z, r) { return Object.values(PLACES).some(([px, pz]) => Math.hypot(px - x, pz - z) < r) || Math.hypot(x - 6, z - 28) < 3 || Math.hypot(x, z - 6) < 3; }

  // Sentier
  for (let i = 0; i < 26; i++) { const t = i / 25; const x = 6 * t * t - 0.5 + Math.sin(t * 5) * 1.2, z = -10 + t * 36; const st = at(mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.12, 7), '#e7d3a9'), x + (i % 2) * 0.4, 0.02, z, i); st.scale.set(1, 1, 0.8); root.add(st); }

  // ---------- Érables (secouables)
  const LEAF = ['#e2572e', '#f08a24', '#f4b63f', '#d9432f', '#ef9a3a'];
  function maple(x, z, s = 1, big = false) {
    const g = new THREE.Group(); const trunk = mesh(new THREE.CylinderGeometry(0.22 * s, 0.34 * s, 2.4 * s, 6), '#7a5236'); trunk.position.y = 1.2 * s; g.add(trunk);
    const crown = new THREE.Group(); crown.position.y = 2.6 * s; g.add(crown);
    const c1 = rng.pick(LEAF), c2 = rng.pick(LEAF);
    for (const [dx, dy, dz, r, c] of [[0, 0.6, 0, 1.5, c1], [-0.8, 0, 0.3, 1.1, c2], [0.85, 0.1, -0.2, 1.05, c2], [0.1, 1.5, 0.1, 0.95, c1]]) crown.add(at(mesh(new THREE.IcosahedronGeometry(r * s, 0), c), dx * s, dy * s, dz * s, rng.next() * 3));
    g.add(blob(1.8 * s)); at(g, x, 0, z, rng.next() * 6);
    root.add(g); obstacles.push({ x, z, r: 0.55 * s });
    const it = { id: `erable_${interactables.length}`, kind: 'tree', pos: new THREE.Vector3(x, 0, z), r: 1.9 * s, label: 'Secouer l’érable', obj: g, crown, ready: 0, big };
    interactables.push(it); return it;
  }
  const TREE_SPOTS = [[-20, -8], [-18, 6], [-6, -22], [8, -20], [20, -14], [23, 0], [-23, -3], [-10, 20], [16, 18], [-17, -17], [3, -8], [22, 12]];
  TREE_SPOTS.forEach(([x, z]) => maple(x, z, 0.9 + rng.next() * 0.3));
  maple(PLACES.erable[0], PLACES.erable[1] - 2.2, 1.6, true).label = 'Secouer le Grand Érable';
  // îlot des érables : érablière avec chaudières
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + 0.4, it = maple(-4 + Math.cos(a) * 6.5, -47 + Math.sin(a) * 6.5, 1.05); it.zone = 'erables'; it.obj.add(at(mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.3, 6), '#b8c2c8'), 0.36, 1.2, 0)); }
  // cabane à sucre
  { const g = new THREE.Group(); g.add(at(mesh(new THREE.BoxGeometry(4, 2.4, 3), '#9a6a45'), 0, 1.2, 0)); const roof = mesh(new THREE.ConeGeometry(3.4, 1.6, 4), '#7b3b2c'); roof.rotation.y = Math.PI / 4; roof.position.y = 3.2; roof.scale.set(1, 1, 0.8); g.add(roof); g.add(at(mesh(new THREE.BoxGeometry(0.5, 1.4, 0.5), '#6e6e6e'), 1, 4, 0)); g.add(at(mesh(new THREE.BoxGeometry(1, 1.6, 0.1), '#5b3a24'), 0, 0.8, 1.52)); g.add(blob(3)); const sg = label('Cabane à sucre', { size: 30 }); sg.position.set(0, 4.6, 0); g.add(sg); root.add(at(g, -4, 0, -47)); obstacles.push({ x: -4, z: -47, r: 2.4 }); }
  // îlot des bleuets : buissons
  const bleuets = [];
  for (let i = 0; i < 9; i++) { const a = rng.next() * 6.283, d = 2 + rng.next() * 6; const x = 46 + Math.cos(a) * d, z = 4 + Math.sin(a) * d; const g = new THREE.Group(); g.add(at(mesh(new THREE.IcosahedronGeometry(0.8, 0), '#4f8a4a'), 0, 0.6, 0)); for (let k = 0; k < 6; k++) g.add(at(mesh(new THREE.IcosahedronGeometry(0.13, 0), '#3d4f9e'), Math.cos(k) * 0.65, 0.5 + (k % 3) * 0.25, Math.sin(k) * 0.65)); root.add(at(g, x, 0, z)); obstacles.push({ x, z, r: 0.7 }); bleuets.push(g); }

  // ---------- Établi de Gaston
  { const [x, z] = PLACES.etabli; const g = new THREE.Group();
    g.add(at(mesh(new THREE.BoxGeometry(3.4, 0.25, 1.4), '#b07b4f'), 0, 1.05, 0));
    for (const [lx, lz] of [[-1.5, -0.55], [1.5, -0.55], [-1.5, 0.55], [1.5, 0.55]]) g.add(at(mesh(new THREE.BoxGeometry(0.2, 1, 0.2), '#8a5a36'), lx, 0.5, lz));
    g.add(at(mesh(new THREE.BoxGeometry(3.6, 2.2, 0.2), '#9c6b45'), 0, 2.1, -0.75));
    const roof = mesh(new THREE.BoxGeometry(4.2, 0.2, 2.2), '#c4553a'); roof.position.set(0, 3.3, 0); roof.rotation.x = 0.25; g.add(roof);
    g.add(at(mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 4), '#5c4033'), -1, 1.8, -0.6)); g.add(at(mesh(new THREE.BoxGeometry(0.5, 0.3, 0.2), '#7c8a96'), -1, 2.5, -0.6));
    g.add(at(mesh(new THREE.TorusGeometry(0.3, 0.06, 5, 10), '#c9a227'), 0.6, 2.3, -0.62)); g.add(at(mesh(new THREE.BoxGeometry(0.5, 0.35, 0.4), '#4d8fbf'), 1.1, 1.35, 0.1));
    g.add(at(mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.7, 7), '#8a5a36'), 2.5, 0.35, 0.6));
    const sg = label('Établi de Gaston', { size: 30 }); sg.position.set(0, 4.1, 0); g.add(sg); g.add(blob(2.6));
    root.add(at(g, x, 0, z)); obstacles.push({ x: x - 1, z, r: 1.1 }, { x: x + 1, z, r: 1.1 });
    interactables.push({ id: 'etabli', kind: 'etabli', pos: new THREE.Vector3(x, 0, z + 1.2), r: 2.6, label: 'Utiliser l’établi', obj: g }); }

  // ---------- Magasin général de Ginette
  { const [x, z] = PLACES.magasin; const g = new THREE.Group();
    g.add(at(mesh(new THREE.BoxGeometry(6, 3.2, 4.4), '#f3e3c3'), 0, 1.6, 0));
    const roof = mesh(new THREE.CylinderGeometry(0.01, 4.1, 2, 4, 1), '#b9473a'); roof.rotation.y = Math.PI / 4; roof.scale.set(1.15, 1, 0.85); roof.position.y = 4.2; g.add(roof);
    g.add(at(mesh(new THREE.BoxGeometry(6.6, 0.25, 1.8), '#9a6a45'), 0, 0.12, 2.9));
    for (const px of [-2.9, 2.9]) g.add(at(mesh(new THREE.BoxGeometry(0.2, 2.6, 0.2), '#7a5236'), px, 1.3, 3.6));
    g.add(at(mesh(new THREE.BoxGeometry(6.6, 0.18, 1.9), '#3f7a5a'), 0, 2.65, 2.95));
    g.add(at(mesh(new THREE.BoxGeometry(1.2, 2, 0.1), '#3f7a5a'), 0, 1, 2.22));
    for (const wx of [-1.9, 1.9]) g.add(at(mesh(new THREE.BoxGeometry(1.1, 0.9, 0.1), '#bfe3f2'), wx, 1.7, 2.22));
    for (let i = 0; i < 3; i++) g.add(at(mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), i % 2 ? '#d99a4e' : '#c1803f'), -2.4 + i * 0.6, 0.5, 3.2, i));
    const sg = label('MAGASIN GÉNÉRAL', { size: 34, bg: 'rgba(63,122,90,0.95)', color: '#fff6e0' }); sg.position.set(0, 3.3, 2.5); g.add(sg); g.add(blob(4.5));
    root.add(at(g, x, 0, z)); obstacles.push({ x: x - 1.6, z, r: 2.3 }, { x: x + 1.6, z, r: 2.3 });
    interactables.push({ id: 'magasin', kind: 'magasin', pos: new THREE.Vector3(x, 0, z + 3.6), r: 2.4, label: 'Entrer au magasin', obj: g }); }

  // ---------- Quai
  { const g = new THREE.Group(); const len = DOCK.z1 - DOCK.z0;
    for (let i = 0; i < len / 0.6; i++) g.add(at(mesh(new THREE.BoxGeometry(2.6, 0.16, 0.52), i % 3 ? '#b88a5c' : '#a77a4f'), 6, 0.05, DOCK.z0 + 0.3 + i * 0.6));
    for (let i = 0; i <= 3; i++) for (const px of [4.75, 7.25]) g.add(at(mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.8, 6), '#7a5236'), px, -0.5, DOCK.z0 + 2 + i * (len - 2) / 3));
    g.add(at(mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 8), '#d64545'), 7.6, -0.62, DOCK.z1 + 1.6)); // flotteur
    root.add(g);
    interactables.push({ id: 'quai', kind: 'fish', pos: new THREE.Vector3(6, 0, DOCK.z1 - 0.8), r: 1.8, label: 'Pêcher', obj: g }); }
  const bobber = at(mesh(new THREE.SphereGeometry(0.16, 8, 6), '#ff5a4a'), 6, -0.55, DOCK.z1 + 2.2); bobber.visible = false; root.add(bobber);

  // ---------- Traversier (vers l’île de Secondaire 2)
  const ferry = makeFerry(root, true);
  interactables.push({ id: 'traversier', kind: 'ferry', pos: new THREE.Vector3(FERRY.x0 + 3, 0, (FERRY.z0 + FERRY.z1) / 2), r: 2.4, label: 'Prendre le traversier', obj: ferry.group });

  // ---------- Plates-bandes
  const beds = [];
  for (let i = 0; i < 4; i++) { const x = PLACES.plates[0] + (i % 2) * 2.6 - 1.3, z = PLACES.plates[1] + Math.floor(i / 2) * 2.4 - 1.2; const g = new THREE.Group();
    g.add(at(mesh(new THREE.BoxGeometry(2.1, 0.3, 1.8), '#8a5a36'), 0, 0.12, 0)); g.add(at(mesh(new THREE.BoxGeometry(1.8, 0.1, 1.5), '#5a3b26'), 0, 0.3, 0));
    const fl = new THREE.Group(); const cols = ['#e86a92', '#f6d04d', '#9b7be0', '#ffffff', '#f08a24'];
    for (let k = 0; k < 6; k++) { const f = new THREE.Group(); f.add(at(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 4), '#5f9a4a'), 0, 0.25, 0)); f.add(at(mesh(new THREE.IcosahedronGeometry(0.14, 0), cols[(k + i) % 5]), 0, 0.52, 0)); fl.add(at(f, (k % 3) * 0.55 - 0.55, 0.3, Math.floor(k / 3) * 0.6 - 0.3)); }
    fl.scale.setScalar(0.35); g.add(fl); root.add(at(g, x, 0, z)); obstacles.push({ x, z, r: 0.9 });
    const it = { id: `plate_${i}`, kind: 'bed', pos: new THREE.Vector3(x, 0, z), r: 1.9, label: 'Arroser', obj: g, flowers: fl, ready: 0, grow: 0.35 }; beds.push(it); interactables.push(it); }
  { const sg = label('Plates-bandes', { size: 26 }); sg.position.set(PLACES.plates[0], 2.2, PLACES.plates[1] - 2.6); root.add(sg); }

  // ---------- Trous à creuser
  const DIG_SPOTS = [[-15, 1], [8, 4], [-4, 21], [14, -21], [-24, 9], [19, 22], [48, 9], [42, -1], [1, -43], [-9, -50]];
  const digs = DIG_SPOTS.map(([x, z], i) => { const g = new THREE.Group(); g.add(at(mesh(new THREE.CylinderGeometry(0.6, 0.75, 0.2, 7), '#8d6a48'), 0, 0.05, 0));
    const xm = new THREE.Group(); xm.add(at(mesh(new THREE.BoxGeometry(0.8, 0.06, 0.14), '#5a3b26'), 0, 0.17, 0, 0.785)); xm.add(at(mesh(new THREE.BoxGeometry(0.8, 0.06, 0.14), '#5a3b26'), 0, 0.17, 0, -0.785)); g.add(xm);
    root.add(at(g, x, 0, z)); const it = { id: `trou_${i}`, kind: 'dig', pos: new THREE.Vector3(x, 0, z), r: 1.6, label: 'Creuser', obj: g, mark: xm, ready: 0, zone: x > 35 ? 'bleuets' : z < -35 ? 'erables' : null }; interactables.push(it); return it; });

  // ---------- Papillons
  const BUGS = ['monarque', 'amiral', 'lune'];
  const butterflies = [];
  const wingCol = { monarque: '#f08a24', amiral: '#2b2b33', lune: '#bff2c8' };
  for (let i = 0; i < 7; i++) { const kind = i < 3 ? 'monarque' : i < 5 ? 'amiral' : 'lune'; const g = new THREE.Group();
    const wg = new THREE.PlaneGeometry(0.42, 0.34); const m = new THREE.MeshLambertMaterial({ color: wingCol[kind], side: THREE.DoubleSide, emissive: kind === 'lune' ? 0x335544 : 0 }); curved(m);
    const l = new THREE.Mesh(wg, m), r = new THREE.Mesh(wg, m); l.position.x = -0.2; r.position.x = 0.2; const lw = new THREE.Group(), rw = new THREE.Group(); lw.add(l); rw.add(r); g.add(lw, rw); g.add(at(mesh(new THREE.BoxGeometry(0.06, 0.06, 0.3), '#2b2018'), 0, 0, 0));
    const home = i < 6 ? [rng.int(-18, 22), rng.int(-14, 20)] : [44, 4];
    if (i === 6) home[0] = 46; const b = { kind, g, lw, rw, home, t: rng.next() * 10, speed: 0.4 + rng.next() * 0.4, caught: 0, night: kind === 'lune' };
    root.add(g); butterflies.push(b); }
  // ---------- Décor achetable (emplacements fixes)
  const decor = {};
  function makeDecor(id) {
    const g = new THREE.Group();
    if (id === 'nichoir') { g.add(at(mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 5), '#7a5236'), 0, 1.1, 0)); g.add(at(mesh(new THREE.BoxGeometry(0.7, 0.7, 0.6), '#5c9bd6'), 0, 2.4, 0)); const rf = mesh(new THREE.ConeGeometry(0.62, 0.45, 4), '#c4553a'); rf.position.y = 2.95; rf.rotation.y = 0.785; g.add(rf); const hole = at(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 8), '#2b2018'), 0, 2.45, 0.31); hole.rotation.x = Math.PI / 2; g.add(hole); }
    if (id === 'lupins') for (let k = 0; k < 9; k++) { const c = ['#9b7be0', '#e86a92', '#f3f0ff'][k % 3]; const f = new THREE.Group(); f.add(at(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 4), '#5f9a4a'), 0, 0.3, 0)); f.add(at(mesh(new THREE.ConeGeometry(0.16, 0.7, 5), c), 0, 0.95, 0)); g.add(at(f, Math.cos(k * 2.4) * (0.3 + k * 0.1), 0, Math.sin(k * 2.4) * (0.3 + k * 0.1))); }
    if (id === 'lanterne') { g.add(at(mesh(new THREE.CylinderGeometry(0.07, 0.09, 2.4, 6), '#3a3a40'), 0, 1.2, 0)); g.add(at(mesh(new THREE.BoxGeometry(0.45, 0.55, 0.45), '#ffe08a', { emissive: 0xffb84a, emissiveIntensity: 0.9 }), 0, 2.6, 0)); const l = new THREE.PointLight(0xffc06a, 0, 9, 1.6); l.position.y = 2.6; g.add(l); g.userData.light = l; }
    if (id === 'banc') { g.add(at(mesh(new THREE.BoxGeometry(2.2, 0.15, 0.6), '#b07b4f'), 0, 0.55, 0)); g.add(at(mesh(new THREE.BoxGeometry(2.2, 0.5, 0.12), '#b07b4f'), 0, 0.95, -0.28)); for (const lx of [-0.9, 0.9]) g.add(at(mesh(new THREE.BoxGeometry(0.12, 0.55, 0.5), '#3a3a40'), lx, 0.27, 0)); }
    if (id === 'feu') { for (let k = 0; k < 7; k++) g.add(at(mesh(new THREE.DodecahedronGeometry(0.28, 0), '#9b968c'), Math.cos(k * 0.9) * 0.75, 0.12, Math.sin(k * 0.9) * 0.75)); for (let k = 0; k < 3; k++) { const lg = at(mesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 5), '#6b4a30'), 0, 0.25, 0, k * 1.05); lg.rotation.z = 1.3; lg.rotation.order = 'YXZ'; g.add(lg); } const fl = mesh(new THREE.ConeGeometry(0.35, 0.9, 5), '#ff9a3a', { emissive: 0xff6a00, emissiveIntensity: 0.8 }); fl.position.y = 0.6; g.add(fl); g.userData.flame = fl; const l = new THREE.PointLight(0xff8a3a, 0, 10, 1.6); l.position.y = 1; g.add(l); g.userData.light = l; }
    if (id === 'adirondack') { const c = '#e0533d'; g.add(at(mesh(new THREE.BoxGeometry(0.9, 0.12, 0.9), c), 0, 0.45, 0)); const bk = mesh(new THREE.BoxGeometry(0.9, 1.1, 0.12), c); bk.position.set(0, 0.95, -0.5); bk.rotation.x = -0.35; g.add(bk); for (const lx of [-0.5, 0.5]) g.add(at(mesh(new THREE.BoxGeometry(0.12, 0.08, 1.1), c), lx, 0.75, 0)); for (const lx of [-0.4, 0.4]) g.add(at(mesh(new THREE.BoxGeometry(0.1, 0.45, 0.1), c), lx, 0.22, 0.3)); }
    g.add(blob(1)); return g;
  }
  function placeDecor(id) { if (decor[id] || !DECOR_SPOTS[id]) return; const [x, z] = DECOR_SPOTS[id]; const g = makeDecor(id); root.add(at(g, x, 0, z, id === 'adirondack' ? 0.5 : id === 'banc' ? 0 : 0)); decor[id] = g; obstacles.push({ x, z, r: id === 'banc' ? 1 : 0.6 }); }
  // ---------- Ponts
  const bridgeObjs = {};
  for (const [zone, b] of Object.entries(BRIDGES)) { const g = new THREE.Group(); const horiz = b.x1 - b.x0 > b.z1 - b.z0; const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    const posts = [[b.x0, b.z0], [b.x0, b.z1], [b.x1, b.z0], [b.x1, b.z1]]; for (const [px, pz] of posts) g.add(at(mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.8, 6), '#7a5236'), px, 0, pz));
    const sign = new THREE.Group(); sign.add(at(mesh(new THREE.BoxGeometry(0.12, 1.4, 0.12), '#7a5236'), 0, 0.7, 0)); sign.add(at(mesh(new THREE.BoxGeometry(1.4, 0.7, 0.1), '#f3e3c3'), 0, 1.4, 0)); const st = label('Pont à vendre', { size: 24 }); st.position.set(0, 2.2, 0); sign.add(st);
    const sx = horiz ? b.x0 - 1.2 : cx + 2, sz = horiz ? cz + 2 : b.z1 + 1.2; root.add(at(sign, sx, 0, sz)); g.userData.sign = sign;
    const deck = new THREE.Group(); const L = horiz ? b.x1 - b.x0 : b.z1 - b.z0;
    for (let i = 0; i < L / 0.55; i++) { const p = mesh(new THREE.BoxGeometry(horiz ? 0.48 : 2.9, 0.14, horiz ? 2.9 : 0.48), i % 2 ? '#b88a5c' : '#a77a4f'); const t = (i + 0.5) * 0.55; const arch = Math.sin(t / L * Math.PI) * 0.2; deck.add(at(p, horiz ? b.x0 + t : cx, 0.05 + arch, horiz ? cz : b.z0 + t)); }
    for (const side of [-1.4, 1.4]) { const rail = mesh(new THREE.BoxGeometry(horiz ? L : 0.1, 0.1, horiz ? 0.1 : L), '#8a5a36'); rail.position.set(horiz ? cx : cx + side, 1.1, horiz ? cz + side : cz); deck.add(rail); }
    deck.visible = false; g.add(deck); g.userData.deck = deck; root.add(g); bridgeObjs[zone] = g; }
  function openBridge(zone) { const g = bridgeObjs[zone]; if (!g) return; g.userData.deck.visible = true; g.userData.sign.visible = false; }

  // ---------- Marcher
  function walkable(x, z, state) {
    const onIsland = ISLANDS.some(i => (i.id === 'main' || state.bridges[i.id]) && Math.hypot(x - i.x, z - i.z) < i.r - 0.3);
    const onDock = (x > DOCK.x0 + 0.2 && x < DOCK.x1 - 0.2 && z > DOCK.z0 - 1 && z < DOCK.z1 - 0.3) || onFerryDock(x, z);
    const onBridge = Object.entries(BRIDGES).some(([k, b]) => state.bridges[k] && x > b.x0 + 0.25 && x < b.x1 - 0.25 && z > b.z0 + 0.25 && z < b.z1 - 0.25);
    if (!(onIsland || onDock || onBridge)) return false;
    return !obstacles.some(o => Math.hypot(x - o.x, z - o.z) < o.r + 0.35);
  }
  const zoneOf = (x, z) => ISLANDS.find(i => Math.hypot(x - i.x, z - i.z) < i.r + 1)?.id || 'main';

  // ---------- Moment de la journée (transition continue entre les 4 palettes)
  const cA = new THREE.Color(), cB = new THREE.Color();
  function blend(key, i0, i1, t, out) { const a = TIMES[TIME_ORDER[i0]][key], b = TIMES[TIME_ORDER[i1]][key]; return out.set(a).lerp(cB.set(b), t); }
  function setTime(clock) {
    const f = (((clock % 1) + 1) % 1) * 4, i0 = Math.floor(f), i1 = (i0 + 1) % 4; let t = f - i0; t = t < 0.7 ? 0 : (t - 0.7) / 0.3; t = t * t * (3 - 2 * t);
    const P0 = TIMES[TIME_ORDER[i0]], P1 = TIMES[TIME_ORDER[i1]];
    skyU.top.value.copy(blend('sky', i0, i1, t, cA).set(P0.sky[0]).lerp(cB.set(P1.sky[0]), t)); skyU.bot.value.set(P0.sky[1]).lerp(cB.set(P1.sky[1]), t);
    scene.fog.color.set(P0.fog).lerp(cB.set(P1.fog), t);
    sun.color.set(P0.sun).lerp(cB.set(P1.sun), t); sun.intensity = P0.sunI + (P1.sunI - P0.sunI) * t;
    sun.position.set(...P0.sunPos.map((v, k) => v + (P1.sunPos[k] - v) * t));
    hemi.color.set(P0.hemi[0]).lerp(cB.set(P1.hemi[0]), t); hemi.groundColor.set(P0.hemi[1]).lerp(cB.set(P1.hemi[1]), t); hemi.intensity = P0.hemiI + (P1.hemiI - P0.hemiI) * t;
    water.material.color.set(P0.water).lerp(cB.set(P1.water), t);
    const night = (i0 === 3 ? 1 - t : 0) + (i1 === 3 ? t : 0); stars.material.opacity = night; stars.visible = night > 0.02;
    for (const d of Object.values(decor)) if (d.userData.light) d.userData.light.intensity = root.visible ? 0.4 + night * 14 : 0;
    return { phase: TIME_ORDER[t > 0.5 ? i1 : i0], night };
  }

  let wt = 0;
  function update(dt, G) {
    wt += dt;
    for (let i = 0; i < wp.count; i++) { const x = wbase[i * 3], z = wbase[i * 3 + 2]; wp.array[i * 3 + 1] = Math.sin(x * 0.35 + wt * 1.2) * 0.08 + Math.cos(z * 0.3 + wt) * 0.08; }
    wp.needsUpdate = true;
    if (!root.visible) return; // île 1 cachée pendant qu’on est sur l’île 2
    for (const it of interactables) {
      if (it.kind === 'tree' && it.shake > 0) { it.shake = Math.max(0, it.shake - dt); const s = Math.sin(it.shake * 40) * it.shake * 0.25; it.crown.rotation.z = s; it.crown.rotation.x = s * 0.5; }
      if (it.kind === 'bed') { const target = G.time >= it.ready ? 1 : 0.35; it.grow += (target - it.grow) * Math.min(1, dt * 2); it.flowers.scale.setScalar(it.grow); }
      if (it.kind === 'dig') it.mark.visible = G.time >= it.ready;
    }
    for (const b of butterflies) { b.t += dt * b.speed; const vis = G.time >= b.caught && (!b.night || G.night > 0.4) && (b.home[0] < 35 || G.state.bridges.bleuets);
      b.g.visible = vis; const x = b.home[0] + Math.sin(b.t * 0.7) * 3 + Math.sin(b.t * 1.9) * 0.8, z = b.home[1] + Math.cos(b.t * 0.5) * 3, y = 1.1 + Math.sin(b.t * 3) * 0.3;
      b.g.position.set(x, y, z); b.g.rotation.y = Math.atan2(Math.cos(b.t * 0.7) * 0.7, -Math.sin(b.t * 0.5) * 0.5); const f = Math.sin(wt * 16 + b.t) * 0.9; b.lw.rotation.z = f; b.rw.rotation.z = -f; }
    for (const d of Object.values(decor)) if (d.userData.flame) { d.userData.flame.scale.y = 1 + Math.sin(wt * 9) * 0.15; }
    for (const g of bleuets) g.rotation.y = Math.sin(wt * 0.5 + g.position.x) * 0.03;
  }
  const fishSpot = { x: 6, z: DOCK.z1 - 0.8, fx: 6, fz: DOCK.z1 + 3 };
  return { update, setTime, interactables, walkable, zoneOf, placeDecor, openBridge, butterflies, beds, digs, bobber, decor, root, obstacles, BUGS, water, ferry, fishSpot, isle: 1, sky, sun, hemi };
}
