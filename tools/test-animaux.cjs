// Test navigateur : animaux (Charlie qui rapporte, quêtes « Trouve Olga »…, sauvegarde v5, Charlie contourne les villageois)
// Usage : node tools/test-animaux.cjs [port]   (serveur : node tools/serve.js 8653)
const { chromium } = require('/usr/local/lib/pnpm/5/.pnpm/playwright@1.63.0-alpha-2026-08-31/node_modules/playwright');
const PORT = process.argv[2] || 8653, URL = `http://localhost:${PORT}/?seed=4242&time=midi&adapt=0`;
let pass = 0, fail = 0, errs = [];
const ok = (name, c, extra = '') => { if (c) pass++; else fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${name}${c || !extra ? '' : ' — ' + extra}`); };
(async () => {
  const b = await chromium.launch({ executablePath: '/home/box/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  async function open(q = '&fresh=1', init) {
    const c = await b.newContext({ viewport: { width: 1280, height: 800 } }); const p = await c.newPage();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
    if (init) await p.addInitScript(init);
    await p.goto(URL + q); await p.waitForFunction(() => window.__mv); await p.click('#play'); await p.evaluate(() => __mv.waitT(0.4));
    await p.evaluate(() => { const s = __mv.G.audio.sfx.bind(__mv.G.audio); window.__sfx = []; __mv.G.audio.sfx = n => { __sfx.push(n); return s(n); }; });
    return { c, p };
  }
  const clean = p => p.evaluate(() => document.querySelectorAll('#toasts .toast').forEach(t => t.remove()));
  try {
    const { c, p } = await open();
    ok('a nouvelle partie en v5 avec animaux par défaut', await p.evaluate(() => __mv.state.v === 5 && __mv.state.animaux.collier === 'bleu' && !__mv.state.animaux.quete));

    // ---- Charlie rapporte : en le flattant (« Va chercher! »)
    await p.evaluate(() => { const ch = __mv.G.pets.charlie; __mv.tp(ch.pos.x + 0.2, ch.pos.z - 1.2); __mv.player.face(ch.pos.x, ch.pos.z); });
    await p.evaluate(() => __mv.waitT(0.1));
    const who = await p.evaluate(() => __mv.nearest());
    await p.keyboard.press('KeyE');
    await p.waitForFunction(() => __mv.animaux().fetching, null, { timeout: 8000 }).catch(() => {});
    ok('b flatter Charlie le fait partir chercher quelque chose', await p.evaluate(() => __mv.state.animaux.fetchN === 1), `nearest=${who}`);
    await p.waitForFunction(() => __mv.animaux().fetching === 'back', null, { timeout: 20000 }).catch(() => {});
    ok('b il revient avec l’objet dans la gueule', await p.evaluate(() => !!__mv.G.pets.charlie.carry && __mv.G.pets.charlie.carry.visible !== false));
    await p.waitForFunction(() => __mv.animaux().drop, null, { timeout: 20000 }).catch(() => {});
    const drop = await p.evaluate(() => __mv.animaux().drop);
    ok('b il dépose la trouvaille près de Camille (émote + toast)', !!drop && await p.evaluate(d => Math.hypot(__mv.player.pos.x - d.x, __mv.player.pos.z - d.z) < 3 && /rapporte/.test(document.getElementById('toasts').textContent) && __sfx.includes('woof'), drop), JSON.stringify(drop));
    const before = await p.evaluate(() => ({ m: __mv.state.money, b: __mv.state.bag.length }));
    await p.evaluate(d => { __mv.tp(d.x, d.z + 0.8); __mv.player.face(d.x, d.z); }, drop); await p.evaluate(() => __mv.waitT(0.1));
    ok('b invite « Ramasser… »', await p.evaluate(() => __mv.nearest() === 'fetch' && /Ramasser/.test(document.getElementById('prompt').textContent)));
    await p.keyboard.press('KeyE'); await p.evaluate(() => __mv.waitT(0.2));
    const after = await p.evaluate(() => ({ m: __mv.state.money, b: __mv.state.bag.length, d: __mv.animaux().drop }));
    ok('b ramasser donne des sous ou un objet dans le sac', !after.d && (drop.k === 'piece' ? after.m - before.m >= 25 : after.b === before.b + 1), JSON.stringify({ before, after, k: drop.k }));
    // limite : pause, puis 3 par jour
    ok('b pause entre deux rapports', await p.evaluate(() => __mv.comp.fetch(false) === false));
    const lim = await p.evaluate(async () => { const a = __mv.state.animaux, r = [];
      for (let i = 0; i < 3; i++) { a.fetchT = -1e9; const ok1 = __mv.comp.fetch(false); r.push(ok1); if (ok1) await new Promise(res => { const t0 = Date.now(); const t = setInterval(() => { if (__mv.animaux().drop || Date.now() - t0 > 60000) { clearInterval(t); __mv.comp.pickup(); res(); } }, 100); }); }
      return { r, n: a.fetchN }; });
    ok('b au plus 3 rapports par journée', lim.r.join() === 'true,true,false' && lim.n === 3, JSON.stringify(lim));
    ok('b nouvelle journée : Charlie repart', await p.evaluate(async () => { __mv.state.day++; __mv.state.animaux.fetchT = -1e9; const r = __mv.comp.fetch(false); if (r) await new Promise(res => { const t0 = Date.now(); const t = setInterval(() => { if (__mv.animaux().drop || Date.now() - t0 > 60000) { clearInterval(t); __mv.comp.pickup(); res(); } }, 100); }); return r && __mv.state.animaux.fetchN === 1; }));

    // ---- Quêtes : Thérèse les donne, 3 par jour
    await clean(p);
    await p.evaluate(() => __mv.flows.talk(__mv.G.villagers.find(v => v.id === 'therese')));
    const opt = await p.$('#panel button:has-text("Quêtes des animaux")'); ok('c Thérèse propose les quêtes des animaux', !!opt);
    await opt.click(); await p.evaluate(() => __mv.waitT(0.2));
    ok('c 3 quêtes listées', await p.evaluate(() => document.querySelectorAll('#panel .qrow').length) === 3);
    const ids = await p.evaluate(() => [...document.querySelectorAll('#panel .qrow')].map(e => e.dataset.q));
    for (const id of ids) {
      const m0 = await p.evaluate(() => __mv.state.money);
      await p.evaluate(id => { if (!document.querySelector('#panel .qrow')) __mv.flows.quetes(); document.querySelector(`#panel .qrow[data-q="${id}"] .btn.primary`).click(); }, id);
      await p.evaluate(() => __mv.waitT(0.2));
      const s = await p.evaluate(() => ({ q: __mv.state.animaux.quete, spot: __mv.state.animaux.spot, hud: document.getElementById('quete').textContent, vis: !document.getElementById('quete').classList.contains('hidden'), hide: __mv.animaux().hide }));
      ok(`d ${id} : quête lancée, ligne HUD visible`, s.q === id && s.vis && /🐾/.test(s.hud) && s.hide === id, JSON.stringify(s));
      // indice : le chat caché est à la cachette (queue visible), miaous quand on approche ; pour la balle, Charlie jappe
      if (id !== 'balle') ok(`d ${id} : le chat est caché à la cachette`, await p.evaluate(([id, s]) => { const a = __mv.G.pets.pets.find(q => q.id === id); return a.hidden && Math.hypot(a.pos.x - s[0], a.pos.z - s[1]) < 0.6; }, [id, s.spot]));
      await p.evaluate(s => { __sfx.length = 0; __mv.tp(s[0] + 4, s[1] + 3); }, s.spot); await p.evaluate(() => __mv.waitT(5));
      ok(`d ${id} : indice sonore près de la cachette`, await p.evaluate(id => __sfx.includes(id === 'balle' ? 'woof' : 'miaou'), id), await p.evaluate(() => __sfx.join()));
      ok(`d ${id} : la ligne HUD dit si ça chauffe`, /chauffe|Tout près|Tiède/.test(await p.evaluate(() => document.getElementById('quete').textContent)));
      await p.evaluate(s => { __mv.tp(s[0], s[1] + 1.3); __mv.player.face(s[0], s[1]); }, s.spot); await p.evaluate(() => __mv.waitT(0.15));
      ok(`d ${id} : invite pour trouver`, await p.evaluate(() => __mv.nearest() === 'quete'));
      await p.keyboard.press('KeyE'); await p.evaluate(() => __mv.waitT(0.3));
      const r = await p.evaluate(id => ({ m: __mv.state.money, a: __mv.state.animaux, hide: __mv.animaux().hide, hud: document.getElementById('quete').classList.contains('hidden'), col: '#' + __mv.G.pets.charlie.collar.material.color.getHexString() }), id);
      ok(`d ${id} : trouvé, récompense et collier neuf`, r.m > m0 && !r.a.quete && r.a.faites[id] === r.a.day && r.a.colliers.length >= 2 && r.col !== '#2f74d8' && !r.hide && r.hud, JSON.stringify({ m0, ...r }));
      ok(`d ${id} : pas deux fois le même jour`, await p.evaluate(id => __mv.comp.start(id) === false, id));
    }
    ok('d chats revenus chez eux', await p.evaluate(() => __mv.G.pets.pets.filter(a => a.id !== 'charlie').every(a => !a.hidden)));
    // carnet : section animaux + collier à choisir
    await clean(p); await p.keyboard.press('KeyC'); await p.evaluate(() => __mv.waitT(0.2));
    ok('e carnet : section 🐾 avec les 3 quêtes faites', await p.evaluate(() => document.querySelectorAll('#panel .animaux .qrow').length === 3 && [...document.querySelectorAll('#panel .animaux .lv')].every(e => e.textContent === 'Faite')));
    await p.evaluate(() => document.querySelector('#panel .chip.collier[data-c="bleu"]').click()); await p.evaluate(() => __mv.waitT(0.1));
    ok('e carnet : changer le collier de Charlie', await p.evaluate(() => __mv.state.animaux.collier === 'bleu' && __mv.G.pets.charlie.collar.material.color.getHexString() === '2f74d8'));
    await p.evaluate(() => __mv.flows.overlay?.close?.()); await p.keyboard.press('Escape');
    // rotation le lendemain
    ok('e lendemain : quêtes de nouveau libres, ordre différent', await p.evaluate(ids => { __mv.state.day++; const l = __mv.comp.jour(); return l.every(q => q.etat === 'libre') && l.map(q => q.id).join() !== ids.join(); }, ids));

    // ---- Charlie contourne les villageois
    const av = await p.evaluate(async () => {
      const v = __mv.G.villagers.find(v => v.id === 'therese'), ch = __mv.G.pets.charlie; let min = 99;
      // Camille d’un côté, Charlie de l’autre : il doit faire le tour
      for (const dir of [[1, 0], [0, 1], [-1, 0]]) {
        ch.pos.set(v.pos.x - dir[0] * 2.4, 0, v.pos.z - dir[1] * 2.4); __mv.tp(v.pos.x + dir[0] * 2.6, v.pos.z + dir[1] * 2.6);
        const t0 = __mv.G.time; while (__mv.G.time - t0 < 2.5) { await new Promise(r => requestAnimationFrame(r)); for (const w of __mv.G.villagers) min = Math.min(min, Math.hypot(w.pos.x - ch.pos.x, w.pos.z - ch.pos.z)); }
      }
      return { min, d: Math.hypot(__mv.player.pos.x - ch.pos.x, __mv.player.pos.z - ch.pos.z) };
    });
    ok('f Charlie ne passe pas au travers des villageois (≥ 0,85 m)', av.min >= 0.85, JSON.stringify(av));
    ok('f … et rejoint quand même Camille', av.d < 4, JSON.stringify(av));

    // ---- Sauvegarde : quête en cours conservée au rechargement ; migration v4 → v5
    await p.evaluate(() => { __mv.comp.start('olga'); __mv.G.save(); });
    const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('vdm.save.v1')));
    ok('g sauvegarde v5 avec animaux', saved.v === 5 && saved.animaux.quete === 'olga' && Array.isArray(saved.animaux.spot) && saved.animaux.colliers.length === 4 && saved.animaux.olga);
    const p2 = await c.newPage(); p2.on('pageerror', e => errs.push(e.message));
    await p2.goto(URL, { timeout: 90000, waitUntil: 'domcontentloaded' }); await p2.waitForFunction(() => window.__mv, null, { timeout: 90000 }); await p2.evaluate(() => __mv.waitT(0.3));
    ok('g rechargée : Olga toujours cachée au même endroit', await p2.evaluate(s => { const o = __mv.G.pets.pets.find(a => a.id === 'olga'); return __mv.state.animaux.quete === 'olga' && o.hidden && Math.hypot(o.pos.x - s[0], o.pos.z - s[1]) < 0.6 && __mv.animaux().hide === 'olga'; }, saved.animaux.spot));
    await p2.close(); await c.close();
    const { c: c4, p: p4 } = await open('', () => { if (!sessionStorage.done) { sessionStorage.done = 1; localStorage.setItem('vdm.save.v1', JSON.stringify({ v: 4, seed: 4242, money: 777, tools: { canne: 1, arrosoir: 0, filet: 0, pelle: 0, sac: 0 }, bag: [], island: 1, day: 3, stats: {}, recentQ: [] })); } });
    const m4 = await p4.evaluate(() => ({ v: __mv.state.v, a: __mv.state.animaux, m: __mv.state.money }));
    ok('g sauvegarde v4 → v5 : animaux ajoutés, rien de perdu', m4.v === 5 && m4.m === 777 && m4.a.collier === 'bleu' && m4.a.quete === null && m4.a.fetchN === 0, JSON.stringify(m4));
    await c4.close();
  } catch (e) { fail++; console.log('FAIL exception', e.stack); }
  ok('h 0 erreur console', errs.length === 0, errs.join(' | '));
  console.log(`\n${pass} PASS, ${fail} FAIL`); await b.close(); process.exit(fail ? 1 : 0);
})();
