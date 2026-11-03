// Vallée des Maths — boucle de jeu, actions (secouer, pêcher, arroser, creuser, attraper), caméra, sauvegarde.
import * as THREE from '../vendor/three.module.min.js';
import { buildWorld, curve, curveDrop, phaseOf, TIME_NOMS, PLACES, DOCK, updateLabels, mesh, at } from './world.js';
import { makePlayer } from './player.js';
import { makeVillagers } from './villagers.js';
import { makeInput } from './input.js';
import { makeUI, fmtMoney } from './ui.js';
import { makeFlows, ITEMS } from './flows.js';
import { makeAudio } from './audio.js';
import { stats } from './progression.js';
import { rareBiteChance, pickQuestion, MAPLE_CHANCE } from './actionq.js';
import { SELL } from './shop.js';
import { load, save, reset, newState } from './save.js';
import { makeRng } from './math/rng.js';

const params = new URLSearchParams(location.search);
if (params.has('fresh')) reset();
const seedParam = params.has('seed') ? parseInt(params.get('seed'), 10) : undefined;
const state = params.has('fresh') ? newState(seedParam ?? 20260) : load(seedParam);
const fixedTime = params.has('time') ? { matin: 0.125, midi: 0.375, doree: 0.625, nuit: 0.875 }[params.get('time')] ?? parseFloat(params.get('time')) : null;
if (fixedTime != null) state.clock = fixedTime;
const DAY = 480; // secondes réelles par journée

const canvas = document.getElementById('c');
const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
document.body.classList.toggle('touch', touch);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !touch, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, touch ? 1.75 : 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 900);
const rng = makeRng(state.seed ^ 0xbeef);

const ui = makeUI(), audio = makeAudio(); audio.setMuted(!!state.muted);
const G = { state, time: 0, paused: false, night: 0, phase: 'matin', ui, audio, save: () => { state.pos = { x: +player.pos.x.toFixed(2), z: +player.pos.z.toFixed(2) }; save(state); } };
const world = buildWorld(scene, G); G.world = world;
for (const id of state.decor) world.placeDecor(id);
for (const [z, open] of Object.entries(state.bridges)) if (open) world.openBridge(z);
const start = world.walkable(state.pos.x, state.pos.z, state) ? state.pos : { x: 2, z: 6 };
const player = makePlayer(scene, start); G.player = player;
const villagers = makeVillagers(scene); G.villagers = villagers;
const flows = makeFlows(G); G.flows = flows;
const walkableFn = (x, z) => world.walkable(x, z, state) && !villagers.some(v => Math.hypot(x - v.pos.x, z - v.pos.z) < 0.75);

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
function updateFx(dt) { for (let i = fx.length - 1; i >= 0; i--) { const f = fx[i]; f.t -= dt; f.vy -= 12 * dt; f.m.position.x += f.vx * dt; f.m.position.y += f.vy * dt; f.m.position.z += f.vz * dt; f.m.rotation.z += dt * 10; if (f.t <= 0 || f.m.position.y < -0.2) { scene.remove(f.m); fx.splice(i, 1); } } }

const bagCap = () => stats('sac', state.tools.sac).cap;
const bagAdd = key => { if (state.bag.length >= bagCap()) { ui.toast('🎒 Ton sac est plein! Va vendre chez Ginette (magasin général).'); return false; } state.bag.push(key); return true; };
const earn = (cents, x, z) => { state.money += cents; state.journal.coins += cents; burst(x, z, Math.min(8, 2 + Math.round(cents / 50))); audio.sfx('coin'); };
// Butin d’une question en action : dans le sac, ou payé tout de suite si le sac est plein
G.grant = key => { if (state.bag.length < bagCap()) { state.bag.push(key); return { bag: true }; } const c = SELL[key] || 0; earn(c, player.pos.x, player.pos.z); return { coins: c }; };
// Forçage pour les tests : __mv.force = { rare: true|false, maple: true|false, q: { skill, d, stretch } }
const force = {};
const question = kind => force.q ? { stretch: false, ...force.q } : pickQuestion(state, kind, rng);

