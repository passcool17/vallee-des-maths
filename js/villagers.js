// Villageois : Gaston le castor (établi), Ginette l’orignale (magasin), Flocon le harfang (défis et carnet).
import * as THREE from '../vendor/three.module.min.js';
import { mesh, at, blob, label } from './world.js';

export const LINES = {
  gaston: [
    'Salut! Moi c’est Gaston. Si t’as besoin d’un outil plus solide, viens me voir à l’établi.',
    'Trois bonnes réponses pis j’te patente ça en deux temps trois mouvements!',
    'Une digue, une canne à pêche, c’est pareil : faut que les calculs tiennent debout.',
    'Prends ton temps. Un castor pressé, ça fait des barrages tout croches.',
  ],
  ginette: [
    'Bienvenue au magasin général! Ginette, pour vous servir.',
    'Pas de panache pour moi, mais j’ai le plus beau foulard de l’île!',
    'TPS 5 %, TVQ 9,975 %... je les sais par cœur, moi!',
    'Si ton sac déborde, je t’achète tes poissons pis tes trouvailles.',
  ],
  flocon: [
    'Hou hou! Je suis Flocon. Je note tes progrès dans ton carnet.',
    'Se tromper, c’est correct. C’est même comme ça qu’on apprend.',
    'Quand ça bloque, on revient à une notion plus simple, pis on remonte.',
    'Le soir, j’aime compter les étoiles. J’en suis à… je recommence.',
  ],
};
export const NOMS = { gaston: 'Gaston le castor', ginette: 'Ginette l’orignale', flocon: 'Flocon le harfang' };
export const EMOJI = { gaston: '🦫', ginette: '🫎', flocon: '🦉' };
const HOMES = { gaston: [-9.2, -1.2], ginette: [15.6, -4.6], flocon: [0.4, -13.2] };

function gaston() {
  const g = new THREE.Group();
  g.add(at(mesh(new THREE.SphereGeometry(0.55, 10, 8), '#8a5a36'), 0, 0.75, 0)).children.at(-1).scale.set(1, 1.15, 0.95);
  g.add(at(mesh(new THREE.SphereGeometry(0.4, 10, 8), '#9a6a45'), 0, 1.55, 0.05));
  g.add(at(mesh(new THREE.SphereGeometry(0.2, 8, 6), '#b88a5c'), 0, 1.45, 0.36));
  g.add(at(mesh(new THREE.BoxGeometry(0.16, 0.14, 0.04), '#f7f0dc'), 0, 1.3, 0.5));
  g.add(at(mesh(new THREE.SphereGeometry(0.06, 6, 4), '#2b2018'), 0, 1.53, 0.55));
  for (const ex of [-0.15, 0.15]) { g.add(at(mesh(new THREE.SphereGeometry(0.05, 6, 4), '#2b2018'), ex, 1.66, 0.36)); g.add(at(mesh(new THREE.SphereGeometry(0.1, 6, 4), '#7a4d2b'), ex * 2, 1.9, 0)); }
  const tail = at(mesh(new THREE.BoxGeometry(0.55, 0.1, 0.8), '#5c4033'), 0, 0.25, -0.75); tail.rotation.x = 0.35; g.add(tail);
  g.add(at(mesh(new THREE.CylinderGeometry(0.5, 0.56, 0.5, 10, 1, true), '#c94f3d', { side: THREE.DoubleSide }), 0, 0.85, 0)); // chemise carreautée
  g.add(at(mesh(new THREE.BoxGeometry(0.5, 0.55, 0.08), '#5c7f99'), 0, 0.8, 0.52)); // tablier
  return g;
}
function ginette() {
  const g = new THREE.Group();
  g.add(at(mesh(new THREE.BoxGeometry(0.9, 0.8, 1.4), '#6b4a30'), 0, 1.35, 0));
  for (const [lx, lz] of [[-0.3, -0.5], [0.3, -0.5], [-0.3, 0.5], [0.3, 0.5]]) g.add(at(mesh(new THREE.CylinderGeometry(0.08, 0.07, 1, 5), '#4d3424'), lx, 0.5, lz));
  g.add(at(mesh(new THREE.BoxGeometry(0.35, 0.8, 0.35), '#6b4a30'), 0, 1.95, 0.6));
  const head = at(mesh(new THREE.BoxGeometry(0.42, 0.42, 0.75), '#7a5236'), 0, 2.4, 0.85); g.add(head);
  g.add(at(mesh(new THREE.BoxGeometry(0.36, 0.3, 0.3), '#8f6646'), 0, 2.32, 1.25));
  for (const ex of [-0.22, 0.22]) { g.add(at(mesh(new THREE.SphereGeometry(0.05, 6, 4), '#2b2018'), ex, 2.5, 0.95)); g.add(at(mesh(new THREE.ConeGeometry(0.09, 0.3, 4), '#6b4a30'), ex * 1.4, 2.72, 0.7)); }
  const scarf = at(mesh(new THREE.TorusGeometry(0.28, 0.1, 6, 12), '#3f9a8a'), 0, 1.75, 0.6); scarf.rotation.x = Math.PI / 2; g.add(scarf);
  g.add(at(mesh(new THREE.BoxGeometry(0.16, 0.45, 0.06), '#e2c044'), 0.15, 1.5, 0.82));
  return g;
}
function flocon() {
  const g = new THREE.Group();
  g.add(at(mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.5, 9), '#8a6a4a'), 0, 0.25, 0)); // souche
  const b = at(mesh(new THREE.SphereGeometry(0.5, 12, 10), '#f7f7f2'), 0, 1.0, 0); b.scale.set(1, 1.15, 0.95); g.add(b);
  g.add(at(mesh(new THREE.SphereGeometry(0.38, 12, 10), '#ffffff'), 0, 1.6, 0.05));
  for (const ex of [-0.14, 0.14]) { g.add(at(mesh(new THREE.SphereGeometry(0.1, 8, 6), '#f2c230'), ex, 1.65, 0.33)); g.add(at(mesh(new THREE.SphereGeometry(0.05, 6, 4), '#1a1a1a'), ex, 1.65, 0.41)); g.add(at(mesh(new THREE.TorusGeometry(0.12, 0.02, 4, 12), '#6b4a30'), ex, 1.65, 0.4)); }
  g.add(at(mesh(new THREE.ConeGeometry(0.06, 0.14, 4), '#3a3a3a'), 0, 1.52, 0.42)).children.at(-1).rotation.x = Math.PI / 2;
  for (let i = 0; i < 8; i++) g.add(at(mesh(new THREE.BoxGeometry(0.06, 0.04, 0.02), '#3a3a3a'), Math.cos(i * 1.7) * 0.32, 0.8 + (i % 4) * 0.15, 0.44));
  for (const wx of [-0.5, 0.5]) { const w = at(mesh(new THREE.SphereGeometry(0.28, 8, 6), '#ecece4'), wx, 1.05, -0.05); w.scale.set(0.45, 1, 0.9); g.add(w); }
  return g;
}

