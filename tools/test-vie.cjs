// Test navigateur : « vie » (nuit lisible, lucioles/feuilles/lumières selon le palier, marche animée, ?joli=0)
// Usage : node tools/test-vie.cjs [port]   (serveur : node tools/serve.js 8653)
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
const PORT = process.argv[2] || 8653, BASE = `http://localhost:${PORT}/?fresh=1&seed=4242&adapt=0`;
let pass = 0, fail = 0, errs = [];
const ok = (name, c, extra = '') => { if (c) pass++; else fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${name}${c || !extra ? '' : ' — ' + extra}`); };
(async () => {
  const b = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  async function open(q) {
    const c = await b.newContext({ viewport: { width: 1024, height: 640 } }); const p = await c.newPage();
    p.on('pageerror', e => errs.push(q + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(q + ': ' + m.text()); });
    await p.goto(BASE + q); await p.waitForFunction(() => window.__mv, null, { timeout: 30000 }); await p.click('#play'); await p.evaluate(() => __mv.waitT(0.6));
    return { c, p };
  }
  // luminance moyenne (0..255) d’une capture, décodée dans la page
  const lum = async p => { const png = (await p.screenshot()).toString('base64');
    return p.evaluate(async s => { const im = new Image(); im.src = 'data:image/png;base64,' + s; await im.decode(); const cv = document.createElement('canvas'); cv.width = 256; cv.height = 160;
      const x = cv.getContext('2d'); x.drawImage(im, 0, 0, 256, 160); const d = x.getImageData(0, 0, 256, 160).data; let L = 0, B = 0, R = 0;
      for (let i = 0; i < d.length; i += 4) { L += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; B += d[i + 2]; R += d[i]; } const n = d.length / 4; return { L: L / n, B: B / n, R: R / n }; }, png); };
  try {
    // ---- nuit, palier 0
    let { c, p } = await open('&time=nuit');
    await p.evaluate(() => { __mv.tp(2, 6); }); await p.evaluate(() => __mv.waitT(2.5));
    const s0 = await p.evaluate(() => __mv.vie());
    ok('a « vie » actif avec joli', !!s0 && s0.night > 0.9, JSON.stringify(s0));
    const L = await lum(p);
    ok('a nuit lisible : luminance moyenne > 55', L.L > 55, JSON.stringify(L));
    ok('a nuit bleu froid : bleu > rouge', L.B > L.R, JSON.stringify(L));
    ok('a lucioles visibles la nuit', s0.fireflies >= 40, JSON.stringify(s0));
    ok('a étoiles et lune', s0.stars, JSON.stringify(s0));
    ok('a lanternes du sentier (≥ 5) et vraies lumières (≤ 4)', s0.lanterns >= 5 && s0.lights >= 1 && s0.lights <= 4 && s0.lightsOn >= 1, JSON.stringify(s0));
    ok('a reflets d’eau actifs au palier 0', s0.refl === 1);
    // feuilles d’automne qui tombent (près des arbres)
    await p.evaluate(() => __mv.tp(-2, -14.5)); await p.evaluate(() => __mv.waitT(4));
    const sL = await p.evaluate(() => __mv.vie());
    ok('a feuilles qui tombent près des arbres', sL.leavesFalling >= 1, JSON.stringify(sL));
    // ---- marche : Camille, Charlie
    await p.evaluate(() => __mv.tp(2, 6)); await p.evaluate(() => __mv.waitT(0.5));
    const ph0 = await p.evaluate(() => __mv.walk().phase);
    await p.keyboard.down('KeyA'); await p.evaluate(() => __mv.waitT(0.3));
    const w = await p.evaluate(() => ({ ...__mv.walk(), legs: __mv.G.pets.pets.filter(a => a.legs).map(a => +a.legs[0].rotation.x.toFixed(3)) }));
    await p.evaluate(() => __mv.waitT(0.15));
    const legs2 = await p.evaluate(() => __mv.G.pets.pets.filter(a => a.legs).map(a => +a.legs[0].rotation.x.toFixed(3)));
    await p.keyboard.up('KeyA');
    ok('b Camille marche : phase de pas qui avance', w.player && w.phase !== ph0, JSON.stringify(w));
    const petW = await p.evaluate(async () => { const L = () => __mv.G.pets.pets.filter(a => a.legs).map(a => a.legs[0].rotation.x); const l0 = L(); __mv.tp(-6, 6);
      for (let i = 0; i < 30; i++) { await __mv.waitT(0.1); const l = L(); if (__mv.walk().pets.length && l.some((v, k) => Math.abs(v - l0[k]) > 0.05)) return true; } return false; });
    ok('b un animal suit en marchant (pattes qui bougent)', petW, JSON.stringify({ w, legs2 }));
    await p.evaluate(() => __mv.waitT(1));
    const rest = await p.evaluate(() => { const b = __mv.player.body || null; return { moving: __mv.walk().player }; });
    ok('b à l’arrêt : plus de marche', !rest.moving);
    const vw = await p.evaluate(async () => { for (let i = 0; i < 40; i++) { if (__mv.walk().villagers.length) return true; await __mv.waitT(0.25); } return false; });
    ok('b un villageois se promène (animation de marche)', vw);
    await c.close();
    // ---- palier 5 : moins de particules, pas de reflets ni de vraies lumières
    ({ c, p } = await open('&time=nuit&q=5'));
    await p.evaluate(() => __mv.tp(2, 6)); await p.evaluate(() => __mv.waitT(2.5));
    const s5 = await p.evaluate(() => __mv.vie());
    ok('c palier 5 : moins de lucioles', s5.firefliesMax < s0.firefliesMax && s5.fireflies < s0.fireflies, JSON.stringify({ s0, s5 }));
    ok('c palier 5 : moins de feuilles possibles', s5.leavesMax < s0.leavesMax && s5.level === 5, JSON.stringify(s5));
    ok('c palier 5 : 0 vraie lumière, reflets coupés', s5.lightsOn === 0 && s5.refl === 0, JSON.stringify(s5));
    await c.close();
    // ---- enseigne du magasin : plaque plate devant le toit (avant : sprite traversé par la pyramide)
    ({ c, p } = await open('&time=midi'));
    const sg = await p.evaluate(() => { let r = null; __mv.world.root.traverse(o => { if (o.isMesh && o.parent && o.parent.userData.sign === o) { const roof = o.parent.children.find(k => k.geometry.type === 'CylinderGeometry'); const e = roof.geometry.parameters.radiusBottom / Math.SQRT2 * roof.scale.z; const h = o.geometry.parameters.height; r = { mesh: true, back: o.position.z - Math.sin(-o.rotation.x) * h / 2, roofEdge: e, w: o.geometry.parameters.width }; } }); return r; });
    ok('d enseigne MAGASIN GÉNÉRAL : plaque entière devant le bord du toit', sg && sg.mesh && sg.back > sg.roofEdge + 0.5 && sg.w <= 6.6, JSON.stringify(sg));
    await c.close();
    // ---- midi : pas de lucioles, lanternes éteintes
    ({ c, p } = await open('&time=midi'));
    await p.evaluate(() => __mv.waitT(1));
    const sm = await p.evaluate(() => __mv.vie());
    ok('d midi : lucioles et lumières éteintes', sm.fireflies === 0 && sm.lightsOn === 0 && !sm.stars, JSON.stringify(sm));
    await c.close();
    // ---- ?joli=0 marche encore
    ({ c, p } = await open('&time=nuit&joli=0'));
    await p.evaluate(() => { __mv.tp(2, 6); }); await p.evaluate(() => __mv.waitT(1));
    ok('e ?joli=0 se charge sans « vie »', await p.evaluate(() => !__mv.vie() && __mv.player.pos.x === 2));
    await c.close();
  } catch (e) { ok('exception', false, e.stack); }
  ok('z 0 erreur console', errs.length === 0, errs.slice(0, 5).join(' | '));
  console.log(`\n${pass} PASS, ${fail} FAIL`); await b.close(); process.exit(fail ? 1 : 0);
})();
