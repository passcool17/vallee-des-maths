// Joueur : Camille, déplacement clavier/joystick ou « clic pour marcher ».
import * as THREE from '../vendor/three.module.min.js';
import { blob } from './world.js';
import { bake, part } from './bake.js';

// Camille : longs cheveux blonds, lunettes rondes or rose, grand coton ouaté brun, jeans évasés pâles, espadrilles noir et blanc, sac à dos rose.
const C = { peau: '#f7d9c2', joue: '#f4a9a0', blond: '#f1c04e', blond2: '#d9a03a', brun: '#5b3a2b', brun2: '#4a2f23', jean: '#a9c9e8', jean2: '#93b6da',
  noir: '#25232a', blanc: '#f6f4ef', rose: '#ff4fa8', rose2: '#e23d8f', lunettes: '#d99a86', oeil: '#3a2a22', bouche: '#c0586a' };
function camille() {
  const body = new THREE.Group(), S = (r, w = 16, h = 12) => new THREE.SphereGeometry(r, w, h), Cy = (a, b, h, n = 14) => new THREE.CylinderGeometry(a, b, h, n);
  // coton ouaté surdimensionné (+ bande du bas, poche kangourou, capuchon dans le dos)
  body.add(part(Cy(0.33, 0.42, 0.6), C.brun, 0, 0.9, 0));
  body.add(part(Cy(0.42, 0.4, 0.09), C.brun2, 0, 0.6, 0));
  body.add(part(S(0.34), C.brun, 0, 1.17, 0, [1, 0.42, 0.85]));
  body.add(part(new THREE.BoxGeometry(0.36, 0.17, 0.06), C.brun2, 0, 0.78, 0.38, null, [-0.18, 0, 0]));
  body.add(part(S(0.24, 12, 8), C.brun2, 0, 1.2, -0.24, [1.15, 0.6, 0.7]));
  // tête et visage
  body.add(part(S(0.31, 18, 14), C.peau, 0, 1.47, 0));
  for (const ex of [-0.115, 0.115]) {
    body.add(part(S(0.042, 8, 6), C.oeil, ex, 1.49, 0.27, [1, 1, 0.6]));
    body.add(part(new THREE.TorusGeometry(0.085, 0.013, 6, 18), C.lunettes, ex, 1.49, 0.295));          // lunettes rondes
    body.add(part(Cy(0.008, 0.008, 0.2, 4), C.lunettes, ex * 2.35, 1.5, 0.19, null, [Math.PI / 2, 0, 0])); // branches
    body.add(part(S(0.05, 8, 6), C.joue, ex * 1.45, 1.4, 0.25, [1, 0.6, 0.4]));
  }
  body.add(part(Cy(0.008, 0.008, 0.06, 4), C.lunettes, 0, 1.5, 0.3, null, [0, 0, Math.PI / 2]));       // pont
  body.add(part(new THREE.TorusGeometry(0.055, 0.012, 5, 10, Math.PI), C.bouche, 0, 1.39, 0.29, null, [0, 0, Math.PI])); // petit sourire
  // cheveux : calotte avec raie au milieu, rideau dans le dos jusque sous les épaules, mèches devant les épaules
  body.add(part(new THREE.SphereGeometry(0.33, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.56), C.blond, 0, 1.49, -0.02, [1.04, 1, 1.05], [-0.28, 0, 0]));
  body.add(part(new THREE.BoxGeometry(0.02, 0.02, 0.32), C.blond2, 0, 1.815, 0.06, null, [-0.4, 0, 0]));
  body.add(part(new THREE.CapsuleGeometry(0.27, 0.42, 6, 14), C.blond, 0, 1.17, -0.17, [1.12, 1, 0.42]));
  for (const sx of [-1, 1]) {
    body.add(part(new THREE.CapsuleGeometry(0.09, 0.55, 4, 10), C.blond, sx * 0.27, 1.2, 0.12, [1, 1, 0.6], [0.12, 0, sx * 0.07]));
    body.add(part(new THREE.CapsuleGeometry(0.07, 0.36, 4, 10), C.blond2, sx * 0.3, 1.18, -0.05, [1, 1, 0.8], [0, 0, sx * 0.12]));
  }
  // sac à dos rose
  body.add(part(new THREE.CapsuleGeometry(0.2, 0.22, 6, 12), C.rose, 0, 0.98, -0.4, [1.2, 1, 0.62]));
  body.add(part(new THREE.BoxGeometry(0.3, 0.16, 0.06), C.rose2, 0, 0.86, -0.53));
  for (const sx of [-0.17, 0.17]) body.add(part(new THREE.BoxGeometry(0.06, 0.5, 0.04), C.rose2, sx, 1.0, 0.33, null, [0.12, 0, 0]));
  bake(body);
  // jambes (jeans évasés + espadrilles) et bras (manches) : articulés à la hanche et à l’épaule
  const legs = [-0.13, 0.13].map(lx => { const l = new THREE.Group(); l.position.set(lx, 0.58, 0);
    l.add(part(Cy(0.1, 0.15, 0.5), C.jean, 0, -0.27, 0));
    l.add(part(Cy(0.15, 0.155, 0.04), C.jean2, 0, -0.51, 0));
    l.add(part(new THREE.BoxGeometry(0.17, 0.05, 0.28), C.blanc, 0, -0.555, 0.05));
    l.add(part(new THREE.BoxGeometry(0.15, 0.06, 0.2), C.noir, 0, -0.51, 0.08));
    l.add(part(new THREE.BoxGeometry(0.155, 0.015, 0.06), C.blanc, 0, -0.48, 0.15));
    bake(l); body.add(l); return l; });
  const arms = [-0.4, 0.4].map(ax => { const a = new THREE.Group(); a.position.set(ax, 1.1, 0);
    a.add(part(Cy(0.11, 0.14, 0.48), C.brun, 0, -0.24, 0)); a.add(part(Cy(0.13, 0.12, 0.08), C.brun2, 0, -0.5, 0));
    a.add(part(new THREE.SphereGeometry(0.075, 10, 8), C.peau, 0, -0.57, 0)); bake(a); body.add(a); return a; });
  return { body, legs, arms };
}