export function makeVillagers(scene) {
  const makers = { gaston, ginette, flocon };
  return Object.keys(makers).map(id => {
    const obj = new THREE.Group(), body = makers[id](); obj.add(body); obj.add(blob(id === 'ginette' ? 1.2 : 0.8));
    const tag = label(NOMS[id].split(' ')[0], { size: 30, scale: 0.9 }); tag.position.y = id === 'ginette' ? 3.3 : 2.4; obj.add(tag);
    const [hx, hz] = HOMES[id]; obj.position.set(hx, 0, hz); scene.add(obj);
    let t = Math.random() * 5, wanderT = 2, goal = null, talk = 0;
    const V = { id, nom: NOMS[id], obj, home: HOMES[id], pos: obj.position, tag, lines: LINES[id],
      talkTo() { talk = 4; }, nextLine(n) { return LINES[id][n % LINES[id].length]; },
      update(dt, player) {
        t += dt; talk = Math.max(0, talk - dt); const d = player.pos.distanceTo(obj.position);
        if (id !== 'flocon' && d > 4 && !talk) { wanderT -= dt; if (wanderT <= 0) { wanderT = 3 + Math.random() * 4; goal = goal ? null : [hx + (Math.random() - 0.5) * 3, hz + (Math.random() - 0.5) * 2]; } }
        else goal = null;
        const tx = goal ? goal[0] : hx, tz = goal ? goal[1] : hz; const dx = tx - obj.position.x, dz = tz - obj.position.z, dd = Math.hypot(dx, dz);
        let want = obj.rotation.y;
        if (d < 4 || talk) want = Math.atan2(player.pos.x - obj.position.x, player.pos.z - obj.position.z);
        else if (dd > 0.15) { obj.position.x += dx / dd * dt * 1.2; obj.position.z += dz / dd * dt * 1.2; want = Math.atan2(dx, dz); }
        let a = want - obj.rotation.y; a = Math.atan2(Math.sin(a), Math.cos(a)); obj.rotation.y += a * Math.min(1, dt * 6);
        body.position.y = Math.abs(Math.sin(t * (dd > 0.15 && !(d < 4) ? 7 : 2))) * (talk ? 0.12 : 0.04);
        if (id === 'flocon') body.children[1].rotation.z = Math.sin(t * 0.8) * 0.05;
      } };
    return V;
  });
}
