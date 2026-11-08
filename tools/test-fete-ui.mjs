// Parcours d’interface de la fête avec les vraies fonctions de ui.js, flows.js et fete.js, dans un DOM simulé (tools/fakedom.mjs).
// Limites : pas de navigateur, pas de rendu ni de CSS ; le routage clavier reproduit celui de input.js + main.js
// (champ de saisie focalisé → comportement natif ; sinon flows.handleKey) ; l’Espace natif d’une case est simulé par click().
import { installDom, visible } from './fakedom.mjs';
const doc = installDom();
const { makeUI } = await import('../js/ui.js');
const { makeFlows } = await import('../js/flows.js');
const { newState } = await import('../js/save.js');
const { makeFeteControl } = await import('../js/fete.js');
let pass = 0, fail = 0; const ok = (n, c, x = '') => { if (c) pass++; else { fail++; console.log('FAIL', n, x); } };

function monde() {
  const state = newState(5), ui = makeUI(); let saves = 0, syncs = 0, conf = 0;
  const G = { state, ui, audio: { sfx() {}, sons: false }, save: () => saves++, animaux: { jour: () => [], wear() {} } };
  G.fete = makeFeteControl({ on: true, getState: () => G.state, save: () => G.save(), sync: () => syncs++, confettis: () => conf++ });
  const F = makeFlows(G);
  return { G, F, ui, state, n: () => ({ saves, syncs, conf }) };
}
const panel = () => doc.getElementById('panel');
// Routage clavier comme input.js/main.js : une case ou un champ focalisé garde son comportement natif
function key(F, code, k = '') {
  const a = doc.activeElement;
  if (a && /INPUT|TEXTAREA/.test(a.tagName)) { const e = a.dispatch('keydown', { code, key: k }); if (!e.defaultPrevented && code === 'Space' && a.type === 'checkbox') a.click(); return 'natif'; }
  return F.handleKey({ code, key: k, shiftKey: false, preventDefault() {} });
}
const tape = (F, s) => { for (const c of s) key(F, c === '/' ? 'Slash' : `Digit${c}`, c); };
const btn = txt => panel().querySelectorAll('button').find(b => b.textContent.includes(txt));
const villageois = id => ({ id, talkTo() {}, nextLine: () => 'Salut!' });

// 1) Les 3 défis au clavier physique, depuis le vrai dialogue
for (const [id, rep] of [['gaston', '5'], ['therese', '9/13'], ['hortense', '52']]) {
  const { F, state } = monde();
  F.talk(villageois(id)); const b = btn('Défi de fête');
  ok(`${id} : option en premier`, b && b.classList.contains('primary'));
  b.click();
  const fin = btn('Continuer');
  ok(`${id} : Continuer masqué au départ`, fin && !visible(fin));
  tape(F, rep); key(F, 'Enter');
  ok(`${id} : Entrée valide ${rep}`, state.fete13.defis[id] === true, JSON.stringify(state.fete13.defis));
  ok(`${id} : Continuer visible`, visible(btn('Continuer')));
  key(F, 'Enter');
  ok(`${id} : Entrée → Continuer ferme`, panel().classList.contains('hidden'));
}
// 2) Pavé tactile, erreurs, indice, voir la réponse
{
  const { F, state } = monde();
  F.feteDefi('therese');
  const pad = k => panel().querySelectorAll('button').find(b => b.getAttribute('data-k') === k).dispatch('pointerdown');
  pad('4'); pad('/'); pad('1'); pad('3'); pad('✓');
  ok('pavé : faux 4/13 → encouragement', panel().textContent.includes('Presque! Essaie encore.') && !state.fete13.defis.therese);
  ok('pavé : Continuer toujours masqué', !visible(btn('Continuer')));
  key(F, 'Enter'); // champ vide : ne doit ni valider ni cliquer le Continuer caché
  ok('Entrée sur champ vide : défi encore ouvert', !panel().classList.contains('hidden') && !state.fete13.defis.therese);
  pad('1'); pad('✓');
  ok('2e erreur → indice', panel().textContent.includes('Indice'));
  pad('2'); pad('✓');
  const voir = btn('Voir la réponse'); ok('3e erreur → Voir la réponse', visible(voir));
  voir.click(); ok('voir la réponse allume quand même', state.fete13.defis.therese && visible(btn('Continuer')));
  ok('aucune statistique ni argent', Object.keys(state.stats).length === 0 && state.money === newState(5).money && state.exCount === 0);
  pad('9'); // le pavé est caché après réussite : rien ne casse
  ok('pavé masqué après réussite', !visible(panel().querySelector('.numpad')));
}
// 3) Échap annule sans rien changer
{
  const { F, state } = monde();
  F.feteDefi('hortense'); tape(F, '52'); key(F, 'Escape');
  ok('Échap ferme', panel().classList.contains('hidden') && !state.fete13.defis.hortense);
}
// 4) Bouton focalisé : Entrée active CE bouton, pas le premier « primary »
{
  const { F } = monde();
  F.talk(villageois('gaston')); btn('À plus tard').focus(); key(F, 'Enter');
  ok('Entrée sur le bouton focalisé « À plus tard »', panel().classList.contains('hidden'));
}
// 5) Gâteau : bougies restantes, puis souffle et message
{
  const { F, state, n } = monde();
  F.feteGateau(); ok('gâteau : défis restants nommés', panel().textContent.includes('Gaston (5)') && panel().textContent.includes('Hortense (4)'));
  key(F, 'Enter'); ok('Entrée → D’accord', panel().classList.contains('hidden'));
  for (const id of ['gaston', 'therese', 'hortense']) state.fete13.defis[id] = true;
  F.feteGateau();
  ok('souffle → message, chapeau, confettis', panel().textContent.includes('Bonne fête Camille! 13 ans, 13 bougies : bravo! Charlie a un cadeau pour toi.') && state.fete13.souffle && state.fete13.chapeau && state.fete13.porte && n().conf === 1);
}
// 6) Case du chapeau dans le carnet : contrôle natif, Espace et Entrée, focus rendu
{
  const { F, state } = monde();
  state.fete13 = { defis: { gaston: true, therese: true, hortense: true }, souffle: true, chapeau: true, porte: true };
  F.carnet();
  let cb = panel().querySelector('input[data-chapeau]');
  ok('case native', cb && cb.type === 'checkbox' && cb.checked && cb.getAttribute('tabindex') !== '-1');
  cb.focus(); key(F, 'Space');
  cb = panel().querySelector('input[data-chapeau]');
  ok('Espace enlève le chapeau', state.fete13.porte === false && cb && !cb.checked);
  ok('focus rendu à la case après le nouveau rendu', doc.activeElement === cb);
  key(F, 'Enter');
  cb = panel().querySelector('input[data-chapeau]');
  ok('Entrée remet le chapeau', state.fete13.porte === true && cb.checked && doc.activeElement === cb);
  ok('Entrée sur la case n’active pas un autre bouton', !panel().classList.contains('hidden'));
}
// 7) Sans chapeau gagné : pas de case
{ const { F } = monde(); F.carnet(); ok('pas de case sans chapeau', !panel().querySelector('input[data-chapeau]')); }
console.log(`${pass} PASS, ${fail} FAIL`);
if (fail) process.exit(1);
