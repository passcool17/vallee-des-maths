// Vallée des Maths — boucle de jeu, actions (secouer, pêcher, arroser, creuser, attraper), caméra, sauvegarde.
import * as THREE from '../vendor/three.module.min.js';
import { buildWorld, curve, curveDrop, phaseOf, TIME_NOMS, PLACES, DOCK, FERRY, updateLabels, mesh, at } from './world.js';
import { buildIsland2 } from './island2.js';
import * as J from './joli.js';
import { makePlayer } from './player.js';
import { makeVie } from './vie.js';
import { makePets, heart } from './pets.js';
import { makeCompagnons } from './compagnons.js';
import { makeVillagers, NOMS } from './villagers.js';
import { makeInput } from './input.js';
import { makeUI, fmtMoney } from './ui.js';
import { makeFlows, ITEMS } from './flows.js';
import { makeAudio } from './audio.js';
import { makeSons } from './sons.js';
import { stats, canFerry } from './progression.js';
import { rareBiteChance, pickQuestion, MAPLE_CHANCE, BERRY_CHANCE, useBait } from './actionq.js';
import { SELL } from './shop.js';
import { load, save, reset, newState } from './save.js';
import { makeRng } from './math/rng.js';

const params = new URLSearchParams(location.search);
if (params.has('fresh')) reset();
const seedParam = params.has('seed') ? parseInt(params.get('seed'), 10) : undefined;
const state = params.has('fresh') ? newState(seedParam ?? 20260) : load(seedParam);
const fixedTime = params.has('time') ? { matin: 0.125, midi: 0.375, doree: 0.625, nuit: 0.875 }[params.get('time')] ?? parseFloat(params.get('time')) : null;
if (fixedTime != null) state.clock = fixedTime;
if (params.has('traversier')) state.ferry = true; // QA : force l’ouverture du traversier
const DAY = 480; // secondes réelles par journée

const canvas = document.getElementById('c');
const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
document.body.classList.toggle('touch', touch);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !touch, powerPreference: 'high-performance' });
renderer.setPixelRatio(J.DPR); J.setupRenderer(renderer);
const scene = new THREE.Scene(); J.setScene(scene);
const camera = new THREE.PerspectiveCamera(J.CAM.fov, 1, 0.5, 900);
const rng = makeRng(state.seed ^ 0xbeef);

const ui = makeUI(), audio = makeAudio(); audio.setMuted(!!state.muted); audio.setSons(state.sons !== false);
const G = { state, time: 0, paused: false, night: 0, phase: 'matin', ui, audio, save: () => { state.pos = { x: +player.pos.x.toFixed(2), z: +player.pos.z.toFixed(2) }; save(state); } };
const world = buildWorld(scene, G); G.world = world;
J.addGrass(world.root, { cx: 0, cz: 0, r: 30, color: '#ffffff', ground: '#6cb946', count: 2600, ok: (x, z) => world.walkable(x, z, { bridges: {} }) && !Object.values(PLACES).some(([px, pz]) => Math.hypot(px - x, pz - z) < 3.2) && Math.abs(x - (6 * ((z + 10) / 36) ** 2 - 0.5)) > 1.6 });
for (const id of state.decor) world.placeDecor(id);
for (const [z, open] of Object.entries(state.bridges)) if (open) world.openBridge(z);
// ---------- Deux îles : une seule est dans la scène à la fois (l’autre est cachée, l’île 2 est construite au premier passage)
const allVillagers = makeVillagers(world.root, ['gaston', 'ginette', 'flocon', 'hortense', 'lionel', 'lise']); G.allVillagers = allVillagers;
function zoneFolkOk(v) { return (v.id !== 'lionel' || state.bridges.erables) && (v.id !== 'lise' || state.bridges.bleuets); }
function zoneItOk(it) { return !((it.kind === 'sap' && !state.bridges.erables) || (it.kind === 'berry' && !state.bridges.bleuets)); }
function syncZoneFolk() {
  for (const v of allVillagers) {
    if (v.id === 'lionel') v.obj.visible = !!state.bridges.erables;
    else if (v.id === 'lise') v.obj.visible = !!state.bridges.bleuets;
  }
}
const _openBridge = world.openBridge;
world.openBridge = zone => { _openBridge(zone); syncZoneFolk(); };
syncZoneFolk();
let isle2 = null;
function ensureIsle2() { if (isle2) return isle2; isle2 = buildIsland2(scene, G); G.isle2 = isle2; allVillagers.push(...makeVillagers(isle2.root, ['rosalie', 'bernard'])); J.addGrass(isle2.root, { cx: 0, cz: 0, r: 30, color: '#ffffff', ground: '#6fae58', count: 2400, ok: (x, z) => isle2.walkable(x, z, state) }); J.dress(isle2.root); return isle2; }
if (state.island === 2) ensureIsle2();
const W = () => state.island === 2 && isle2 ? isle2 : world; G.W = W;
let villagers = [];
function showIsland() { world.root.visible = state.island !== 2; if (isle2) isle2.root.visible = state.island === 2; villagers = allVillagers.filter(v => v.isle === (state.island === 2 ? 2 : 1)); G.villagers = villagers; }
showIsland();
const start = W().walkable(state.pos.x, state.pos.z, state) ? state.pos : state.island === 2 ? { x: FERRY.arrive[0], z: FERRY.arrive[1] } : { x: 2, z: 6 };
const player = makePlayer(scene, start); G.player = player;
const pets = makePets(scene, world, G); G.pets = pets; const sons = makeSons(audio, G); G.sons = sons; pets.regroup(player); J.dress(scene);
const vie = J.ON ? makeVie(scene, world, G, W) : null; G.vie = vie; // nuit, eau vivante, lucioles, lanternes, feuilles (seulement avec « joli »)
const flows = makeFlows(G); G.flows = flows;
const walkableFn = (x, z) => W().walkable(x, z, state) && !villagers.some(v => Math.hypot(x - v.pos.x, z - v.pos.z) < 0.75);

