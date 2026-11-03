// Parcours d’interface : dialogues, établi, exercices (indices, réchauffement), magasin, défis, carnet.
import { h, fmtMoney } from './ui.js';
import { makeExercise, canonical } from './math/gen.js';
import { checkAnswer } from './math/check.js';
import { SKILLS, DOMAINES, skillById, shortId, prereqsOf } from './math/skills.js';
import { MASTERY, TOOLS, toolById, nextUpgrade, difficultyFor, recordAnswer, isMastered, isUnlocked, defiChoices, masteryCount, stats } from './progression.js';
import { CATALOG, SELL, quoteFor, forgetQuote, checkTotal } from './shop.js';
import { NOMS, EMOJI } from './villagers.js';
import { NIVEAUX, loot, timeFor, makeTimer } from './actionq.js';

export const ITEMS = {
  perchaude: ['🐟', 'Perchaude'], achigan: ['🐟', 'Achigan'], dore: ['🐠', 'Doré jaune'], truite: ['🐠', 'Truite arc-en-ciel'],
  omble: ['🐠', 'Omble de fontaine'], maskinonge: ['🐟', 'Maskinongé'], esturgeon: ['🐋', 'Esturgeon jaune'],
  tire: ['🍭', 'Tire d’érable'], sirop: ['🍯', 'Cruchon de sirop ambré'], coulee: ['🍁', 'Sirop de première coulée'],
  monarque: ['🦋', 'Monarque'], amiral: ['🦋', 'Amiral'], lune: ['🦋', 'Papillon lune'],
  capsule: ['🧢', 'Capsule de liqueur'], bouton: ['🔘', 'Bouton de manteau'], cle: ['🗝️', 'Vieille clé'], pepite: ['✨', 'Pépite d’or'], trilobite: ['🐚', 'Trilobite fossile'],
};
const dots = (n, max = MASTERY) => h('span', { class: 'dots', 'aria-label': `${Math.min(n, max)} sur ${max}` }, Array.from({ length: max }, (_, i) => h('i', { class: i < n ? 'on' : '' })));
const stars = n => '★'.repeat(n) + '☆'.repeat(3 - n);
const face = id => h('div', { class: `face ${id}` }, EMOJI[id]);