// ---------- Pêche
const fishing = { state: null, t: 0, rare: false };
function weighted(table) { const tot = table.reduce((a, [, w]) => a + w, 0); let r = rng.next() * tot; for (const [k, w] of table) { if ((r -= w) < 0) return k; } return table[0][0]; }
function startFishing() {
  const s = stats('canne', state.tools.canne); fishing.state = 'wait'; fishing.t = s.wait[0] + rng.next() * (s.wait[1] - s.wait[0]);
  player.teleport(6, DOCK.z1 - 0.8); player.face(6, DOCK.z1 + 3); hold('canne', 0); world.bobber.visible = true; audio.sfx('splash');
  ui.toast('🎣 Attends que ça morde… pis appuie au bon moment!');
}
function stopFishing() { fishing.state = null; fishing.rare = false; world.bobber.visible = false; player.tool.clear(); }
function fishTick(dt) {
  if (!fishing.state) return;
  if (Math.hypot(player.pos.x - 6, player.pos.z - (DOCK.z1 - 0.8)) > 1.2) { stopFishing(); return; }
  fishing.t -= dt; const b = world.bobber;
  b.position.y = -0.45 + Math.sin(G.time * 3) * 0.04 - (fishing.state === 'bite' ? 0.18 + Math.sin(G.time * 30) * 0.05 : 0);
  if (fishing.rare && fishing.state === 'bite') b.position.y -= 0.12 + Math.sin(G.time * 18) * 0.06; // ça cale fort
  if (fishing.state === 'wait' && fishing.t <= 0) {
    fishing.rare = 'rare' in force ? force.rare : rng.chance(rareBiteChance(state.tools.canne)); delete force.rare;
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
  const kind = weighted([['perchaude', 50], ['achigan', 30], ['dore', 12 + lvl * 4], ['truite', 4 + lvl * 5]]);
  stopFishing(); if (!bagAdd(kind)) return;
  state.journal.fish++; audio.sfx('catch'); ui.toast(`${ITEMS[kind][0]} Une belle prise : ${ITEMS[kind][1]}!`); G.save();
}

// ---------- Interactions
function nearest() {
  const p = player.pos; let best = null, bd = Infinity;
  const consider = (o, d, r) => { if (d < r && d < bd) { bd = d; best = o; } };
  for (const v of villagers) consider({ kind: 'npc', v, label: `Parler à ${v.nom.split(' ')[0]}`, pos: v.pos }, Math.hypot(p.x - v.pos.x, p.z - v.pos.z), 2.4);
  for (const it of world.interactables) consider(it, Math.hypot(p.x - it.pos.x, p.z - it.pos.z), it.r);
  const reach = stats('filet', state.tools.filet).reach;
  for (const b of world.butterflies) if (b.g.visible) consider({ kind: 'bug', b, label: 'Attraper le papillon', pos: b.g.position }, Math.hypot(p.x - b.g.position.x, p.z - b.g.position.z), reach);
  return best;
}
function interact(target = nearest()) {
  if (ui.isOpen || G.paused) return;
  if (fishing.state) { reel(); return; }
  if (!target) return;
  const it = target; player.face(it.pos.x, it.pos.z); player.cancelWalk();
  switch (it.kind) {
    case 'npc': flows.talk(it.v); break;
    case 'etabli': flows.workbench(); break;
    case 'magasin': flows.shop(); break;
    case 'fish': startFishing(); break;
    case 'tree': {
      if (G.time < it.ready) { it.shake = 0.3; ui.toast('🍁 Cet érable se repose. Reviens tantôt!'); break; }
      it.shake = 1; it.ready = G.time + 45; audio.sfx('shake'); player.busyFor(0.5);
      const c = (it.big ? 150 : 50) + Math.floor(rng.next() * 5) * 25; setTimeout(() => { earn(c, it.pos.x, it.pos.z); ui.gain(c); }, 350);
      // Coup de sirop : parfois, une question de fractions (facultative) en bonus
      const sirop = 'maple' in force ? force.maple : rng.chance(MAPLE_CHANCE); delete force.maple;
      if (sirop) waitT(0.8).then(() => { if (!ui.isOpen) flows.actionQ({ kind: 'maple', ...question('maple') }); });
      break;
    }
    case 'bed': {
      const s = stats('arrosoir', state.tools.arrosoir); const ready = world.beds.filter(b => G.time >= b.ready).sort((a, b) => a.pos.distanceTo(player.pos) - b.pos.distanceTo(player.pos)).slice(0, s.beds);
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
  const cands = [...villagers.map(v => ({ kind: 'npc', v, pos: v.pos, label: '' })), ...world.interactables, ...world.butterflies.filter(b => b.g.visible).map(b => ({ kind: 'bug', b, pos: b.g.position }))];
  let best = null, bd = 46;
  for (const c of cands) { tmp.set(c.pos.x, (c.kind === 'npc' ? 1.2 : 0.6) - curveDrop(c.pos.x, c.pos.z), c.pos.z).project(camera); const sx = (tmp.x + 1) / 2 * r.width + r.left, sy = (1 - tmp.y) / 2 * r.height + r.top; const d = Math.hypot(sx - cx, sy - cy); if (tmp.z < 1 && d < bd) { bd = d; best = c; } }
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
    if (e.code === 'KeyP') { G.pause(true); return true; }
    if (flows.handleKey(e)) return true;
    if (ui.isOpen) return false;
    if (e.code === 'KeyC') { flows.carnet(); return true; }
    if (e.code === 'KeyM' || e.code === 'Semicolon' || e.key === 'm') { toggleMute(); return true; }
    return false;
  } });
function toggleMute() { state.muted = !state.muted; audio.setMuted(state.muted); save(state); ui.toast(state.muted ? '🔇 Son coupé' : '🔊 Son activé'); }
document.getElementById('btn-son').addEventListener('click', e => { e.currentTarget.blur(); toggleMute(); });
document.getElementById('btn-carnet').addEventListener('click', e => { e.currentTarget.blur(); if (!ui.isOpen && started) flows.carnet(); });

// ---------- Pause : touche P, bouton ⏸ dans les questions, onglet caché. Le temps de jeu (et donc les chronos) s’arrête.
const pauseEl = document.getElementById('pause');
G.pause = on => {
  if (!started || G.paused === on) return;
  G.paused = on; pauseEl.classList.toggle('hidden', !on); document.body.classList.toggle('paused', on);
  if (on) { player.cancelWalk(); G.save(); } else last = performance.now();
};
document.getElementById('resume').addEventListener('click', e => { e.currentTarget.blur(); audio.sfx('click'); G.pause(false); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') G.pause(true); });

// ---------- Écran titre
let started = false;
const hasSave = !params.has('fresh') && Object.keys(state.mastery).length + state.exCount > 0;
if (hasSave) { document.getElementById('play').textContent = 'Continuer'; document.getElementById('new').classList.remove('hidden'); }
document.getElementById('new').addEventListener('click', () => { if (confirm('Effacer ta partie et recommencer?')) { reset(); location.search = '?fresh=1'; } });
document.getElementById('play').addEventListener('click', () => {
  if (started) return; started = true; document.getElementById('title').remove(); audio.start(); audio.setMuted(state.muted);
  if (!state.met.intro) { state.met.intro = 1; setTimeout(() => ui.toast('🍁 Bienvenue sur l’île! Va voir Gaston, à l’établi, à gauche du sentier.'), 400); }
});

// ---------- Caméra et boucle
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();
const camPos = new THREE.Vector3(), look = new THREE.Vector3();
function camOffset() { const portrait = camera.aspect < 0.8; return portrait ? [0, 22, 22] : [0, 15.5, 18.5]; }
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
  const t = world.setTime(state.clock); G.night = t.night; if (t.phase !== G.phase) { G.phase = t.phase; audio.setPhase(t.phase); }
  const mv = ui.isOpen || !started ? { x: 0, z: 0, run: false } : input.move();
  if ((mv.x || mv.z) && fishing.state) stopFishing();
  player.update(dt, mv, walkableFn);
  for (const v of villagers) v.update(dt, player);
  world.update(dt, G); fishTick(dt); updateFx(dt); flows.tick(dt);
  curve.uCenter.value.set(player.pos.x, player.pos.z); updateLabels();
  const o = camOffset(); look.set(player.pos.x, 0.8, player.pos.z - 1.5);
  camPos.lerp(tmp.set(player.pos.x + o[0], o[1], player.pos.z + o[2]), Math.min(1, dt * 4)); camera.position.copy(camPos); camera.lookAt(look);
  if (started && !ui.isOpen) { const n = fishing.state ? { label: fishing.state === 'bite' ? (fishing.rare ? 'Ça mord fort! Ferre!' : 'Ça mord! Ferre!') : 'Remonter la ligne' } : nearest(); ui.prompt(n && n.label); } else ui.prompt(null);
  ui.hud(state, { phase: G.phase, phaseNom: TIME_NOMS[G.phase], bagCap: bagCap() });
  saveT += dt; if (saveT > 5) { saveT = 0; G.save(); }
  for (let i = waiters.length - 1; i >= 0; i--) if (G.time >= waiters[i].t) { waiters[i].res(); waiters.splice(i, 1); }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
addEventListener('pagehide', () => G.save());

// Crochet de test (lecture seule pour l’essentiel)
window.__mv = {
  G, state, world, player, flows,
  waitT, force,
  tp: (x, z) => player.teleport(x, z),
  answer: () => flows.cur && flows.cur.answer(),
  fps: () => fps, nearest: () => { const n = nearest(); return n && (n.kind === 'npc' ? n.v.id : n.id || n.kind); },
  screen(x, z, y = 0.6) { tmp.set(x, y - curveDrop(x, z), z).project(camera); const r = canvas.getBoundingClientRect(); return { x: (tmp.x + 1) / 2 * r.width + r.left, y: (1 - tmp.y) / 2 * r.height + r.top }; },
};
