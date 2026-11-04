// « Joli » : passe visuelle (ombres douces, tonemapping filmique, palette plus vive, matériaux lisses à reflets, herbe au vent).
// Tout est désactivable avec ?joli=0 pour comparer avant/après dans le même build.
import * as THREE from '../vendor/three.module.min.js';
import { curved, TIMES } from './world.js';

const params = new URLSearchParams(location.search);
export const ON = params.get('joli') !== '0';
const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const off = k => params.get(k) === '0';
// Interrupteurs pour mesurer chaque morceau : ombres, herbe, geo (polygones en plus), pbr (MeshStandard + reflets du ciel + liseré), cam,
// vignette, adapt (qualité adaptative), q=N (force un palier de qualité, 0 = plein)
const SH = ON && !off('ombres'), HERBE = ON && !off('herbe') && !off('geo'), GEOX = ON && !off('geo'), PBR = ON && !off('pbr');
const ADAPT = ON && !off('adapt');
export const CAM = ON && !off('cam') ? { fov: 34, k: 1 } : { fov: 38, k: 1.08 };
// Densité de pixels : un écran DPR 3 (Galaxy S20) rend 2,25× plus de pixels qu’à DPR 2 pour un gain à peine visible
export const DPR = Math.min(devicePixelRatio || 1, ON ? 2 : (touch ? 1.75 : 2));

// Palette : couleurs plus saturées, ciel plus profond ; l’heure dorée garde un ciel chaud, un soleil bas et orangé, des ombres longues.
const GROUND = { '#a9d68b': '#6cb946', '#9fcf86': '#78bf5e', '#b6c979': '#9fc160', '#86b873': '#6fae58', '#f1d9a6': '#f0cd8a', '#d9cdb0': '#dcc79a', '#e7d3a9': '#ead2a0' };
if (ON) {
  Object.assign(TIMES.matin, { sky: ['#7fc0ea', '#ffd9b4'], fog: '#f2d6be', sunI: 2.2, hemiI: 1.3 });
  Object.assign(TIMES.midi, { sky: ['#3f9fe8', '#c4ecff'], fog: '#c9e8f6', sun: '#fff3dc', sunI: 1.9, hemi: ['#d6ecff', '#93a86a'], hemiI: 1.05, sunPos: [20, 34, 18] });
  Object.assign(TIMES.doree, { sky: ['#e98a5c', '#ffd08a'], fog: '#f0b27c', sun: '#ffaa5e', sunI: 2.9, hemi: ['#ffdcbc', '#a2906c'], hemiI: 1.3, sunPos: [34, 16, 8] });
  // nuit : clair de lune bleu froid, assez lumineux pour lire Flocon, les troncs et le sentier
  Object.assign(TIMES.nuit, { sky: ['#1f2f66', '#56679e'], fog: '#2c3866', sun: '#9fb6ff', sunI: 0.95, hemi: ['#7f98e6', '#262c55'], hemiI: 1.05, water: '#2f5f8e', waterE: '#14305a' });
}

let R = null; // renderer
export function setupRenderer(renderer) {
  if (!ON) return;
  R = renderer;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = SH; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (SH) renderer.shadowMap.autoUpdate = false; // on décide nous-mêmes quand recalculer l’ombre (voir tick)
  if (PBR) makeEnvs(renderer);
  if (params.get('vignette') === '0') return;
  const v = document.createElement('div'); v.id = 'vignette';
  v.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:1;background:radial-gradient(ellipse at 50% 45%,rgba(0,0,0,0) 58%,rgba(40,25,10,0.22) 100%)';
  document.body.appendChild(v);
}

