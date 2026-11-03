// Joueur : petit personnage à tuque, déplacement clavier/joystick ou « clic pour marcher ».
import * as THREE from '../vendor/three.module.min.js';
import { mesh, at, blob } from './world.js';

export function makePlayer(scene, start) {
  const obj = new THREE.Group(), body = new THREE.Group(); obj.add(body);
  body.add(at(mesh(new THREE.CylinderGeometry(0.34, 0.42, 0.7, 8), '#f2c230'), 0, 0.62, 0));           // imperméable
  body.add(at(mesh(new THREE.SphereGeometry(0.33, 10, 8), '#f6d2b0'), 0, 1.2, 0));                     // tête
  body.add(at(mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.3, 10), '#d8433a'), 0, 1.42, 0));           // tuque
  body.add(at(mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.1, 10), '#f3efe6'), 0, 1.3, 0));           // rebord
  body.add(at(mesh(new THREE.SphereGeometry(0.12, 8, 6), '#f3efe6'), 0, 1.66, 0));                     // pompon
  for (const ex of [-0.11, 0.11]) body.add(at(mesh(new THREE.SphereGeometry(0.04, 6, 4), '#2b2018'), ex, 1.24, 0.3));
  const legs = [-0.14, 0.14].map(lx => { const l = at(mesh(new THREE.BoxGeometry(0.16, 0.32, 0.18), '#3f5f9a'), lx, 0.16, 0); body.add(l); return l; });
  const arms = [-0.42, 0.42].map(ax => { const a = at(mesh(new THREE.BoxGeometry(0.13, 0.42, 0.13), '#f2c230'), ax, 0.72, 0); body.add(a); return a; });
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
