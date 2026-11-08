// Tests Node purs de la fête de Camille (aucun navigateur).
import * as F from '../js/fete.js';
import { newState, normalize } from '../js/save.js';
let pass = 0, fail = 0; const ok = (n, c, x = '') => { if (c) pass++; else { fail++; console.log('FAIL', n, x); } };
const D = s => new Date(s);
// Activation
ok('8 nov. midi Toronto', F.feteActive(D('2026-11-08T17:00:00Z')));
ok('8 nov. 00 h 01 Toronto', F.feteActive(D('2026-11-08T05:01:00Z')));
ok('8 nov. 23 h 59 Toronto = 9 nov. 04 h 59 UTC', F.feteActive(D('2026-11-09T04:59:00Z')));
ok('9 nov. 00 h 00 Toronto', !F.feteActive(D('2026-11-09T05:00:00Z')));
ok('7 nov. 23 h 59 Toronto', !F.feteActive(D('2026-11-08T04:59:00Z')));
ok('lien un autre jour', F.feteActive(D('2027-03-01T12:00:00Z'), '?fete=camille13'));
ok('autre valeur', !F.feteActive(D('2027-03-01T12:00:00Z'), '?fete=autre'));
ok('autres paramètres', F.feteActive(D('2027-03-01T12:00:00Z'), '?seed=3&fete=camille13&debug=1'));
// Défis
ok('13 bougies 5+4+4', F.TOTAL_BOUGIES === 13 && F.DEFIS.map(d => d.bougies).join() === '5,4,4');
ok('PNJ', F.DEFI_IDS.join() === 'gaston,therese,hortense');
for (const [id, good, bad] of [['gaston', ['5', ' 5 '], ['4', '', '13', '5/1']], ['therese', ['9/13', '9 / 13'], ['4/13', '18/26', '0,69', '9']], ['hortense', ['52'], ['51', '17', '52/1']]]) {
  for (const g of good) ok(`${id} bon ${g}`, F.verifier(id, g));
  for (const b of bad) ok(`${id} faux ${b}`, !F.verifier(id, b));
}
ok('id inconnu', !F.verifier('lise', '5'));
ok('échelle erreurs', [1, 2, 3, 7].map(F.etapeErreur).join() === 'encore,indice,reponse,reponse');
ok('message exact', F.MESSAGE === 'Bonne fête Camille! 13 ans, 13 bougies : bravo! Charlie a un cadeau pour toi.');
const textes = [F.MESSAGE, F.BANNIERE, ...F.DEFIS.flatMap(d => [d.q, d.indice, d.explication])].join(' ');
ok('pas d’année ni de nom de famille', !/\b(19|20)\d\d\b/.test(textes) && !/maman|papa|soeur|sœur|frère|grand/i.test(textes));
// Progression et sauvegarde
let f = F.feteDefaut();
ok('0 bougie', F.bougies(f) === 0 && !F.pretASouffler(f));
f = F.reussir(f, 'gaston'); ok('5 bougies', F.bougies(f) === 5);
ok('souffler trop tôt ne fait rien', !F.souffler(f).souffle);
f = F.reussir(F.reussir(f, 'hortense'), 'therese'); ok('13 bougies', F.bougies(f) === 13 && F.pretASouffler(f));
f = F.souffler(f); ok('soufflé → chapeau porté', f.souffle && f.chapeau && f.porte && !F.pretASouffler(f));
f = F.basculerChapeau(f); ok('enlever chapeau', f.chapeau && !f.porte);
ok('remettre chapeau', F.basculerChapeau(f).porte);
ok('basculer sans chapeau', !F.basculerChapeau(F.feteDefaut()).porte);
// normFete : règles 1 à 4
ok('absent → défaut', JSON.stringify(F.normFete(undefined)) === JSON.stringify(F.feteDefaut()));
ok('corrompu → défaut', JSON.stringify(F.normFete('x')) === JSON.stringify(F.feteDefaut()) && JSON.stringify(F.normFete([1])) === JSON.stringify(F.feteDefaut()));
ok('non booléens → false', F.normFete({ defis: { gaston: 1, therese: 'true' }, porte: 1 }).defis.gaston === false);
ok('règle 2', F.normFete({ defis: { gaston: true }, souffle: true }).souffle === false);
const r3 = F.normFete({ defis: { gaston: true, therese: true, hortense: true }, souffle: true });
ok('règle 3', r3.souffle && r3.chapeau && r3.porte === false);
ok('règle 4', F.normFete({ chapeau: false, porte: true }).porte === false);
ok('clés inconnues retirées', !('lise' in F.normFete({ defis: { lise: true } }).defis));
// Confettis
ok('confettis bornés', [-3, 0, 2, 5, 99].every(l => F.nbConfettis(l) <= 150) && F.nbConfettis(5) < F.nbConfettis(0));
ok('mouvement réduit', F.nbConfettis(2, true) === 0);
// Sauvegarde : invariants
ok('nouvelle partie', JSON.stringify(newState(4).fete13) === JSON.stringify(F.feteDefaut()));
const strip = s => { const c = { ...s }; delete c.fete13; return JSON.stringify(c); };
const v5 = normalize({ ...newState(7), money: 98765, bridges: { bleuets: true, erables: false }, rods: { petite: true, moyenne: true, grosse: false }, tools: { canne: 2, arrosoir: 1, filet: 0, pelle: 3, sac: 1 }, stats: { a: { n: 4, ok: 3, h: '1101' } }, island: 2, ferry: true }, 7);
const sans = { ...v5 }; delete sans.fete13;
ok('v5 : avec ≡ sans fete13 hors fete13', strip(normalize(v5, 7)) === strip(normalize(sans, 7)));
ok('v5 : fete13 corrompu ne touche rien d’autre', strip(normalize({ ...v5, fete13: 'zz' }, 7)) === strip(v5));
ok('v5 : fete13 corrompu → défaut', JSON.stringify(normalize({ ...v5, fete13: 'zz' }, 7).fete13) === JSON.stringify(F.feteDefaut()));
const avance = { defis: { gaston: true, therese: false, hortense: true }, souffle: false, chapeau: false, porte: false };
ok('reprise 2/3', JSON.stringify(normalize({ ...v5, fete13: avance }, 7).fete13) === JSON.stringify(avance));
ok('charger→sauver idempotent', JSON.stringify(normalize(JSON.parse(JSON.stringify(v5)), 7)) === JSON.stringify(v5));
ok('argent, ponts, cannes, outils, île', v5.money === 98765 && v5.bridges.bleuets && v5.rods.moyenne && v5.tools.pelle === 3 && v5.island === 2);
for (const v of [1, 2, 3, 4]) {
  const old = { v, seed: 11, money: 4321 + v, tools: { canne: 1 }, mastery: { qc_s1_ari_01: { ok: 3, tries: 4 } }, bridges: { erables: true } };
  const n = normalize(old, 11);
  ok(`v${v} → fete13 défaut, argent intact`, JSON.stringify(n.fete13) === JSON.stringify(F.feteDefaut()) && n.money === 4321 + v && n.bridges.erables && n.tools.canne === 1);
}
console.log(`${pass} PASS, ${fail} FAIL`);
if (fail) process.exit(1);