// Bord de la carte d’ombre : au lieu d’une coupure nette, l’ombre s’estompe sur les derniers 12 % de la zone couverte.
if (SH) {
  const C = THREE.ShaderChunk, a = 'return mix( 1.0, shadow, shadowIntensity );', i = C.shadowmap_pars_fragment.indexOf(a);
  if (i >= 0) C.shadowmap_pars_fragment = C.shadowmap_pars_fragment.slice(0, i) +
    '{ vec2 ed = min( shadowCoord.xy, 1.0 - shadowCoord.xy ); return mix( 1.0, shadow, shadowIntensity * smoothstep( 0.0, 0.12, min( ed.x, ed.y ) ) ); }' + C.shadowmap_pars_fragment.slice(i + a.length);
}

// ---------- Reflets doux : une carte d’environnement pré-filtrée (PMREM) par moment de la journée, tirée d’un petit ciel dégradé
const ENV = {}; let envTex = null;
function makeEnv(pm, T) {
  const sc = new THREE.Scene();
  const g = new THREE.SphereGeometry(10, 32, 16), c = [], p = g.attributes.position, top = new THREE.Color(T.sky[0]), hor = new THREE.Color(T.sky[1]), gnd = new THREE.Color(T.hemi[1]).lerp(new THREE.Color('#5f8f45'), 0.5), t = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 10; if (y > 0) t.copy(hor).lerp(top, Math.pow(y, 0.6)); else t.copy(hor).lerp(gnd, Math.min(1, -y * 4)); c.push(t.r, t.g, t.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  sc.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const sunC = new THREE.Color(T.sun).multiplyScalar(3.5 * Math.min(1, T.sunI / 2));
  const disc = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), new THREE.MeshBasicMaterial({ color: sunC })); disc.position.set(...T.sunPos).setLength(8); sc.add(disc);
  const tex = pm.fromScene(sc, 0.04).texture; g.dispose(); return tex;
}
function makeEnvs(renderer) {
  const pm = new THREE.PMREMGenerator(renderer);
  for (const k of Object.keys(TIMES)) ENV[k] = makeEnv(pm, TIMES[k]);
  pm.dispose(); envTex = ENV.midi;
}
// Liseré (fresnel) : un léger contre-jour sur les silhouettes, couleur liée au soleil
const rim = { value: new THREE.Color('#fff1d6') }, rimK = { value: 0.22 };
function withRim(m) {
  const base = m.onBeforeCompile;
  m.onBeforeCompile = sh => { base && base(sh); sh.uniforms.uRim = rim; sh.uniforms.uRimK = rimK;
    sh.fragmentShader = 'uniform vec3 uRim; uniform float uRimK;\n' + sh.fragmentShader.replace('#include <opaque_fragment>',
      `{ float fr = 1.0 - saturate(dot(normal, normalize(vViewPosition))); outgoingLight += uRim * uRimK * fr * fr * fr; }\n#include <opaque_fragment>`); };
  m.customProgramCacheKey = () => 'curved-rim'; return m;
}
// Lambert facetté -> MeshStandard lisse (rugueux, non métallique) + reflets du ciel + liseré
const SMOOTH = new Map();
const LAMB = new Map();
// Grandes surfaces planes (sol, dalles, eau) : en Standard, le reflet rasant du ciel les délave. Elles restent Lambert.
function plainMat(m) { if (!LAMB.has(m)) { const c = m.clone(); curved(c); c.flatShading = false; LAMB.set(m, c); } return LAMB.get(m); }
function smoothMat(m) {
  if (SMOOTH.has(m)) return SMOOTH.get(m);
  let c;
  if (PBR && m.isMeshLambertMaterial) {
    c = new THREE.MeshStandardMaterial({ color: m.color, emissive: m.emissive, emissiveIntensity: m.emissiveIntensity, map: m.map, vertexColors: m.vertexColors,
      transparent: m.transparent, opacity: m.opacity, side: m.side, roughness: 0.82, metalness: 0, envMapIntensity: 0.45 });
    curved(c); withRim(c);
  } else { c = m.clone(); curved(c); }
  c.flatShading = false; SMOOTH.set(m, c); return c;
}
// Mêmes triangles, normales lisses : fusionner les sommets des polyèdres (ombrage seul, sans polygones)
function smoothNormals(geo) {
  const key = 'sn' + geo.uuid; if (GEO.has(key)) return GEO.get(key);
  const g = mergeVerts(geo); g.computeVertexNormals(); GEO.set(key, g); return g;
}
const GEO = new Map();
function bumpyBall(r) { // icosaèdre subdivisé, légèrement bosselé : couronne ronde mais pas « boule de billard »
  const key = 'ico' + r.toFixed(3);
  if (GEO.has(key)) return GEO.get(key);
  const g = new THREE.IcosahedronGeometry(r, 3); const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = v.clone().normalize();
    const k = 1 + 0.07 * Math.sin(n.x * 7.1 + n.y * 3.3) * Math.cos(n.z * 6.4 - n.y * 2.2) + 0.035 * Math.sin(n.y * 13 + n.x * 9);
    v.copy(n).multiplyScalar(r * k); p.setXYZ(i, v.x, v.y, v.z); }
  // icosaèdre non indexé : fusionner les sommets pour des normales lisses
  const merged = mergeVerts(g); merged.computeVertexNormals(); GEO.set(key, merged); return merged;
}
function mergeVerts(g) {
  const p = g.attributes.position, map = new Map(), pos = [], idx = [];
  for (let i = 0; i < p.count; i++) { const k = `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
    if (!map.has(k)) { map.set(k, pos.length / 3); pos.push(p.getX(i), p.getY(i), p.getZ(i)); } idx.push(map.get(k)); }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setIndex(idx); return out;
}
function finer(geo) { // sphères et cylindres des personnages : plus de segments
  const P = geo.parameters, key = geo.type + JSON.stringify(P);
  if (GEO.has(key)) return GEO.get(key);
  let g = geo;
  if (geo.type === 'SphereGeometry' && P.radius >= 0.1) g = new THREE.SphereGeometry(P.radius, Math.max(16, P.widthSegments * 2), Math.max(12, P.heightSegments * 2), P.phiStart, P.phiLength, P.thetaStart, P.thetaLength);
  if (geo.type === 'CylinderGeometry' && P.radialSegments >= 8) g = new THREE.CylinderGeometry(P.radiusTop, P.radiusBottom, P.height, Math.max(18, P.radialSegments * 2), 1, P.openEnded);
  if (geo.type === 'ConeGeometry' && P.radialSegments === 7 && P.radius > 0.6) g = new THREE.ConeGeometry(P.radius, P.height, 12); // sapins
  GEO.set(key, g); return g;
}
let depthMat = null;
const curvedDepth = () => depthMat || (depthMat = curved(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })));

const FLAT = new Map();
function smoothMatFlat(m) { if (!FLAT.has(m)) { const c = smoothMat(m).clone(); c.flatShading = true; curved(c); withRim(c); FLAT.set(m, c); } return FLAT.get(m); }
// Habille une île : ombres, feuillage arrondi, couleurs du sol.
export function dress(root) {
  if (!ON) return;
  root.traverse(o => {
    if (!o.isMesh || !o.material || Array.isArray(o.material) || o.userData.joli) return; o.userData.joli = 1;
    const m = o.material, t = o.geometry.type, P = o.geometry.parameters || {};
    if (m.color && GROUND[('#' + m.color.getHexString())]) m.color.set(GROUND['#' + m.color.getHexString()]);
    if (m.isMeshBasicMaterial) { if (m.map && m.transparent && t === 'PlaneGeometry') m.opacity = 0.6; return; } // ombres-disques : plus légères
    if (!m.isMeshLambertMaterial) return;
    const ground = t === 'CylinderGeometry' && P.radiusTop > 6, rock = t === 'DodecahedronGeometry';
    if (GEOX && t === 'IcosahedronGeometry' && P.detail === 0 && P.radius >= 0.5) o.geometry = bumpyBall(P.radius);
    else if (GEOX && ['SphereGeometry', 'CylinderGeometry', 'ConeGeometry'].includes(t) && !ground) o.geometry = finer(o.geometry);
    else if (!GEOX && t === 'IcosahedronGeometry') o.geometry = smoothNormals(o.geometry);
    // les rochers restent facettés (comme la pierre taillée) ; volumes en Standard + reflets du ciel ; surfaces planes en Lambert
    const flat = ground || o.userData.flat || t === 'PlaneGeometry' || t === 'CircleGeometry' || t === 'ShapeGeometry' || (t === 'CylinderGeometry' && P.height < 0.35 * Math.max(P.radiusTop, P.radiusBottom));
    o.material = rock ? (PBR ? smoothMatFlat(m) : m) : flat ? plainMat(m) : smoothMat(m);
    o.receiveShadow = true;
    if (!ground && !m.transparent && o.geometry.type !== 'PlaneGeometry') { o.castShadow = true; o.customDepthMaterial = curvedDepth(); }
  });
}

// ---------- Herbe instanciée qui ondule au vent (1 appel de dessin par île)
const wind = { value: 0 };
function tuftGeo() {
  const pos = [], col = [], nor = [];
  for (let b = 0; b < 3; b++) { const a = b * 2.1 + 0.3, w = 0.1, h = 0.24 + b * 0.05, lean = 0.08;
    const cx = Math.cos(a), cz = Math.sin(a), ox = Math.cos(a + 1.57) * 0.06 * b, oz = Math.sin(a + 1.57) * 0.06 * b;
    const A = [ox - cx * w, 0, oz - cz * w], B = [ox + cx * w, 0, oz + cz * w], T = [ox + Math.cos(a + 1.57) * lean, h, oz + Math.sin(a + 1.57) * lean];
    // deux faces explicites (normales vers le haut des deux côtés : l’herbe s’éclaire comme le sol, sans face sombre)
    pos.push(...A, ...B, ...T, ...B, ...A, ...T);
    for (let f = 0; f < 2; f++) { col.push(0.9, 0.92, 0.88, 0.9, 0.92, 0.88, 1.18, 1.16, 1.0); nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); return g;
}
function grassMat(color) {
  const m = curved(new THREE.MeshLambertMaterial({ color, vertexColors: true }));
  const base = m.onBeforeCompile;
  m.onBeforeCompile = sh => { base(sh); sh.uniforms.uWind = wind;
    sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      { vec2 ip = instanceMatrix[3].xz; float h = position.y; float s = sin(uWind * 1.7 + ip.x * 0.35 + ip.y * 0.21) + 0.5 * sin(uWind * 3.1 + ip.x * 0.9);
        transformed.x += s * 0.09 * h * 2.5; transformed.z += s * 0.05 * h * 2.5; }`); };
  m.customProgramCacheKey = () => 'curved-grass';
  return m;
}
export function addGrass(root, { cx, cz, r, color, ground, ok, count }) {
  if (!HERBE) return null;
  const n = Math.round(count * (touch ? 0.5 : 1));
  const im = new THREE.InstancedMesh(tuftGeo(), grassMat(color), n); im.receiveShadow = true;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), c = new THREE.Color();
  let seed = 1234567; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let k = 0;
  for (let tries = 0; k < n && tries < n * 4; tries++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * (r - 0.8), x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
    if (!ok(x, z)) continue; const sc = 0.7 + rnd() * 0.8; p.set(x, 0, z); q.setFromAxisAngle(up, rnd() * 6.283); s.set(sc, sc * (0.8 + rnd() * 0.5), sc);
    m4.compose(p, q, s); im.setMatrixAt(k, m4); im.setColorAt(k, c.set(ground).offsetHSL(rnd() * 0.04 - 0.02, 0.02, rnd() * 0.08 - 0.05)); k++; }
  im.count = k; im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); root.add(im); return im;
}

