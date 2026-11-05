// Villageois (tous fictifs) — île 1 : Gaston le castor (établi), Thérèse l’orignale (magasin), Flocon le harfang (défis et carnet).
// Hortense la tortue (bibliothécaire : leçons de théorie, coin lecture près du village).
// Lionel l’orignal (cabane à sucre, nord) et Lise la renarde (bleuetière, est).
// Île 2 : Rosalie la loutre (gardienne du phare, atelier niveau 4), Bernard le huard (kiosque de pêche).
import * as THREE from '../vendor/three.module.min.js';
import { mesh, at, blob, label } from './world.js';

export const LINES = {
  gaston: [
    'Salut! Moi c’est Gaston. Si t’as besoin d’un outil plus solide, viens me voir à l’établi.',
    'Trois bonnes réponses pis j’te patente ça en deux temps trois mouvements!',
    'Une digue, une canne à pêche, c’est pareil : faut que les calculs tiennent debout.',
    'Prends ton temps. Un castor pressé, ça fait des barrages tout croches.',
  ],
  therese: [
    'Bienvenue au magasin général! Thérèse, pour vous servir.',
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
  hortense: [
    'Bonjour, ma belle! Hortense, la bibliothécaire de l’île. Une petite leçon, ça te tente?',
    'Lentement, mais sûrement : une étape à la fois, pis le problème le plus compliqué devient simple.',
    'Quand ça accroche, on relit la règle, on regarde un exemple, pis on réessaie.',
    'J’ai rangé mes livres par compétence. Celles qui te donnent du fil à retordre sont en avant.',
  ],
  rosalie: [
    'Allô! Rosalie, gardienne du phare. Bienvenue sur l’île de secondaire 2!',
    'Mon phare est brisé depuis la dernière tempête. Tu m’aides à le réparer? Faut juste bien calculer.',
    'Une échelle, c’est magique : un petit plan, pis on connaît la vraie hauteur.',
    'À mon atelier, je monte tes outils au niveau 4. Mais je veux voir des calculs de secondaire 2!',
  ],
  bernard: [
    'Bonjour, bonjour! Bernard le huard, kiosque de pêche. Les poissons rares, c’est par ici.',
    'Pige dans ma chaudière une fois par jour : si tu calcules bien la probabilité, je te donne un appât rare.',
    'Avec ou sans remise, ça change toute! Les billes qu’on remet pas, ça compte plus.',
    'Le bar rayé, c’est le plus rare. Moi je l’ai vu juste deux fois… pis je rêvais peut-être.',
  ],
  lionel: [
    'Bienvenue à la cabane! Moi c’est Lionel. L’évaporateur chante déjà, viens te réchauffer.',
    'On pend les chaudières aux érables, pis on attend que la sève se montre. Ça presse pas.',
    'Une chaudière prête, c’est comme un bon calcul : faut juste lui laisser le temps.',
    'La première coulée, c’est mon petit bonheur. Même hors saison, j’en parle encore.',
    'Si t’as froid aux pattes, approche-toi du feu. Y’a toujours une place ici.',
  ],
  lise: [
    'Allô mon coco! Lise, ici. Les bleuets sont beaux cette année, viens voir.',
    'Cueille tout doucement : un plant à la fois, comme on compte les petits.',
    'Après la cueillette, on trie sur la table. Les plus jolis vont en confiture.',
    'Si t’as les mains bleues, c’est que t’as bien travaillé. Moi aussi!',
    'Prends ton temps. Une renarde pressée, ça écrase les bleuets.',
  ],
};
export const NOMS = { gaston: 'Gaston le castor', therese: 'Thérèse l’orignale', flocon: 'Flocon le harfang', hortense: 'Hortense la tortue', rosalie: 'Rosalie la loutre', bernard: 'Bernard le huard', lionel: 'Lionel l’orignal', lise: 'Lise la renarde' };
export const EMOJI = { gaston: '🦫', therese: '🫎', flocon: '🦉', hortense: '🐢', rosalie: '🦦', bernard: '🐦', lionel: '🫎', lise: '🦊' };
export const ISLE_OF = { gaston: 1, therese: 1, flocon: 1, hortense: 1, rosalie: 2, bernard: 2, lionel: 1, lise: 1 };
const HOMES = { gaston: [-9.2, -1.2], therese: [15.6, -4.6], flocon: [0.4, -13.2], hortense: [-5.4, -8.7], rosalie: [13.4, -12.2], bernard: [8.8, 21.4], lionel: [-1.4, -43.6], lise: [43.2, 6.4] };

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
function therese() {
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

function rosalie() {
  const g = new THREE.Group();
  const b = at(mesh(new THREE.CapsuleGeometry(0.36, 0.7, 4, 10), '#7b5233'), 0, 0.85, 0); g.add(b);
  g.add(at(mesh(new THREE.CylinderGeometry(0.45, 0.5, 0.8, 10, 1, true), '#f2c230', { side: THREE.DoubleSide }), 0, 0.85, 0)); // ciré jaune
  g.add(at(mesh(new THREE.SphereGeometry(0.34, 10, 8), '#8a5c3a'), 0, 1.6, 0.02));
  g.add(at(mesh(new THREE.SphereGeometry(0.22, 8, 6), '#e8d2b0'), 0, 1.52, 0.24)); // museau clair
  g.add(at(mesh(new THREE.SphereGeometry(0.06, 6, 4), '#2b2018'), 0, 1.58, 0.45));
  for (const ex of [-0.13, 0.13]) { g.add(at(mesh(new THREE.SphereGeometry(0.045, 6, 4), '#1a1a1a'), ex, 1.7, 0.29)); g.add(at(mesh(new THREE.SphereGeometry(0.08, 6, 4), '#6b4a30'), ex * 2.2, 1.8, 0)); }
  for (const s of [-1, 1]) for (const dy of [0, 0.05]) g.add(at(mesh(new THREE.BoxGeometry(0.3, 0.012, 0.012), '#f7f0dc'), s * 0.2, 1.5 + dy, 0.4, s * 0.25));
  const hat = at(mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.26, 10), '#2f4a7a'), 0, 1.9, 0); g.add(hat); // tuque marine
  g.add(at(mesh(new THREE.SphereGeometry(0.1, 6, 4), '#f6f2ea'), 0, 2.08, 0));
  const tail = at(mesh(new THREE.ConeGeometry(0.16, 0.9, 6), '#6b4529'), 0, 0.3, -0.55); tail.rotation.x = -1.2; g.add(tail);
  g.add(at(mesh(new THREE.TorusGeometry(0.14, 0.03, 4, 10), '#9aa3ad'), 0.4, 0.9, 0.2)); // clé à molette stylisée
  return g;
}
function bernard() {
  const g = new THREE.Group();
  const b = at(mesh(new THREE.SphereGeometry(0.55, 12, 10), '#1f2326'), 0, 0.8, 0); b.scale.set(0.95, 0.85, 1.3); g.add(b);
  const belly = at(mesh(new THREE.SphereGeometry(0.46, 10, 8), '#f4f4ee'), 0, 0.72, 0.18); belly.scale.set(0.9, 0.8, 1.1); g.add(belly);
  for (let i = 0; i < 10; i++) g.add(at(mesh(new THREE.BoxGeometry(0.07, 0.03, 0.07), '#f4f4ee'), Math.cos(i * 2.4) * 0.38, 1.17, -0.15 - (i % 5) * 0.12)); // damier du dos
  g.add(at(mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.45, 8), '#1f2326'), 0, 1.3, 0.35));
  for (const y of [1.3, 1.38]) g.add(at(mesh(new THREE.TorusGeometry(0.19, 0.02, 4, 12), '#f4f4ee'), 0, y, 0.35)).children.at(-1).rotation.x = Math.PI / 2;
  g.add(at(mesh(new THREE.SphereGeometry(0.27, 10, 8), '#1d3a33'), 0, 1.65, 0.42));
  const beak = at(mesh(new THREE.ConeGeometry(0.07, 0.45, 5), '#2b2b33'), 0, 1.6, 0.85); beak.rotation.x = Math.PI / 2; g.add(beak);
  for (const ex of [-0.15, 0.15]) g.add(at(mesh(new THREE.SphereGeometry(0.05, 6, 4), '#c7362f'), ex, 1.7, 0.6));
  const hat = at(mesh(new THREE.CylinderGeometry(0.22, 0.34, 0.2, 10), '#c9b48a'), 0, 1.9, 0.42); g.add(hat); // bob de pêcheur
  g.add(at(mesh(new THREE.TorusGeometry(0.06, 0.015, 4, 8), '#e2572e'), 0.2, 1.95, 0.42)); // mouche à pêche
  return g;
}

