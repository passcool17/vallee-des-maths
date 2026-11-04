// Animaux : logique pure (testée en Node) — Charlie qui rapporte des trouvailles, quêtes « Trouve Olga » et compagnie.
// Rien de 3D ici : pets.js fait bouger les animaux, main.js et flows.js branchent le tout.

export const FETCH_MAX = 3;          // rapports de Charlie par journée de jeu
export const FETCH_COOL = 40;        // secondes de jeu minimum entre deux rapports
// Trouvailles de Charlie : [clé, poids]. « piece » = des sous tout de suite ; le reste va dans le sac.
export const FETCH_LOOT = [['piece', 38], ['cocotte', 26], ['coquillage', 22], ['bouton', 8], ['pepite', 5], ['trilobite', 1]];
export const LOOT_NOMS = { piece: 'une pièce', cocotte: 'une cocotte de pin', coquillage: 'un coquillage', bouton: 'un bouton de manteau', pepite: 'une pépite d’or', trilobite: 'un trilobite fossile!' };

// Colliers de Charlie : le bleu au départ, un nouveau à la première réussite de chaque quête
export const COLLIERS = { bleu: ['#2f74d8', 'Bleu'], rose: ['#ec6fa5', 'Rose'], vert: ['#4caf6a', 'Vert sapin'], rouge: ['#d9432f', 'Rouge érable'] };

export const QUETES = {
  olga: { nom: 'Trouve Olga', emoji: '🐈‍⬛', chat: 'olga', cents: 300, collier: 'rose',
    intro: 'Olga s’est encore cachée quelque part sur l’île. Je l’entends miauler, mais je la vois pas!',
    indice: 'Écoute les miaous, pis cherche une queue noire qui dépasse.', bravo: 'Te voilà, Olga! Elle se frotte contre tes jambes.' },
  gisele: { nom: 'Trouve Gisèle', emoji: '🐈', chat: 'gisele', cents: 250, collier: 'vert',
    intro: 'Gisèle a quitté son coussin! D’habitude, elle bouge jamais. Elle a laissé des traces de pattes…',
    indice: 'Suis les traces de pattes. Une queue rousse touffue, ça se voit de loin.', bravo: 'Gisèle ouvre un œil : « Prrrr… » Elle retourne à son coussin.' },
  balle: { nom: 'Charlie a perdu sa balle', emoji: '🎾', cents: 200, collier: 'rouge',
    intro: 'Charlie cherche sa balle partout. Il jappe dans une direction… on dirait qu’il sait où elle est!',
    indice: 'Quand tu es proche, Charlie jappe et regarde vers la balle. Suis son museau!', bravo: 'La balle! Charlie fait des tours de joie.' },
};
export const QUETE_IDS = Object.keys(QUETES);

// Cachettes possibles sur l’île 1 (main.js garde celles qui sont praticables et loin des villageois)
export const CACHETTES = [[-15, 9], [-9, 15.5], [13.5, 13.5], [16.5, -2], [-17, -6], [3, -14.5], [10.5, 19], [-4, 19.5], [-19, 2], [18, 3.5]];

export function animauxDefaut() {
  return { day: -1, fetchN: 0, fetchT: -1e9, quete: null, spot: null, faites: {}, total: 0, colliers: ['bleu'], collier: 'bleu', olga: null };
}
// Sauvegarde : complète et répare (v1–v4 n’en ont pas)
export function normAnimaux(raw) {
  const d = animauxDefaut(), a = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const num = (x, def) => (Number.isFinite(x) ? x : def);
  const colliers = Array.isArray(a.colliers) ? [...new Set(['bleu', ...a.colliers.filter(c => c in COLLIERS)])] : d.colliers;
  const faites = {}; if (a.faites && typeof a.faites === 'object') for (const id of QUETE_IDS) if (Number.isFinite(a.faites[id])) faites[id] = a.faites[id];
  const spot = Array.isArray(a.spot) && a.spot.length === 2 && a.spot.every(Number.isFinite) ? [a.spot[0], a.spot[1]] : null;
  const quete = QUETE_IDS.includes(a.quete) && spot ? a.quete : null;
  const olga = a.olga && Number.isFinite(a.olga.x) && Number.isFinite(a.olga.z) ? { x: a.olga.x, z: a.olga.z } : null;
  return { day: num(a.day, -1), fetchN: Math.max(0, num(a.fetchN, 0)), fetchT: -1e9, quete, spot: quete ? spot : null, faites, total: Math.max(0, num(a.total, 0)),
    colliers, collier: colliers.includes(a.collier) ? a.collier : 'bleu', olga };
}
// Nouvelle journée : Charlie peut rapporter de nouveau
export function rollDay(a, day) { if (a.day !== day) { a.day = day; a.fetchN = 0; } return a; }
export function canFetch(a, day, now) { rollDay(a, day); return a.fetchN < FETCH_MAX && now - a.fetchT >= FETCH_COOL; }
export function noteFetch(a, now) { a.fetchN++; a.fetchT = now; }
export function pickLoot(rng) {
  const tot = FETCH_LOOT.reduce((s, [, w]) => s + w, 0); let r = rng.next() * tot;
  for (const [k, w] of FETCH_LOOT) if ((r -= w) < 0) return k; return FETCH_LOOT[0][0];
}
export const pieceCents = rng => 25 + Math.floor(rng.next() * 4) * 25; // 0,25 $ à 1,00 $

// Quêtes du jour : les 3, dans un ordre qui tourne chaque jour ; une quête se refait le lendemain
export function questsDuJour(a, day, seed = 0) {
  const k = ((day + seed) % QUETE_IDS.length + QUETE_IDS.length) % QUETE_IDS.length;
  return [...QUETE_IDS.slice(k), ...QUETE_IDS.slice(0, k)].map(id => ({ id, ...QUETES[id], etat: a.quete === id ? 'active' : a.faites[id] === day ? 'faite' : 'libre' }));
}
export function startQuest(a, id, day, spot) {
  if (!QUETES[id] || a.quete || a.faites[id] === day || !spot) return false;
  a.quete = id; a.spot = [spot[0], spot[1]]; return true;
}
export function abandonQuest(a) { a.quete = null; a.spot = null; }
// Réussite : sous, et un collier neuf la première fois
export function finishQuest(a, day) {
  const id = a.quete; if (!id) return null;
  const q = QUETES[id], neuf = !a.colliers.includes(q.collier);
  a.faites[id] = day; a.total++; a.quete = null; a.spot = null;
  if (neuf) { a.colliers.push(q.collier); a.collier = q.collier; }
  return { id, cents: q.cents, collier: neuf ? q.collier : null };
}
// Cachette du jour pour une quête : déterministe (graine, jour, quête), parmi les cachettes valides
export function pickSpot(valid, day, id, seed = 0) {
  if (!valid.length) return null;
  const h = Math.abs((seed * 31 + day * 7 + QUETE_IDS.indexOf(id) * 13) | 0);
  return valid[h % valid.length];
}
// Indice « chaud ou froid » : distance → mot
export const chaleur = d => (d < 3 ? 'Tout près!' : d < 7 ? 'Ça chauffe…' : d < 13 ? 'Tiède' : 'Froid');
