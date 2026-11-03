// Générateurs seedés de secondaire 2 : GEN2[id](rng, d) → { prompt, answer, hints[3], data, figure?, table? }.
// Mêmes conventions que gen.js. Champs π : { value: coefficient de π, pi: true, places } (voir check.js).
import { F, add, sub, mul, div, fmt, fmtFrac, fmtDec, toNumber, gcd } from './frac.js';

const n = x => fmt(typeof x === 'number' ? F(x) : x);
const fr = x => fmtFrac(typeof x === 'number' ? F(x) : x);
const fq = (a, b) => fmtFrac(F(a, b));
const $ = cents => `${fmtDec(cents / 100, 2)} $`;
const val = v => (typeof v === 'number' ? F(v) : v);
const fields = (...fs) => ({ kind: 'num', fields: fs.map(f => ({ ...f, value: val(f.value) })) });
const one = (value, extra = {}) => fields({ value, ...extra });
function choice(rng, good, bads) {
  const uniq = [...new Set(bads.filter(b => b !== good))].slice(0, 3);
  const choices = rng.shuffle([good, ...uniq]);
  return { kind: 'choice', choices, correct: choices.indexOf(good) };
}
// 3x − 5, −x + 2, 4x
const lin = (k, b, v = 'x') => {
  const kx = k === 0 ? '' : k === 1 ? v : k === -1 ? `−${v}` : `${n(k)}${v}`;
  if (!kx) return n(b);
  return b === 0 ? kx : `${kx} ${b < 0 ? '−' : '+'} ${Math.abs(b)}`;
};
const co = k => (k === 1 ? '' : k === -1 ? '−' : n(k));
const sgn = x => (x < 0 ? `(${n(x)})` : n(x));
const PI_TXT = places => `Arrondis ${places === 1 ? 'au dixième' : 'au centième'} (π ≈ 3,14) ou réponds en fonction de π (ex. : 12π).`;
const piF = (coef, places, unit) => ({ value: coef, pi: true, places, unit });
const piT = c => { const a = Math.abs(c.n); return `${c.n < 0 ? '−' : ''}${a === 1 ? '' : a}π${c.d === 1 ? '' : `/${c.d}`}`; };
const PI_HINT = 'Tu peux garder π dans ta réponse : la touche π du pavé l’écrit pour toi.';

// Figure : deux parallèles coupées par une sécante ; phi = mesure de l’angle 2 (en haut à droite).
export function parallelsSVG(phi, mark = []) {
  const t = Math.tan(phi * Math.PI / 180), dx = 30 / t, Y = [45, 105], X = [120 + dx, 120 - dx];
  const ray = (cx, cy, a, r) => [cx + Math.cos(a * Math.PI / 180) * r, cy - Math.sin(a * Math.PI / 180) * r];
  const bis = [(180 + phi) / 2, phi / 2, 180 + phi / 2, (540 + phi) / 2];
  let s = `<svg viewBox="0 0 240 150" class="fig" role="img" aria-label="Deux droites parallèles coupées par une sécante, angles numérotés de 1 à 8">`;
  s += `<line x1="8" y1="45" x2="232" y2="45" /><line x1="8" y1="105" x2="232" y2="105" />`;
  const [ax, ay] = ray(120, 75, phi, 95), [bx, by] = ray(120, 75, phi + 180, 95);
  s += `<line class="sec" x1="${bx.toFixed(1)}" y1="${by.toFixed(1)}" x2="${ax.toFixed(1)}" y2="${ay.toFixed(1)}" />`;
  s += `<text class="par" x="226" y="40">›</text><text class="par" x="226" y="100">›</text>`;
  for (let k = 0; k < 8; k++) { const I = k < 4 ? 0 : 1, [x, y] = ray(X[I], Y[I], bis[k % 4], 15);
    s += `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" class="${mark.includes(k + 1) ? 'on' : ''}">${k + 1}</text>`; }
  return s + '</svg>';
}
// Angles 1 à 8 : 1 haut-gauche, 2 haut-droite, 3 bas-gauche, 4 bas-droite (en haut), 5 à 8 pareil (en bas).
export const ANGLE_GROUP = k => ([1, 4, 5, 8].includes(k) ? 'A' : 'B');
const PAIRS = {
  'correspondants': [[1, 5], [2, 6], [3, 7], [4, 8]],
  'alternes-internes': [[3, 6], [4, 5]],
  'alternes-externes': [[1, 8], [2, 7]],
  'opposés par le sommet': [[1, 4], [2, 3], [5, 8], [6, 7]],
};

const MAP_K = [500, 1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000];
const RATIOS = [[2, 1], [3, 1], [4, 1], [3, 2], [5, 2], [5, 4], [4, 3]];

