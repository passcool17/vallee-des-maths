// Animaux en jeu : branche la logique pure (animaux.js) sur les animaux 3D (pets.js), la sauvegarde et l’interface.
import { QUETES, COLLIERS, CACHETTES, LOOT_NOMS, FETCH_MAX, canFetch, noteFetch, pickLoot, pieceCents, questsDuJour, startQuest, abandonQuest, finishQuest, pickSpot, chaleur, rollDay } from './animaux.js';
import { lootMesh } from './pets.js';
import { ITEMS } from './flows.js';

export function makeCompagnons({ G, state, scene, pets, rng, ui, audio, earn, bagAdd, emote, W, player }) {
  const A = () => state.animaux;
  let drop = null, auto = 45 + rng.next() * 40, hudTxt = null;
  const hud = document.getElementById('quete');
  pets.setCollar(COLLIERS[A().collier][0]);
  pets.setOlga(A().olga);
  if (A().quete) pets.hideFor(A().quete, A().spot[0], A().spot[1]);

  pets.on.drop = (x, z, k) => {
    const m = lootMesh(k); m.position.set(x, 0.07, z); scene.add(m); drop = { x, z, k, m, isle: state.island };
    emote(pets.charlie, 1.05); audio.sfx('woof');
    ui.toast(`🐶 Charlie te rapporte ${LOOT_NOMS[k]} Ramasse-la!`);
  };
  pets.on.meow = () => audio.sfx('miaou');
  pets.on.bark = () => audio.sfx('woof');

  // Cachettes praticables de l’île 1, loin des villageois et de la maison des chats
  const validSpots = () => CACHETTES.filter(([x, z]) => W().walkable(x, z, state) && W().walkable(x - 0.1, z - 0.45, state) && (G.allVillagers || []).every(v => v.isle !== 1 || Math.hypot(v.pos.x - x, v.pos.z - z) > 3) && (state.island !== 1 || W().interactables.every(it => Math.hypot(it.pos.x - x, it.pos.z - z) > (it.r || 2) + 2)) && Math.hypot(x - 7, z - 4) > 5);

  // « Va chercher! » — manuel (en flattant Charlie) ou spontané, quelques fois par journée
  function fetch(manual) {
    if (drop || pets.fetching) return false;
    if (!canFetch(A(), state.day, G.time)) { if (manual && A().fetchN >= FETCH_MAX) ui.toast('🐶 Charlie est fatigué : il a assez couru pour aujourd’hui. Demain!'); return false; }
    const c = pets.charlie.pos;
    for (let i = 0; i < 10; i++) { const a = rng.next() * Math.PI * 2, d = 4.5 + rng.next() * 2.5, x = c.x + Math.sin(a) * d, z = c.z + Math.cos(a) * d;
      if (!W().walkable(x, z, state)) continue;
      const k = pickLoot(rng); noteFetch(A(), G.time); pets.fetch(x, z, k);
      if (manual) ui.toast('🐶 « Va chercher, Charlie! » Il part en courant…');
      return true; }
    return false;
  }
  function pickup() {
    if (!drop) return; const { k, x, z } = drop;
    if (k === 'piece') { const c = pieceCents(rng); earn(c, x, z); ui.gain(c); ui.toast('🪙 Merci Charlie! Une pièce toute baveuse.'); }
    else { if (!bagAdd(k)) return; state.journal.finds++; audio.sfx('catch'); ui.toast(`${ITEMS[k][0]} Dans ton sac : ${ITEMS[k][1]}!`, k === 'trilobite' || k === 'pepite' ? 'gold' : ''); }
    scene.remove(drop.m); drop = null; G.save();
  }
  function start(id) {
    if (state.island !== 1) return false;
    const spot = pickSpot(validSpots(), state.day, id, state.seed);
    if (!startQuest(A(), id, state.day, spot)) return false;
    pets.hideFor(id, spot[0], spot[1]); ui.toast(`🐾 Quête : ${QUETES[id].nom}. ${QUETES[id].indice}`); G.save(); return true;
  }
  function abandon() { abandonQuest(A()); pets.unhide(true); G.save(); }
  function trouver() {
    const id = A().quete; if (!id) return null; const [x, z] = A().spot;
    const r = finishQuest(A(), state.day); pets.unhide(false);
    emote({ pos: { x, z } }, 1.0); audio.sfx(id === 'balle' ? 'woof' : 'purr'); audio.sfx('up');
    earn(r.cents, x, z); ui.gain(r.cents);
    ui.toast(`🎉 ${QUETES[id].bravo}`, 'gold');
    if (r.collier) { pets.setCollar(COLLIERS[r.collier][0]); ui.toast(`🎀 Nouveau collier pour Charlie : ${COLLIERS[r.collier][1]}!`, 'gold'); }
    G.save(); return r;
  }
  function wear(c) { if (!A().colliers.includes(c)) return false; A().collier = c; pets.setCollar(COLLIERS[c][0]); G.save(); return true; }
  // Cibles pour nearest()/onTap : la trouvaille au sol, la cachette de la quête
  function targets() {
    const out = [];
    if (drop && drop.isle === state.island) out.push({ kind: 'fetch', label: `Ramasser ${LOOT_NOMS[drop.k].replace(/!$/, '')}`, pos: { x: drop.x, z: drop.z }, r: 1.6 });
    if (A().quete && state.island === 1) { const [x, z] = A().spot, q = QUETES[A().quete];
      out.push({ kind: 'quete', label: A().quete === 'balle' ? 'Prendre la balle de Charlie!' : `Trouver ${q.chat === 'olga' ? 'Olga' : 'Gisèle'}!`, pos: { x, z }, r: 1.9 }); }
    return out;
  }
  function line() {
    const id = A().quete; if (!id) return '';
    const [x, z] = A().spot, d = state.island === 1 ? Math.hypot(player.pos.x - x, player.pos.z - z) : 99;
    return `🐾 ${QUETES[id].nom} · ${state.island === 1 ? chaleur(d) : 'sur l’île 1'}`;
  }
  return {
    fetch, pickup, start, abandon, trouver, wear, targets, line,
    get drop() { return drop && { x: drop.x, z: drop.z, k: drop.k }; },
    jour: () => { rollDay(A(), state.day); return questsDuJour(A(), state.day, state.seed); },
    tick(dt, idle) {
      if (idle && !drop && !pets.fetching && !A().quete) { auto -= dt; if (auto <= 0) { auto = 70 + rng.next() * 60; fetch(false); } }
      A().olga = pets.olgaPos();
      const t = line(); if (t !== hudTxt && hud) { hudTxt = t; hud.textContent = t; hud.classList.toggle('hidden', !t); }
    },
  };
}
