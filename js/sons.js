// « Sons de vie » : tout est synthétisé en WebAudio (aucun fichier). Ambiance (vagues selon la distance à l’eau, vent dans les arbres,
// oiseaux le jour, grillons et grenouilles la nuit), pas de Camille selon le sol, et une voix par créature, placée (volume + gauche/droite)
// selon la distance à Camille. Au plus CAP voix ponctuelles à la fois; les paliers de qualité bas allègent (moins de voix, pas de vent).
import { fxQ } from './joli.js';
import { onDockWood } from './world.js';
import { PLACES2 } from './island2.js';

const R = 22;               // au-delà, une créature ne s’entend plus
const CAP = 8, CAP_LOW = 5; // voix ponctuelles simultanées (palier 3+ : 5)
// voix des villageois : hauteur de base (Hz), timbre, débit — petits « blablas » à la Animal Crossing
export const VOIX = {
  gaston: { f: 230, type: 'triangle', gap: 0.075, n: 7 },  // castor : voix ronde, moyenne
  therese: { f: 150, type: 'triangle', gap: 0.09, n: 6 },  // orignale : grave et posée
  flocon: { f: 520, type: 'sine', gap: 0.07, n: 6 },       // harfang : aigu, doux
  hortense: { f: 125, type: 'sine', gap: 0.14, n: 5 },     // tortue : lente et basse
  rosalie: { f: 640, type: 'square', gap: 0.06, n: 8 },    // loutre : vive, couinante
  bernard: { f: 300, type: 'triangle', gap: 0.08, n: 6 },  // huard : + son cri
  lionel: { f: 105, type: 'triangle', gap: 0.13, n: 5 },   // orignal : grave et lent (papie)
  lise: { f: 310, type: 'sine', gap: 0.068, n: 7 },        // renarde : medium-high, chaleureuse
};