export function makePlayer(scene, start) {
  const obj = new THREE.Group(); const { body, legs, arms } = camille(); obj.add(body);
  const tool = new THREE.Group(); tool.position.set(0.45, 0.6, 0.15); body.add(tool); // outil tenu (canne, filet…)
  obj.add(blob(0.6)); scene.add(obj);
  const pos = new THREE.Vector3(start.x, 0, start.z); obj.position.copy(pos);
  let facing = 0, phase = 0, target = null, stuck = 0, busy = 0;
  const P = {
    obj, pos, tool, get facing() { return facing; }, get moving() { return P.speed > 0.1; }, speed: 0,
    walkTo(x, z, onArrive, near = 0.4) { target = { x, z, onArrive, near }; stuck = 0; },
    cancelWalk() { target = null; }, get target() { return target; },
    busyFor(s) { busy = s; },
    face(x, z) { facing = Math.atan2(x - pos.x, z - pos.z); },
    teleport(x, z) { pos.set(x, 0, z); obj.position.copy(pos); target = null; },
    update(dt, mv, walkable) {
      busy = Math.max(0, busy - dt);
      let dx = mv.x, dz = mv.z, run = mv.run;
      if (Math.hypot(dx, dz) > 0.05) target = null;
      else if (target) { const tx = target.x - pos.x, tz = target.z - pos.z, d = Math.hypot(tx, tz);
        if (d < target.near) { const t = target; target = null; t.onArrive && t.onArrive(); } else { dx = tx / d; dz = tz / d; run = d > 6; } }
      const len = Math.hypot(dx, dz);
      if (len > 0.05 && busy <= 0) {
        const sp = (run ? 7.5 : 4.6) * Math.min(1, len), vx = dx / Math.max(1, len) * sp * dt, vz = dz / Math.max(1, len) * sp * dt;
        const before = pos.clone();
        if (walkable(pos.x + vx, pos.z + vz)) { pos.x += vx; pos.z += vz; }
        else if (walkable(pos.x + vx, pos.z)) pos.x += vx;
        else if (walkable(pos.x, pos.z + vz)) pos.z += vz;
        const moved = before.distanceTo(pos); P.speed = moved / dt;
        if (target && moved < 0.002) { stuck += dt; if (stuck > 0.6) target = null; } else stuck = 0;
        const want = Math.atan2(dx, dz); let dA = want - facing; dA = Math.atan2(Math.sin(dA), Math.cos(dA)); facing += dA * Math.min(1, dt * 12);
      } else P.speed = 0;
      phase += dt * (P.speed > 0.1 ? P.speed * 2.2 : 2);
      const sw = P.speed > 0.1 ? Math.sin(phase) * 0.6 : 0;
      legs[0].rotation.x = sw; legs[1].rotation.x = -sw; arms[0].rotation.x = -sw; arms[1].rotation.x = busy > 0 ? -1.2 : sw;
      body.position.y = P.speed > 0.1 ? Math.abs(Math.sin(phase)) * 0.08 : Math.sin(phase) * 0.015;
      obj.position.copy(pos); obj.rotation.y = facing;
    },
  };
  return P;
}
