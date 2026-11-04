// « Vie » : nuit lisible et belle (étoiles qui scintillent, lune, lucioles, lanternes qui éclairent vraiment),
// eau vivante (écume au rivage, reflets du ciel, miroitement), feuilles d’érable qui tombent.
// Tout passe par la qualité adaptative de joli.js : les paliers bas réduisent lucioles/feuilles, coupent reflets et vraies lumières.
// Actif seulement avec « joli » (?joli=0 garde le rendu d’origine).
import * as THREE from '../vendor/three.module.min.js';
import { curve, curved, ISLANDS } from './world.js';
import { fxQ } from './joli.js';

const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const MUL = touch ? 0.6 : 1;                               // téléphone : 40 % de particules en moins dès le départ
const MAX = { lucioles: 90, feuilles: 44, etoiles: 520 };
const CURVE_GLSL = 'vec2 dd = wp.xz - uCenter; wp.y -= dot(dd, dd) * uCurve;';
const rnd = (() => { let s = 777; return () => (s = (s * 16807) % 2147483647) / 2147483647; })(); // déterministe (captures)

function glowTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function moonTex() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 20, 64, 64, 64); g.addColorStop(0, 'rgba(220,230,255,0.5)'); g.addColorStop(1, 'rgba(220,230,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  x.fillStyle = '#f4f1e2'; x.beginPath(); x.arc(64, 64, 30, 0, 7); x.fill();
  x.fillStyle = 'rgba(180,176,160,0.55)'; for (const [a, b, r] of [[54, 56, 7], [74, 70, 5], [62, 78, 4], [76, 52, 3]]) { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// Points courbés comme le monde (même formule que curved())
function pointsMat(uniforms, vBody, fBody, extra = {}) {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, ...extra,
    uniforms: { uCurve: curve.uCurve, uCenter: curve.uCenter, uT: { value: 0 }, uA: { value: 0 }, uPx: { value: 1 }, ...uniforms },
    vertexShader: `uniform float uCurve; uniform vec2 uCenter; uniform float uT; uniform float uA; uniform float uPx; attribute float aPh; varying float vA; varying float vPh;
      void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vPh = aPh; ${vBody} ${CURVE_GLSL} vec4 mv = viewMatrix * wp; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uA; uniform float uT; varying float vA; varying float vPh; ${fBody}` });
}

