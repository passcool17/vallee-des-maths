// Magasin général de Thérèse : catalogue, devis avec rabais et taxes, vérification du total.
import { parseAnswer } from './math/check.js';
import { toNumber, fmtDec } from './math/frac.js';
import { makeRng, hashSeed } from './math/rng.js';

export const TPS = 0.05, TVQ = 0.09975;
export const RABAIS = [10, 15, 20, 25, 30, 50];
export const CATALOG = [
  { id: 'nichoir', nom: 'Nichoir', prixCents: 1250, kind: 'decor', desc: 'Pour les mésanges de l’île.' },
  { id: 'lupins', nom: 'Massif de lupins', prixCents: 950, kind: 'decor', desc: 'Mauve, rose, blanc : la totale.' },
  { id: 'lanterne', nom: 'Lanterne', prixCents: 1800, kind: 'decor', desc: 'Éclaire les soirées au quai.' },
  { id: 'banc', nom: 'Banc de parc', prixCents: 2400, kind: 'decor', desc: 'Pour jaser avec les voisins.' },
  { id: 'feu', nom: 'Feu de camp', prixCents: 3000, kind: 'decor', desc: 'Guimauves non incluses.' },
  { id: 'adirondack', nom: 'Chaise Adirondack', prixCents: 4500, kind: 'decor', desc: 'La chaise de chalet par excellence.' },
  { id: 'pont_bleuets', nom: 'Pont de la Pointe-aux-Bleuets', prixCents: 6000, kind: 'bridge', zone: 'bleuets', desc: 'Ouvre l’îlot de l’est.' },
  { id: 'pont_erables', nom: 'Pont de la Colline des Érables', prixCents: 9000, kind: 'bridge', zone: 'erables', desc: 'Ouvre la colline du nord.' },
];
// Ce que Thérèse rachète (en cents)
export const SELL = {
  perchaude: 150, achigan: 250, dore: 400, truite: 500, omble: 700, maskinonge: 1000, esturgeon: 1500,
  gros_dore: 900, saumon: 1400, bar: 2000,
meunier: 350, crapet: 450, brochet: 550,
ouananiche: 850, touladi: 1050, anguille: 1250,
laquaiche: 600, coregone: 750, barbotte: 900,
marigane: 1300, omble_ch: 1600, esturgeon_n: 1900,
  tire: 300, sirop: 600, coulee: 1200,
  barquette: 400, confiture: 800, confiture_mamie: 1400,
  monarque: 200, amiral: 250, lune: 600,
  capsule: 50, bouton: 100, cle: 300, pepite: 800, trilobite: 1500,
  cocotte: 75, coquillage: 125,
};
export const $ = cents => `${fmtDec(cents / 100, 2)} $`;
const r2 = x => Math.round(x + 1e-9);

export function quote(item, rng) {
  const rabais = rng.chance(0.65) ? rng.pick(RABAIS) : 0;
  const prixCents = item.prixCents;
  const baseCents = r2(prixCents * (100 - rabais) / 100);
  const tpsCents = r2(baseCents * TPS), tvqCents = r2(baseCents * TVQ);
  const totalCents = baseCents + tpsCents + tvqCents;
  const altTotalCents = r2(baseCents * (1 + TPS + TVQ));
  const hints = [
    rabais ? `Calcule d’abord le rabais : ${rabais} % de ${$(prixCents)}, puis enlève-le du prix.` : 'Pas de rabais aujourd’hui : on part du prix affiché.',
    `Les taxes se calculent sur le prix${rabais ? ' après rabais' : ''} (${$(baseCents)}) : TPS = 5 %, TVQ = 9,975 %.`,
    `TPS ≈ ${$(tpsCents)} et TVQ ≈ ${$(tvqCents)}. Additionne tout !`,
  ];
  return { item, prixCents, rabais, baseCents, tpsCents, tvqCents, totalCents, altTotalCents, hints };
}
// Devis mémorisé : le même rabais reste affiché jusqu’à l’achat ou jusqu’au jour suivant.
export function quoteFor(state, item) {
  const memo = state.quotes[item.id];
  let n;
  if (memo && memo.day === state.day) n = memo.n;
  else { state.exCount = (state.exCount || 0) + 1; n = state.exCount; state.quotes[item.id] = { day: state.day, n }; }
  return quote(item, makeRng(hashSeed('magasin', state.seed, n)));
}
export const forgetQuote = (state, item) => { delete state.quotes[item.id]; };

// Accepte l’arrondi taxe par taxe ou l’arrondi global ; le « $ » et la virgule sont tolérés.
export function checkTotal(input, q) {
  const v = parseAnswer(input); if (!v) return { ok: false, msg: 'Écris un montant, par exemple 14,37.' };
  const cents = Math.round(toNumber(v) * 100);
  if (Math.abs(toNumber(v) * 100 - cents) > 1e-6) return { ok: false, msg: 'Un montant d’argent a au plus deux décimales.' };
  if (cents === q.totalCents || cents === q.altTotalCents) return { ok: true };
  if (cents === q.baseCents) return { ok: false, msg: 'Tu as oublié les taxes !' };
  if (q.rabais && cents === q.prixCents + q.tpsCents + q.tvqCents) return { ok: false, msg: 'Et le rabais ?' };
  if (q.rabais && Math.abs(cents - r2(q.prixCents * 1.14975)) <= 1) return { ok: false, msg: 'N’oublie pas le rabais avant les taxes.' };
  return { ok: false, msg: 'Pas tout à fait… recompte avec les indices.' };
}
