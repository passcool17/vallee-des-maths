// « Joli » : passe visuelle (ombres douces, tonemapping filmique, palette plus vive, feuillage arrondi, herbe au vent).
// Tout est désactivable avec ?joli=0 pour comparer avant/après dans le même build.
import * as THREE from '../vendor/three.module.min.js';
import { curved, TIMES } from './world.js';

const params = new URLSearchParams(location.search);
export const ON = params.get('joli') !== '0';
const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const off = k => params.get(k) === '0';
// Interrupteurs pour mesurer chaque morceau : ombres, herbe, geo (polygones en plus), pbr (MeshStandard + reflets du ciel + liseré), cam
const SH = ON && !off('ombres'), HERBE = ON && !off('herbe') && !off('geo'), GEOX = ON && !off('geo'), PBR = ON && !off('pbr');
export const CAM = ON && !off('cam') ? { fov: 38, k: 0.88 } : { fov: 42, k: 1 };

// Palette : couleurs plus saturées, ciel plus profond, heure dorée turquoise au zénith / ambre à l’horizon.
const GROUND = { '#a9d68b': '#6cb946', '#9fcf86': '#78bf5e', '#b6c979': '#9fc160', '#86b873': '#6fae58', '#f1d9a6': '#f0cd8a', '#d9cdb0': '#dcc79a', '#e7d3a9': '#ead2a0' };
if (ON) {
  Object.assign(TIMES.matin, { sky: ['#7fc0ea', '#ffd9b4'], fog: '#f2d6be', sunI: 2.2, hemiI: 1.3 });
  Object.assign(TIMES.midi, { sky: ['#3f9fe8', '#c4ecff'], fog: '#c9e8f6', sun: '#fff3dc', sunI: 1.9, hemi: ['#d6ecff', '#93a86a'], hemiI: 1.05, sunPos: [20, 34, 18] });
  Object.assign(TIMES.doree, { sky: ['#3b8aa6', '#f7cf7f'], fog: '#efc48c', sun: '#ffc46e', sunI: 2.3, hemi: ['#b4dcd4', '#d8a273'], hemiI: 1.5 });
  Object.assign(TIMES.nuit, { sunI: 0.7, hemiI: 0.8 });
}

export function setupRenderer(renderer) {
  if (!ON) return;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = SH; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (params.get('vignette') === '0') return;
  if (PBR) makeEnv(renderer);
  const v = document.createElement('div'); v.id = 'vignette';
  v.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:1;background:radial-gradient(ellipse at 50% 45%,rgba(0,0,0,0) 58%,rgba(40,25,10,0.22) 100%)';
  document.body.appendChild(v);
}

// ---------- Reflets doux : carte d’environnement pré-filtrée (PMREM) tirée d’un petit ciel dégradé + sol vert
let envTex = null; export let envScene = null;
function makeEnv(renderer) {
  envScene = new THREE.Scene();
  const g = new THREE.SphereGeometry(10, 32, 16), c = [], p = g.attributes.position, top = new THREE.Color('#7cc2f2'), hor = new THREE.Color('#f4f0e2'), gnd = new THREE.Color('#6b9a4a'), t = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 10; if (y > 0) t.copy(hor).lerp(top, Math.pow(y, 0.6)); else t.copy(hor).lerp(gnd, Math.min(1, -y * 4)); c.push(t.r, t.g, t.b); }
  g.setAttribute('color', new THREE.Float32BufferAttribute(c, 3));
  envScene.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.7, 3.2) })); sunDisc.position.set(4, 7, 4); envScene.add(sunDisc);
  const pm = new THREE.PMREMGenerator(renderer); envTex = pm.fromScene(envScene, 0.04).texture; pm.dispose();
}
// Liseré (fresnel) : un léger contre-jour chaud sur les silhouettes, couleur liée au soleil
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
    const flat = ground || t === 'PlaneGeometry' || t === 'CircleGeometry' || t === 'ShapeGeometry' || (t === 'CylinderGeometry' && P.height < 0.35 * Math.max(P.radiusTop, P.radiusBottom));
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

// ---------- Chaque image : le soleil (et sa caméra d’ombre) suit le joueur
const _d = new THREE.Vector3(), WHITE = new THREE.Color(1, 1, 1); let scene0 = null;
export function setScene(s) { scene0 = s; if (PBR && envTex) s.environment = envTex; }
export function tick(dt, sun, player, hemi) {
  if (!ON) return;
  wind.value += dt; rim.value.copy(sun.color).lerp(WHITE, 0.4);
  if (PBR && hemi) hemi.intensity *= 0.8; // le ciel réfléchi (IBL) prend le relais d’une partie du remplissage
  if (PBR && scene0) scene0.environmentIntensity = 0.25 + 0.2 * Math.min(1, sun.intensity / 2);
  if (SH && !sun.castShadow) {
    sun.castShadow = true; const S = sun.shadow, e = touch ? 17 : 20; S.mapSize.set(touch ? 1024 : 2048, touch ? 1024 : 2048);
    Object.assign(S.camera, { left: -e, right: e, top: e, bottom: -e, near: 1, far: 120 }); S.camera.updateProjectionMatrix();
    S.bias = -0.0006; S.normalBias = 0.03; S.radius = 3; sun.parent.add(sun.target);
  }
  _d.copy(sun.position).normalize(); // setTime remet la position « absolue » : on la recentre sur le joueur
  sun.target.position.set(player.pos.x, 0, player.pos.z);
  sun.position.copy(sun.target.position).addScaledVector(_d, 50);
}