function hortense() {
  const g = new THREE.Group();
  const shell = at(mesh(new THREE.SphereGeometry(0.62, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), '#4f7f4a'), 0, 0.42, -0.12); shell.scale.set(1, 1.05, 1.1); g.add(shell); // carapace
  g.add(at(mesh(new THREE.CylinderGeometry(0.64, 0.66, 0.1, 8), '#c9b47a'), 0, 0.42, -0.12)); // rebord
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.add(at(mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.05, 6), '#3d6439'), Math.cos(a) * 0.36, 0.78, -0.12 + Math.sin(a) * 0.38, a)).children.at(-1).rotation.x = Math.sin(a) * 0.5; }
  g.add(at(mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 6), '#3d6439'), 0, 1.04, -0.12));
  for (const [lx, lz] of [[-0.4, 0.25], [0.4, 0.25], [-0.4, -0.45], [0.4, -0.45]]) g.add(at(mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.42, 6), '#9bbf7a'), lx, 0.21, lz));
  const neck = at(mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.5, 7), '#9bbf7a'), 0, 0.85, 0.45); neck.rotation.x = 0.35; g.add(neck);
  g.add(at(mesh(new THREE.SphereGeometry(0.27, 10, 8), '#a6c784'), 0, 1.18, 0.58));
  for (const ex of [-0.11, 0.11]) { g.add(at(mesh(new THREE.SphereGeometry(0.035, 6, 4), '#1a1a1a'), ex, 1.24, 0.83)); g.add(at(mesh(new THREE.TorusGeometry(0.075, 0.015, 4, 12), '#7a5236'), ex, 1.24, 0.85)); } // lunettes rondes
  g.add(at(mesh(new THREE.BoxGeometry(0.06, 0.015, 0.015), '#7a5236'), 0, 1.24, 0.85));
  const scarf = at(mesh(new THREE.TorusGeometry(0.19, 0.06, 6, 12), '#c96a8a'), 0, 0.98, 0.5); scarf.rotation.x = Math.PI / 2 - 0.35; g.add(scarf); // foulard tricoté
  const book = at(mesh(new THREE.BoxGeometry(0.34, 0.44, 0.1), '#3f7fb5'), 0.48, 0.6, 0.35, -0.4); g.add(book);
  g.add(at(mesh(new THREE.BoxGeometry(0.3, 0.4, 0.11), '#f7f0dc'), 0.47, 0.6, 0.36, -0.4));
  return g;
}