export function makeSons(audio, G) {
  const S = { voices: 0, maxSeen: 0, played: [], beds: {}, surface: 'herbe', shore: 99, enabled: true };
  let ctx = null, bus = null, noiseBuf = null, live = [], steps = 0, idleT = 2, sampleT = 0, last = { x: 0, z: 0 };
  const lvl = () => { try { return fxQ().i; } catch { return 0; } };
  const cap = () => (lvl() >= 3 ? CAP_LOW : CAP);

  function init() {
    if (ctx || !audio.ctx) return !!ctx; ctx = audio.ctx; bus = audio.life;
    // un seul tampon de bruit (2 s) réutilisé partout
    const n = ctx.sampleRate * 2; noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate); const d = noiseBuf.getChannelData(0);
    let b = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; b = 0.97 * b + 0.03 * w; d[i] = w * 0.6 + b * 3; }
    // nappes continues (pas comptées comme voix) : vagues, vent, grillons
    S.beds.vagues = bed('lowpass', 420, 0.8); S.beds.vent = bed('bandpass', 950, 0.6);
    const cr = ctx.createOscillator(), am = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(), out = ctx.createGain();
    cr.frequency.value = 4400; lfo.type = 'square'; lfo.frequency.value = 26; lg.gain.value = 0.5; am.gain.value = 0.5; out.gain.value = 0;
    lfo.connect(lg); lg.connect(am.gain); cr.connect(am); am.connect(out); out.connect(bus); cr.start(); lfo.start();
    S.beds.grillons = { g: out };
    return true;
  }
  function bed(type, f, q) {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuf; s.loop = true;
    fl.type = type; fl.frequency.value = f; fl.Q.value = q; g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(bus); s.start(); return { g, fl };
  }
  // une voix ponctuelle : gain + panoramique, libérée à la fin. null si trop loin ou si le plafond est atteint
  function voice(x, z, dur, vol = 1, prio = false) {
    if (!ctx || !S.enabled || !audio.sons || audio.muted) return null;
    const now = ctx.currentTime; live = live.filter(e => e > now);
    const p = G.player.pos, dx = x == null ? 0 : x - p.x, dz = z == null ? 0 : z - p.z, d = Math.hypot(dx, dz);
    const att = x == null ? 1 : Math.max(0, 1 - d / R) ** 2; if (att * vol < 0.015) return null;
    if (live.length >= cap() - (prio ? 0 : 1)) return null; // une place gardée pour les pas
    const g = ctx.createGain(), pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null; g.gain.value = att * vol;
    if (pan) { pan.pan.value = Math.max(-0.9, Math.min(0.9, dx / 10)); g.connect(pan); pan.connect(bus); } else g.connect(bus);
    live.push(now + dur + 0.1); S.voices = live.length; S.maxSeen = Math.max(S.maxSeen, live.length);
    setTimeout(() => { g.disconnect(); pan && pan.disconnect(); }, (dur + 0.3) * 1000);
    return { g, t: now + 0.01, att };
  }
  function osc(v, t, f, dur, { type = 'sine', vol = 0.2, glide = 0, to = 0, attack = 0.01, cut = 0 } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + (to || dur));
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    let src = o; if (cut) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = cut; o.connect(fl); src = fl; }
    src.connect(g); g.connect(v.g); o.start(t); o.stop(t + dur + 0.05); return o;
  }
  function hiss(v, t, dur, { vol = 0.3, type = 'lowpass', cut = 800, q = 0.7, attack = 0.005 } = {}) {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = noiseBuf;
    fl.type = type; fl.frequency.value = cut; fl.Q.value = q; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(fl); fl.connect(g); g.connect(v.g); s.start(t, Math.random() * 1.5, dur + 0.05);
  }
  const log = (k, id) => { S.played.push(id ? k + ':' + id : k); if (S.played.length > 60) S.played.shift(); };

  // ---------- sons des créatures
  const SND = {
    yip(x, z) { const v = voice(x, z, 0.35, 1); if (!v) return; const t = v.t, f = 900 + Math.random() * 200;      // Charlie : petit jappement aigu
      osc(v, t, f, 0.09, { type: 'sawtooth', vol: 0.07, glide: f * 0.7, cut: 2600 }); osc(v, t + 0.13, f * 1.05, 0.08, { type: 'sawtooth', vol: 0.06, glide: f * 0.75, cut: 2600 }); log('yip'); },
    pant(x, z) { const v = voice(x, z, 0.7, 0.8); if (!v) return; for (let i = 0; i < 4; i++) hiss(v, v.t + i * 0.16, 0.1, { vol: 0.12, type: 'bandpass', cut: 1700, q: 1.2 }); log('pant'); },
    meow(x, z, id) { const v = voice(x, z, 0.6, 1); if (!v) return; const k = id === 'olga' ? 1.15 : 1;               // chattes : miaou (Olga un peu plus aiguë)
      osc(v, v.t, 560 * k, 0.18, { type: 'triangle', vol: 0.06, glide: 820 * k, cut: 2200 }); osc(v, v.t + 0.16, 820 * k, 0.38, { type: 'triangle', vol: 0.06, glide: 500 * k, cut: 2200 }); log('meow', id); },
    purr(x, z, id) { const v = voice(x, z, 1.3, 1); if (!v) return; for (let i = 0; i < 8; i++) hiss(v, v.t + i * 0.15, 0.13, { vol: 0.28, cut: 150, q: 1 }); log('purr', id); },
    blabla(x, z, id) { const P = VOIX[id] || VOIX.gaston, dur = P.n * P.gap + 0.2, v = voice(x, z, dur, 1, true); if (!v) return;
      for (let i = 0; i < P.n; i++) { const f = P.f * (0.85 + Math.random() * 0.4) * (i === P.n - 1 ? 1.12 : 1); osc(v, v.t + i * P.gap, f, P.gap * 0.8, { type: P.type, vol: 0.06, glide: f * 0.92, cut: 1500 }); }
      log('blabla', id); if (id === 'bernard') setTimeout(() => SND.loon(x, z), dur * 1000); },
    loon(x, z) { const v = voice(x, z, 2.4, 1.3); if (!v) return; const t = v.t;                                     // huard : long cri qui monte, tremble, redescend
      const o = osc(v, t, 560, 2.2, { type: 'sine', vol: 0.09, glide: 880, to: 0.7, attack: 0.25 }); o.frequency.exponentialRampToValueAtTime(700, t + 2.1);
      const lf = ctx.createOscillator(), lg = ctx.createGain(); lf.frequency.value = 7; lg.gain.value = 18; lf.connect(lg); lg.connect(o.frequency); lf.start(t + 0.8); lf.stop(t + 2.2); log('loon'); },
    hoot(x, z) { const v = voice(x, z, 1.1, 1.2); if (!v) return; osc(v, v.t, 400, 0.3, { vol: 0.08, glide: 370, attack: 0.05 }); osc(v, v.t + 0.45, 390, 0.5, { vol: 0.08, glide: 350, attack: 0.06 }); log('hoot'); }, // Flocon : « hou hou »
    otter(x, z) { const v = voice(x, z, 0.5, 1); if (!v) return; for (let i = 0; i < 3; i++) osc(v, v.t + i * 0.1, 1500 + i * 150, 0.07, { vol: 0.04, glide: 1900 }); log('otter'); },
    tortue(x, z) { const v = voice(x, z, 0.8, 1); if (!v) return; osc(v, v.t, 110, 0.6, { type: 'triangle', vol: 0.06, glide: 95, attack: 0.1, cut: 500 }); log('tortue'); },      // petit « hmmm » content
    orignal(x, z) { const v = voice(x, z, 1, 1); if (!v) return; osc(v, v.t, 140, 0.8, { type: 'sawtooth', vol: 0.04, glide: 110, attack: 0.12, cut: 600 }); log('orignal'); },  // meuglement très doux
    castor(x, z) { const v = voice(x, z, 0.5, 1); if (!v) return; for (let i = 0; i < 3; i++) hiss(v, v.t + i * 0.11, 0.05, { vol: 0.2, type: 'bandpass', cut: 2400, q: 3 }); log('castor'); }, // grignote
    bird(x, z) { const v = voice(x, z, 0.8, 0.9); if (!v) return; const f = 2400 + Math.random() * 1600, n = 2 + (Math.random() * 3 | 0);
      for (let i = 0; i < n; i++) osc(v, v.t + i * 0.12, f * (1 + (i % 2) * 0.15), 0.08, { vol: 0.03, glide: f * 1.3 }); log('bird'); },
    gull(x, z) { const v = voice(x, z, 1, 1.2); if (!v) return; for (let i = 0; i < 2; i++) osc(v, v.t + i * 0.32, 1300, 0.26, { type: 'sawtooth', vol: 0.025, glide: 800, cut: 2500, attack: 0.03 }); log('gull'); },
    frog(x, z) { const v = voice(x, z, 0.4, 1); if (!v) return; osc(v, v.t, 190, 0.09, { type: 'sawtooth', vol: 0.05, glide: 140, cut: 900 }); osc(v, v.t + 0.13, 200, 0.12, { type: 'sawtooth', vol: 0.05, glide: 130, cut: 900 }); log('frog'); },
  };
  const IDLE = { gaston: 'castor', therese: 'orignal', flocon: 'hoot', hortense: 'tortue', rosalie: 'otter', bernard: 'loon', lionel: 'orignal' };

  // ---------- pas de Camille
  function surface(x, z) {
    if (G.state.island === 2) return S.shore < 1.6 ? 'sable' : 'herbe';
    if (onDockWood(x, z)) return 'bois';
    if (Math.abs(x - (6 * ((z + 10) / 36) ** 2 - 0.5)) < 0.9 && z > -12 && z < 27) return 'pierre';
    return S.shore < 1.6 ? 'sable' : 'herbe';
  }
  function step(kind) {
    const v = voice(null, null, 0.25, 1, true); if (!v) return; const t = v.t;
    if (kind === 'herbe') hiss(v, t, 0.09, { vol: 0.07, type: 'bandpass', cut: 2600, q: 0.8 });
    else if (kind === 'sable') hiss(v, t, 0.14, { vol: 0.09, cut: 900, attack: 0.02 });
    else if (kind === 'bois') { osc(v, t, 170, 0.1, { type: 'triangle', vol: 0.12, glide: 120 }); hiss(v, t, 0.04, { vol: 0.04, cut: 1800 }); }
    else { osc(v, t, 320, 0.05, { type: 'triangle', vol: 0.06, glide: 240 }); hiss(v, t, 0.05, { vol: 0.06, type: 'highpass', cut: 1500 }); } // pierre
    log('pas', kind);
  }

  // distance à l’eau (échantillonnée 4 fois/s) : on cherche le bord marchable dans 8 directions
  function shoreDist(W, x, z) {
    let best = 14; for (let a = 0; a < 8; a++) { const cx = Math.cos(a * 0.785), cz = Math.sin(a * 0.785);
      for (let r = 0.8; r < best; r += 0.8) { const qx = x + cx * r, qz = z + cz * r; if (!W.walkable(qx, qz, G.state) && !(W.obstacles || []).some(o => Math.hypot(qx - o.x, qz - o.z) < o.r + 0.4)) { best = r; break; } } } return best;
  }

  S.update = (dt, player, W) => {
    if (!init()) return;
    const t = ctx.currentTime, night = G.night || 0, day = 1 - night, low = lvl() >= 3, p = player.pos;
    // nappes
    sampleT -= dt; if (sampleT <= 0) { sampleT = 0.25; S.shore = shoreDist(W, p.x, p.z);
      S.trees = W.interactables.filter(i => i.kind === 'tree' && Math.hypot(i.pos.x - p.x, i.pos.z - p.z) < 9).length; }
    const wv = Math.max(0, 1 - S.shore / 12) ** 1.5 * (0.7 + 0.3 * Math.sin(t * 0.7) * Math.sin(t * 0.31));
    S.beds.vagues.g.gain.setTargetAtTime(wv * 0.22, t, 0.3);
    S.beds.vent.g.gain.setTargetAtTime(low ? 0 : Math.min(1, S.trees / 4) * 0.035 * (0.6 + 0.4 * Math.sin(t * 0.23)), t, 0.6);
    S.beds.vent.fl.frequency.setTargetAtTime(800 + 300 * Math.sin(t * 0.17), t, 0.5);
    const gate = (Math.sin(t * 9) > 0.2 && Math.sin(t * 0.8) > -0.4) ? 1 : 0; // trilles de grillons par bouffées
    S.beds.grillons.g.gain.setTargetAtTime(night > 0.4 ? gate * night * 0.012 : 0, t, 0.02);
    S.waves = wv; S.night = night;
    // pas : un à chaque appui (creux du rebond, toutes les demi-périodes de marche)
    if (player.moving) { const k = Math.floor((player.walkPhase || 0) / Math.PI); if (k !== steps) { steps = k; S.surface = surface(p.x, p.z); step(S.surface); } }
    else steps = Math.floor((player.walkPhase || 0) / Math.PI);
    // Charlie halète en rapportant
    const pets = G.pets, ch = pets && pets.charlie;
    if (ch && ch.isle === G.state.island && pets.fetching && Math.random() < dt * 0.9) SND.pant(ch.pos.x, ch.pos.z);
    // petits bruits de vie au hasard, rythme réduit aux paliers bas
    idleT -= dt; if (idleT > 0) return; idleT = (low ? 4 : 2.2) + Math.random() * 2.5;
    const r = Math.random(), isle = G.state.island;
    if (night < 0.5 && r < 0.45) { const tr = W.interactables.filter(i => i.kind === 'tree'); const a = tr[(Math.random() * tr.length) | 0]; a && SND.bird(a.pos.x, a.pos.z); return; }
    if (night >= 0.5 && S.shore < 5 && r < 0.4) { SND.frog(p.x + (Math.random() - 0.5) * 8, p.z + (Math.random() - 0.5) * 8); return; }
    if (isle === 2 && night < 0.5 && r < 0.65) { for (const [x, z] of [PLACES2.phare, PLACES2.quai]) if (Math.hypot(x - p.x, z - p.z) < 20) { SND.gull(x + Math.random() * 4, z); return; } }
    const vs = (G.villagers || []).filter(v => Math.hypot(v.pos.x - p.x, v.pos.z - p.z) < R * 0.8);
    if (vs.length && r < 0.8) { const v = vs[(Math.random() * vs.length) | 0], k = IDLE[v.id];
      if (k === 'hoot' && night < 0.5) return; if (k === 'loon' && Math.random() < 0.6) return; k && SND[k](v.pos.x, v.pos.z); return; }
    if (pets) { const ps = pets.pets.filter(a => a.isle === isle && a.obj.visible !== false); const a = ps[(Math.random() * ps.length) | 0];
      if (a) a.id === 'charlie' ? SND.yip(a.pos.x, a.pos.z) : (a.id === 'gisele' && Math.random() < 0.5 ? SND.purr(a.pos.x, a.pos.z, a.id) : SND.meow(a.pos.x, a.pos.z, a.id)); }
  };
  // déclencheurs du jeu
  S.talk = v => { init(); SND.blabla(v.pos.x, v.pos.z, v.id); };
  S.pet = a => { init(); if (a.id === 'charlie') { SND.yip(a.pos.x, a.pos.z); setTimeout(() => SND.pant(a.pos.x, a.pos.z), 380); } else { SND.purr(a.pos.x, a.pos.z, a.id); SND.meow(a.pos.x, a.pos.z, a.id); } };
  S.charlie = () => { init(); const c = G.pets && G.pets.charlie; c && SND.yip(c.pos.x, c.pos.z); };
  S.miaou = () => { init(); const h = G.pets && G.pets.hide; const a = h && h.id && G.pets.pets.find(q => q.id === h.id); a ? SND.meow(a.pos.x, a.pos.z, a.id) : audio.sfx('miaou'); };
  S.snd = SND; S.voice = voice; S.cap = cap; S.R = R;
  return S;
}