export function makeVie(scene, world, G, getWorld) {
  const tex = glowTex();
  const api = { level: 0 };

  // ---------- Ciel : lueur du soleil et bande d’horizon (uniformes ajoutés dans world.js, noirs sans « joli »)
  const skyU = world.sky.material.uniforms;

  // ---------- Étoiles qui scintillent (remplacent les points fixes de world.js) + lune
  world.stars.visible = false; world.stars.userData.off = 1;
  const starG = new THREE.BufferGeometry(); { const p = [], ph = [];
    for (let i = 0; i < MAX.etoiles; i++) { const a = rnd() * 6.283, e = 0.08 + Math.asin(rnd()) * 0.95; p.push(Math.cos(a) * Math.cos(e) * 320, Math.sin(e) * 320, Math.sin(a) * Math.cos(e) * 320); ph.push(rnd()); }
    starG.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); starG.setAttribute('aPh', new THREE.Float32BufferAttribute(ph, 1)); }
  const starM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, uniforms: { uT: { value: 0 }, uA: { value: 0 } },
    vertexShader: 'uniform float uT; attribute float aPh; varying float vA; void main(){ vA = 0.55 + 0.45 * sin(uT * (1.5 + aPh * 3.0) + aPh * 40.0); gl_PointSize = 1.5 + aPh * aPh * 2.5; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform float uA; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); gl_FragColor = vec4(vec3(1.0, 0.96, 0.86) * vA * uA * smoothstep(0.5, 0.1, d), 1.0); }' });
  const stars = new THREE.Points(starG, starM); stars.frustumCulled = false; stars.renderOrder = -1; scene.add(stars);
  const MOON = new THREE.Vector3(-0.32, 0.55, -0.77).normalize();
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex(), fog: false, depthWrite: false, transparent: true }));
  moon.scale.setScalar(70); moon.renderOrder = -1; scene.add(moon);

  // ---------- Eau : écume au rivage, reflet du ciel (étoiles et lune la nuit), miroitement du soleil
  const wU = { uT: { value: 0 }, uNight: { value: 0 }, uRefl: { value: 1 }, uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() },
    uMoon: { value: MOON }, uMoonC: { value: new THREE.Color('#e8eeff') }, uLdir: { value: new THREE.Vector3(0, 1, 0) }, uLcol: { value: new THREE.Color() },
    uFoam: { value: new THREE.Color('#ffffff') }, uIsl: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] } };
  { const m = world.water.material, base = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => { base && base(sh, r); Object.assign(sh.uniforms, wU);
      sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = `varying vec3 vWP; uniform float uT, uNight, uRefl; uniform vec3 uTop, uHor, uMoon, uMoonC, uLdir, uLcol, uFoam; uniform vec4 uIsl[3];\n` + sh.fragmentShader.replace('#include <opaque_fragment>', `{
        vec3 p = vWP; float t = uT, foam = 0.0;
        for (int i = 0; i < 3; i++) { vec4 c = uIsl[i]; if (c.z < 0.0) continue;
          vec2 d2 = p.xz - c.xy; float a = atan(d2.y, d2.x);
          float k = c.w < 0.5 ? 1.0 + (sin(a * 3.0 + c.z) * 0.03 + sin(a * 7.0) * 0.02) * 0.7 : 1.0 + (sin(a * 4.0 + 2.0) * 0.03 + sin(a * 9.0) * 0.015) * 0.7;
          float e = length(d2) - (c.z + 2.0) * k;
          float w = 0.5 + 0.5 * sin(e * 7.0 - t * 2.4 + sin(a * 17.0 + t * 0.3) * 1.4);
          foam = max(foam, (1.0 - smoothstep(0.0, 1.5, e)) * mix(1.0, w, smoothstep(0.15, 0.7, e)) * step(-0.6, e)); }
        vec3 V = normalize(p - cameraPosition);
        vec3 N = normalize(vec3(sin(p.x * 0.9 + t * 1.3) * 0.06 + sin((p.x + p.z) * 2.3 - t * 2.1) * 0.035, 1.0, cos(p.z * 0.8 + t * 1.1) * 0.06 + cos((p.x - p.z) * 2.1 + t * 1.7) * 0.035));
        vec3 R = reflect(V, N); float ry = max(R.y, 0.0);
        vec3 sk = mix(uHor, uTop, smoothstep(0.0, 0.7, ry));
        vec2 sc = R.xz / (ry + 0.25) * 16.0; vec2 cell = floor(sc); float h = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5);
        sk += vec3(1.0, 0.96, 0.88) * step(0.9, h) * smoothstep(0.3, 0.0, length(fract(sc) - 0.5)) * (0.55 + 0.45 * sin(t * 3.0 + h * 60.0)) * uNight * 1.4;
        float md = dot(R, uMoon); sk += uMoonC * (smoothstep(0.985, 0.992, md) * 1.2 + pow(max(md, 0.0), 30.0) * 0.45) * uNight;
        float fres = uRefl * (0.22 + 0.45 * pow(1.0 - max(-V.y, 0.0), 3.0));
        outgoingLight = mix(outgoingLight, sk, fres);
        float spark = pow(max(0.0, sin(p.x * 2.7 + t * 2.3 + sin(p.z * 1.3)) * sin(p.z * 3.1 - t * 1.9 + sin(p.x * 1.7))), 10.0);
        float spec = pow(max(dot(R, uLdir), 0.0), 36.0);
        outgoingLight += uLcol * (spec * 0.5 + spark * (0.18 + spec * 2.0)) * uRefl;
        outgoingLight = mix(outgoingLight, uFoam, clamp(foam, 0.0, 1.0) * 0.8);
      }\n#include <opaque_fragment>`); };
    m.customProgramCacheKey = () => 'curved-water'; m.needsUpdate = true; }
  function setIsles(n) { const u = wU.uIsl.value;
    if (n === 2) { u[0].set(0, 0, 30, 1); u[1].set(0, 0, -1, 0); u[2].set(0, 0, -1, 0); }
    else ISLANDS.forEach((i, k) => u[k].set(i.x, i.z, i.r, 0)); }
  setIsles(1);

  // ---------- Lucioles : un seul nuage de points (1 appel de dessin), près du rivage et dans l’herbe, crépuscule et nuit
  const flyG = new THREE.BufferGeometry(); { const p = [], ph = [];
    for (let i = 0; i < MAX.lucioles; i++) { const a = rnd() * 6.283, d = i % 3 ? 24 + rnd() * 9 : 6 + rnd() * 20; p.push(Math.cos(a) * d, 0.35 + rnd() * 1.3, Math.sin(a) * d); ph.push(rnd()); }
    flyG.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); flyG.setAttribute('aPh', new THREE.Float32BufferAttribute(ph, 1)); }
  const flyM = pointsMat({ uTex: { value: tex } },
    `wp.xyz += vec3(sin(uT * 0.5 + aPh * 37.0) * 1.3 + sin(uT * 1.3 + aPh * 11.0) * 0.3, sin(uT * 0.9 + aPh * 23.0) * 0.35, cos(uT * 0.43 + aPh * 19.0) * 1.3);
     vA = smoothstep(0.1, 0.9, sin(uT * (0.9 + aPh) + aPh * 50.0) * 0.5 + 0.5);
     { vec4 mv0 = viewMatrix * wp; gl_PointSize = uPx * 0.22 / -mv0.z; }`,
    'uniform sampler2D uTex; void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(vec3(0.85, 1.0, 0.45) * t.a * vA * uA * 1.6, 1.0); }', { fog: false });
  const flies = new THREE.Points(flyG, flyM); flies.frustumCulled = false; scene.add(flies);

  // ---------- Lanternes de sentier : poteaux, verre qui s’allume, flaque de lumière au sol, halo — 4 appels de dessin pour toutes
  const SPOTS = { 1: [[1.7, -4.5], [-1.2, 5.6], [4.6, 14.8], [8.0, 23.5], [-2.6, 1.2]], 2: [[8.3, 31.5], [3.6, 22.2], [12.6, -12.8], [16.4, -14.2]] };
  const CAP = 12, lanterns = [];
  const pole = new THREE.CylinderGeometry(0.06, 0.08, 1.9, 6); pole.translate(0, 0.95, 0);
  const poleCap = (() => { const cap = new THREE.ConeGeometry(0.3, 0.22, 4); cap.rotateY(0.785); cap.translate(0, 2.42, 0);
    const A = pole.toNonIndexed(), B = cap.toNonIndexed(), g = new THREE.BufferGeometry();
    for (const k of ['position', 'normal']) { const a = A.attributes[k].array, b = B.attributes[k].array, x = new Float32Array(a.length + b.length); x.set(a); x.set(b, a.length); g.setAttribute(k, new THREE.BufferAttribute(x, 3)); }
    return g; })();
  const poles = new THREE.InstancedMesh(poleCap, curved(new THREE.MeshLambertMaterial({ color: '#34343c' })), CAP);
  const GLASS_OFF = new THREE.Color('#8d8672'), GLASS_ON = new THREE.Color('#ffd27a');
  const glassMat = curved(new THREE.MeshBasicMaterial({ color: '#8d8672' }));
  const glassG = new THREE.BoxGeometry(0.34, 0.42, 0.34); glassG.translate(0, 2.1, 0);
  const glass = new THREE.InstancedMesh(glassG, glassMat, CAP);
  const poolG = new THREE.PlaneGeometry(1, 1); poolG.rotateX(-Math.PI / 2);
  const poolMat = curved(new THREE.MeshBasicMaterial({ map: tex, color: '#ff9a3c', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2 }));
  const pools = new THREE.InstancedMesh(poolG, poolMat, CAP); pools.renderOrder = 2;
  const haloG = new THREE.BufferGeometry(); haloG.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(CAP * 3), 3)); haloG.setAttribute('aPh', new THREE.Float32BufferAttribute(new Float32Array(CAP), 1));
  const haloM = pointsMat({ uTex: { value: tex } }, 'vA = 0.9 + 0.1 * sin(uT * 7.0 + aPh * 30.0); { vec4 mv0 = viewMatrix * wp; gl_PointSize = uPx * (aPh > 0.95 ? 7.0 : 1.9) / -mv0.z; }',
    'uniform sampler2D uTex; void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(vec3(1.0, 0.78, 0.42) * t.a * vA * uA, 1.0); }', { fog: false });
  const halos = new THREE.Points(haloG, haloM); halos.frustumCulled = false;
  for (const m of [poles, glass, pools]) { m.frustumCulled = false; m.count = 0; }
  poles.castShadow = true; scene.add(poles, glass, pools, halos);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e3 = new THREE.Euler(), v = new THREE.Vector3(), s3 = new THREE.Vector3();
  let isleNow = 0, decorLantern = null;
  function layout(n) {
    isleNow = n; lanterns.length = 0;
    for (const [x, z] of SPOTS[n]) lanterns.push({ x, z, y: 2.1, pool: 3.2, post: 1 });
    if (n === 1 && world.decor?.lanterne) { const d = world.decor.lanterne; lanterns.push({ x: d.position.x, z: d.position.z, y: 2.6, pool: 4, post: 0 }); }
    if (n === 2 && G.state.phare?.done && G.isle2) { const ph = G.isle2.phare; lanterns.push({ x: ph.position.x, z: ph.position.z, y: 9.9, pool: 7, post: 0, big: 1 }); }
    let k = 0; const hp = haloG.attributes.position, ha = haloG.attributes.aPh;
    lanterns.forEach((L, i) => {
      if (L.post) { m4.makeTranslation(L.x, 0, L.z); poles.setMatrixAt(k, m4); glass.setMatrixAt(k, m4); k++; }
      m4.compose(v.set(L.x, 0.04, L.z), q.identity(), s3.set(L.pool * 2, 1, L.pool * 2)); pools.setMatrixAt(i, m4);
      hp.setXYZ(i, L.x, L.y, L.z); ha.setX(i, L.big ? 1 : 0.3 + (i % 5) * 0.1); });
    poles.count = glass.count = k; pools.count = lanterns.length; haloG.setDrawRange(0, lanterns.length);
    for (const m of [poles, glass, pools]) m.instanceMatrix.needsUpdate = true; hp.needsUpdate = ha.needsUpdate = true;
    // les lanternes posées comptent comme obstacles (une seule fois par île)
    const W = getWorld(); if (!W.userData_vie) { W.userData_vie = 1; for (const [x, z] of SPOTS[n]) W.obstacles.push({ x, z, r: 0.35 }); }
    lightCands = null;
  }
  // Vraies lumières : 2 au plus (les lanternes les plus proches de Camille), 1 puis 0 aux paliers bas
  const lights = []; let lightCands = null, lightT = 0;
  function setLights(n) {
    while (lights.length > n) scene.remove(lights.pop());
    while (lights.length < n) { const l = new THREE.PointLight(0xffb45a, 0, 10, 1.5); scene.add(l); lights.push(l); }
  }

  // ---------- Feuilles qui tombent des érables (1 maille instanciée)
  const leafG = new THREE.BufferGeometry(); leafG.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -0.13, 0.09, 0, 0, 0, 0, 0.11, 0, 0, -0.13, 0, 0, 0.11, -0.09, 0, 0], 3));
  leafG.setAttribute('normal', new THREE.Float32BufferAttribute(Array(6).fill([0, 1, 0]).flat(), 3));
  const leaves = new THREE.InstancedMesh(leafG, curved(new THREE.MeshLambertMaterial({ side: THREE.DoubleSide })), MAX.feuilles);
  const LEAFC = ['#e2572e', '#f08a24', '#f4b63f', '#d9432f', '#ef9a3a'].map(c => new THREE.Color(c));
  const L = []; for (let i = 0; i < MAX.feuilles; i++) { leaves.setColorAt(i, LEAFC[i % 5]); L.push({ y: -1, t: 0, x: 0, z: 0, life: 0, rest: 0, ph: rnd() * 9, sp: 0.5 + rnd() * 0.5 }); }
  leaves.frustumCulled = false; leaves.castShadow = false; scene.add(leaves);
  let trees = [], treeT = 0;
  function spawnLeaf(f) {
    if (!trees.length) { f.y = -1; f.rest = 1 + rnd() * 2; return; }
    const tr = trees[Math.floor(rnd() * trees.length)], a = rnd() * 6.283, r = rnd() * tr.r;
    f.x = tr.x + Math.cos(a) * r; f.z = tr.z + Math.sin(a) * r; f.y = tr.y - rnd() * 0.6; f.t = 0; f.rest = 0; f.life = 1;
  }

  // ---------- Mise à jour
  let t = 0, lvl = -1, dusk = 0;
  api.update = (dt, player, camera, renderer) => {
    t += dt; const W = getWorld(), isle = G.state.island === 2 ? 2 : 1, Q = fxQ();
    if (isle !== isleNow || (isle === 1 && !!world.decor?.lanterne !== !!decorLantern) || (isle === 2 && !!G.state.phare?.done !== api._phare)) {
      decorLantern = world.decor?.lanterne || null; api._phare = !!G.state.phare?.done; setIsles(isle); layout(isle);
      if (decorLantern?.userData.light) { decorLantern.userData.light.parent.remove(decorLantern.userData.light); decorLantern.userData.light = null; } }
    if (Q.i !== lvl) { lvl = Q.i; setLights(Q.lights); api.level = lvl; }
    const night = G.night; dusk += ((G.phase === 'doree' ? 0.55 : 0) - dusk) * Math.min(1, dt * 0.8); const glow = Math.max(night, dusk);
    const px = renderer.domElement.height / 2 / Math.tan(camera.fov * Math.PI / 360);
    // ciel
    const sd = v.copy(world.sun.position).normalize(); skyU.sdir?.value.copy(sd);
    skyU.glow?.value.copy(world.sun.color).multiplyScalar(G.phase === 'doree' ? 0.9 : G.phase === 'matin' ? 0.5 : G.phase === 'nuit' ? 0.12 : 0.2);
    starM.uniforms.uT.value = t; starM.uniforms.uA.value = night; stars.visible = night > 0.02; stars.position.copy(camera.position);
    moon.visible = night > 0.02; moon.material.opacity = night; moon.position.copy(camera.position).addScaledVector(MOON, 300);
    // eau
    wU.uT.value = t; wU.uNight.value = night; wU.uRefl.value = Q.refl; wU.uTop.value.copy(skyU.top.value); wU.uHor.value.copy(skyU.bot.value);
    wU.uLdir.value.copy(night > 0.5 ? MOON : sd); wU.uLcol.value.copy(world.sun.color).multiplyScalar(night > 0.5 ? 0.9 : Math.min(1.2, world.sun.intensity * 0.45));
    wU.uFoam.value.setScalar(0.25 + 0.75 * (1 - night * 0.7));
    // lucioles
    const nf = Math.round(MAX.lucioles * MUL * Q.fx); flyG.setDrawRange(0, nf); api.fireflies = glow > 0.05 ? nf : 0;
    flies.visible = glow > 0.05; flyM.uniforms.uT.value = t; flyM.uniforms.uA.value = glow; flyM.uniforms.uPx.value = px; flies.position.set(0, 0, 0);
    // lanternes
    glassMat.color.copy(GLASS_OFF).lerp(GLASS_ON, Math.min(1, glow * 1.4));
    poolMat.opacity = Math.min(1, glow * 1.1) * 0.36; // caméra proche : la flaque couvre plus d’écran, on la garde discrète haloM.uniforms.uA.value = Math.min(1, glow * 1.2); haloM.uniforms.uT.value = t; haloM.uniforms.uPx.value = px;
    pools.visible = halos.visible = glow > 0.03;
    lightT -= dt; if (lightT <= 0) { lightT = 0.25; lightCands = lanterns.slice().sort((a, b) => Math.hypot(a.x - player.pos.x, a.z - player.pos.z) - Math.hypot(b.x - player.pos.x, b.z - player.pos.z)); }
    let on = 0;
    lights.forEach((l, i) => { const c = lightCands?.[i]; if (!c || glow < 0.03) { l.intensity = 0; return; }
      const dx = c.x - curve.uCenter.value.x, dz = c.z - curve.uCenter.value.y; l.position.set(c.x, c.y - (dx * dx + dz * dz) * curve.uCurve.value, c.z);
      l.distance = c.big ? 20 : 10; l.intensity = glow * (c.big ? 14 : 4); on++; });
    api.lightsOn = on;
    // feuilles
    treeT -= dt; if (treeT <= 0) { treeT = 1; trees = [];
      for (const it of W.interactables) if (it.kind === 'tree' && it.obj.visible && it.crown && Math.hypot(it.pos.x - player.pos.x, it.pos.z - player.pos.z) < 26) {
        it.crown.getWorldPosition(v); trees.push({ x: it.pos.x, z: it.pos.z, y: v.y + 0.3, r: 1.6 * (it.r / 1.9) }); } }
    const nl = Math.round(MAX.feuilles * MUL * Q.fx); leaves.count = nl; let fall = 0;
    for (let i = 0; i < nl; i++) { const f = L[i];
      if (f.y < 0 && f.life <= 0) { f.rest -= dt; if (f.rest <= 0) spawnLeaf(f); if (f.y < 0) { m4.makeScale(0, 0, 0); leaves.setMatrixAt(i, m4); continue; } }
      f.t += dt;
      if (f.y > 0.03) { f.y -= dt * f.sp; f.x += Math.sin(f.t * 1.7 + f.ph) * dt * 0.7; f.z += Math.cos(f.t * 1.1 + f.ph) * dt * 0.4; fall++;
        e3.set(Math.sin(f.t * 2.3 + f.ph) * 1.1, f.t * 1.5 + f.ph, Math.cos(f.t * 1.9 + f.ph) * 0.9); }
      else { f.y = 0.03; f.life -= dt * 0.25; e3.set(0, f.ph, 0); if (f.life <= 0) { f.y = -1; f.rest = rnd() * 2; } }
      const s = Math.min(1, f.life * 3) * 1.2; m4.compose(v.set(f.x, f.y, f.z), q.setFromEuler(e3), s3.set(s, s, s)); leaves.setMatrixAt(i, m4); }
    leaves.instanceMatrix.needsUpdate = true; api.leavesFalling = fall; api.leaves = nl;
  };
  api.stats = () => ({ level: lvl, fireflies: api.fireflies, firefliesMax: Math.round(MAX.lucioles * MUL * fxQ().fx), leaves: api.leaves, leavesMax: Math.round(MAX.feuilles * MUL * fxQ().fx), leavesFalling: api.leavesFalling,
    lights: lights.length, lightsOn: api.lightsOn, lanterns: lanterns.length, refl: wU.uRefl.value, night: G.night, stars: stars.visible });
  return api;
}