// ---------- Chaque image : ombre ajustée à la vue, reflets du moment, qualité adaptative
const _d = new THREE.Vector3(), _c = new THREE.Vector3(), _x = new THREE.Vector3(), _y = new THREE.Vector3(), _r = new THREE.Vector3(), _o = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0), WHITE = new THREE.Color(1, 1, 1); let scene0 = null;
export function setScene(s) { scene0 = s; if (PBR && envTex) s.environment = envTex; }
let fogSet = false; // brume plus proche : le haut de l’écran se fond dans la couleur du moment (profondeur)

// Zone vue au sol : on lance les 4 coins de l’écran (plus le centre des bords) sur le plan y = 0, rayon plafonné.
const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1], [0, 1], [0, -1]];
function viewFootprint(cam, out) {
  const pts = []; cam.updateMatrixWorld(); _o.setFromMatrixPosition(cam.matrixWorld);
  for (const [x, y] of CORNERS) { _r.set(x, y, 0.5).unproject(cam).sub(_o).normalize();
    let t = _r.y < -0.05 ? -_o.y / _r.y : 1e9; const hd = Math.hypot(_r.x, _r.z) * t, MAX = 34;
    if (hd > MAX) t = MAX / Math.hypot(_r.x, _r.z); pts.push(_o.x + _r.x * t, _o.z + _r.z * t); }
  let x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
  for (let i = 0; i < pts.length; i += 2) { x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]); z0 = Math.min(z0, pts[i + 1]); z1 = Math.max(z1, pts[i + 1]); }
  out.set((x0 + x1) / 2, 0, (z0 + z1) / 2); return Math.hypot(x1 - x0, z1 - z0) / 2;
}