// Outil tenu en main selon l’action
const held = {
  canne: (() => { const g = new THREE.Group(); const r = mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.8, 5), '#7a5236'); r.position.set(0, 0.6, 0.5); r.rotation.x = 1.0; g.add(r); return g; })(),
  filet: (() => { const g = new THREE.Group(); const r = mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.2, 5), '#b88a5c'); r.position.set(0, 0.3, 0.35); r.rotation.x = 1.0; g.add(r); const n = mesh(new THREE.TorusGeometry(0.25, 0.03, 4, 10), '#f3efe6'); n.position.set(0, 0.62, 0.86); g.add(n); return g; })(),
  arrosoir: (() => { const g = new THREE.Group(); g.add(at(mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.35, 8), '#4d8fcc'), 0, 0, 0.1)); const s = mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.4, 5), '#4d8fcc'); s.position.set(0, 0.05, 0.38); s.rotation.x = 1.1; g.add(s); return g; })(),
  pelle: (() => { const g = new THREE.Group(); g.add(at(mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 5), '#b88a5c'), 0, 0.1, 0.1)); g.add(at(mesh(new THREE.BoxGeometry(0.22, 0.28, 0.04), '#9aa3ad'), 0, -0.5, 0.1)); return g; })(),
};
function hold(id, s = 1.2) { player.tool.clear(); if (id && held[id]) player.tool.add(held[id]); clearTimeout(hold.t); if (id && s) hold.t = setTimeout(() => player.tool.clear(), s * 1000); }

// ---------- Effets : pièces qui jaillissent
const fx = [];
const coinGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.05, 10);
function burst(x, z, n = 5, color = '#f2c230', y0 = 2.2) {
  for (let i = 0; i < n; i++) { const m = mesh(coinGeo, color, { emissive: 0x553300 }); m.rotation.x = Math.PI / 2; m.position.set(x, y0, z); scene.add(m);
    fx.push({ m, vx: (Math.random() - 0.5) * 3, vy: 3 + Math.random() * 2, vz: (Math.random() - 0.5) * 3, t: 0.9 }); }
}
const hearts = [];
function updateFx(dt) {
  for (let i = hearts.length - 1; i >= 0; i--) { const h = hearts[i]; h.t -= dt; h.m.position.y += dt * 0.7; h.m.quaternion.copy(camera.quaternion); h.m.scale.setScalar(Math.min(1, (1.3 - h.t) * 6) * Math.min(1, h.t * 3) + 0.001); if (h.t <= 0) { scene.remove(h.m); hearts.splice(i, 1); } } for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t -= dt; f.vy -= 12 * dt; f.m.position.x += f.vx * dt; f.m.position.y += f.vy * dt; f.m.position.z += f.vz * dt; f.m.rotation.z += dt * 10; if (f.t <= 0 || f.m.position.y < -0.2) { scene.remove(f.m); fx.splice(i, 1); } } }

