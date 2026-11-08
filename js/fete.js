// Fête de Camille, 13 ans : logique pure (activation, défis, sauvegarde). Aucune dépendance au DOM ni à three.js.
export const FETE_PARAM = 'camille13';
export const FETE_DATE = '2026-11-08'; // date de l’événement, à l’heure de Toronto
export const FETE_TZ = 'America/Toronto';
export const MESSAGE = 'Bonne fête Camille! 13 ans, 13 bougies : bravo! Charlie a un cadeau pour toi.';
export const BANNIERE = 'Bonne fête Camille! — 13 ans';
export const DEFIS = [
  { id: 'gaston', bougies: 5, q: 'Camille a 13 ans aujourd’hui! J’ai 13 bougies et j’en plante déjà 8. Combien en manque-t-il?', rep: '5',
    indice: 'Pense à 13 − 8.', explication: '13 − 8 = 5 : il manque 5 bougies.' },
  { id: 'therese', bougies: 4, q: 'Je coupe le gâteau en 13 parts égales. On en mange 4. Quelle fraction du gâteau reste-t-il?', rep: '9/13',
    indice: '13 − 4 = 9 parts restent, sur 13 parts en tout.', explication: '13 − 4 = 9 parts restent sur 13 : il reste 9/13 du gâteau.' },
  { id: 'hortense', bougies: 4, q: '13 × 4 = ? Ce sont les fanions de la guirlande : 13 fanions sur chacun des 4 côtés de la place.', rep: '52',
    indice: '10 × 4 + 3 × 4.', explication: '10 × 4 = 40 et 3 × 4 = 12 ; 40 + 12 = 52 fanions.' },
];
export const DEFI_IDS = DEFIS.map(d => d.id);
export const TOTAL_BOUGIES = DEFIS.reduce((a, d) => a + d.bougies, 0);

// Date locale de Toronto au format AAAA-MM-JJ
export function torontoDate(date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: FETE_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date).map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}
// Décidé une seule fois au chargement : le jour J à Toronto, ou avec ?fete=camille13
export function feteActive(date, search = '') {
  let q = null; try { q = new URLSearchParams(search).get('fete'); } catch { q = null; }
  if (q === FETE_PARAM) return true;
  try { return torontoDate(date) === FETE_DATE; } catch { return false; }
}

export function feteDefaut() { return { defis: { gaston: false, therese: false, hortense: false }, souffle: false, chapeau: false, porte: false }; }
// Règles de la spec, dans l’ordre : 1) défauts/booléens ; 2) souffle ⇒ 3 défis ; 3) souffle ⇒ chapeau ; 4) pas de chapeau ⇒ pas porté
export function normFete(raw) {
  const f = feteDefaut();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return f;
  const d = raw.defis && typeof raw.defis === 'object' && !Array.isArray(raw.defis) ? raw.defis : {};
  for (const id of DEFI_IDS) f.defis[id] = d[id] === true;
  f.souffle = raw.souffle === true; f.chapeau = raw.chapeau === true; f.porte = raw.porte === true;
  if (f.souffle && !DEFI_IDS.every(id => f.defis[id])) f.souffle = false;
  if (f.souffle) f.chapeau = true;
  if (!f.chapeau) f.porte = false;
  return f;
}
export const bougies = f => DEFIS.reduce((a, d) => a + (f.defis[d.id] ? d.bougies : 0), 0);
export const pretASouffler = f => !f.souffle && DEFI_IDS.every(id => f.defis[id]);
export const defiDe = id => DEFIS.find(d => d.id === id) || null;

// Réponse : espaces ignorés, virgule ou point acceptés pour les entiers ; 9/13 exactement (fraction irréductible)
export function verifier(id, saisie) {
  const d = defiDe(id); if (!d) return false;
  const s = String(saisie ?? '').replace(/\s+/g, '').replace('−', '-');
  return s === d.rep;
}
// Tentative sans pénalité : 1re erreur → encouragement ; 2e → indice ; 3e et plus → on peut voir la réponse
export function etapeErreur(nErreurs) { return nErreurs <= 1 ? 'encore' : nErreurs === 2 ? 'indice' : 'reponse'; }
export const ENCOURAGE = 'Presque! Essaie encore.';
// Réussir (ou voir la réponse) allume les bougies du défi ; renvoie une nouvelle fête normalisée
export function reussir(f, id) { const n = normFete(f); if (DEFI_IDS.includes(id)) n.defis[id] = true; return n; }
export function souffler(f) { const n = normFete(f); if (!pretASouffler(n)) return n; n.souffle = true; n.chapeau = true; n.porte = true; return normFete(n); }
export function basculerChapeau(f) { const n = normFete(f); if (n.chapeau) n.porte = !n.porte; return n; }
// Confettis : bornés, réduits selon le palier de qualité adaptative (0 = plein … 5 = le plus léger), aucun si mouvement réduit
export const CONFETTI_MAX = 150;
export function nbConfettis(level = 0, reduceMotion = false) { if (reduceMotion) return 0; return [150, 150, 100, 100, 60, 60][Math.max(0, Math.min(5, level | 0))]; }
// Contrôleur partagé par main.js (et les tests d’interface) : modifie G.state.fete13, puis resynchronise la scène et sauvegarde
export function makeFeteControl({ on, getState, save, sync, confettis }) {
  return {
    on,
    reussir(id) { const s = getState(); s.fete13 = reussir(s.fete13, id); sync(); save(); },
    souffler() { const s = getState(); if (!pretASouffler(normFete(s.fete13))) return false; s.fete13 = souffler(s.fete13); confettis(); sync(); save(); return true; },
    basculer() { const s = getState(); s.fete13 = basculerChapeau(s.fete13); sync(); save(); },
  };
}