export function makeFlows(G) {
  const { ui, audio } = G;
  const S = () => G.state;
  const click = () => audio.sfx('click');
  let keyHandler = null; // clavier actif dans le panneau (exercice, total)
  const F = {
    cur: null, // exercice ou devis en cours (pour les tests)
    handleKey(e) {
      if (!ui.isOpen) return false;
      if (e.code === 'Escape') { ui.close(); return true; }
      if (keyHandler) return keyHandler(e);
      if (e.code === 'Enter' || e.code === 'Space') { const b = document.querySelector('#panel .primary'); if (b) { b.click(); return true; } }
      return false;
    },
  };
  const open = (content, opts) => { keyHandler = null; F.cur = null; return ui.open(content, opts); };
  const swap = content => { keyHandler = null; F.cur = null; return ui.swap(content); };

  // ---------- Dialogue avec un villageois
  F.talk = (v) => {
    const st = S(); st.met[v.id] = (st.met[v.id] || 0) + 1; v.talkTo(); audio.sfx('talk');
    const line = v.nextLine(st.met[v.id] - 1);
    const opts = [];
    if (v.id === 'gaston') opts.push(['🔨 Voir l’établi', () => F.workbench()]);
    if (v.id === 'ginette') { opts.push(['🛒 Acheter', () => F.shop()]); opts.push([`💰 Vendre le sac (${st.bag.length})`, () => F.sell()]); }
    if (v.id === 'flocon') { opts.push(['⭐ Un défi!', () => F.defi()]); opts.push(['📒 Mon carnet', () => F.carnet()]); }
    opts.push(['👋 À plus tard!', () => ui.close()]);
    open(h('div', { class: 'dialog' },
      h('div', { class: 'who' }, face(v.id), h('div', {}, h('b', {}, NOMS[v.id]), h('p', { class: 'line' }, line))),
      h('div', { class: 'choices' }, opts.map(([t, f], i) => h('button', { class: `btn ${i === 0 ? 'primary' : ''}`, onclick: () => { click(); f(); } }, t)))), { cls: 'talk' });
  };

  // ---------- Établi de Gaston
  F.workbench = () => {
    const st = S();
    const cards = TOOLS.map(t => {
      const lvl = st.tools[t.id] || 0, up = nextUpgrade(st, t.id);
      let body;
      if (!up) body = h('p', { class: 'max' }, 'Niveau maximum! Beau travail.');
      else {
        const sk = skillById(up.skill);
        body = [h('p', { class: 'next' }, `Niveau ${up.level} : `, h('b', {}, sk.nom)), h('p', { class: 'benefit' }, `➜ ${up.benefit}`),
          up.unlocked ? h('div', { class: 'row' }, dots(up.progress), h('button', { class: 'btn primary', 'data-tool': t.id, onclick: () => { click(); F.exercise({ kind: 'upgrade', tool: t.id, skill: up.skill }); } }, 'Améliorer'))
            : h('div', { class: 'locked' }, '🔒 D’abord maîtriser : ', up.missing.map(id => skillById(id).nom).join(', '), h('button', { class: 'btn small', onclick: () => { click(); F.defi(up.missing[0]); } }, 'Défi de Flocon'))];
      }
      return h('div', { class: `tool ${!up ? 'done' : up.unlocked ? '' : 'lock'}` }, h('div', { class: 'ticon' }, t.icone), h('div', { class: 'tbody' }, h('div', { class: 'thead' }, h('b', {}, t.nom), h('span', { class: 'stars' }, stars(lvl))), body));
    });
    open(h('div', {}, h('div', { class: 'who' }, face('gaston'), h('div', {}, h('b', {}, 'L’établi de Gaston'), h('p', { class: 'line' }, 'Chaque amélioration : 3 bonnes réponses dans une compétence. Pas de presse!'))), h('div', { class: 'tools' }, cards)), { cls: 'bench' });
  };

  // ---------- Champs de réponse + pavé
  function answerBox(ex, onSubmit) {
    const A = ex.answer;
    if (A.kind === 'choice') {
      let sel = -1; const btns = A.choices.map((c, i) => h('button', { class: 'btn choice', 'data-i': i, onclick: () => { click(); sel = i; btns.forEach((b, k) => b.classList.toggle('sel', k === i)); } }, c));
      const box = h('div', { class: 'answer' }, h('div', { class: 'choices grid' }, btns), h('button', { class: 'btn primary validate', onclick: () => onSubmit(sel) }, 'Valider'));
      keyHandler = e => { const n = parseInt(e.key, 10); if (n >= 1 && n <= btns.length) { btns[n - 1].click(); return true; } if (e.code === 'Enter' || e.code === 'NumpadEnter') { onSubmit(sel); return true; } return false; };
      return { el: box, clear() { sel = -1; btns.forEach(b => b.classList.remove('sel')); } };
    }
    const vals = A.fields.map(() => ''); let active = 0;
    const inputs = A.fields.map((f, i) => h('button', { class: 'field', 'data-f': i, onclick: () => { active = i; paint(); } }));
    function paint() { inputs.forEach((b, i) => { b.textContent = vals[i] || ' '; b.classList.toggle('active', i === active); }); }
    function key(k) {
      if (k === '✓') return onSubmit(vals.slice());
      if (k === '⌫') vals[active] = vals[active].slice(0, -1);
      else if (k === 'C') vals[active] = '';
      else if (k === '−') vals[active] = vals[active].startsWith('−') ? vals[active].slice(1) : '−' + vals[active];
      else if (vals[active].length < 12) vals[active] += k;
      paint();
    }
    keyHandler = e => {
      if (/^[0-9]$/.test(e.key)) key(e.key); else if (e.key === ',' || e.key === '.') key(','); else if (e.key === '/') key('/'); else if (e.key === '-') key('−');
      else if (e.code === 'Backspace') key('⌫'); else if (e.code === 'Delete') key('C'); else if (e.code === 'Enter' || e.code === 'NumpadEnter') key('✓');
      else if (e.code === 'Tab') { active = (active + (e.shiftKey ? inputs.length - 1 : 1)) % inputs.length; paint(); } else return false;
      return true;
    };
    paint();
    const box = h('div', { class: 'answer' }, h('div', { class: 'fields' }, A.fields.map((f, i) => h('label', { class: 'fl' }, f.label ? h('span', {}, f.label) : null, inputs[i], f.unit ? h('span', { class: 'unit' }, f.unit) : null))), ui.numpad(k => { click(); key(k); }));
    return { el: box, clear() { vals.fill(''); active = 0; paint(); }, get values() { return vals; } };
  }

  // ---------- Séance d’exercices
  // s = { kind:'upgrade'|'defi'|'warmup', skill, tool?, d?, goal?, done, back? }
  F.exercise = (s) => {
    s.done = s.done || 0; s.goal = s.goal || (s.kind === 'warmup' ? 1 : MASTERY);
    const st = S(); st.exCount = (st.exCount || 0) + 1;
    const d = s.d ?? difficultyFor(st, s.skill);
    const ex = makeExercise(s.skill, `${st.seed}:${st.exCount}`, d);
    const sk = skillById(s.skill); let misses = 0, hintN = 0, locked = false;
    const hintsEl = h('div', { class: 'hints' }), fb = h('div', { class: 'feedback', role: 'status' });
    const hintBtn = h('button', { class: 'btn hint', onclick: () => { click(); showHint(); } }, '💡 Indice');
    const showBtn = h('button', { class: 'btn small hidden', onclick: () => { click(); reveal(); } }, 'Montre-moi la réponse');
    function showHint() { if (hintN >= ex.hints.length) return; hintsEl.append(h('p', { class: 'hintline' }, h('b', {}, `Indice ${hintN + 1} : `), ex.hints[hintN])); hintN++; hintBtn.textContent = hintN >= ex.hints.length ? '💡 Plus d’indices' : `💡 Indice ${hintN + 1}`; hintBtn.disabled = hintN >= ex.hints.length; }
    function progress() {
      if (s.kind === 'upgrade') return h('div', { class: 'prog' }, `${toolById(s.tool).icone} ${toolById(s.tool).nom} → niv. ${(st.tools[s.tool] || 0) + 1}`, dots(st.upg[s.tool] || 0));
      if (s.kind === 'defi') return h('div', { class: 'prog' }, '⭐ Défi de Flocon', dots(s.done));
      return h('div', { class: 'prog warm' }, '🔥 Réchauffement avec Flocon');
    }
    const next = h('button', { class: 'btn primary hidden', onclick: () => { click(); after(); } }, 'Continuer');
    let afterFn = null; const after = () => afterFn && afterFn();
    function done(fn, label = 'Continuer') { locked = true; afterFn = fn; next.textContent = label; next.classList.remove('hidden'); box.el.classList.add('hidden'); keyHandler = e => { if (e.code === 'Enter' || e.code === 'Space' || e.code === 'NumpadEnter') { after(); return true; } return false; }; }
    function reveal() { fb.className = 'feedback info'; fb.replaceChildren('La réponse était : ', h('b', {}, canonical(ex.answer)), '. On en essaie un autre, sans pénalité.'); showBtn.classList.add('hidden'); done(() => F.exercise(s), 'Nouvel exercice'); }
    function submit(v) {
      if (locked) return;
      const r = checkAnswer(v, ex.answer);
      if (r.empty || (ex.answer.kind === 'choice' && v < 0)) { fb.className = 'feedback info'; fb.textContent = ex.answer.kind === 'choice' ? 'Choisis une réponse.' : r.msg || 'Écris une réponse.'; return; }
      if (r.ok) {
        audio.sfx('ok'); const out = recordAnswer(st, s.skill, true, { tool: s.kind === 'upgrade' ? s.tool : null }); s.done++; G.save();
        fb.className = 'feedback ok'; fb.replaceChildren(h('b', {}, ['Bravo!', 'Excellent!', 'Tiguidou!', 'Bien joué!'][st.exCount % 4]), ' ', canonical(ex.answer));
        if (s.kind === 'defi') { st.money += 100; st.journal.coins += 100; fb.append(h('span', { class: 'gain' }, ' +1,00 $')); }
        if (out.mastered) ui.toast(`📒 Compétence maîtrisée : ${sk.nom}!`, 'gold');
        if (out.upgraded) return done(() => F.celebrate(out.upgraded), 'Voir mon outil!');
        if (s.kind === 'warmup') return done(() => s.back ? F.exercise(s.back) : ui.close(), s.back ? 'On y retourne!' : 'Terminer');
        if (s.kind === 'defi' && s.done >= s.goal) return done(() => F.defiEnd(s), 'Terminer');
        return done(() => F.exercise(s), 'Suivant');
      }
      misses++;
      if (r.near) { audio.sfx('near'); recordAnswer(st, s.skill, false, { near: true }); fb.className = 'feedback near'; fb.textContent = r.msg; return; }
      audio.sfx('miss'); const out = recordAnswer(st, s.skill, false, {}); G.save();
      fb.className = 'feedback no'; fb.textContent = r.msg || ['Pas tout à fait. Essaie encore!', 'Presque… un indice peut aider.', 'On respire, pis on recommence.'][Math.min(misses - 1, 2)];
      hintBtn.classList.add('pulse'); if (misses >= 2 && hintN === 0) showHint();
      if (misses >= 3) showBtn.classList.remove('hidden');
      if (out.warmup && s.kind !== 'warmup') offerWarmup(out.warmup);
      box.clear();
    }
    function offerWarmup(w) {
      const wsk = skillById(w.skill);
      const why = w.skill === s.skill ? 'une version plus simple' : `« ${wsk.nom} »`;
      const card = h('div', { class: 'warmup' }, face('flocon'), h('div', {}, h('p', {}, `Hou hou! Ça accroche un peu? Faisons un petit réchauffement sur ${why}, ça va aider.`),
        h('div', { class: 'row' }, h('button', { class: 'btn primary warm-yes', onclick: () => { click(); F.exercise({ kind: 'warmup', skill: w.skill, d: 0, back: { ...s, done: s.done } }); } }, 'Oui!'), h('button', { class: 'btn', onclick: () => { click(); card.remove(); } }, 'Non merci, je réessaie'))));
      fb.after(card);
    }
    const head = h('div', { class: 'exhead' }, progress(), h('h3', {}, sk.nom), h('span', { class: 'ref', title: 'Progression des apprentissages (MEQ)' }, `MEQ · ${sk.pda.split(' — ')[0]}`), h('span', { class: 'ref id' }, shortId(sk.id)));
    const content = h('div', { class: 'exercise' }, head, h('p', { class: 'q' }, ex.prompt), fb, hintsEl, h('div', { class: 'row tools' }, hintBtn, showBtn), next);
    const sheetFn = ui.isOpen ? swap : open; sheetFn(content, { cls: 'ex' });
    const box = answerBox(ex, submit); next.before(box.el);
    F.cur = { kind: 'exercise', ex, answer: () => canonical(ex.answer), session: s };
  };

  F.celebrate = ({ tool, level }) => {
    const t = toolById(tool); audio.sfx('up'); G.onUpgrade && G.onUpgrade(tool, level);
    swap(h('div', { class: 'celebrate' }, h('div', { class: 'big' }, t.icone), h('h3', {}, `${t.nom} — niveau ${level}!`), h('p', {}, stars(level)), h('p', { class: 'benefit' }, `➜ ${({ canne: 'Pêche', arrosoir: 'Arrosage', filet: 'Chasse aux papillons', pelle: 'Fouilles', sac: 'Sac' })[tool]} : ${describe(tool, level)}`),
      h('p', { class: 'line' }, '« Tiguidou! Ça, c’est de l’ouvrage bien faite. » — Gaston'), h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => { click(); F.workbench(); } }, 'Retour à l’établi'), h('button', { class: 'btn', onclick: () => ui.close() }, 'Fermer'))));
  };
  // Une fonction par outil : seules les stats de l’outil demandé sont lues.
  const DESCRIBE = {
    canne: x => `touche en ${x.wait[0]}–${x.wait[1]} s, ${x.window.toFixed(1).replace('.', ',')} s pour ferrer, ${Math.round((0.25 + x.rare * 0.7) * 100)} % de touches rares`,
    arrosoir: x => `${x.beds} plate(s)-bande(s), ${fmtMoney(x.coins)} chacune`,
    filet: x => `portée ${String(x.reach).replace('.', ',')} m, ${Math.round(x.chance * 100)} % de réussite`,
    pelle: x => `chance ${x.luck}/3`,
    sac: x => `${x.cap} places`,
  };
  const describe = (tool, l) => DESCRIBE[tool](stats(tool, l));

  // ---------- Défis de Flocon
  F.defi = (focus) => {
    const st = S(); const list = defiChoices(st); const pick = focus && isUnlocked(st, focus) ? [focus, ...list.filter(x => x !== focus)] : list;
    const rows = pick.slice(0, 5).map(id => { const sk = skillById(id); return h('button', { class: 'btn skill', 'data-skill': id, onclick: () => { click(); F.exercise({ kind: 'defi', skill: id, goal: 3 }); } }, h('span', {}, sk.nom), dots(st.mastery[id]?.ok || 0)); });
    open(h('div', {}, h('div', { class: 'who' }, face('flocon'), h('div', {}, h('b', {}, 'Défi de Flocon'), h('p', { class: 'line' }, '3 questions, 1,00 $ par bonne réponse. Choisis ta notion!'))), h('div', { class: 'skills' }, rows)), { cls: 'defi' });
  };
  F.defiEnd = s => swap(h('div', { class: 'celebrate' }, h('div', { class: 'big' }, '🦉'), h('h3', {}, 'Défi réussi!'), h('p', {}, `${skillById(s.skill).nom} : `, dots(S().mastery[s.skill]?.ok || 0)), h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => F.defi() }, 'Un autre!'), h('button', { class: 'btn', onclick: () => ui.close() }, 'Fermer'))));

  // ---------- Magasin général
  F.shop = () => {
    const st = S();
    const owned = it => it.kind === 'bridge' ? st.bridges[it.zone] : st.decor.includes(it.id);
    const rows = CATALOG.map(it => h('div', { class: `item ${owned(it) ? 'owned' : ''}` }, h('div', {}, h('b', {}, it.nom), h('p', {}, it.desc)), h('span', { class: 'price' }, fmtMoney(it.prixCents)),
      owned(it) ? h('span', { class: 'ok' }, '✓') : h('button', { class: 'btn primary small', 'data-item': it.id, onclick: () => { click(); F.checkout(it); } }, 'Acheter')));
    open(h('div', {}, h('div', { class: 'who' }, face('ginette'), h('div', {}, h('b', {}, 'Magasin général'), h('p', { class: 'line' }, `Tu as ${fmtMoney(st.money)}. Les prix sont avant taxes, comme partout au Québec!`))), h('div', { class: 'items' }, rows),
      h('button', { class: 'btn', onclick: () => { click(); F.sell(); } }, `💰 Vendre le sac (${st.bag.length})`)), { cls: 'shop' });
  };
  F.checkout = (it) => {
    const st = S(); const q = quoteFor(st, it); G.save();
    let misses = 0, hintN = 0, locked = false;
    const fb = h('div', { class: 'feedback', role: 'status' }), hintsEl = h('div', { class: 'hints' });
    const hintBtn = h('button', { class: 'btn hint', onclick: () => { click(); if (hintN < 3) { hintsEl.append(h('p', { class: 'hintline' }, h('b', {}, `Indice ${hintN + 1} : `), q.hints[hintN])); hintN++; } hintBtn.disabled = hintN >= 3; } }, '💡 Indice');
    const ticket = h('div', { class: 'ticket' }, h('div', { class: 'tl' }, h('span', {}, it.nom), h('span', {}, fmtMoney(q.prixCents))),
      q.rabais ? h('div', { class: 'tl rabais' }, h('span', {}, `🏷️ Rabais de ${q.rabais} %`), h('span', {}, 'aujourd’hui!')) : h('div', { class: 'tl' }, h('span', {}, 'Rabais'), h('span', {}, 'aucun')),
      h('div', { class: 'tl' }, h('span', {}, 'TPS'), h('span', {}, '5 %')), h('div', { class: 'tl' }, h('span', {}, 'TVQ'), h('span', {}, '9,975 %')), h('div', { class: 'tl total' }, h('span', {}, 'Total à payer'), h('span', {}, '?')));
    const back = h('button', { class: 'btn small', onclick: () => { click(); F.shop(); } }, '← Catalogue');
    let box;
    const submit = v => {
      if (locked) return; const r = checkTotal(v[0], q);
      if (r.ok) {
        locked = true; audio.sfx('ok'); ticket.lastChild.lastChild.textContent = fmtMoney(q.totalCents);
        if (st.money < q.totalCents) { fb.className = 'feedback info'; fb.textContent = `Bon calcul! Mais il te manque ${fmtMoney(q.totalCents - st.money)}. Reviens quand tu auras assez d’argent.`; }
        else { st.money -= q.totalCents; forgetQuote(st, it); if (it.kind === 'bridge') { st.bridges[it.zone] = true; G.world.openBridge(it.zone); } else { st.decor.push(it.id); G.world.placeDecor(it.id); } G.save(); audio.sfx('coin');
          fb.className = 'feedback ok'; fb.replaceChildren(h('b', {}, 'Exact! '), `${fmtMoney(q.totalCents)}. Merci beaucoup! `, it.kind === 'bridge' ? 'Le pont est installé!' : 'Je l’ai installé sur l’île.'); ui.toast(`🛍️ ${it.nom} acheté!`, 'gold'); }
        box.el.classList.add('hidden'); keyHandler = e => { if (e.code === 'Enter') { F.shop(); return true; } return false; };
        fb.after(h('button', { class: 'btn primary', onclick: () => { click(); F.shop(); } }, 'Retour au magasin')); return;
      }
      misses++; audio.sfx('miss'); fb.className = 'feedback no'; fb.textContent = r.msg; box.clear();
      if (misses >= 2 && hintN === 0) hintBtn.click();
      if (misses >= 3 && !fb.nextSibling?.classList?.contains('detail')) fb.after(h('div', { class: 'detail' }, `Détail : prix ${q.rabais ? 'après rabais ' : ''}${fmtMoney(q.baseCents)} + TPS ${fmtMoney(q.tpsCents)} + TVQ ${fmtMoney(q.tvqCents)}. À toi d’additionner!`));
    };
    const fakeEx = { answer: { kind: 'num', fields: [{ label: 'Total ($)' }] } };
    const content = h('div', { class: 'checkout' }, h('div', { class: 'who' }, face('ginette'), h('div', {}, h('b', {}, it.nom), h('p', { class: 'line' }, 'Calcule le total à payer, taxes incluses. Arrondis au cent près.'))), ticket, fb, hintsEl, h('div', { class: 'row tools' }, hintBtn, back));
    open(content, { cls: 'ex' }); box = answerBox(fakeEx, submit); content.append(box.el);
    F.cur = { kind: 'checkout', q, answer: () => (q.totalCents / 100).toFixed(2).replace('.', ',') };
  };
  F.sell = () => {
    const st = S(); if (!st.bag.length) { open(h('div', { class: 'dialog' }, h('div', { class: 'who' }, face('ginette'), h('div', {}, h('b', {}, 'Ginette'), h('p', { class: 'line' }, 'Ton sac est vide! Va pêcher, creuser ou attraper des papillons.'))), h('button', { class: 'btn primary', onclick: () => ui.close() }, 'D’accord'))); return; }
    const counts = {}; for (const k of st.bag) counts[k] = (counts[k] || 0) + 1;
    const total = st.bag.reduce((a, k) => a + (SELL[k] || 0), 0);
    open(h('div', {}, h('div', { class: 'who' }, face('ginette'), h('div', {}, h('b', {}, 'Je rachète tout ça'), h('p', { class: 'line' }, 'Les papillons, je les relâche dans mon jardin. Promis!'))),
      h('div', { class: 'items' }, Object.entries(counts).map(([k, n]) => h('div', { class: 'item' }, h('span', {}, `${ITEMS[k][0]} ${ITEMS[k][1]} × ${n}`), h('span', { class: 'price' }, fmtMoney(SELL[k] * n))))),
      h('button', { class: 'btn primary', onclick: () => { st.money += total; st.journal.coins += total; st.bag = []; G.save(); audio.sfx('coin'); ui.toast(`💰 +${fmtMoney(total)}`, 'gold'); ui.close(); } }, `Vendre pour ${fmtMoney(total)}`)), { cls: 'shop' });
  };

  // ---------- Question pendant une action (étape 2) : touche rare, coup de sirop
  // q = { kind:'fish'|'maple', skill, d, stretch, onEnd?(result) } ; result = 'win'|'miss'|'timeout'|'skip'
  const ACTION = {
    fish: { icon: '🎣', titre: 'Ça mord fort!', line: 'Un poisson rare tire sur ta ligne! Réponds avant qu’il se fatigue… ou laisse-le filer, pas de souci.',
      win: k => `Tu as sorti un ${ITEMS[k][1].toLowerCase()}! Il est noté dans ton carnet.`, lose: { miss: 'Il a donné un bon coup de queue pis il est reparti. Ce sera pour la prochaine!', timeout: 'Il s’est faufilé entre les quenouilles. Pas grave, le lac en est plein!', skip: 'Tu l’as laissé filer. Il te fait un clin d’œil en partant.' } },
    maple: { icon: '🍁', titre: 'Coup de sirop!', line: 'L’érable coule! Une petite question de fractions pour remplir ton seau. Tu peux aussi laisser filer.',
      win: k => `${ITEMS[k][1]} pour toi! C’est noté dans ton carnet.`, lose: { miss: 'La sève s’est arrêtée de couler. L’érable va se reprendre, promis!', timeout: 'Le seau a débordé dans la neige. Les écureuils sont ben contents!', skip: 'Tu laisses l’érable tranquille pour l’instant.' } },
  };
  F.actionQ = (q) => {
    const st = S(), cfg = ACTION[q.kind]; st.exCount = (st.exCount || 0) + 1;
    const ex = makeExercise(q.skill, `${st.seed}:${st.exCount}:${q.kind}`, q.d);
    const sk = skillById(q.skill), timer = makeTimer(timeFor(ex, q));
    let settled = false, hintN = 0;
    const hintsEl = h('div', { class: 'hints' }), fb = h('div', { class: 'feedback', role: 'status' });
    const hintBtn = h('button', { class: 'btn hint', onclick: () => { click(); if (hintN >= ex.hints.length) return; hintsEl.append(h('p', { class: 'hintline' }, h('b', {}, `Indice ${hintN + 1} : `), ex.hints[hintN])); hintN++; hintBtn.disabled = hintN >= ex.hints.length; } }, '💡 Indice');
    const skipBtn = h('button', { class: 'btn skip', onclick: () => { click(); end('skip'); } }, 'Laisser filer');
    const pauseBtn = h('button', { class: 'btn small pausebtn', 'aria-label': 'Pause', title: 'Pause (P)', onclick: () => { click(); G.pause(true); } }, '⏸');
    const bar = h('i'), secs = h('span', { class: 'secs' });
    const paint = () => { bar.style.width = `${(timer.left / timer.total) * 100}%`; bar.classList.toggle('low', timer.left < 6); secs.textContent = `${Math.ceil(timer.left)} s`; };
    function end(result, closed = false) {
      if (settled) return; settled = true; timer.stop(); keyHandler = null;
      if (closed) { audio.sfx('click'); ui.toast(`${q.kind === 'fish' ? '💨' : '🍂'} ${cfg.lose.skip}`); F.cur = null; q.onEnd && q.onEnd('skip'); return; }
      let body;
      if (result === 'win') {
        const key = loot(q.kind, q.d), got = G.grant(key);
        st.rares[key] = (st.rares[key] || 0) + 1; st.journal[q.kind === 'fish' ? 'rare' : 'sirop']++; if (q.kind === 'fish') st.journal.fish++;
        audio.sfx('up');
        body = h('div', { class: 'celebrate actionwin' }, h('div', { class: 'big' }, ITEMS[key][0]), h('h3', {}, cfg.win(key)),
          h('p', { class: 'benefit' }, got.coins ? `Ton sac est plein : Ginette te l’achète tout de suite, ${fmtMoney(got.coins)}.` : `Dans ton sac · vaut ${fmtMoney(SELL[key])} chez Ginette`),
          h('p', { class: 'lvl' }, `Niveau ${NIVEAUX[q.d]}${q.stretch ? ' · ⭐ défi surprise réussi!' : ''}`));
      } else {
        audio.sfx(result === 'skip' ? 'click' : 'near');
        body = h('div', { class: 'celebrate actionlose' }, h('div', { class: 'big' }, q.kind === 'fish' ? '💨' : '🍂'), h('h3', {}, cfg.lose[result]),
          result !== 'skip' ? h('p', { class: 'feedback info' }, 'La réponse était : ', h('b', {}, canonical(ex.answer)), '.') : null);
      }
      G.save();
      const ok = h('button', { class: 'btn primary', onclick: () => { click(); ui.close(); } }, 'Continuer');
      body.append(h('div', { class: 'row' }, ok));
      swap(h('div', { class: 'action' }, body));
      F.cur = { kind: 'actionEnd', result };
      q.onEnd && q.onEnd(result);
    }
    function submit(v) {
      if (settled) return;
      const r = checkAnswer(v, ex.answer);
      if (r.empty || (ex.answer.kind === 'choice' && v < 0)) { fb.className = 'feedback info'; fb.textContent = ex.answer.kind === 'choice' ? 'Choisis une réponse.' : r.msg || 'Écris une réponse.'; return; }
      if (r.near) { audio.sfx('near'); fb.className = 'feedback near'; fb.textContent = r.msg; return; } // presque : un indice, pas d’échec
      if (!q.stretch) { const out = recordAnswer(st, q.skill, !!r.ok, {}); if (out.mastered) ui.toast(`📒 Compétence maîtrisée : ${sk.nom}!`, 'gold'); }
      end(r.ok ? 'win' : 'miss');
    }
    const content = h('div', { class: `exercise action ${q.kind}` },
      h('div', { class: 'who' }, h('div', { class: 'face' }, cfg.icon), h('div', {}, h('b', {}, cfg.titre), h('p', { class: 'line' }, cfg.line))),
      h('div', { class: 'timer' }, h('div', { class: 'tbar', role: 'progressbar', 'aria-label': 'Temps restant' }, bar), secs, pauseBtn),
      h('div', { class: 'exhead' }, h('span', { class: `ref lvl d${q.d}` }, `Niveau ${NIVEAUX[q.d]}`), q.stretch ? h('span', { class: 'ref stretch' }, '⭐ Défi surprise') : null, h('span', { class: 'ref' }, sk.nom)),
      h('p', { class: 'q' }, ex.prompt), fb, hintsEl);
    open(content, { cls: 'ex', close: () => end('skip', true) });
    const box = answerBox(ex, submit); content.append(box.el, h('div', { class: 'row tools' }, hintBtn, skipBtn));
    paint();
    F.cur = { kind: 'action', q, ex, timer, answer: () => canonical(ex.answer), tick(dt) { if (!settled && timer.tick(dt)) end('timeout'); paint(); } };
  };
  // Appelé par la boucle de jeu seulement quand le jeu n’est pas en pause
  F.tick = dt => { if (F.cur?.kind === 'action') F.cur.tick(dt); };

  // ---------- Carnet
  F.carnet = () => {
    const st = S(); const j = st.journal;
    const tools = h('div', { class: 'ctools' }, TOOLS.map(t => h('span', { class: 'chip' }, `${t.icone} ${stars(st.tools[t.id] || 0)}`)));
    const journal = h('p', { class: 'journal' }, `🐟 ${j.fish} (✨ ${j.rare || 0} rare${(j.rare || 0) > 1 ? "s" : ""}) · 🍯 ${j.sirop || 0} · 🦋 ${j.bugs} · ⛏️ ${j.finds} · 🌸 ${j.flowers} · 🪙 ${fmtMoney(j.coins)} gagnés`);
    const RARE_KEYS = ['omble', 'maskinonge', 'esturgeon', 'tire', 'sirop', 'coulee'];
    const rares = h('section', { class: 'rares' }, h('h4', {}, '✨ Prises rares et sirop'), RARE_KEYS.some(k => st.rares[k])
      ? h('div', { class: 'ctools' }, RARE_KEYS.filter(k => st.rares[k]).map(k => h('span', { class: 'chip rare', 'data-k': k }, `${ITEMS[k][0]} ${ITEMS[k][1]} × ${st.rares[k]}`)))
      : h('p', { class: 'pre' }, 'Rien encore. Quand ça mord fort ou qu’un érable coule, une petite question peut te rapporter une prise rare!'));
    const doms = DOMAINES.map(dname => h('section', {}, h('h4', {}, dname), SKILLS.filter(s => s.domaine === dname).map(sk => {
      const ok = st.mastery[sk.id]?.ok || 0, m = isMastered(st, sk.id), u = isUnlocked(st, sk.id);
      return h('div', { class: `sk ${m ? 'm' : u ? '' : 'lock'}` }, h('div', {}, h('b', {}, `${m ? '✅ ' : u ? '' : '🔒 '}${sk.nom}`), h('p', { class: 'pda' }, sk.pda), !u ? h('p', { class: 'pre' }, 'Préalable : ', prereqsOf(sk.id, 'hard').map(p => skillById(p).nom).join(', ')) : null), dots(ok));
    })));
    open(h('div', { class: 'carnet' }, h('div', { class: 'who' }, face('flocon'), h('div', {}, h('b', {}, 'Mon carnet'), h('p', { class: 'line' }, `${masteryCount(st)} / ${SKILLS.length} compétences maîtrisées — Secondaire 1 (PDA du MEQ)`))), tools, journal, rares, doms), { cls: 'carnet' });
  };
  return F;
}