const bagCap = () => stats('sac', state.tools.sac).cap;
const bagAdd = key => { if (state.bag.length >= bagCap()) { ui.toast('🎒 Ton sac est plein! Va vendre chez Ginette (magasin général).'); return false; } state.bag.push(key); return true; };
const earn = (cents, x, z) => { state.money += cents; state.journal.coins += cents; burst(x, z, Math.min(8, 2 + Math.round(cents / 50))); audio.sfx('coin'); };
// Butin d’une question en action : dans le sac, ou payé tout de suite si le sac est plein
// Animaux : Charlie qui rapporte, quêtes « Trouve Olga »… (petit cœur = émote)
const emote = (a, y = 0.9) => hearts.push({ m: heart(scene, a.pos.x, y, a.pos.z), t: 1.3 });
const comp = makeCompagnons({ G, state, scene, pets, rng, ui, audio, earn, bagAdd, emote, W: () => W(), player }); G.animaux = comp;
G.grant = key => { if (state.bag.length < bagCap()) { state.bag.push(key); return { bag: true }; } const c = SELL[key] || 0; earn(c, player.pos.x, player.pos.z); return { coins: c }; };
// Forçage pour les tests : __mv.force = { rare: true|false, maple: true|false, sap: true|false, berry: true|false, q: { skill, d, stretch } }
const force = {};
const question = kind => force.q ? { stretch: false, ...force.q } : pickQuestion(state, kind, rng, state.island === 2 ? 2 : 1);

// ---------- Pêche
const fishing = { state: null, t: 0, rare: false };
function weighted(table) { const tot = table.reduce((a, [, w]) => a + w, 0); let r = rng.next() * tot; for (const [k, w] of table) { if ((r -= w) < 0) return k; } return table[0][0]; }
function startFishing() {
  const s = stats('canne', state.tools.canne); fishing.state = 'wait'; fishing.t = s.wait[0] + rng.next() * (s.wait[1] - s.wait[0]);
  const f = W().fishSpot; player.teleport(f.x, f.z); player.face(f.fx, f.fz); hold('canne', 0); W().bobber.visible = true; audio.sfx('splash');
  fishing.bait = useBait(state);
  ui.toast(fishing.bait ? `🪱 Appât rare de Bernard accroché! Un gros poisson s’en vient… (il t’en reste ${state.appats})` : '🎣 Attends que ça morde… pis appuie au bon moment!');
}
function stopFishing() { fishing.state = null; fishing.rare = false; fishing.bait = false; W().bobber.visible = false; player.tool.clear(); }
function fishTick(dt) {
  if (!fishing.state) return;
  const f = W().fishSpot;
  if (Math.hypot(player.pos.x - f.x, player.pos.z - f.z) > 1.2) { stopFishing(); return; }
  fishing.t -= dt; const b = W().bobber;
  b.position.y = -0.45 + Math.sin(G.time * 3) * 0.04 - (fishing.state === 'bite' ? 0.18 + Math.sin(G.time * 30) * 0.05 : 0);
  if (fishing.rare && fishing.state === 'bite') b.position.y -= 0.12 + Math.sin(G.time * 18) * 0.06; // ça cale fort
  if (fishing.state === 'wait' && fishing.t <= 0) {
    fishing.rare = 'rare' in force ? force.rare : fishing.bait || rng.chance(rareBiteChance(state.tools.canne)); delete force.rare;
    fishing.state = 'bite'; fishing.t = stats('canne', state.tools.canne).window + (fishing.rare ? 0.5 : 0); audio.sfx('bite');
    if (fishing.rare) setTimeout(() => audio.sfx('bite'), 160);
  }
  else if (fishing.state === 'bite' && fishing.t <= 0) { ui.toast('💨 Il s’est sauvé… Réessaie!'); stopFishing(); }
}
function reel() {
  const s = stats('canne', state.tools.canne);
  if (fishing.state === 'wait') { ui.toast('Trop tôt! Attends que le bouchon cale.'); stopFishing(); return; }
  const lvl = state.tools.canne;
  if (fishing.rare) { stopFishing(); audio.sfx('catch'); flows.actionQ({ kind: 'fish', ...question('fish') }); return; }
  const kind = state.island === 2 ? weighted([['truite', 40], ['achigan', 25], ['dore', 20 + lvl * 4], ['perchaude', 15]]) : weighted([['perchaude', 50], ['achigan', 30], ['dore', 12 + lvl * 4], ['truite', 4 + lvl * 5]]);
  stopFishing(); if (!bagAdd(kind)) return;
  state.journal.fish++; audio.sfx('catch'); ui.toast(`${ITEMS[kind][0]} Une belle prise : ${ITEMS[kind][1]}!`); G.save();
}

