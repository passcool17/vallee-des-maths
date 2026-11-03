// Tests de la progression, du magasin et de la sauvegarde.
import { TOOLS, nextUpgrade, recordAnswer, isUnlocked, warmupFor, stats, defiChoices, DEFI_SKILLS, MASTERY } from '../js/progression.js';
import { CATALOG, quote, checkTotal } from '../js/shop.js';
import { newState, load, save, reset, KEY } from '../js/save.js';
import { SKILLS, EDGES } from '../js/math/skills.js';
import { makeRng } from '../js/math/rng.js';
import { quoteFor, forgetQuote, SELL } from '../js/shop.js';
import { pickQuestion, rareBiteChance, loot, timeFor, makeTimer, FRACTION_SKILLS, RARE_FISH, SIROP } from '../js/actionq.js';
import { makeExercise } from '../js/math/gen.js';

export function run(ok) {
  // Graphe sans cycle, toutes les compétences atteignables en maîtrisant dans l’ordre
  const st = newState(1); const done = new Set(); let guard = 0;
  while (done.size < SKILLS.length && guard++ < 50) for (const s of SKILLS) if (!done.has(s.id) && isUnlocked(st, s.id)) { st.mastery[s.id] = { ok: MASTERY, tries: 3, miss: 0 }; done.add(s.id); }
  ok('toutes les compétences atteignables', done.size === 22, done.size);
  ok('arêtes valides', EDGES.every(e => SKILLS.some(s => s.id === e.skill) && SKILLS.some(s => s.id === e.prereq)));
  ok('15 + 7 compétences', TOOLS.flatMap(t => t.skills).length === 15 && DEFI_SKILLS.length === 7);
  // Au départ, le niveau 1 des 5 outils est débloqué
  const s0 = newState(2);
  ok('niv 1 débloqués', TOOLS.every(t => nextUpgrade(s0, t.id).unlocked), TOOLS.map(t => nextUpgrade(s0, t.id).skill).join());
  // 3 bonnes réponses → amélioration
  let r; for (let i = 0; i < 3; i++) r = recordAnswer(s0, 'qc_s1_ari_01', true, { tool: 'canne' });
  ok('canne niv 1', s0.tools.canne === 1 && r.upgraded?.level === 1 && r.mastered);
  ok('canne niv 2 débloqué (ari_02 ← ari_01)', nextUpgrade(s0, 'canne').unlocked);
  ok('canne niv 3 bloqué tant que ari_02 pas maîtrisé', !isUnlocked(s0, 'qc_s1_pro_01'));
  // 2 erreurs → réchauffement sur un préalable ; « presque » ne compte pas
  recordAnswer(s0, 'qc_s1_ari_02', false, { tool: 'canne' }); recordAnswer(s0, 'qc_s1_ari_02', false, { near: true });
  r = recordAnswer(s0, 'qc_s1_ari_02', false, { tool: 'canne' });
  ok('réchauffement après 2 erreurs', r.warmup?.skill === 'qc_s1_ari_01', JSON.stringify(r.warmup));
  ok('réchauffement racine = même compétence', warmupFor('qc_s1_geo_01').skill === 'qc_s1_geo_01');
  ok('réchauffement faible', warmupFor('qc_s1_alg_01').skill === 'qc_s1_ari_01');
  ok('pas de pénalité', s0.tools.canne === 1 && s0.money === 2500);
  ok('stats croissantes', stats('sac', 0).cap === 4 && stats('sac', 3).cap === 20 && stats('canne', 3).window > stats('canne', 0).window);
  ok('défis proposés', defiChoices(s0).length > 0 && defiChoices(s0).every(id => isUnlocked(s0, id)));
  // Magasin
  const fixed = (rabais) => ({ chance: () => rabais > 0, pick: () => rabais });
  const q1 = quote({ prixCents: 2400 }, fixed(0));
  ok('24,00 $ → 27,59 $', q1.totalCents === 2759 && q1.tpsCents === 120 && q1.tvqCents === 239, JSON.stringify(q1));
  const q2 = quote({ prixCents: 12000 }, fixed(25));
  ok('120 $ −25 % → 103,48 $', q2.totalCents === 10348 && q2.baseCents === 9000, JSON.stringify(q2));
  ok('total accepté (virgule, point, $)', checkTotal('27,59', q1).ok && checkTotal('27.59', q1).ok && checkTotal('27,59 $', q1).ok);
  ok('oubli des taxes détecté', /taxes/.test(checkTotal('24', q1).msg));
  ok('mauvais total refusé', !checkTotal('27,60', q1).ok);
  const rng = makeRng(5); let allOk = true;
  for (let i = 0; i < 500; i++) { const it = CATALOG[i % CATALOG.length], q = quote(it, rng); const s = (q.totalCents / 100).toFixed(2).replace('.', ',');
    if (!checkTotal(s, q).ok || !checkTotal((q.altTotalCents / 100).toFixed(2), q).ok || Math.abs(q.totalCents - q.altTotalCents) > 1) allOk = false; }
  ok('500 devis cohérents', allOk);
  ok('nichoir abordable au départ', quote(CATALOG[0], fixed(0)).totalCents <= 2500);
  // Sauvegarde
  const mem = {}; globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; }, removeItem: k => { delete mem[k]; } };
  const s1 = newState(9); s1.money = 1234; s1.tools.sac = 2; save(s1);
  const l1 = load(); ok('sauvegarde/chargement', l1.money === 1234 && l1.tools.sac === 2 && l1.seed === 9);
  mem[KEY] = '{pas du json'; ok('sauvegarde corrompue → neuve', load(3).money === 2500);
  mem[KEY] = JSON.stringify({ v: 1, seed: 4, money: 10 }); const l2 = load(); ok('vieille sauvegarde complétée', l2.tools.canne === 0 && l2.bridges.erables === false && l2.money === 10);
  // Sauvegarde de l’étape 1 (forme réelle v1) → normalisée pour l’étape 2
  const v1 = { v: 1, seed: 77, money: 4321, tools: { canne: 2, arrosoir: 1, filet: 0, pelle: 0, sac: 1 }, upg: { canne: 1 }, mastery: { qc_s1_ari_01: { ok: 3, tries: 4, miss: 0 } }, bag: ['perchaude', 'esturgeon'], decor: ['nichoir'], bridges: { erables: true, plage: false },
    pos: { x: 3, z: 7 }, clock: 0.4, exCount: 12, muted: true, met: { intro: 1, gaston: 2 }, journal: { fish: 5, bugs: 1, finds: 2, coins: 900, flowers: 3 } };
  mem[KEY] = JSON.stringify(v1); const l3 = load();
  ok('sauvegarde v1 chargée sans perte', l3.money === 4321 && l3.tools.canne === 2 && l3.bag.length === 2 && l3.decor[0] === 'nichoir' && l3.bridges.erables && l3.mastery.qc_s1_ari_01.ok === 3 && l3.journal.fish === 5 && l3.exCount === 12 && l3.muted);
  ok('sauvegarde v1 normalisée', l3.v === 2 && l3.journal.rare === 0 && l3.journal.sirop === 0 && JSON.stringify(l3.rares) === '{}' && JSON.stringify(l3.quotes) === '{}' && l3.day === 0);
  mem[KEY] = JSON.stringify({ ...v1, rares: null, quotes: [], bag: 'x' }); const l4 = load(); ok('champs abîmés réparés', JSON.stringify(l4.rares) === '{}' && JSON.stringify(l4.quotes) === '{}' && Array.isArray(l4.bag));
  save(l3); ok('v2 relue', load().v === 2 && load().money === 4321);
  reset(); ok('reset', !(KEY in mem));
  delete globalThis.localStorage;

  // Devis mémorisé (rabais qui ne change plus en rouvrant l’article)
  { const st = newState(11), it = CATALOG[1]; const a = quoteFor(st, it), b = quoteFor(st, it);
    ok('même devis en rouvrant', a.rabais === b.rabais && a.totalCents === b.totalCents && st.exCount === 1);
    let changed = false; for (let i = 0; i < 20 && !changed; i++) { forgetQuote(st, it); const c = quoteFor(st, it); if (c.rabais !== a.rabais) changed = true; }
    ok('nouveau devis après achat', changed);
    const st2 = newState(12); const d0 = quoteFor(st2, it); let dayChange = false;
    for (let i = 0; i < 20 && !dayChange; i++) { st2.day++; if (quoteFor(st2, it).rabais !== d0.rabais) dayChange = true; }
    ok('nouveau devis le lendemain', dayChange);
    ok('devis par article', (quoteFor(st2, CATALOG[0]), Object.keys(st2.quotes).length === 2)); }

  // Questions en action
  ok('touche rare ≈ 1 sur 4, mieux avec la canne', rareBiteChance(0) === 0.25 && rareBiteChance(3) > rareBiteChance(2) && rareBiteChance(2) > rareBiteChance(1) && rareBiteChance(1) > 0.25 && rareBiteChance(3) <= 0.41);
  ok('butin selon la difficulté', loot('fish', 0) === 'omble' && loot('fish', 2) === 'esturgeon' && loot('maple', 1) === 'sirop' && [...RARE_FISH, ...SIROP].every(k => SELL[k] > 0));
  ok('plus difficile = plus payant', SELL[RARE_FISH[0]] < SELL[RARE_FISH[1]] && SELL[RARE_FISH[1]] < SELL[RARE_FISH[2]] && SELL[SIROP[0]] < SELL[SIROP[1]] && SELL[SIROP[1]] < SELL[SIROP[2]] && SELL.omble > SELL.truite);
  { const st = newState(13), r = makeRng(1); let fishOpen = 0, stretch = 0, maple = 0, mapleBad = 0, dmax = 0; const N = 2000;
    for (let i = 0; i < N; i++) { const q = pickQuestion(st, 'fish', r); if (q.stretch) { stretch++; if (q.d !== 0) dmax = 9; } else { fishOpen += isUnlocked(st, q.skill) ? 1 : 0; dmax = Math.max(dmax, q.d); }
      const m = pickQuestion(st, 'maple', r); maple++; if (!FRACTION_SKILLS.includes(m.skill)) mapleBad++; }
    ok('pêche : surtout des compétences débloquées', fishOpen === N - stretch && stretch > N * 0.1 && stretch < N * 0.2, `${stretch}`);
    ok('érable : toujours des fractions', mapleBad === 0);
    ok('débutant : basique ou standard (petit coup de pouce)', dmax <= 1);
    st.mastery.qc_s1_ari_03 = { ok: 3, tries: 3, miss: 0 }; st.mastery.qc_s1_ari_04 = { ok: 3, tries: 3, miss: 0 }; st.mastery.qc_s1_ari_05 = { ok: 3, tries: 3, miss: 0 }; st.mastery.qc_s1_ari_06 = { ok: 3, tries: 3, miss: 0 };
    let adv = 0; for (let i = 0; i < 200; i++) if (pickQuestion(st, 'maple', r).d === 2) adv++;
    ok('fractions maîtrisées → avancé', adv === 200); }
  { const ex0 = makeExercise('qc_s1_ari_01', 's', 0), ex2 = makeExercise('qc_s1_ari_04', 's', 2);
    const t0 = timeFor(ex0), t2 = timeFor(ex2), ts = timeFor(ex0, { stretch: true });
    ok('chrono généreux 20–35 s', t0 >= 20 && t0 <= 25 && t2 >= 30 && t2 <= 35 && ts === t0 + 5, `${t0} ${t2} ${ts}`);
    const tm = makeTimer(20); tm.tick(5); ok('chrono avance seulement quand on le fait avancer', tm.left === 15 && !tm.done);
    ok('chrono fini', tm.tick(30) === true && tm.done && tm.left === 0 && tm.tick(1) === false); }
}
