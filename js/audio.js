// Musique de fond : une piste par île (music/ile1.mp3, music/ile2.mp3), en boucle, fondu enchaîné au traversier.
// Effets sonores synthétisés (WebAudio). La piste 2 n’est téléchargée qu’au besoin; une piste introuvable = silence, sans erreur.
const VOL = 0.32, DUCK = 0.55, FADE = 1.2; // musique sous les effets; un peu plus bas pendant une question
export function makeAudio() {
  let ctx = null, master, music, sfxBus, muted = false, paused = false, ducked = false, cur = 0;
  const NOTE = n => 440 * 2 ** ((n - 69) / 12);
  const tracks = {}; // n → { el, g }
  function tone(t, f, dur, { type = 'triangle', vol = 0.2, bus = sfxBus, attack = 0.01, glide = 0 } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (glide) o.frequency.exponentialRampToValueAtTime(glide, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(t, dur, { vol = 0.3, cut = 800, q = 0.7 } = {}) {
    const len = Math.ceil(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = buf; f.type = 'lowpass'; f.frequency.value = cut; f.Q.value = q; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t);
  }
  function track(n, preload = 'auto') { // créée au premier besoin seulement (chargement paresseux)
    if (tracks[n] || !ctx) return tracks[n];
    const el = new Audio(); el.loop = true; el.preload = preload; el.src = `music/ile${n}.mp3`; el.addEventListener('error', () => {}); el.addEventListener('canplay', () => +n === cur && !muted && !paused && el.paused && play(el));
    const g = ctx.createGain(); g.gain.value = 0;
    try { ctx.createMediaElementSource(el).connect(g); g.connect(music); } catch { /* lecteur sans WebAudio sur <audio> : on reste muet */ }
    return (tracks[n] = { el, g });
  }
  const play = el => { const p = el.play(); p && p.catch(() => {}); };
  function sync() { // applique île courante + muet + pause à toutes les pistes, avec fondu
    if (!ctx) return; const t = ctx.currentTime, on = !muted && !paused;
    music.gain.setTargetAtTime(ducked ? VOL * DUCK : VOL, t, 0.3);
    for (const [n, k] of Object.entries(tracks)) {
      const live = +n === cur && on;
      k.g.gain.cancelScheduledValues(t); k.g.gain.setValueAtTime(k.g.gain.value, t); k.g.gain.linearRampToValueAtTime(live ? 1 : 0, t + (on ? FADE : 0.05));
      if (live) play(k.el); else if (!on) k.el.pause(); else { clearTimeout(k.stop); k.stop = setTimeout(() => +n !== cur && k.el.pause(), FADE * 1000 + 100); }
    }
  }
  const A = {
    get started() { return !!ctx; }, get muted() { return muted; },
    start(island = 1) { // à appeler dans le geste « Jouer » (iOS / blocage de lecture automatique)
      if (ctx) { ctx.resume(); return; }
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext; if (!AC) return;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.7; master.connect(ctx.destination);
      music = ctx.createGain(); music.gain.value = VOL; music.connect(master);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
      A.island(island);
    },
    island(n) { cur = n; track(n); sync(); },   // fondu enchaîné vers la piste de l’île n
    preload(n) { track(n); },                    // ex. dès que le traversier s’ouvre
    setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 0.7, ctx.currentTime, 0.05); sync(); },
    setPaused(p) { if (p !== paused) { paused = p; sync(); } },
    duck(d) { if (d !== ducked) { ducked = d; sync(); } },
    get playing() { return Object.fromEntries(Object.entries(tracks).map(([n, k]) => [n, !k.el.paused && k.g.gain.value > 0.01])); }, // pour les tests
    sfx(name) {
      if (!ctx || muted) return; const t = ctx.currentTime + 0.01;
      switch (name) {
        case 'coin': tone(t, 988, 0.12, { type: 'square', vol: 0.06 }); tone(t + 0.07, 1319, 0.3, { type: 'square', vol: 0.06 }); break;
        case 'ok': [72, 76, 79, 84].forEach((n, i) => tone(t + i * 0.08, NOTE(n), 0.35, { vol: 0.14 })); break;
        case 'miss': tone(t, NOTE(64), 0.25, { type: 'sine', vol: 0.12 }); tone(t + 0.15, NOTE(60), 0.4, { type: 'sine', vol: 0.12 }); break;
        case 'near': tone(t, NOTE(67), 0.2, { type: 'sine', vol: 0.12 }); tone(t + 0.12, NOTE(69), 0.3, { type: 'sine', vol: 0.12 }); break;
        case 'click': tone(t, 1800, 0.04, { type: 'sine', vol: 0.05 }); break;
        case 'up': [65, 69, 72, 77, 81, 84].forEach((n, i) => tone(t + i * 0.09, NOTE(n), 0.6, { vol: 0.12 })); tone(t + 0.55, NOTE(89), 1.2, { type: 'sine', vol: 0.06 }); break;
        case 'splash': noise(t, 0.5, { vol: 0.35, cut: 1200 }); break;
        case 'bite': tone(t, 1400, 0.08, { type: 'sine', vol: 0.15 }); tone(t + 0.1, 1400, 0.08, { type: 'sine', vol: 0.15 }); break;
        case 'catch': tone(t, 400, 0.4, { type: 'triangle', vol: 0.12, glide: 1200 }); break;
        case 'dig': noise(t, 0.25, { vol: 0.5, cut: 400 }); noise(t + 0.2, 0.2, { vol: 0.4, cut: 350 }); break;
        case 'shake': noise(t, 0.6, { vol: 0.25, cut: 3000, q: 0.3 }); break;
        case 'water': noise(t, 0.9, { vol: 0.18, cut: 2500, q: 0.4 }); break;
        case 'talk': [0, 1, 2].forEach(i => tone(t + i * 0.07, 500 + Math.random() * 300, 0.06, { type: 'sine', vol: 0.06 })); break;
      }
    },
  };
  return A;
}