// ---------- Interactions
function nearest() {
  const p = player.pos; let best = null, bd = Infinity;
  const consider = (o, d, r) => { if (d < r && d < bd) { bd = d; best = o; } };
  for (const v of villagers) if (zoneFolkOk(v)) consider({ kind: 'npc', v, label: `Parler à ${v.nom.split(' ')[0]}`, pos: v.pos }, Math.hypot(p.x - v.pos.x, p.z - v.pos.z), 2.4);
  for (const it of W().interactables) if (zoneItOk(it)) consider(it, Math.hypot(p.x - it.pos.x, p.z - it.pos.z), it.r);
  const reach = stats('filet', state.tools.filet).reach;
  for (const b of W().butterflies) if (b.g.visible) consider({ kind: 'bug', b, label: 'Attraper le papillon', pos: b.g.position }, Math.hypot(p.x - b.g.position.x, p.z - b.g.position.z), reach);
  // la cachette de quête / la trouvaille gagnent sur l’érable voisin quand elles sont à portée
  for (const o of comp.targets()) { const d = Math.hypot(p.x - o.pos.x, p.z - o.pos.z); if (d < o.r && d * 0.3 < bd) { bd = d * 0.3; best = o; } }
  // les animaux passent en dernier : Charlie est toujours tout près, il ne doit pas voler la place d’un villageois ou d’une action
  if (!best) for (const a of pets.visible(state.island)) { const dx = a.pos.x - p.x, dz = a.pos.z - p.z, d = Math.hypot(dx, dz) || 1; if ((Math.sin(player.facing) * dx + Math.cos(player.facing) * dz) / d > 0.35) consider({ kind: 'pet', p: a, label: `Flatter ${a.nom}`, pos: a.pos }, d, 1.9); } // seulement s’il est devant Camille (sinon « Flatter Charlie » serait affiché tout le temps)
  return best;
}
function interact(target = nearest()) {
  if (ui.isOpen || G.paused) return;
  if (fishing.state) { reel(); return; }
  if (!target) return;
  const it = target; player.face(it.pos.x, it.pos.z); player.cancelWalk();
  switch (it.kind) {
    case 'npc': flows.talk(it.v); break;
    case 'pet': { const a = it.p, line = pets.pat(a); hearts.push({ m: heart(scene, a.pos.x, a.id === 'charlie' ? 0.95 : 0.8, a.pos.z), t: 1.3 }); if (audio.sons) sons.pet(a); else audio.sfx(a.id === 'charlie' ? 'woof' : 'purr'); if (a.id === 'charlie') waitT(0.6).then(() => comp.fetch(true)); ui.toast(`${a.id === 'charlie' ? '🐶' : '🐱'} ${line}`); break; }
    case 'fetch': comp.pickup(); break;
    case 'quete': comp.trouver(); break;
    case 'etabli': flows.workbench(); break;
    case 'magasin': flows.shop(); break;
    case 'ferry': flows.ferry(); break;
    case 'atelier': flows.workbench(2); break;
    case 'phare': flows.phare(); break;
    case 'kiosk': flows.kiosk(); break;
    case 'fish': startFishing(); break;
    case 'tree': {
      if (G.time < it.ready) { it.shake = 0.3; ui.toast('🍁 Cet érable se repose. Reviens tantôt!'); break; }
      it.shake = 1; it.ready = G.time + 45; audio.sfx('shake'); player.busyFor(0.5);
      const c = (it.red ? 120 : it.big ? 150 : 50) + Math.floor(rng.next() * 5) * 25; setTimeout(() => { earn(c, it.pos.x, it.pos.z); ui.gain(c); }, 350);
      // Coup de sirop : parfois, une question (facultative) en bonus — secondaire 2 sur les érables rouges
      const sirop = 'maple' in force ? force.maple : rng.chance(it.red ? Math.max(0.45, MAPLE_CHANCE) : MAPLE_CHANCE); delete force.maple;
      if (sirop) waitT(0.8).then(() => { if (!ui.isOpen) flows.actionQ({ kind: 'maple', ...question('maple') }); });
      break;
    }
    case 'sap': {
      if (state.island === 2 || !state.bridges.erables) break;
      if (G.time < it.ready) { ui.toast('🪣 Cette chaudière se remplit. Reviens tantôt!'); break; }
      it.ready = G.time + (it.cooldown || 45); audio.sfx('shake'); player.busyFor(0.5);
      const cents = 50 + rng.int(0, 100); setTimeout(() => { earn(cents, it.pos.x, it.pos.z); ui.gain(cents); }, 350);
      const hit = 'sap' in force ? force.sap : rng.chance(MAPLE_CHANCE); delete force.sap;
      if (hit) waitT(0.8).then(() => { if (!ui.isOpen) flows.actionQ({ kind: 'sap', ...question('sap') }); });
      break;
    }
    case 'berry': {
      if (state.island === 2 || !state.bridges.bleuets) break;
      if (G.time < it.ready) { ui.toast('🫐 Les bleuets poussent encore. Reviens tantôt!'); break; }
      it.ready = G.time + (it.cooldown || 40); audio.sfx('catch'); player.busyFor(0.5);
      const cents = 50 + rng.int(0, 100); setTimeout(() => { earn(cents, it.pos.x, it.pos.z); ui.gain(cents); }, 350);
      const hit = 'berry' in force ? force.berry : rng.chance(BERRY_CHANCE); delete force.berry;
      if (hit) waitT(0.8).then(() => { if (!ui.isOpen) flows.actionQ({ kind: 'berry', ...question('berry') }); });
      break;
    }
    case 'bed': {
      const s = stats('arrosoir', state.tools.arrosoir); const ready = W().beds.filter(b => G.time >= b.ready).sort((a, b) => a.pos.distanceTo(player.pos) - b.pos.distanceTo(player.pos)).slice(0, s.beds);
      if (!ready.length) { ui.toast('🌱 Les fleurs repoussent. Patience!'); break; }
      hold('arrosoir', 1.2); audio.sfx('water'); player.busyFor(0.8);
      for (const b of ready) b.ready = G.time + 60;
      const c = s.coins * ready.length; state.journal.flowers += ready.length; setTimeout(() => { earn(c, it.pos.x, it.pos.z); ui.toast(`🌸 ${ready.length} plate(s)-bande(s) en fleurs : +${fmtMoney(c)}`); }, 600); break;
    }
    case 'dig': {
      if (G.time < it.ready) { ui.toast('Déjà creusé ici. Cherche un autre X!'); break; }
      if (state.bag.length >= bagCap()) { bagAdd('x'); break; }
      hold('pelle', 1.2); audio.sfx('dig'); player.busyFor(0.9); it.ready = G.time + 90;
      const L = stats('pelle', state.tools.pelle).luck + (it.zone ? 1 : 0);
      const k = weighted([['capsule', 40 - L * 8], ['bouton', 30 - L * 4], ['cle', 18 + L * 3], ['pepite', 8 + L * 5], ['trilobite', 1 + L * 3]]);
      setTimeout(() => { if (bagAdd(k)) { state.journal.finds++; ui.toast(`${ITEMS[k][0]} Trouvé : ${ITEMS[k][1]}!`, k === 'trilobite' ? 'gold' : ''); G.save(); } }, 700); break;
    }
    case 'bug': {
      const s = stats('filet', state.tools.filet); hold('filet', 0.8); player.busyFor(0.4);
      if (rng.chance(s.chance)) { if (bagAdd(it.b.kind)) { it.b.caught = G.time + 50; state.journal.bugs++; audio.sfx('catch'); ui.toast(`🦋 Attrapé : ${ITEMS[it.b.kind][1]}!`); G.save(); } }
      else { it.b.t += 2.5; audio.sfx('miss'); ui.toast('Oups! Il s’est envolé.'); } break;
    }
  }
}
G.interact = interact;
G.onUpgrade = (tool) => { const p = player.pos; burst(p.x, p.z, 10, '#ffd36a', 2); };

