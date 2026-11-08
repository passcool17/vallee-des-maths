// Fête de Camille : décor 3D de la place (guirlande, table, gâteau à 13 bougies, bannière), confettis bornés et chapeau de Charlie.
// Aucune vraie lumière : flammes et confettis en matériaux de base (MeshBasic), mailles instanciées.
import * as THREE from '../vendor/three.module.min.js';
import { mesh, at, plaque, curved } from './world.js';
import { BANNIERE, CONFETTI_MAX } from './fete.js';

export const GATEAU = { x: 4.6, z: 2.4 }; // place de l’île 1, à l’est du sentier, près de l’arrivée (2, 6)
const basic = (color, extra = {}) => curved(new THREE.MeshBasicMaterial({ color, toneMapped: false, ...extra }));

export function makeFeteScene({ scene, world, active }) {
  const root = new THREE.Group(); root.visible = active; world.root.add(root);
  const { x: cx, z: cz } = GATEAU, m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s1 = new THREE.Vector3(1, 1, 1), col = new THREE.Color();
  let flames = null, candles = null;
  if (active) {
    // Table et gâteau à 2 étages
    root.add(at(mesh(new THREE.BoxGeometry(1.6, 0.08, 1.0), '#c98f5a'), cx, 0.72, cz));
    for (const [dx, dz] of [[-0.7, -0.4], [0.7, -0.4], [-0.7, 0.4], [0.7, 0.4]]) root.add(at(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.72, 5), '#8a5a2b'), cx + dx, 0.36, cz + dz));
    root.add(at(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.24, 16), '#f7e1ea'), cx, 0.88, cz));
    root.add(at(mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 16), '#fbeff4'), cx, 1.1, cz));
    // 13 bougies en cercle sur l’étage du bas (une maille instanciée) ; flammes instanciées, on n’affiche que celles allumées
    candles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 5), basic('#ffffff'), 13);
    flames = new THREE.InstancedMesh(new THREE.ConeGeometry(0.03, 0.08, 5), basic('#ffcf4a'), 13);
    const pal = ['#ff7aa8', '#7ac8ff', '#ffd36a', '#9be27a'];
    for (let i = 0; i < 13; i++) {
      const a = (i / 13) * Math.PI * 2, x = cx + Math.cos(a) * 0.35, z = cz + Math.sin(a) * 0.35;
      m4.makeTranslation(x, 1.07, z); candles.setMatrixAt(i, m4); candles.setColorAt(i, col.set(pal[i % 4]));
      m4.makeTranslation(x, 1.18, z); flames.setMatrixAt(i, m4);
    }
    flames.count = 0; root.add(candles, flames);
    // Deux poteaux et une guirlande de 13 fanions
    const p1 = [cx - 2.2, cz - 1.2], p2 = [cx + 2.2, cz - 1.2];
    for (const [px, pz] of [p1, p2]) root.add(at(mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.6, 6), '#8a5a2b'), px, 1.3, pz));
    const tri = new THREE.ConeGeometry(0.12, 0.26, 3); tri.rotateX(Math.PI); // pointe vers le bas
    const flags = new THREE.InstancedMesh(tri, basic('#ffffff', { side: THREE.DoubleSide }), 13);
    for (let i = 0; i < 13; i++) {
      const t = (i + 0.5) / 13, x = p1[0] + (p2[0] - p1[0]) * t, y = 2.45 - Math.sin(t * Math.PI) * 0.45;
      m4.makeTranslation(x, y, p1[1]); flags.setMatrixAt(i, m4); flags.setColorAt(i, col.set(['#ff6f91', '#ffd36a', '#6fc3ff', '#8be07a', '#c99bff'][i % 5]));
    }
    root.add(flags);
    const ban = plaque(BANNIERE, 0.42, 4.2, { size: 30, color: '#7a2e4a', bg: 'rgba(255,240,246,0.95)' }); ban.position.set(cx, 2.85, p1[1]); root.add(ban);
    world.obstacles.push({ x: cx, z: cz, r: 0.85 }, { x: p1[0], z: p1[1], r: 0.15 }, { x: p2[0], z: p2[1], r: 0.15 });
  }
  // Confettis : une maille instanciée de CONFETTI_MAX au plus, cachée hors animation
  const conf = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.08, 0.05), basic('#ffffff', { side: THREE.DoubleSide }), CONFETTI_MAX);
  conf.visible = false; conf.frustumCulled = false; scene.add(conf);
  const parts = []; let confT = 0;
  for (let i = 0; i < CONFETTI_MAX; i++) conf.setColorAt(i, col.set(['#ff6f91', '#ffd36a', '#6fc3ff', '#8be07a', '#c99bff'][i % 5]));

  const api = {
    active, root,
    setBougies(n) { if (flames) flames.count = Math.max(0, Math.min(13, n)); },
    confettis(n) {
      if (!n) return; parts.length = 0; confT = 2.2; conf.count = n; conf.visible = true;
      for (let i = 0; i < n; i++) parts.push({ x: cx, y: 1.3, z: cz, vx: (Math.random() - 0.5) * 4, vy: 3 + Math.random() * 3, vz: (Math.random() - 0.5) * 4, r: Math.random() * 6 });
    },
    update(dt, time) {
      if (flames && flames.count) flames.position.y = Math.sin(time * 18) * 0.004; // léger tremblement
      if (confT <= 0) return; confT -= dt;
      if (confT <= 0) { conf.visible = false; return; }
      for (let i = 0; i < parts.length; i++) { const p = parts[i]; p.vy -= 6 * dt; p.vx *= 0.99; p.vz *= 0.99; p.x += p.vx * dt; p.y = Math.max(0.03, p.y + p.vy * dt); p.z += p.vz * dt; p.r += dt * 8;
        m4.compose(v.set(p.x, p.y, p.z), q.setFromEuler(e.set(p.r, p.r * 0.7, 0)), s1); conf.setMatrixAt(i, m4); }
      conf.instanceMatrix.needsUpdate = true;
    },
  };
  return api;
}
// Chapeau de fête conique pour Charlie (2 petites mailles, attachées à son corps)
export function chapeauCharlie(body) {
  const g = new THREE.Group(); g.add(at(mesh(new THREE.ConeGeometry(0.075, 0.2, 8), '#ff6f91'), 0, 0.78, 0.22)); g.add(at(mesh(new THREE.SphereGeometry(0.03, 6, 5), '#ffd36a'), 0, 0.89, 0.22));
  g.visible = false; body.add(g); return g;
}