export const GEN2 = {
  // ---------- Arithmétique : chaînes d’opérations sur les fractions
  qc_s2_ari_01(r, d) {
    const fx = () => { const b = r.int(2, 9); let a; do a = r.int(1, 2 * b - 1); while (a % b === 0); return [a, b]; };
    let [a, b] = fx(), [c, e] = fx();
    if (d === 0) {
      const v = div(F(a, b), F(c, e));
      return { prompt: `Calcule : ${fq(a, b)} ÷ ${fq(c, e)}`, answer: one(v, { frac: true }), data: { mode: 'div', a, b, c, d: e },
        hints: ['Diviser par une fraction, c’est multiplier par son inverse.', `L’inverse de ${fq(c, e)} est ${fq(e, c)}.`, `${fq(a, b)} × ${fq(e, c)} : multiplie les numérateurs entre eux et les dénominateurs entre eux, puis réduis.`] };
    }
    if (d === 1) {
      const [f, g] = fx(); const s = add(F(a, b), F(c, e)), v = mul(s, F(f, g));
      return { prompt: `Calcule : (${fq(a, b)} + ${fq(c, e)}) × ${fq(f, g)}`, answer: one(v, { frac: true }), data: { mode: 'addmul', a, b, c, d: e, f, g },
        hints: ['Les parenthèses d’abord : additionne les deux fractions.', `Dénominateur commun : ${fq(a, b)} + ${fq(c, e)} = ${fr(s)}.`, `Ensuite ${fr(s)} × ${fq(f, g)}, puis réduis.`] };
    }
    let q, f, g, guard = 0;
    do { [a, b] = fx(); [c, e] = fx(); q = div(F(a, b), F(c, e)); [f, g] = fx(); guard++; } while (toNumber(F(f, g)) > toNumber(q) && guard < 50);
    if (toNumber(F(f, g)) > toNumber(q)) { f = 1; g = q.d * 2; }
    const v = sub(q, F(f, g));
    return { prompt: `Calcule : ${fq(a, b)} ÷ ${fq(c, e)} − ${fq(f, g)}`, answer: one(v, { frac: true }), data: { mode: 'divsub', a, b, c, d: e, f, g },
      hints: ['Priorité des opérations : la division avant la soustraction.', `${fq(a, b)} ÷ ${fq(c, e)} = ${fq(a, b)} × ${fq(e, c)} = ${fr(q)}.`, `Ensuite ${fr(q)} − ${fq(f, g)} avec un dénominateur commun.`] };
  },

  // ---------- Pourcentages et taxes
  qc_s2_pro_01(r, d) {
    if (d === 0) {
      const p = r.pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 75]), W = r.int(1, 20) * 20, V = p * W / 100;
      const ctx = r.pick([
        [`Rosalie a déjà repeint ${p} % de la rampe du phare, soit ${V} m.`, 'Quelle est la longueur totale de la rampe ?', 'm'],
        [`Bernard a vendu ${p} % de ses mouches à pêche, soit ${V} mouches.`, 'Combien de mouches avait-il au départ ?', 'mouches'],
        [`${p} % des arbres du sentier sont des érables rouges, soit ${V} arbres.`, 'Combien d’arbres y a-t-il en tout ?', 'arbres'],
      ]);
      return { prompt: `${ctx[0]} ${ctx[1]}`, answer: one(W, { unit: ctx[2] }), data: { mode: 'whole', p, V },
        hints: [`${p} % du tout, c’est ${V}. Cherche le 100 %.`, `1 % du tout vaut ${n(F(V, p))}.`, `100 % = ${n(F(V, p))} × 100.`] };
    }
    if (d === 1) {
      const P = r.int(8, 120) * 100 + r.pick([0, 25, 49, 50, 75, 95, 99]);
      const tps = Math.round(P * 0.05), tvq = Math.round(P * 0.09975), T = P + tps + tvq;
      const item = r.pick(['une canne à pêche', 'un ciré jaune', 'une lanterne', 'un coffre à pêche', 'une paire de bottes de pluie']);
      return { prompt: `Au kiosque, ${item} coûte ${$(P)} avant taxes. Avec la TPS (5 %) et la TVQ (9,975 %), quel est le prix total ? (au cent près)`, answer: one(F(T, 100), { tol: 0.0101, unit: '$' }), data: { mode: 'tax', P },
        hints: ['Les deux taxes se calculent sur le prix avant taxes.', `TPS = 0,05 × ${$(P)} ≈ ${$(tps)} ; TVQ = 0,09975 × ${$(P)} ≈ ${$(tvq)}.`, `Total = ${$(P)} + ${$(tps)} + ${$(tvq)}.`] };
    }
    const up = r.chance(0.5), p = r.pick([10, 15, 20, 25, 30, 40, 50]), I = r.int(2, 30) * 20;
    const A = I * (100 + (up ? p : -p)) / 100;
    return { prompt: `Après ${up ? 'une hausse' : 'un rabais'} de ${p} %, un forfait de pêche coûte ${n(A)} $. Quel était son prix initial ?`, answer: one(I, { unit: '$' }), data: { mode: 'initial', up, p, A },
      hints: [`${up ? 'Une hausse' : 'Un rabais'} de ${p} %, c’est payer ${up ? 100 + p : 100 - p} % du prix initial.`, `Prix initial × ${n(F(up ? 100 + p : 100 - p, 100))} = ${n(A)}.`, `Divise : ${n(A)} ÷ ${n(F(up ? 100 + p : 100 - p, 100))}.`] };
  },

  // ---------- Proportion directe et inverse
  qc_s2_pro_02(r, d) {
    if (d === 0) {
      const a = r.int(1, 12), b = r.int(2, 12), k = r.int(2, 9), pos = r.int(0, 2);
      if (pos === 0) { const c = b * k; return { prompt: `Résous la proportion : ${a}/${b} = x/${c}`, answer: one(a * k), data: { mode: 'prop', pos, a, b, c },
        hints: ['Dans une proportion, les produits croisés sont égaux.', `${b} × x = ${a} × ${c}`, `x = ${a * c} ÷ ${b}`] }; }
      if (pos === 1) { const c = a * k; return { prompt: `Résous la proportion : ${a}/${b} = ${c}/x`, answer: one(b * k), data: { mode: 'prop', pos, a, b, c },
        hints: ['Dans une proportion, les produits croisés sont égaux.', `${a} × x = ${b} × ${c}`, `x = ${b * c} ÷ ${a}`] }; }
      const c = b * k; return { prompt: `Résous la proportion : x/${c} = ${a}/${b}`, answer: one(a * k), data: { mode: 'prop', pos: 0, a, b, c },
        hints: ['Dans une proportion, les produits croisés sont égaux.', `${b} × x = ${a} × ${c}`, `x = ${a * c} ÷ ${b}`] };
    }
    if (d === 1) {
      const n1 = r.int(2, 8), t1 = r.int(2, 12), K = n1 * t1; const dv = []; for (let x = 2; x <= K; x++) if (K % x === 0 && x !== n1) dv.push(x);
      const ok = r.pick(dv);
      const ctx = r.pick([['castors', 'construisent le barrage', 'h'], ['bénévoles', 'nettoient la plage', 'h'], ['rameurs', 'font avancer la chaloupe jusqu’à l’îlot', 'min']]);
      return { prompt: `${n1} ${ctx[0]} ${ctx[1]} en ${t1} ${ctx[2]}. Au même rythme, combien de temps prendront ${ok} ${ctx[0]} ?`, answer: one(F(K, ok), { unit: ctx[2] }), data: { mode: 'inv', n1, t1, n2: ok },
        hints: ['Plus il y a de monde, moins ça prend de temps : c’est une situation inverse.', `Le produit reste constant : ${n1} × ${t1} = ${K}.`, `Temps = ${K} ÷ ${ok}.`] };
    }
    const kind = r.pick(['directe', 'inverse', 'ni']); let xs, ys;
    if (kind === 'directe') { const k = r.int(2, 9); xs = r.shuffle([1, 2, 3, 4, 5, 6, 8, 10]).slice(0, 4).sort((a, b) => a - b); ys = xs.map(x => k * x); }
    else if (kind === 'inverse') { const K = r.pick([24, 36, 48, 60, 72, 120]); const dv = []; for (let i = 1; i <= K; i++) if (K % i === 0) dv.push(i); xs = r.shuffle(dv.slice(1, -1)).slice(0, 4).sort((a, b) => a - b); ys = xs.map(x => K / x); }
    else { const a = r.int(2, 6), b = r.int(1, 9); xs = r.shuffle([1, 2, 3, 4, 5, 6, 8]).slice(0, 4).sort((p, q) => p - q); ys = xs.map(x => a * x + b); }
    const good = kind === 'ni' ? 'ni l’une ni l’autre' : `proportionnelle ${kind}`;
    return { prompt: `Bernard note la distance (x) et ce qu’il a pêché (y). Quelle situation montre la table ? x : ${xs.join(' ; ')} — y : ${ys.join(' ; ')}`, table: [['x', ...xs], ['y', ...ys]],
      answer: choice(r, good, ['proportionnelle directe', 'proportionnelle inverse', 'ni l’une ni l’autre']), data: { mode: 'kind', xs, ys },
      hints: ['Directe : le quotient y ÷ x est toujours le même. Inverse : le produit x × y est toujours le même.', `Quotients : ${xs.map((x, i) => n(F(ys[i], x))).join(' ; ')}.`, `Produits : ${xs.map((x, i) => x * ys[i]).join(' ; ')}.`] };
  },

  // ---------- Échelle et figures semblables
  qc_s2_pro_03(r, d) {
    if (d === 0) {
      const k = r.pick(MAP_K), cm = r.int(2, 18) + (r.chance(0.3) ? 0.5 : 0); const cmF = F(Math.round(cm * 2), 2);
      const m = mul(cmF, F(k, 100)), km = toNumber(m) >= 1000;
      return { prompt: `Sur la carte de l’île (échelle 1 : ${n(k)}), le sentier du phare mesure ${n(cmF)} cm. Quelle est sa longueur réelle en ${km ? 'kilomètres' : 'mètres'} ?`, answer: one(km ? div(m, F(1000)) : m, { unit: km ? 'km' : 'm' }), data: { mode: 'map', k, cm: toNumber(cmF), km },
        hints: [`1 cm sur la carte = ${n(k)} cm en vrai.`, `${n(cmF)} × ${n(k)} = ${n(mul(cmF, F(k)))} cm.`, km ? `Puis ÷ 100 pour des m (${n(m)} m) et ÷ 1000 pour des km.` : `Puis ÷ 100 pour passer en mètres.`] };
    }
    const [kn, kd] = r.pick(RATIOS);
    if (d === 1) {
      const s = r.int(2, 12) * kd, L = s * kn / kd, big = r.chance(0.5);
      if (big) return { prompt: `Deux voiles semblables : le rapport de similitude (petite → grande) est ${fq(kn, kd)}. Un côté de la grande mesure ${n(L)} cm. Combien mesure le côté correspondant de la petite ?`, answer: one(s, { unit: 'cm' }), data: { mode: 'sim', kn, kd, L, big },
        hints: ['Grande = petite × rapport.', `Petite = grande ÷ ${fq(kn, kd)}.`, `${n(L)} × ${fq(kd, kn)} = ?`] };
      return { prompt: `Deux voiles semblables : le rapport de similitude (petite → grande) est ${fq(kn, kd)}. Un côté de la petite mesure ${s} cm. Combien mesure le côté correspondant de la grande ?`, answer: one(L, { unit: 'cm' }), data: { mode: 'sim', kn, kd, L: s, big },
        hints: ['Grande = petite × rapport.', `${s} × ${fq(kn, kd)}`, `${s} × ${kn} ÷ ${kd} = ?`] };
    }
    const A = r.int(2, 15) * kd * kd, k2 = F(kn * kn, kd * kd);
    return { prompt: `Rosalie agrandit le plan d’une fenêtre du phare selon un rapport de similitude de ${fq(kn, kd)}. L’aire de la petite fenêtre est ${A} cm². Quelle est l’aire de la grande ?`, answer: one(mul(F(A), k2), { unit: 'cm²' }), data: { mode: 'area', kn, kd, A },
      hints: ['Attention : les aires ne sont pas multipliées par k, mais par k².', `k² = (${fq(kn, kd)})² = ${fr(k2)}.`, `${A} × ${fr(k2)} = ?`] };
  },

  // ---------- Distributivité
  qc_s2_alg_01(r, d) {
    if (d === 0) {
      const a = r.pick([2, 3, 4, 5, 6, 7, -2, -3, -4, -5]), b = r.nz(-6, 6), c = r.nz(-9, 9);
      return { prompt: `Développe : ${n(a)}(${lin(b, c)}). Donne le coefficient de x et la constante.`, answer: fields({ value: a * b, label: 'Coefficient de x' }, { value: a * c, label: 'Constante' }), data: { mode: 'dev', a, b, c },
        hints: ['Multiplie le facteur devant la parenthèse par chaque terme.', `${sgn(a)} × ${b === 1 ? '' : sgn(b)}x et ${sgn(a)} × ${sgn(c)}.`, 'Attention aux signes : − × − = +.'] };
    }
    if (d === 1) {
      const a = r.int(2, 7); let cc = r.int(2, 6); if (cc >= a) cc++; const b = r.nz(-6, 6), e = r.nz(-6, 6);
      return { prompt: `Développe et réduis : ${a}(${lin(1, b)}) − ${cc}(${lin(1, e)}). Donne le coefficient de x et la constante.`, answer: fields({ value: a - cc, label: 'Coefficient de x' }, { value: a * b - cc * e, label: 'Constante' }), data: { mode: 'devsub', a, b, c: cc, d: e },
        hints: ['Développe chaque parenthèse séparément.', `Le − devant ${cc}( ) change le signe de chaque terme : −${cc}x ${-cc * e < 0 ? '−' : '+'} ${Math.abs(cc * e)}.`, 'Regroupe les x ensemble, puis les nombres ensemble.'] };
    }
    const a = r.pick([2, 3, 4, 5, -2, -3]), b = r.int(2, 5), c = r.nz(-7, 7); let e; do e = r.nz(-6, 6); while (Math.abs(a * b + e) <= 1);
    const K = a * b + e, B = a * c;
    const good = lin(K, B);
    const bads = [lin(K, c), lin(a * b, B + e), lin(b + e, B), lin(K, -B), lin(a + b + e, B)].filter(s => s !== good);
    return { prompt: `Quelle est la forme réduite de ${n(a)}(${lin(b, c)}) ${e < 0 ? '−' : '+'} ${Math.abs(e) === 1 ? '' : Math.abs(e)}x ?`, answer: choice(r, good, bads), data: { mode: 'reduce', a, b, c, e },
      hints: ['D’abord la distributivité, ensuite les termes semblables.', `${n(a)}(${lin(b, c)}) = ${lin(a * b, a * c)}.`, `${n(a * b)}x ${e < 0 ? '−' : '+'} ${co(Math.abs(e))}x = ${co(K)}x.`] };
  },

  // ---------- Mise en évidence simple
  qc_s2_alg_04(r, d) {
    const coprime = () => { let p, q; do { p = r.int(1, 7); q = r.nz(-9, 9); } while (gcd(p, Math.abs(q)) !== 1); return [p, q]; };
    if (d === 0) {
      const g = r.int(2, 9), [p, q] = coprime();
      return { prompt: `Mets en évidence le plus grand facteur commun : ${lin(g * p, g * q)} = ▢(${lin(p, q)}). Quel nombre va dans la case ?`, answer: one(g), data: { mode: 'gcf', A: g * p, B: g * q },
        hints: ['Cherche le plus grand nombre qui divise les deux coefficients.', `Diviseurs communs de ${g * p} et ${Math.abs(g * q)} ?`, `Vérifie : ▢ × ${p === 1 ? '' : p}x doit donner ${g * p}x.`] };
    }
    if (d === 1) {
      const a = r.int(11, 49), b = r.int(11, 89), S = r.pick([100, 100, 1000, 10]); const c = S - b > 0 ? S - b : 100 - b; const T = b + c;
      return { prompt: `Calcule mentalement avec une mise en évidence : ${a} × ${b} + ${a} × ${c}`, answer: one(a * T), data: { mode: 'mental', a, b, c },
        hints: [`${a} est un facteur commun aux deux produits.`, `${a} × ${b} + ${a} × ${c} = ${a} × (${b} + ${c}).`, `${a} × ${T} = ?`] };
    }
    const g = r.int(2, 6), [p, q] = coprime();
    return { prompt: `Mets en évidence le plus grand facteur commun : ${n(g * p)}x² ${g * q < 0 ? '−' : '+'} ${Math.abs(g * q)}x = ▢x(▢x + ▢). Remplis les trois cases.`, answer: fields({ value: g, label: 'Devant x(…)' }, { value: p, label: 'Coefficient de x' }, { value: q, label: 'Constante' }), data: { mode: 'gcfx', A: g * p, B: g * q },
      hints: ['Les deux termes contiennent x : on peut mettre x en évidence.', `Plus grand diviseur commun de ${g * p} et ${Math.abs(g * q)} ?`, `Divise chaque terme par ce facteur × x, puis vérifie en redistribuant.`] };
  },

  // ---------- Équations (inconnue des deux côtés)
  qc_s2_alg_02(r, d) {
    const x = r.int(-9, 12);
    if (d === 0) {
      let a = r.int(2, 9), c = r.int(1, 8); if (c === a) c = a - 1 || a + 1; const b = r.nz(-15, 15), dd = a * x + b - c * x;
      return { prompt: `Résous : ${lin(a, b)} = ${lin(c, dd)}`, answer: one(x, { label: 'x =' }), data: { mode: 'eq', a, b, c, d: dd },
        hints: ['Ramène les termes en x du même côté.', `${a}x − ${c === 1 ? '' : c}x = ${n(dd)} ${b < 0 ? '+' : '−'} ${Math.abs(b)}`, `${co(a - c)}x = ${n(dd - b)}, donc x = ${n(dd - b)} ÷ ${sgn(a - c)}.`] };
    }
    if (d === 1) {
      const h = r.int(2, 12), r1 = r.int(2, 8), r2 = r1 + r.int(1, 6), f2 = r.int(0, 10), f1 = f2 + (r2 - r1) * h;
      return { prompt: `Location de kayak : chez Bernard, ${f1} $ plus ${r1} $ l’heure ; au camping, ${f2 ? `${f2} $ plus ` : ''}${r2} $ l’heure. Après combien d’heures les deux coûtent-ils pareil ?`, answer: one(h, { unit: 'h' }), data: { mode: 'tarif', f1, r1, f2, r2 },
        hints: ['Écris une expression pour chaque prix, avec x heures.', `${lin(r1, f1)} = ${lin(r2, f2)}`, `${f1 - f2} = ${co(r2 - r1)}x`] };
    }
    const a = r.int(2, 6), b = r.nz(-6, 6); let c = r.nz(-5, 9); if (c === a) c = a + 2; const dd = a * (x + b) - c * x;
    return { prompt: `Résous : ${a}(${lin(1, b)}) = ${lin(c, dd)}`, answer: one(x, { label: 'x =' }), data: { mode: 'par', a, b, c, d: dd },
      hints: ['Commence par développer la parenthèse.', `${lin(a * 1, a * b)} = ${lin(c, dd)}`, `${co(a - c)}x = ${n(dd - a * b)}`] };
  },

  // ---------- Table de valeurs et règle
  qc_s2_alg_03(r, d) {
    const a = r.nz(-5, 8), b = r.int(-10, 20);
    if (d === 0) {
      const xs = [0, 1, 2, 3], ys = xs.map(x => a * x + b), N = r.int(7, 25);
      return { prompt: `Le phare compte ses marches. Dans la table, quelle est la valeur de y quand x = ${N} ? x : ${xs.join(' ; ')} — y : ${ys.map(n).join(' ; ')}`, table: [['x', ...xs], ['y', ...ys.map(n)]], answer: one(a * N + b, { label: 'y =' }), data: { mode: 'val', xs, ys, N },
        hints: ['Regarde de combien y change quand x augmente de 1.', `y change de ${n(a)} à chaque pas ; quand x = 0, y = ${n(b)}.`, `y = ${lin(a, b)} ; remplace x par ${N}.`] };
    }
    if (d === 1) {
      const x0 = r.int(1, 4), xs = [x0, x0 + 1, x0 + 2, x0 + 3], ys = xs.map(x => a * x + b);
      return { prompt: `Trouve la règle y = ax + b de cette table. x : ${xs.join(' ; ')} — y : ${ys.map(n).join(' ; ')}`, table: [['x', ...xs], ['y', ...ys.map(n)]], answer: fields({ value: a, label: 'a' }, { value: b, label: 'b' }), data: { mode: 'rule', xs, ys },
        hints: ['a = variation de y ÷ variation de x.', `a = (${n(ys[1])} − ${sgn(ys[0])}) ÷ 1 = ${n(a)}.`, `b = y − ax avec un point : ${n(ys[0])} − ${sgn(a)} × ${x0}.`] };
    }
    const xs = r.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 4).sort((p, q) => p - q), ys = xs.map(x => a * x + b);
    const dx = xs[1] - xs[0], dy = ys[1] - ys[0];
    const R = (k, c) => `y = ${lin(k, c)}`;
    const good = R(a, b), bads = [R(dy, ys[0] - dy * xs[0]), R(a, ys[0]), R(a + 1, b - xs[0]), R(-a, b), R(a, b + a)].filter(s => s !== good);
    return { prompt: `Quelle règle correspond à cette table ? x : ${xs.join(' ; ')} — y : ${ys.map(n).join(' ; ')}`, table: [['x', ...xs], ['y', ...ys.map(n)]], answer: choice(r, good, bads), data: { mode: 'choose', xs, ys },
      hints: ['Attention : les x ne se suivent pas un par un.', `De x = ${xs[0]} à x = ${xs[1]}, x change de ${dx} et y change de ${n(dy)}.`, `a = ${n(dy)} ÷ ${dx} ; vérifie ta règle avec tous les points.`] };
  },

  // ---------- Aire du disque, du secteur, longueur d’arc (π)
  qc_s2_geo_01(r, d) {
    const R = r.int(2, 15);
    if (d === 0) {
      const dia = r.chance(0.4);
      return { prompt: `La lentille ronde du phare a ${dia ? `un diamètre de ${2 * R}` : `un rayon de ${R}`} cm. Quelle est son aire ? ${PI_TXT(2)}`, answer: fields(piF(R * R, 2, 'cm²')), data: { mode: 'disk', r: R, pi: true },
        hints: ['Aire du disque : A = π × r².', dia ? `Le rayon est la moitié du diamètre : r = ${R} cm.` : `r² = ${R} × ${R} = ${R * R}.`, `A = ${R * R}π ≈ ${R * R} × 3,14. ${PI_HINT}`] };
    }
    const deg = r.pick([30, 40, 45, 60, 72, 90, 120, 135, 150, 180, 210, 240, 270, 300]);
    if (d === 1) {
      const c = F(deg * R * R, 360);
      return { prompt: `Le faisceau du phare balaie un secteur de ${deg}° sur ${R} m de rayon. Quelle est l’aire de ce secteur ? ${PI_TXT(1)}`, answer: fields(piF(c, 1, 'm²')), data: { mode: 'sector', r: R, deg, pi: true },
        hints: [`Un secteur de ${deg}°, c’est ${fq(deg, 360)} du disque.`, `Aire du disque = π × ${R}² = ${R * R}π.`, `${fq(deg, 360)} × ${R * R}π = ${piT(c)}.`] };
    }
    const c = F(deg * 2 * R, 360);
    return { prompt: `Un sentier en arc de cercle fait ${deg}° autour d’un étang de ${R} m de rayon. Quelle est la longueur de l’arc ? ${PI_TXT(2)}`, answer: fields(piF(c, 2, 'm')), data: { mode: 'arc', r: R, deg, pi: true },
      hints: ['Circonférence : C = 2πr.', `C = 2 × ${R} × π = ${2 * R}π ; l’arc en est ${fq(deg, 360)}.`, `${fq(deg, 360)} × ${2 * R}π = ${piT(c)}.`] };
  },

  // ---------- Aire des solides
  qc_s2_geo_02(r, d) {
    if (d === 0) {
      const L = r.int(2, 12), l = r.int(2, 10), h = r.int(2, 9);
      return { prompt: `Bernard peint toutes les faces d’un coffre à pêche (prisme rectangulaire) de ${L} dm × ${l} dm × ${h} dm. Quelle est l’aire totale à peindre ?`, answer: fields({ value: 2 * (L * l + L * h + l * h), unit: 'dm²' }), data: { mode: 'prism', L, l, h },
        hints: ['Un prisme rectangulaire a 6 faces, en 3 paires identiques.', `Les paires : ${L} × ${l}, ${L} × ${h} et ${l} × ${h}.`, `A = 2 × (${L * l} + ${L * h} + ${l * h}).`] };
    }
    const R = r.int(1, 9), h = r.int(2, 15);
    if (d === 1) return { prompt: `La tour du phare est un cylindre de ${R} m de rayon et ${h} m de haut. Quelle est son aire latérale (le mur à repeindre) ? ${PI_TXT(2)}`, answer: fields(piF(2 * R * h, 2, 'm²')), data: { mode: 'cylL', r: R, h, pi: true },
      hints: ['Déroulé, le mur d’un cylindre est un rectangle.', `Largeur = circonférence = 2π × ${R} ; hauteur = ${h}.`, `Aire latérale = 2πrh = ${2 * R * h}π.`] };
    if (r.chance(0.5)) return { prompt: `Une boîte à appâts cylindrique a un rayon de ${R} cm et une hauteur de ${h} cm. Quelle est son aire totale (avec les deux couvercles) ? ${PI_TXT(2)}`, answer: fields(piF(2 * R * R + 2 * R * h, 2, 'cm²')), data: { mode: 'cylT', r: R, h, pi: true },
      hints: ['Aire totale = 2 disques + la paroi.', `2 disques : 2 × π × ${R}² = ${2 * R * R}π ; paroi : 2π × ${R} × ${h} = ${2 * R * h}π.`, `Total = ${2 * R * R + 2 * R * h}π.`] };
    const c = r.int(2, 12), a = r.int(c, 20);
    return { prompt: `Le toit d’un cabanon est une pyramide droite à base carrée de ${c} m de côté ; l’apothème mesure ${a} m. Quelle est l’aire totale de la pyramide (base comprise) ?`, answer: fields({ value: c * c + 2 * c * a, unit: 'm²' }), data: { mode: 'pyr', c, a },
      hints: ['Aire totale = base + 4 triangles.', `Base : ${c} × ${c} = ${c * c} ; un triangle : ${c} × ${a} ÷ 2.`, `Total = ${c * c} + 4 × ${n(F(c * a, 2))}.`] };
  },

  // ---------- Angles et parallèles (figure)
  qc_s2_geo_03(r, d) {
    const phi = r.pick([35, 40, 50, 55, 60, 65, 70, 115, 120, 125, 130, 140]);
    if (d === 0) {
      const names = Object.keys(PAIRS), name = r.pick(names), [i, j] = r.pick(PAIRS[name]);
      return { prompt: `Les droites horizontales sont parallèles. Comment appelle-t-on les angles ${i} et ${j} ?`, figure: parallelsSVG(phi, [i, j]), answer: choice(r, name, names), data: { mode: 'pair', i, j, phi },
        hints: ['Repère où sont les angles : à la même intersection ou pas ? entre les parallèles (internes) ou dehors (externes) ?', 'Alternes : de part et d’autre de la sécante. Correspondants : même position aux deux intersections.', 'Opposés par le sommet : face à face au même point.'] };
    }
    const k = r.int(1, 8); let m = r.int(1, 8); if (m === k) m = (k % 8) + 1;
    const theta2 = phi, mes = q => (ANGLE_GROUP(q) === 'B' ? theta2 : 180 - theta2);
    if (d === 1) {
      const same = ANGLE_GROUP(k) === ANGLE_GROUP(m);
      return { prompt: `Les droites horizontales sont parallèles. L’angle ${k} mesure ${mes(k)}°. Combien mesure l’angle ${m} ?`, figure: parallelsSVG(phi, [k, m]), answer: one(mes(m), { unit: '°' }), data: { mode: 'value', k, m, v: mes(k), phi },
        hints: ['Avec deux parallèles, il n’y a que deux mesures : un angle aigu et un angle obtus.', 'Deux angles adjacents sur une droite sont supplémentaires (somme 180°).', same ? `Les angles ${k} et ${m} sont isométriques.` : `Les angles ${k} et ${m} sont supplémentaires : 180° − ${mes(k)}°.`] };
    }
    const x = r.int(5, 30), same = ANGLE_GROUP(k) === ANGLE_GROUP(m), a = r.int(2, 5); let c = r.int(1, 4); if (same && c === a) c = a + 1;
    const vk = mes(k), vm = mes(m), b = vk - a * x, e = vm - c * x;
    return { prompt: `Les droites horizontales sont parallèles. L’angle ${k} mesure (${lin(a, b)})° et l’angle ${m} mesure (${lin(c, e)})°. Trouve x.`, figure: parallelsSVG(phi, [k, m]), answer: one(x, { label: 'x =' }), data: { mode: 'alg', k, m, a, b, c, e, phi },
      hints: [same ? `Les angles ${k} et ${m} sont isométriques : écris une équation avec =.` : `Les angles ${k} et ${m} sont supplémentaires : leur somme vaut 180°.`, same ? `${lin(a, b)} = ${lin(c, e)}` : `${lin(a, b)} + ${lin(c, e)} = 180`, 'Isole x, puis vérifie avec la figure.'] };
  },

  // ---------- Tirages avec ou sans remise
  qc_s2_prb_01(r, d) {
    const R = r.int(2, 7), B = r.int(2, 7), N = R + B;
    const ctx = r.pick([['mouches dorées', 'vers de terre'], ['billes rouges', 'billes bleues'], ['jetons verts', 'jetons blancs']]);
    const intro = `Dans la chaudière du kiosque de Bernard, il y a ${R} ${ctx[0]} et ${B} ${ctx[1]}.`;
    if (d === 0) return { prompt: `${intro} On en pige une, on la remet, puis on en pige une autre. Quelle est la probabilité de piger deux ${ctx[0]} ?`, answer: one(F(R * R, N * N), { frac: true }), data: { mode: 'avec', R, B, ev: 'RR' },
      hints: ['Avec remise, le 2e tirage est pareil au 1er.', `P(1re) = ${fq(R, N)} et P(2e) = ${fq(R, N)}.`, `Multiplie : ${fq(R, N)} × ${fq(R, N)}.`] };
    if (d === 1) return { prompt: `${intro} On en pige une, on la garde, puis on en pige une autre. Quelle est la probabilité de piger deux ${ctx[0]} ?`, answer: one(F(R * (R - 1), N * (N - 1)), { frac: true }), data: { mode: 'sans', R, B, ev: 'RR' },
      hints: ['Sans remise, il en reste une de moins pour le 2e tirage.', `P(1re) = ${fq(R, N)} ; ensuite il reste ${R - 1} ${ctx[0]} sur ${N - 1}.`, `Multiplie : ${R}/${N} × ${R - 1}/${N - 1}.`] };
    if (r.chance(0.5)) return { prompt: `${intro} On en pige deux, l’une après l’autre, sans remise. Quelle est la probabilité d’obtenir une de chaque sorte ?`, answer: one(F(2 * R * B, N * (N - 1)), { frac: true }), data: { mode: 'sans', R, B, ev: 'RB' },
      hints: ['Deux chemins possibles : la 1re d’une sorte puis l’autre, ou l’inverse.', `${R}/${N} × ${B}/${N - 1} + ${B}/${N} × ${R}/${N - 1}`, 'Additionne les deux chemins, puis réduis.'] };
    return { prompt: `${intro} On pige deux fois avec remise. Quelle est la probabilité d’obtenir au moins une des ${ctx[0]} ?`, answer: one(sub(F(1), F(B * B, N * N)), { frac: true }), data: { mode: 'avec', R, B, ev: 'atleast' },
      hints: ['« Au moins une », c’est le contraire de « aucune ».', `P(aucune) = ${fq(B, N)} × ${fq(B, N)}.`, `P(au moins une) = 1 − ${fq(B * B, N * N)}.`] };
  },
};