function lionel() {
  const g = new THREE.Group();
  g.add(at(mesh(new THREE.BoxGeometry(1.05, 1.0, 1.7), '#5a3d24'), 0, 1.55, 0));
  for (const [lx, lz] of [[-0.34, -0.62], [0.34, -0.62], [-0.34, 0.62], [0.34, 0.62]]) g.add(at(mesh(new THREE.CylinderGeometry(0.09, 0.08, 1.2, 5), '#3d2818'), lx, 0.58, lz));
  g.add(at(mesh(new THREE.BoxGeometry(0.42, 0.95, 0.42), '#5a3d24'), 0, 2.28, 0.72));
  g.add(at(mesh(new THREE.BoxGeometry(0.5, 0.5, 0.92), '#6b4a30'), 0, 2.82, 1.02));
  g.add(at(mesh(new THREE.BoxGeometry(0.42, 0.34, 0.38), '#7a5236'), 0, 2.72, 1.52));
  for (const ex of [-0.26, 0.26]) {
    g.add(at(mesh(new THREE.SphereGeometry(0.055, 6, 4), '#2b2018'), ex, 2.94, 1.14));
    g.add(at(mesh(new THREE.ConeGeometry(0.1, 0.46, 4), '#4d3424'), ex * 1.45, 3.22, 0.84));
    g.add(at(mesh(new THREE.BoxGeometry(0.32, 0.07, 0.07), '#4d3424'), ex * 1.75, 3.32, 0.84));
  }
  g.add(at(mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.24, 8), '#8b2e2e'), 0, 3.14, 0.96)); // tuque
  g.add(at(mesh(new THREE.SphereGeometry(0.08, 6, 4), '#f4efe6'), 0, 3.3, 0.96));
  g.add(at(mesh(new THREE.BoxGeometry(0.22, 0.55, 0.08), '#c94f3d'), 0.22, 1.72, 0.92)); // carreau de flanelle
  return g;
}
function lise() {
  const g = new THREE.Group();
  g.add(at(mesh(new THREE.CapsuleGeometry(0.28, 0.46, 4, 8), '#e07a3d'), 0, 0.72, 0));
  g.add(at(mesh(new THREE.SphereGeometry(0.22, 8, 6), '#f4e6d4'), 0, 0.7, 0.14)); // poitrail blanc
  g.add(at(mesh(new THREE.SphereGeometry(0.26, 10, 8), '#e8894a'), 0, 1.28, 0.04));
  g.add(at(mesh(new THREE.SphereGeometry(0.16, 8, 6), '#f7efe4'), 0, 1.18, 0.2));
  g.add(at(mesh(new THREE.SphereGeometry(0.045, 6, 4), '#2b2018'), 0, 1.2, 0.34));
  for (const ex of [-0.1, 0.1]) {
    g.add(at(mesh(new THREE.SphereGeometry(0.04, 6, 4), '#1a1a1a'), ex, 1.36, 0.22));
    g.add(at(mesh(new THREE.ConeGeometry(0.08, 0.22, 4), '#e07a3d'), ex * 1.55, 1.54, 0));
  }
  const tail = at(mesh(new THREE.ConeGeometry(0.12, 0.72, 6), '#e07a3d'), 0, 0.46, -0.46); tail.rotation.x = -1.15; g.add(tail);
  g.add(at(mesh(new THREE.SphereGeometry(0.08, 6, 4), '#f7efe4'), 0, 0.22, -0.74)); // bout de queue blanc
  g.add(at(mesh(new THREE.BoxGeometry(0.22, 0.16, 0.16), '#3d4f9e'), 0.3, 0.7, 0.14)); // petit panier
  return g;
}

