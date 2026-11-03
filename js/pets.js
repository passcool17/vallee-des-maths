// Animaux de compagnie : Charlie le shih tzu (suit Camille partout, même sur le traversier),
// Gisèle la chatte rousse (fait la sieste sur son coussin près du magasin) et Olga la chatte noir et blanc (flâne, suit parfois).
import * as THREE from '../vendor/three.module.min.js';
import { blob, mesh } from './world.js';
import { bake, part } from './bake.js';

const S = (r, w = 12, h = 10) => new THREE.SphereGeometry(r, w, h), Cy = (a, b, h, n = 10) => new THREE.CylinderGeometry(a, b, h, n);
const Cap = (r, l) => new THREE.CapsuleGeometry(r, l, 4, 10);
const keep = m => { m.userData.keep = 1; return m; };

export const PET_LINES = {
  charlie: ['Charlie remue la queue!', 'Charlie te lèche la main. Ouaf!', 'Charlie tourne en rond, tout content.', 'Charlie s’assoit bien droit. Bon chien!'],
  gisele: ['Gisèle ronronne.', 'Gisèle ouvre un œil… puis le referme.', 'Gisèle s’étire et se rendort au soleil.', 'Prrrr… Gisèle ronronne encore plus fort.'],
  olga: ['Olga te fixe de ses yeux verts.', 'Olga se frotte contre tes jambes.', 'Olga cligne lentement des yeux : c’est un bisou de chat.', 'Olga fait semblant de ne pas t’avoir vue.'],
};
export const PET_NOMS = { charlie: 'Charlie', gisele: 'Gisèle', olga: 'Olga' };