// Qualité adaptative : si l’image tombe sous ~40 i/s pendant 4 s d’affilée, on descend d’UN palier (puis 4 s de répit).
// Paliers : 0 plein · 1 DPR 1,5 · 2 DPR 1,25 · 3 carte d’ombre ÷2 · 4 sans ombres · 5 DPR 1
const LEVELS = [{ dpr: 2, sh: 1 }, { dpr: 1.5, sh: 1 }, { dpr: 1.25, sh: 1 }, { dpr: 1.25, sh: 0.5 }, { dpr: 1.25, sh: 0 }, { dpr: 1, sh: 0 }];
// Effets « vie » par palier : fx = part des lucioles/feuilles, lights = vraies lumières de lanternes, refl = reflets/miroitement de l’eau
const FXL = [{ fx: 1, lights: 2, refl: 1 }, { fx: 1, lights: 2, refl: 1 }, { fx: 0.75, lights: 2, refl: 1 }, { fx: 0.6, lights: 1, refl: 0 }, { fx: 0.45, lights: 1, refl: 0 }, { fx: 0.3, lights: 0, refl: 0 }];
export const fxQ = () => ({ i: Q.level, ...FXL[Q.level] });
const Q = { level: 0, slow: 0, win: 0, frames: 0, calm: 3, fps: 60, steps: [] };
export const quality = () => ({ level: Q.level, fps: Math.round(Q.fps * 10) / 10, dpr: R ? R.getPixelRatio() : DPR, steps: Q.steps.slice() });
let shMap = touch ? 1024 : 2048;
function applyLevel(sun, lv) {
  const L = LEVELS[lv]; Q.level = lv;
  if (R && R.getPixelRatio() > Math.min(DPR, L.dpr) + 1e-3) R.setPixelRatio(Math.min(DPR, L.dpr));
  if (!SH) return;
  const want = (touch ? 1024 : 2048) * L.sh;
  if (want && want !== shMap) { shMap = want; sun.shadow.mapSize.set(want, want); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  if (!want && sun.castShadow) { sun.castShadow = false; R.shadowMap.enabled = false; }
}
function adapt(dt, sun) {
  if (dt > 0.25) return; // onglet en arrière-plan, chargement : on ne compte pas
  Q.frames++; Q.win += dt; if (Q.win < 1) return;
  Q.fps = Q.frames / Q.win; Q.frames = 0; Q.win = 0;
  if (Q.calm > 0) { Q.calm--; return; }
  Q.slow = Q.fps < 40 ? Q.slow + 1 : 0;
  if (ADAPT && Q.slow >= 4 && Q.level < LEVELS.length - 1) { applyLevel(sun, Q.level + 1); Q.steps.push(Math.round(Q.fps)); Q.slow = 0; Q.calm = 4; }
}

let lastPhase = '', frame = 0; const lastC = new THREE.Vector3(1e9, 0, 0), lastD = new THREE.Vector3();
export function tick(dt, sun, player, hemi, cam, phase) {
  if (!ON) return;
  if (!fogSet && scene0 && scene0.fog) { fogSet = true; scene0.fog.near = 26; scene0.fog.far = 105; }
  frame++; wind.value += dt; rim.value.copy(sun.color).lerp(WHITE, 0.4);
  if (PBR && hemi) hemi.intensity *= 0.8; // le ciel réfléchi (IBL) prend le relais d’une partie du remplissage
  if (PBR && scene0) { scene0.environmentIntensity = 0.25 + 0.2 * Math.min(1, sun.intensity / 2);
    if (phase && phase !== lastPhase && ENV[phase]) { lastPhase = phase; scene0.environment = envTex = ENV[phase]; } }
  if (SH && frame === 1) {
    sun.castShadow = true; const S = sun.shadow; S.mapSize.set(shMap, shMap);
    S.bias = -0.0006; S.normalBias = 0.03; S.radius = 3; sun.parent.add(sun.target);
    const q = +params.get('q'); if (q > 0) applyLevel(sun, Math.min(q, LEVELS.length - 1)); else applyLevel(sun, 0);
  } else if (frame === 1) { const q = +params.get('q'); applyLevel(sun, q > 0 ? Math.min(q, LEVELS.length - 1) : 0); }
  adapt(dt, sun);
  _d.copy(sun.position).normalize(); // setTime remet la position « absolue » chaque image : on n’en garde que la direction
  if (!sun.castShadow) { sun.target.position.set(player.pos.x, 0, player.pos.z); sun.position.copy(sun.target.position).addScaledVector(_d, 50); return; }
  // Boîte d’ombre = zone vue au sol (centre + rayon), rayon arrondi au mètre, centre calé sur la grille des texels (pas de scintillement)
  const e = cam ? Math.min(30, Math.ceil(viewFootprint(cam, _c) + 1)) : 20; if (!cam) _c.set(player.pos.x, 0, player.pos.z);
  _x.crossVectors(UP, _d).normalize(); _y.crossVectors(_d, _x);
  const tx = 2 * e / shMap, ax = _c.dot(_x), ay = _c.dot(_y);
  _c.addScaledVector(_x, Math.round(ax / tx) * tx - ax).addScaledVector(_y, Math.round(ay / tx) * tx - ay);
  const S = sun.shadow, C = S.camera;
  if (C.right !== e) { Object.assign(C, { left: -e, right: e, top: e, bottom: -e, near: 1, far: 140 }); C.updateProjectionMatrix(); R.shadowMap.needsUpdate = true; }
  sun.target.position.copy(_c); sun.position.copy(_c).addScaledVector(_d, 60);
  // Recalcul de l’ombre : quand la vue ou le soleil bougent ; sinon 30 fois/s (villageois, arbres secoués, papillons)
  const moved = lastC.distanceToSquared(_c) > 1e-6 || lastD.distanceToSquared(_d) > 1e-8;
  if (moved || frame % 2 === 0) R.shadowMap.needsUpdate = true;
  lastC.copy(_c); lastD.copy(_d);
}