const MAKERS = { gaston, therese, flocon, hortense, rosalie, bernard, lionel, lise };
export function makeVillagers(parent, ids = ['gaston', 'therese', 'flocon', 'hortense', 'lionel', 'lise']) {
  return ids.map(id => {
    const makers = MAKERS;
    const obj = new THREE.Group(), body = makers[id](); obj.add(body); obj.add(blob(id === 'lionel' ? 1.35 : id === 'therese' ? 1.2 : id === 'lise' ? 0.65 : 0.8));
    const tag = label(NOMS[id].split(' ')[0], { size: 30, scale: 0.9 }); tag.position.y = id === 'lionel' ? 3.7 : id === 'therese' ? 3.3 : id === 'hortense' ? 1.85 : id === 'lise' ? 1.95 : 2.4; obj.add(tag);
    const [hx, hz] = HOMES[id]; obj.position.set(hx, 0, hz); parent.add(obj);
    let t = Math.random() * 5, wanderT = 2, goal = null, talk = 0;
    const V = { id, isle: ISLE_OF[id], nom: NOMS[id], obj, home: HOMES[id], pos: obj.position, tag, lines: LINES[id],
      talkTo() { talk = 4; }, nextLine(n) { return LINES[id][n % LINES[id].length]; },
      update(dt, player) {
        t += dt; talk = Math.max(0, talk - dt); const d = player.pos.distanceTo(obj.position);
        if (id !== 'flocon' && id !== 'bernard' && id !== 'hortense' && d > 4 && !talk) { wanderT -= dt; if (wanderT <= 0) { wanderT = 3 + Math.random() * 4; goal = goal ? null : [hx + (Math.random() - 0.5) * 3, hz + (Math.random() - 0.5) * 2]; } }
        else goal = null;
        const tx = goal ? goal[0] : hx, tz = goal ? goal[1] : hz; const dx = tx - obj.position.x, dz = tz - obj.position.z, dd = Math.hypot(dx, dz);
        let want = obj.rotation.y;
        if (d < 4 || talk) want = Math.atan2(player.pos.x - obj.position.x, player.pos.z - obj.position.z);
        else if (dd > 0.15) { obj.position.x += dx / dd * dt * 1.2; obj.position.z += dz / dd * dt * 1.2; want = Math.atan2(dx, dz); }
        let a = want - obj.rotation.y; a = Math.atan2(Math.sin(a), Math.cos(a)); obj.rotation.y += a * Math.min(1, dt * 6);
        // marche : dandinement, penché vers l’avant, rebond ; immobile : respiration lente
        const walk = dd > 0.15 && !(d < 4) && !talk; V.walking = walk;
        body.position.y = Math.abs(Math.sin(t * (walk ? 7 : 2))) * (talk ? 0.12 : walk ? 0.06 : 0.02);
        body.rotation.z = walk ? Math.sin(t * 7) * 0.09 : Math.sin(t * 0.9) * 0.015; body.rotation.x = walk ? 0.08 : 0;
        body.scale.set(1, walk ? 1 - Math.abs(Math.cos(t * 7)) * 0.04 : 1 + Math.sin(t * 1.7) * 0.018, 1);
        if (id === 'flocon') body.children[1].rotation.z = Math.sin(t * 0.8) * 0.05;
      } };
    return V;
  });
}
