// Musique de fond : piste 1 sur l’île 1, piste 2 sur l’île 2 (fondu au traversier), muet, pause, piste introuvable.
// Usage : node tools/serve.js 8653 & node tools/test-music.cjs [port]
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
const path = require('path');
const PORT = +process.argv[2] || 8653, URL = `http://localhost:${PORT}/`;
const SHOTS = path.join(__dirname, '..', '..', 'shots', 'musique');
const EXE = '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? ' — ' + extra : ''}`); };

async function run(kind, { broken = false } = {}) {
  const mobile = kind === 'mobile', px = (mobile ? 'm' : 'd') + (broken ? ' (piste 2 introuvable)' : '');
  const browser = await chromium.launch({ executablePath: EXE, args: ARGS });
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1280, height: 800 } });
  const p = await ctx.newPage(); const errs = [], got = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  p.on('request', r => { const m = r.url().match(/music\/(ile\d)\.mp3/); if (m) got.push(m[1]); });
  if (broken) await p.route('**/music/ile2.mp3', r => r.fulfill({ status: 404, body: '' }));
  const ev = (f, a) => p.evaluate(f, a);
  const waitT = s => ev(s => __mv.waitT(s), s);
  const playing = () => ev(() => __mv.G.audio.playing);
  const settle = async () => { await p.waitForTimeout(1800); return playing(); }; // fondu de 1,2 s
  await p.goto(URL + '?fresh=1&seed=4242&time=matin');
  await p.waitForFunction(() => window.__mv);
  ok(`${px} rien de téléchargé avant Jouer`, got.length === 0, got.join(','));
  mobile ? await p.tap('#play') : await p.click('#play');
  let s = await settle();
  ok(`${px} piste 1 jouée sur l’île 1 après Jouer`, s[1] === true, JSON.stringify(s));
  ok(`${px} piste 2 pas encore téléchargée (chargement paresseux)`, !got.includes('ile2'), got.join(','));
  if (!broken && !mobile) await p.screenshot({ path: path.join(SHOTS, 'd-ile1.png') });
  await ev(() => __mv.unlockFerry()); await waitT(0.2);
  ok(`${px} piste 2 préchargée dès que le traversier s’ouvre`, got.includes('ile2'), got.join(','));
  await ev(() => __mv.travel(2, false)); s = await settle();
  ok(broken ? `${px} piste 2 introuvable : silence, piste 1 arrêtée` : `${px} piste 2 jouée après le traversier, piste 1 arrêtée`, (broken ? !s[2] : s[2] === true) && !s[1], JSON.stringify(s));
  ok(`${px} on est bien sur l’île 2`, await ev(() => __mv.island()) === 2);
  if (!broken) await p.screenshot({ path: path.join(SHOTS, `${mobile ? 'm' : 'd'}-ile2.png`) });
  await ev(() => __mv.travel(1, false)); s = await settle();
  ok(`${px} retour à l’île 1 : piste 1 de nouveau, piste 2 arrêtée`, s[1] === true && !s[2], JSON.stringify(s));
  if (!broken) {
    await ev(() => __mv.G.pause(true)); s = await settle();
    ok(`${px} pause : musique arrêtée`, !s[1] && !s[2], JSON.stringify(s));
    await ev(() => __mv.G.pause(false)); s = await settle();
    ok(`${px} reprise : piste 1 repart`, s[1] === true, JSON.stringify(s));
    mobile ? await p.tap('#btn-son') : await p.keyboard.press('KeyM'); s = await settle();
    ok(`${px} muet : les deux pistes arrêtées`, !s[1] && !s[2], JSON.stringify(s));
    ok(`${px} muet sauvegardé`, await ev(() => JSON.parse(Object.values(localStorage).find(v => v.includes('"muted"'))).muted === true));
    await ev(() => __mv.travel(2, false)); s = await settle();
    ok(`${px} muet tenu au traversier`, !s[1] && !s[2], JSON.stringify(s));
    mobile ? await p.tap('#btn-son') : await p.keyboard.press('KeyM'); s = await settle();
    ok(`${px} son réactivé : piste 2 repart`, s[2] === true && !s[1], JSON.stringify(s));
  }
  ok(`${px} 0 erreur JS`, errs.length === 0, errs.slice(0, 3).join(' | '));
  await browser.close();
}
(async () => {
  require('fs').mkdirSync(SHOTS, { recursive: true });
  await run('desktop'); await run('mobile'); await run('desktop', { broken: true });
  console.log(`\n${pass} PASS, ${fail} FAIL`); process.exit(fail ? 1 : 0);
})();