// ---------- Charlie : petit shih tzu blanc, oreilles et taches brun-gris, collier bleu avec médaille
function charlie() {
  const W = '#f5f0e8', B = '#8b7464', B2 = '#6e5a4d', K = '#1e1b1c', g = new THREE.Group();
  g.add(part(Cap(0.17, 0.3), W, 0, 0.3, 0, [1, 0.95, 1], [Math.PI / 2, 0, 0]));                 // corps
  for (const [x, z] of [[-0.1, 0.17], [0.1, 0.17], [-0.1, -0.17], [0.1, -0.17]]) g.add(part(Cy(0.055, 0.065, 0.2, 8), W, x, 0.12, z)); // pattes
  g.add(part(S(0.13), W, 0, 0.2, 0, [1.25, 0.6, 1.9]));                                          // poil long qui tombe
  g.add(part(S(0.18, 14, 12), W, 0, 0.52, 0.24));                                                // tête
  g.add(part(S(0.1), W, 0, 0.47, 0.39, [1.2, 0.85, 0.8]));                                       // museau
  g.add(part(S(0.035, 8, 6), K, 0, 0.5, 0.47));                                                  // truffe
  g.add(part(S(0.05, 8, 6), B, 0, 0.67, 0.2, [1.4, 0.7, 1.2]));                                  // houppette
  for (const sx of [-1, 1]) {
    g.add(part(S(0.06, 10, 8), B, sx * 0.075, 0.56, 0.37, [1, 0.9, 0.45]));                     // taches autour des yeux
    g.add(part(S(0.028, 8, 6), K, sx * 0.075, 0.565, 0.4));                                      // yeux
    g.add(part(Cap(0.07, 0.17), B2, sx * 0.17, 0.46, 0.2, [0.75, 1, 1], [0.1, 0, sx * 0.25]));   // oreilles tombantes
  }
  g.add(part(new THREE.TorusGeometry(0.13, 0.025, 6, 14), '#2f74d8', 0, 0.4, 0.22, null, [Math.PI / 2 - 0.35, 0, 0])); // collier bleu
  g.add(part(Cy(0.035, 0.035, 0.012, 10), '#e7c25a', 0, 0.31, 0.34, null, [Math.PI / 2, 0, 0])); // médaille
  bake(g);
  const tail = new THREE.Group(); tail.position.set(0, 0.42, -0.3);
  tail.add(part(S(0.09), W, 0, 0.08, -0.03, [0.8, 1.3, 0.8], [-0.5, 0, 0])); tail.add(part(S(0.06), B, 0, 0.17, 0.04, [0.9, 1, 0.9])); bake(tail); g.add(tail);
  return { g, tail };
}
// ---------- Chats : Gisèle (longs poils roux, yeux mi-clos) couchée en pain ; Olga (smoking noir et blanc, yeux verts) debout
function cat({ fur, fur2, belly, ears, eyes, nose, sleepy, loaf, blaze }) {
  const g = new THREE.Group();
  if (loaf) {
    g.add(part(S(0.26, 14, 12), fur, 0, 0.2, -0.04, [1, 0.72, 1.35]));
    for (let i = 0; i < 6; i++) g.add(part(S(0.1, 8, 6), i % 2 ? fur2 : fur, Math.cos(i) * 0.24, 0.16 + (i % 3) * 0.04, -0.2 + i * 0.07, [1, 0.8, 1])); // touffes
    for (const sx of [-0.08, 0.08]) g.add(part(S(0.06, 8, 6), belly, sx, 0.06, 0.3, [1, 0.7, 1.3])); // pattes repliées
  } else {
    g.add(part(Cap(0.15, 0.3), fur, 0, 0.3, -0.02, null, [Math.PI / 2, 0, 0]));
    for (const [x, z] of [[-0.08, 0.16], [0.08, 0.16], [-0.08, -0.18], [0.08, -0.18]]) { g.add(part(Cy(0.045, 0.045, 0.22, 8), fur, x, 0.14, z)); g.add(part(S(0.05, 8, 6), belly, x, 0.04, z + 0.01, [1, 0.7, 1.2])); }
  }
  const hy = loaf ? 0.34 : 0.5, hz = loaf ? 0.26 : 0.26;
  g.add(part(S(0.15, 14, 12), fur, 0, hy, hz, [1.1, 0.95, 1]));
  g.add(part(S(0.12, 10, 8), belly, 0, hy - 0.16, hz - 0.02, [1.05, 1.1, 0.7]));                  // poitrail
  g.add(part(S(0.075, 10, 8), belly, 0, hy - 0.05, hz + 0.1, [1.3, 0.85, 0.8]));                 // museau
  if (blaze) g.add(part(S(0.04, 8, 6), belly, 0, hy + 0.04, hz + 0.135, [0.7, 1.6, 0.5]));       // liste blanche
  g.add(part(S(0.022, 8, 6), nose, 0, hy - 0.015, hz + 0.16, [1.2, 0.8, 0.8]));
  for (const sx of [-1, 1]) {
    g.add(part(new THREE.ConeGeometry(0.06, 0.12, 4), fur, sx * 0.09, hy + 0.14, hz - 0.02, null, [0, 0, -sx * 0.25]));
    g.add(part(new THREE.ConeGeometry(0.032, 0.07, 4), ears, sx * 0.09, hy + 0.13, hz + 0.01, null, [0, 0, -sx * 0.25]));
    if (sleepy) g.add(part(new THREE.BoxGeometry(0.06, 0.012, 0.01), '#3a2416', sx * 0.065, hy + 0.025, hz + 0.145, null, [0, 0, sx * 0.15])); // yeux mi-clos
    else { g.add(part(S(0.032, 10, 8), eyes, sx * 0.065, hy + 0.03, hz + 0.13, [1, 1.1, 0.6])); g.add(part(S(0.013, 6, 4), '#111111', sx * 0.065, hy + 0.03, hz + 0.15, [0.5, 1.3, 0.5])); }
  }
  bake(g);
  const tail = new THREE.Group(); tail.position.set(0, loaf ? 0.12 : 0.34, -0.3);
  if (loaf) { tail.add(part(new THREE.TorusGeometry(0.24, 0.07, 6, 14, Math.PI * 0.9), fur2, 0.0, -0.05, 0.2, null, [Math.PI / 2, 0, 0.3])); }
  else tail.add(part(Cap(0.04, 0.34), fur, 0, 0.17, -0.05, null, [-0.35, 0, 0]));
  bake(tail); g.add(tail);
  return { g, tail };
}

