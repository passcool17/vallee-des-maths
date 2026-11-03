// Musique douce et effets sonores synthétisés (WebAudio). Rien n’est chargé : tout est généré.
export function makeAudio() {
  let ctx = null, master, music, sfxBus, muted = false, phase = 'matin', timer = null, step = 0, nextT = 0;
  const NOTE = n => 440 * 2 ** ((n - 69) / 12);
  // Fa majeur : I – vi – IV – V, arpèges pentatoniques
  const CHORDS = [[53, 57, 60, 65, 69], [50, 53, 57, 62, 65], [46, 50, 53, 58, 62], [48, 52, 55, 60, 64]];
  const PATTERN = [0, 2, 4, 3, 1, 3, 2, 4];
  const PH = { matin: { up: 12, cut: 2600, vol: 1 }, midi: { up: 12, cut: 3200, vol: 1 }, doree: { up: 12, cut: 1900, vol: 0.9 }, nuit: { up: 0, cut: 1200, vol: 0.75 } };
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
  function schedule() {
    const spb = 60 / 84 / 2; // croches
    while (nextT < ctx.currentTime + 0.4) {
      const ch = CHORDS[Math.floor(step / 16) % 4], p = PH[phase];
      const n = ch[PATTERN[step % 8]] + p.up;
      if (step % 8 !== 7 || step % 32 === 7) tone(nextT, NOTE(n), spb * 2.2, { vol: 0.07 * p.vol, bus: music, attack: 0.02 });
      if (step % 8 === 0) tone(nextT, NOTE(ch[0] - 12), spb * 7, { type: 'sine', vol: 0.09 * p.vol, bus: music, attack: 0.08 });
      if (step % 16 === 0) for (const k of [1, 2, 3]) tone(nextT, NOTE(ch[k]), spb * 15, { type: 'sine', vol: 0.025 * p.vol, bus: music, attack: 0.6 });
      music.filter.frequency.setTargetAtTime(p.cut, nextT, 0.5);
      nextT += spb; step++;
    }
  }
  const A = {
    get started() { return !!ctx; }, get muted() { return muted; },
    start() {
      if (ctx) { ctx.resume(); return; }
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext; if (!AC) return;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.7; master.connect(ctx.destination);
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 2400; filter.connect(master);
      music = ctx.createGain(); music.gain.value = 0.9; music.connect(filter); music.filter = filter;
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
      nextT = ctx.currentTime + 0.1; timer = setInterval(schedule, 120);
    },
    setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 0.7, ctx.currentTime, 0.05); },
    setPhase(p) { phase = p; },
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
