// Tests de la progression, du magasin et de la sauvegarde.
import { TOOLS, nextUpgrade, recordAnswer, isUnlocked, warmupFor, stats, defiChoices, DEFI_SKILLS, MASTERY } from '../js/progression.js';
import { CATALOG, quote, checkTotal } from '../js/shop.js';
import { newState, load, save, reset, KEY } from '../js/save.js';
import { SKILLS, EDGES } from '../js/math/skills.js';
import { makeRng } from '../js/math/rng.js';

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
  reset(); ok('reset', !(KEY in mem));
  delete globalThis.localStorage;
}
