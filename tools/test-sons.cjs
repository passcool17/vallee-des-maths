// Test navigateur : « sons de vie » (démarrage après le geste, plafond de voix, volume selon la distance, voix des créatures, pas, bouton 🐦)
// Usage : node tools/test-sons.cjs [port]   (serveur : node tools/serve.js 8653)
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
const PORT = process.argv[2] || 8653, BASE = `http://localhost:${PORT}/?fresh=1&seed=4242&adapt=0`;
let pass = 0, fail = 0, errs = [];
const ok = (name, c, extra = '') => { if (c) pass++; else fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${name}${c || !extra ? '' : ' — ' + extra}`); };
(async () => {
  const b = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  async function open(q, mob) {
    const c = await b.newContext(mob ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1024, height: 640 } }); const p = await c.newPage();
    p.on('pageerror', e => errs.push(q + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(q + ': ' + m.text()); });
    await p.goto(BASE + q); await p.waitForFunction(() => window.__mv, null, { timeout: 30000 });
    return { c, p };
  }
  const has = (p, k) => p.evaluate(k => __mv.sons().played.some(x => x.startsWith(k)), k);
  try {
    let { c, p } = await open('&time=midi');
    ok('a pas de son avant le geste « Jouer »', await p.evaluate(() => !__mv.audio.started && !__mv.audio.ctx));
    await p.click('#play'); await p.evaluate(() => __mv.waitT(0.8));
    const st = await p.evaluate(() => ({ started: __mv.audio.started, life: !!__mv.audio.life, beds: Object.keys(__mv.sons().beds), state: __mv.audio.ctx.state }));
    ok('a après le geste : contexte audio + bus « vie » + nappes (vagues, vent, grillons)', st.started && st.life && st.beds.length === 3, JSON.stringify(st));
    // volume selon la distance
    const att = await p.evaluate(() => { const S = __mv.sons(), P = __mv.player.pos; return [1, 6, 12, 18, 30].map(d => { const v = S.voice(P.x + d, P.z, 0.05, 1, true); return v ? +v.att.toFixed(3) : 0; }); });
    ok('b le volume baisse avec la distance (et 0 au loin)', att.every((v, i) => i === 0 || v < att[i - 1] || v === 0) && att[0] > 0.8 && att[4] === 0, JSON.stringify(att));
    await p.evaluate(() => __mv.waitT(0.4));
    // plafond de voix
    const capT = await p.evaluate(() => { const S = __mv.sons(), P = __mv.player.pos; for (let i = 0; i < 30; i++) S.snd.bird(P.x + 1, P.z); return { v: S.voices, max: S.maxSeen, cap: S.cap() }; });
    ok('b plafond : jamais plus de 8 voix à la fois', capT.max <= 8 && capT.v <= 8 && capT.cap === 8, JSON.stringify(capT));
    await p.evaluate(() => __mv.waitT(1.5));
    // voix des créatures
    await p.evaluate(() => { const v = __mv.G.villagers.find(q => q.id === 'therese'); __mv.sons().talk(v); }); await p.evaluate(() => __mv.waitT(0.8));
    ok('c Thérèse parle en petits « blablas »', await has(p, 'blabla:therese'));
    await p.evaluate(() => { const ch = __mv.G.pets.charlie; __mv.tp(ch.pos.x + 0.5, ch.pos.z - 1); __mv.G.sons.pet(ch); }); await p.evaluate(() => __mv.waitT(0.6));
    ok('c flatter Charlie : jappement + halètement', await has(p, 'yip') && await has(p, 'pant'));
    await p.evaluate(() => __mv.waitT(1.2));
    await p.evaluate(() => { const g = __mv.G.pets.pets.find(a => a.id === 'gisele'); __mv.tp(g.pos.x + 0.5, g.pos.z + 1); __mv.G.sons.pet(g); }); await p.evaluate(() => __mv.waitT(0.3));
    ok('c flatter Gisèle : ronron + miaou', await has(p, 'purr:gisele') && await has(p, 'meow:gisele'));
    // pas selon le sol
    await p.evaluate(() => __mv.waitT(1.5));
    await p.evaluate(() => __mv.tp(-6, 8)); await p.evaluate(() => __mv.waitT(0.3)); await p.keyboard.down('KeyS'); await p.evaluate(() => __mv.waitT(0.9)); await p.keyboard.up('KeyS');
    ok('d pas dans l’herbe en marchant', await has(p, 'pas:herbe'), JSON.stringify(await p.evaluate(() => __mv.sons().played.slice(-6))));
    await p.evaluate(() => { __mv.tp(6, 31); }); await p.evaluate(() => __mv.waitT(0.3)); await p.keyboard.down('KeyW'); await p.evaluate(() => __mv.waitT(0.8)); await p.keyboard.up('KeyW');
    ok('d pas sur le bois du quai', await has(p, 'pas:bois'), JSON.stringify(await p.evaluate(() => [__mv.player.pos.x, __mv.player.pos.z, __mv.sons().played.slice(-4)])));
    // vagues selon la distance à l’eau
    await p.evaluate(() => __mv.tp(0, -4)); await p.evaluate(() => __mv.waitT(0.6)); const wIn = await p.evaluate(() => __mv.sons().waves);
    await p.evaluate(() => __mv.tp(6, 37)); await p.evaluate(() => __mv.waitT(0.6)); const wSh = await p.evaluate(() => __mv.sons().waves);
    ok('e vagues plus fortes près de l’eau', wSh > wIn + 0.2, JSON.stringify({ wIn, wSh }));
    // bouton 🐦 : coupe les sons de vie sans couper la musique
    await p.click('#btn-vie'); await p.evaluate(() => __mv.waitT(0.2));
    const off = await p.evaluate(() => ({ sons: __mv.audio.sons, muted: __mv.audio.muted, saved: __mv.state.sons, btn: document.getElementById('btn-vie').textContent, v: __mv.sons().voice(__mv.player.pos.x, __mv.player.pos.z, 0.1) }));
    ok('f 🐦 coupe les sons de vie (sauvegardé), la musique reste', !off.sons && !off.muted && off.saved === false && off.btn === '🔕' && off.v === null, JSON.stringify(off));
    await p.keyboard.press('KeyN'); ok('f N les remet', await p.evaluate(() => __mv.audio.sons && __mv.state.sons));
    await c.close();
    // nuit : grillons ; île 2 : Bernard le huard
    ({ c, p } = await open('&time=nuit')); await p.click('#play'); await p.evaluate(() => __mv.waitT(1.5));
    ok('g la nuit : les grillons chantent', await p.evaluate(() => __mv.sons().night > 0.9 && __mv.sons().beds.grillons.g.gain.value >= 0));
    await p.evaluate(() => { __mv.unlockFerry(); return __mv.travel(2); }); await p.evaluate(() => __mv.waitT(1));
    await p.evaluate(() => { const v = __mv.G.villagers.find(q => q.id === 'bernard'); __mv.tp(v.pos.x + 1, v.pos.z + 1); __mv.sons().talk(v); }); await p.evaluate(() => __mv.waitT(1.6));
    ok('g Bernard : blabla puis cri du huard', await has(p, 'blabla:bernard') && await has(p, 'loon'));
    await c.close();
    // palier bas : plafond 5 ; mobile : démarre au toucher
    ({ c, p } = await open('&time=midi&q=5', true)); await p.tap('#play'); await p.evaluate(() => __mv.waitT(0.8));
    const low = await p.evaluate(() => { const S = __mv.sons(), P = __mv.player.pos; for (let i = 0; i < 20; i++) S.snd.bird(P.x, P.z); return { cap: S.cap(), max: S.maxSeen, started: __mv.audio.started }; });
    ok('h mobile palier 5 : démarre au toucher, plafond 5 voix', low.started && low.cap === 5 && low.max <= 5, JSON.stringify(low));
    await p.screenshot({ path: '/workspace/games/math-valley/shots/sons/m-hud.png' });
    await c.close();
  } catch (e) { ok('exception', false, e.stack); }
  ok('z 0 erreur console', errs.length === 0, errs.slice(0, 5).join(' | '));
  console.log(`\n${pass} PASS, ${fail} FAIL`); await b.close(); process.exit(fail ? 1 : 0);
})();