function cushion() { const g = new THREE.Group();
  g.add(part(S(0.5, 16, 8), '#e9dcc6', 0, 0.08, 0, [1, 0.22, 1])); g.add(part(new THREE.TorusGeometry(0.45, 0.09, 6, 18), '#d6c3a5', 0, 0.12, 0, null, [Math.PI / 2, 0, 0]));
  bake(g); return g; }

export function makePets(scene, world, G) {
  const pets = [];
  function make(id, built, parent, x, z, isle) {
    const obj = new THREE.Group(); obj.add(built.g); built.g.scale.setScalar(id === 'charlie' ? 1.15 : 1.3); obj.add(blob(id === 'charlie' ? 0.45 : 0.42)); obj.position.set(x, 0, z); parent.add(obj);
    const P = { id, nom: PET_NOMS[id], obj, pos: obj.position, body: built.g, tail: built.tail, isle, t: Math.random() * 9, pet: 0, n: 0, say() { return PET_LINES[id][P.n++ % PET_LINES[id].length]; } };
    pets.push(P); return P;
  }
  // Charlie dans la scène (pas dans une île) : il prend le traversier avec Camille
  const st = G.player.pos, ch = make('charlie', charlie(), scene, st.x - 1.2, st.z + 1, 0);
  ch.speed = 0; ch.facing = 0;
  // Gisèle : coussin au soleil, à côté du magasin général
  const home = [8.2, -5.0]; const cu = cushion(); cu.position.set(home[0], 0, home[1]); world.root.add(cu);
  const gi = make('gisele', cat({ fur: '#e3974e', fur2: '#f0b170', belly: '#f6c896', ears: '#f0a99a', nose: '#e88f8f', sleepy: true, loaf: true }), world.root, home[0], home[1], 1);
  gi.obj.rotation.y = 0.6; gi.body.position.y = 0.1;
  // Olga : flâne entre le magasin et le sentier, suit Camille un bout de temps à l’occasion
  const ol = make('olga', cat({ fur: '#1f1d22', fur2: '#1f1d22', belly: '#f7f5f0', ears: '#e9a3a8', eyes: '#8fcf4a', nose: '#f29aa8', blaze: true }), world.root, 6.5, -3.2, 1);
  ol.home = [6.5, -3.2]; ol.goal = null; ol.wait = 2; ol.follow = 0; ol.cool = 8;

  const tmp = new THREE.Vector3();
  function stepTo(P, tx, tz, sp, dt, walkable) {
    const dx = tx - P.pos.x, dz = tz - P.pos.z, d = Math.hypot(dx, dz); if (d < 0.05) return 0;
    const s = Math.min(d, sp * dt), nx = P.pos.x + dx / d * s, nz = P.pos.z + dz / d * s;
    if (!walkable || walkable(nx, nz)) { P.pos.x = nx; P.pos.z = nz; }
    turn(P, Math.atan2(dx, dz), dt); return s / dt;
  }
  function turn(P, want, dt) { let a = want - P.obj.rotation.y; a = Math.atan2(Math.sin(a), Math.cos(a)); P.obj.rotation.y += a * Math.min(1, dt * 7); }

  return {
    pets, charlie: ch,
    // à appeler après un saut (traversier, chargement) : Charlie réapparaît juste derrière Camille
    regroup(player) { ch.pos.set(player.pos.x - Math.sin(player.facing) * 1.3 - 0.5, 0, player.pos.z - Math.cos(player.facing) * 1.3); },
    visible(island) { return pets.filter(p => !p.isle || p.isle === island); },
    pat(P) { P.pet = 1.6; return P.say(); },
    update(dt, player, walkable, island) {
      for (const P of pets) { P.t += dt; P.pet = Math.max(0, P.pet - dt); }
      // ---- Charlie : trotte derrière, garde ses distances, remue la queue
      { const p = player.pos, d = Math.hypot(p.x - ch.pos.x, p.z - ch.pos.z);
        if (d > 9) this.regroup(player);
        let sp = 0;
        if (d > 1.7 && !ch.pet) { const tx = p.x - (p.x - ch.pos.x) / d * 1.4, tz = p.z - (p.z - ch.pos.z) / d * 1.4; sp = stepTo(ch, tx, tz, Math.min(8, 2.5 + (d - 1.7) * 2.6), dt, walkable); }
        else turn(ch, Math.atan2(p.x - ch.pos.x, p.z - ch.pos.z), dt);
        ch.speed += (sp - ch.speed) * Math.min(1, dt * 8); const run = ch.speed > 0.3;
        ch.body.position.y = run ? Math.abs(Math.sin(ch.t * 15)) * 0.06 : 0; ch.body.rotation.x = run ? Math.sin(ch.t * 15) * 0.06 : 0;
        ch.tail.rotation.z = Math.sin(ch.t * (ch.pet || player.moving ? 22 : 8)) * (ch.pet ? 0.7 : 0.4); }
      if (island !== 1) return;
      // ---- Gisèle : respire en dormant, lève un peu la tête quand on la flatte
      gi.body.scale.y = 1 + Math.sin(gi.t * 1.6) * 0.03; gi.body.rotation.x = gi.pet ? -0.08 : 0; gi.tail.rotation.y = Math.sin(gi.t * 0.7) * 0.08;
      // ---- Olga : flâne paresseusement ; de temps en temps, suit Camille un bout
      { const p = player.pos, dp = Math.hypot(p.x - ol.pos.x, p.z - ol.pos.z), dh = Math.hypot(ol.home[0] - ol.pos.x, ol.home[1] - ol.pos.z); let sp = 0;
        ol.cool -= dt;
        if (!ol.follow && ol.cool <= 0 && dp < 5 && player.moving) { ol.follow = 7; ol.cool = 25; }
        if (ol.follow) { ol.follow = Math.max(0, ol.follow - dt); if (dh > 11) ol.follow = 0;
          if (dp > 2.2 && !ol.pet) sp = stepTo(ol, p.x - (p.x - ol.pos.x) / dp * 2, p.z - (p.z - ol.pos.z) / dp * 2, 2.6, dt, walkable); else turn(ol, Math.atan2(p.x - ol.pos.x, p.z - ol.pos.z), dt); }
        else if (ol.pet) turn(ol, Math.atan2(p.x - ol.pos.x, p.z - ol.pos.z), dt);
        else { ol.wait -= dt;
          if (ol.goal) { sp = stepTo(ol, ol.goal[0], ol.goal[1], 1.1, dt, walkable); if (!sp) { ol.goal = null; ol.wait = 3 + Math.random() * 5; } }
          else if (ol.wait <= 0) ol.goal = dh > 4 ? [...ol.home] : [ol.home[0] + (Math.random() - 0.5) * 5, ol.home[1] + (Math.random() - 0.5) * 3]; }
        ol.body.position.y = sp > 0.2 ? Math.abs(Math.sin(ol.t * 9)) * 0.025 : 0;
        ol.tail.rotation.x = -0.2 + Math.sin(ol.t * 1.3) * 0.25; ol.tail.rotation.z = Math.sin(ol.t * 0.9) * 0.3; }
    },
  };
}

// ---------- Petit cœur qui monte au-dessus d’un animal flatté
const heartGeo = (() => { const s = new THREE.Shape(); s.moveTo(0, -0.18); s.bezierCurveTo(0.05, -0.1, 0.22, -0.02, 0.2, 0.08); s.bezierCurveTo(0.18, 0.2, 0.03, 0.2, 0, 0.1); s.bezierCurveTo(-0.03, 0.2, -0.18, 0.2, -0.2, 0.08); s.bezierCurveTo(-0.22, -0.02, -0.05, -0.1, 0, -0.18);
  return new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2, curveSegments: 8 }); })();
export function heart(scene, x, y, z) { const m = mesh(heartGeo, '#ff5c8a', { emissive: '#d81b5a' }); m.position.set(x, y, z); m.userData.joli = 1; scene.add(m); return m; }