// ---------- Entrées
const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3(), tmp = new THREE.Vector3();
function onTap(cx, cy) {
  if (ui.isOpen || !started || G.paused) return;
  if (fishing.state) { reel(); return; }
  const r = canvas.getBoundingClientRect();
  // 1) Un objet interactif près du doigt (en coordonnées écran, pour tenir compte de la courbure)
  const cands = [...villagers.filter(zoneFolkOk).map(v => ({ kind: 'npc', v, pos: v.pos, label: '' })), ...W().interactables.filter(zoneItOk), ...W().butterflies.filter(b => b.g.visible).map(b => ({ kind: 'bug', b, pos: b.g.position })), ...comp.targets()];
  let best = null, bd = 46;
  for (const c of cands) { tmp.set(c.pos.x, (c.kind === 'npc' ? 1.2 : 0.6) - curveDrop(c.pos.x, c.pos.z), c.pos.z).project(camera); const sx = (tmp.x + 1) / 2 * r.width + r.left, sy = (1 - tmp.y) / 2 * r.height + r.top; const d = Math.hypot(sx - cx, sy - cy); if (tmp.z < 1 && d < bd) { bd = d; best = c; } }
  if (!best) { let pd = 30; for (const a of pets.visible(state.island)) { tmp.set(a.pos.x, 0.4 - curveDrop(a.pos.x, a.pos.z), a.pos.z).project(camera); const d = Math.hypot((tmp.x + 1) / 2 * r.width + r.left - cx, (1 - tmp.y) / 2 * r.height + r.top - cy); if (tmp.z < 1 && d < pd) { pd = d; best = { kind: 'pet', p: a, pos: a.pos, r: 1.6 }; } } }
  if (best) { const tgt = best; const rr = tgt.kind === 'bug' ? stats('filet', state.tools.filet).reach * 0.8 : tgt.kind === 'npc' ? 1.8 : (tgt.r || 2) * 0.8; player.walkTo(tgt.pos.x, tgt.pos.z, () => interact(tgt), rr); return; }
  // 2) Sinon, marcher vers le sol touché (on corrige la courbure en 3 itérations)
  ndc.set((cx - r.left) / r.width * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); raycaster.setFromCamera(ndc, camera);
  let y = 0; for (let i = 0; i < 3; i++) { plane.constant = -y; if (!raycaster.ray.intersectPlane(plane, hit)) return; y = -curveDrop(hit.x, hit.z); }
  player.walkTo(hit.x, hit.z, null, 0.3);
}
const input = makeInput({ canvas, onInteract: () => interact(), onTap,
  onKey(e) {
    if (!started) { if (e.code === 'Enter' || e.code === 'Space') { document.getElementById('play').click(); return true; } return false; }
    if (G.paused) { if (['KeyP', 'Escape', 'Enter', 'Space'].includes(e.code)) G.pause(false); return true; }
    if (e.code === 'KeyP' && !flows.piActive()) { G.pause(true); return true; }
    if (flows.handleKey(e)) return true;
    if (ui.isOpen) return false;
    if (e.code === 'KeyC') { flows.carnet(); return true; }
    if (e.code === 'KeyN') { toggleSons(); return true; }
    if (e.code === 'KeyM' || e.code === 'Semicolon' || e.key === 'm') { toggleMute(); return true; }
    return false;
  } });
