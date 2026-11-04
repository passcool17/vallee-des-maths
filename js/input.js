// Entrées : clavier (par position physique : ZQSD sur AZERTY = WASD sur QWERTY), flèches, clic/tap, joystick tactile.
export function makeInput({ canvas, onInteract, onKey, onTap }) {
  const down = new Set();
  const MOVE = { KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
  let enabled = true;
  const typing = () => document.activeElement && /INPUT|TEXTAREA/.test(document.activeElement.tagName);
  addEventListener('keydown', e => {
    if (typing()) return;
    if (onKey(e) === true) { e.preventDefault(); return; }
    if (!enabled) return;
    if (MOVE[e.code] || e.code === 'ShiftLeft' || e.code === 'ShiftRight') { down.add(e.code); e.preventDefault(); }
    if ((e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') && !e.repeat) { e.preventDefault(); onInteract(); }
  });
  addEventListener('keyup', e => down.delete(e.code));
  addEventListener('blur', () => down.clear());

  // Clic / tap pour marcher (on distingue un tap d’un glissement)
  let pd = null;
  const fingers = new Set(); // deux doigts = pincer pour zoomer, pas un tap
  canvas.addEventListener('pointerdown', e => { fingers.add(e.pointerId); pd = fingers.size > 1 ? null : { x: e.clientX, y: e.clientY, t: performance.now() }; });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) canvas.addEventListener(ev, e => fingers.delete(e.pointerId));
  canvas.addEventListener('pointerup', e => { if (!pd || !enabled) return; if (Math.hypot(e.clientX - pd.x, e.clientY - pd.y) < 12 && performance.now() - pd.t < 600) onTap(e.clientX, e.clientY); pd = null; });

  // Joystick tactile
  const stick = document.getElementById('stick'), knob = document.getElementById('knob'), act = document.getElementById('act');
  const joy = { x: 0, z: 0, id: null };
  if (stick) {
    const R = () => stick.getBoundingClientRect();
    const set = e => { const r = R(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, max = r.width / 2; let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy); if (d > max) { dx *= max / d; dy *= max / d; } joy.x = dx / max; joy.z = dy / max; knob.style.transform = `translate(${dx}px, ${dy}px)`; };
    stick.addEventListener('pointerdown', e => { joy.id = e.pointerId; stick.setPointerCapture(e.pointerId); set(e); e.preventDefault(); });
    stick.addEventListener('pointermove', e => { if (e.pointerId === joy.id) set(e); });
    const end = e => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.z = 0; knob.style.transform = ''; };
    stick.addEventListener('pointerup', end); stick.addEventListener('pointercancel', end);
  }
  if (act) {
    act.addEventListener('pointerdown', e => { e.preventDefault(); if (enabled) onInteract(); });
    // Empêche le « clic fantôme » qui suivrait le toucher et activerait le bouton du panneau qui vient de s’ouvrir dessous.
    act.addEventListener('touchend', e => e.preventDefault(), { passive: false });
  }

  return {
    move() {
      if (!enabled) return { x: 0, z: 0, run: false };
      let x = 0, z = 0; for (const c of down) if (MOVE[c]) { x += MOVE[c][0]; z += MOVE[c][1]; }
      const l = Math.hypot(x, z); if (l > 0) { x /= l; z /= l; }
      if (Math.hypot(joy.x, joy.z) > 0.15) { x = joy.x; z = joy.z; }
      return { x, z, run: down.has('ShiftLeft') || down.has('ShiftRight') || Math.hypot(joy.x, joy.z) > 0.9 };
    },
    set enabled(v) { enabled = v; if (!v) down.clear(); }, get enabled() { return enabled; },
  };
}