function toggleSons() { state.sons = state.sons === false; audio.setSons(state.sons); save(state); ui.refresh?.(state); document.getElementById('btn-vie').textContent = state.sons ? '🐦' : '🔕'; ui.toast(state.sons ? '🐦 Sons de vie activés' : '🔕 Sons de vie coupés (la musique reste)'); }
function toggleMute() { state.muted = !state.muted; audio.setMuted(state.muted); save(state); ui.toast(state.muted ? '🔇 Son coupé' : '🔊 Son activé'); }
document.getElementById('btn-vie').textContent = state.sons === false ? '🔕' : '🐦';
document.getElementById('btn-vie').addEventListener('click', e => { e.currentTarget.blur(); toggleSons(); });
document.getElementById('btn-son').addEventListener('click', e => { e.currentTarget.blur(); toggleMute(); });
document.getElementById('btn-carnet').addEventListener('click', e => { e.currentTarget.blur(); if (!ui.isOpen && started) flows.carnet(); });

// ---------- Pause : touche P, bouton ⏸ dans les questions, onglet caché. Le temps de jeu (et donc les chronos) s’arrête.
const pauseEl = document.getElementById('pause');
G.pause = on => {
  if (!started || G.paused === on) return;
  G.paused = on; pauseEl.classList.toggle('hidden', !on); document.body.classList.toggle('paused', on);
  audio.setPaused(on); if (on) { player.cancelWalk(); G.save(); } else last = performance.now();
};
document.getElementById('resume').addEventListener('click', e => { e.currentTarget.blur(); audio.sfx('click'); G.pause(false); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') G.pause(true); });

// ---------- Écran titre
let started = false;
const hasSave = !params.has('fresh') && Object.keys(state.mastery).length + state.exCount > 0;
if (hasSave) { document.getElementById('play').textContent = 'Continuer'; document.getElementById('new').classList.remove('hidden'); }
document.getElementById('new').addEventListener('click', () => { if (confirm('Effacer ta partie et recommencer?')) { reset(); location.search = '?fresh=1'; } });
document.getElementById('play').addEventListener('click', () => {
  if (started) return; started = true; document.getElementById('title').remove(); audio.start(state.island); audio.setMuted(state.muted);
  if (!state.met.intro) { state.met.intro = 1; setTimeout(() => ui.toast('🍁 Bienvenue sur l’île, Camille! Charlie te suit partout. Va voir Gaston, à l’établi, à gauche du sentier.'), 400); }
});

// ---------- Caméra et boucle
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const camPos = new THREE.Vector3(), look = new THREE.Vector3();
// Caméra proche, un peu plus basse (~31°), comme un diorama : Camille occupe ~20 % de la hauteur de l’écran.
// zoom = molette / pincer / + − (0,7 à 1,6) ; occ = rapprochement quand un bâtiment ou un arbre cache Camille.
const CAMV = { land: [0, 7.6, 10.6], port: [0, 10.8, 14], look: [0.9, -0.6] }, cam = { zoom: 1, occ: 1 };
const setZoom = z => { cam.zoom = Math.min(1.6, Math.max(0.7, z)); };
function camOffset() { const k = J.CAM.k * cam.zoom * cam.occ; return (camera.aspect < 0.8 ? CAMV.port : CAMV.land).map(v => v * k); }
// Segment Camille → caméra (en plan) : le premier obstacle haut qui le coupe fixe la distance max (on s’arrête devant).
function occlusion() {
  const k = J.CAM.k * cam.zoom, o = camera.aspect < 0.8 ? CAMV.port : CAMV.land, dx = o[0] * k, dz = o[2] * k, dy = o[1] * k, L2 = dx * dx + dz * dz;
  const lx = player.pos.x, lz = player.pos.z + CAMV.look[1]; let f = 1;
  for (const ob of W().obstacles) {
    if (ob.r < 0.42) continue; // lampadaires, souches, piquets : trop minces pour cacher Camille
    const ox = ob.x - lx, oz = ob.z - lz, t = (ox * dx + oz * dz) / L2; if (t <= 0.08 || t >= f) continue;
    const h = 0.9 + t * dy, rr = ob.r + 0.5; if (h > (ob.r >= 0.9 ? 4.6 : 5.4)) continue; // la caméra passe déjà au-dessus
    if ((ox - t * dx) ** 2 + (oz - t * dz) ** 2 < rr * rr) f = t;
  }
  return f < 1 ? Math.max(0.42, f - 0.1) : 1;
}
addEventListener('wheel', e => { if (!ui.isOpen && e.target === renderer.domElement) setZoom(cam.zoom * (e.deltaY > 0 ? 1.08 : 1 / 1.08)); }, { passive: true });
{ let d0 = 0, z0 = 1; const T = renderer.domElement, D = e => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  T.addEventListener('touchstart', e => { if (e.touches.length === 2) { d0 = D(e); z0 = cam.zoom; } }, { passive: true });
  T.addEventListener('touchmove', e => { if (e.touches.length === 2 && d0 && !ui.isOpen) setZoom(z0 * d0 / D(e)); }, { passive: true });
  T.addEventListener('touchend', e => { if (e.touches.length < 2) d0 = 0; }, { passive: true }); }
addEventListener('keydown', e => { if (ui.isOpen || !started) return; if (e.key === '+' || e.key === '=') setZoom(cam.zoom / 1.12); else if (e.key === '-' || e.key === '_') setZoom(cam.zoom * 1.12); });
{ const o = camOffset(); camPos.set(player.pos.x + o[0], o[1], player.pos.z + o[2]); }
let last = performance.now(), saveT = 0, frames = 0, fpsT = 0, fps = 60;
const waiters = [];
const waitT = s => new Promise(res => waiters.push({ t: G.time + s, res }));
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (G.paused) { renderer.render(scene, camera); requestAnimationFrame(frame); return; }
  G.time += dt;
  frames++; fpsT += dt; if (fpsT >= 1) { fps = frames / fpsT; frames = 0; fpsT = 0; }
  if (fixedTime == null) { const prev = state.clock; state.clock = (state.clock + dt / DAY) % 1; if (state.clock < prev) state.day++; }
  const t = world.setTime(state.clock); G.night = t.night; if (t.phase !== G.phase) G.phase = t.phase;
  const mv = ui.isOpen || !started ? { x: 0, z: 0, run: false } : input.move();
  if ((mv.x || mv.z) && fishing.state) stopFishing();
  player.update(dt, mv, walkableFn); pets.update(dt, player, (x, z) => W().walkable(x, z, state), state.island, villagers.map(v => v.pos));
  comp.tick(dt, started && !ui.isOpen && !fishing.state);
  for (const v of villagers) v.update(dt, player);
  world.update(dt, G); if (state.island === 2 && isle2) isle2.update(dt, G); fishTick(dt);
  { const lock = !canFerry(state); if (lock !== G.ferryLock) { G.ferryLock = lock; world.ferry.setLocked(lock); if (!lock) audio.preload(2); } } audio.duck(ui.isOpen); if (started) sons.update(dt, player, W()); updateFx(dt); flows.tick(dt);
  curve.uCenter.value.set(player.pos.x, player.pos.z); updateLabels(); J.tick(dt, world.sun, player, world.hemi, camera, G.phase); if (vie) vie.update(dt, player, camera, renderer);
  { const f = occlusion(); cam.occ += (f - cam.occ) * Math.min(1, dt * (f < cam.occ ? 9 : 2.5)); } // vite devant un mur, doucement en ressortant
  const o = camOffset(); look.set(player.pos.x, CAMV.look[0], player.pos.z + CAMV.look[1]);
  camPos.lerp(tmp.set(player.pos.x + o[0], o[1], player.pos.z + o[2]), Math.min(1, dt * 6)); camera.position.copy(camPos); camera.lookAt(look);
  if (started && !ui.isOpen) { const n = fishing.state ? { label: fishing.state === 'bite' ? (fishing.rare ? 'Ça mord fort! Ferre!' : 'Ça mord! Ferre!') : 'Remonter la ligne' } : nearest(); ui.prompt(n && n.label); } else ui.prompt(null);
  ui.hud(state, { phase: G.phase, phaseNom: TIME_NOMS[G.phase], bagCap: bagCap() });
  saveT += dt; if (saveT > 5) { saveT = 0; G.save(); }
  for (let i = waiters.length - 1; i >= 0; i--) if (G.time >= waiters[i].t) { waiters[i].res(); waiters.splice(i, 1); }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
addEventListener('pagehide', () => G.save());

// ---------- Traversier : fondu, échange d’île, arrivée sur le quai
const fondu = document.createElement('div'); fondu.id = 'fondu';
fondu.style.cssText = 'position:fixed;inset:0;z-index:40;pointer-events:none;opacity:0;transition:opacity .45s;background:radial-gradient(circle,#2f5d8a,#132a40);display:flex;align-items:center;justify-content:center;color:#fff6e0;font:800 1.4rem Nunito,"Trebuchet MS",sans-serif;text-align:center;padding:1rem';
document.body.appendChild(fondu);
G.travel = async (to, { instant = false } = {}) => {
  if (to !== 1 && to !== 2) return false;
  if (to === 2 && !canFerry(state)) return false;
  stopFishing(); player.cancelWalk(); audio.island(to); // tout de suite, encore dans le geste du joueur
  if (!instant) { fondu.textContent = to === 2 ? '⛴️ Cap sur l’île de secondaire 2…' : '⛴️ Retour vers la Vallée des Maths…'; fondu.style.pointerEvents = 'auto'; fondu.style.opacity = '1'; audio.sfx('splash'); await new Promise(r => setTimeout(r, 650)); }
  if (to === 2) ensureIsle2();
  state.island = to; if (to === 2) state.ferry = true; showIsland();
  player.teleport(FERRY.arrive[0], FERRY.arrive[1]); player.face(FERRY.arrive[0] + 5, FERRY.arrive[1]); pets.regroup(player);
  { const o = camOffset(); camPos.set(player.pos.x + o[0], o[1], player.pos.z + o[2]); }
  G.save();
  if (!instant) { await new Promise(r => setTimeout(r, 250)); fondu.style.opacity = '0'; fondu.style.pointerEvents = 'none'; }
  if (to === 2 && !state.met.ile2) { state.met.ile2 = 1; ui.toast('🌲 Bienvenue sur l’île de secondaire 2! Rosalie t’attend au phare, au nord-est.'); }
  else ui.toast(to === 2 ? '🌲 Île de secondaire 2' : '🍁 De retour sur l’île principale');
  return true;
};

// Crochet de test (lecture seule pour l’essentiel)
window.__mv = {
  G, state, world, player, flows, renderer, scene, NOMS,
  waitT, force,
  tp: (x, z) => player.teleport(x, z),
  answer: () => flows.cur && flows.cur.answer(),
  fps: () => fps, camera, cam: () => ({ ...cam, pos: camera.position.toArray(), fov: camera.fov, setZoom }), sons: () => sons, audio, quality: J.quality, vie: () => vie && vie.stats(), calls: () => renderer.info.render.calls,
  walk: () => ({ player: player.moving, phase: player.walkPhase, villagers: allVillagers.filter(v => v.walking).map(v => v.id), pets: pets.pets.filter(a => a.walking).map(a => a.id) }),
  camK: k => { J.CAM.k = k; }, // test : rapprocher la caméra pour les captures
  pets: () => pets.visible(state.island).map(a => ({ id: a.id, x: +a.pos.x.toFixed(2), z: +a.pos.z.toFixed(2) })), pet: id => { const a = pets.pets.find(q => q.id === id); return a && pets.pat(a); },
  animaux: () => ({ ...state.animaux, drop: comp.drop, fetching: pets.fetching, hide: pets.hide.id }), comp,
  unlockFerry: () => { state.ferry = true; return true; },
  travel: (n, instant = true) => G.travel(n, { instant }),
  island: () => state.island, isle2: () => isle2, W, nearest: () => { const n = nearest(); return n && (n.kind === 'npc' ? n.v.id : n.id || n.kind); },
  screen(x, z, y = 0.6) { tmp.set(x, y - curveDrop(x, z), z).project(camera); const r = canvas.getBoundingClientRect(); return { x: (tmp.x + 1) / 2 * r.width + r.left, y: (1 - tmp.y) / 2 * r.height + r.top }; },
};
