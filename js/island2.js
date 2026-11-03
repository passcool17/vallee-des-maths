// Île de Secondaire 2 : phare de Rosalie, conifères, rochers, rivière à petites chutes, érables rouges, kiosque et quai de Bernard.
// Construite seulement au premier passage du traversier (ou au chargement d’une partie sur l’île 2).
import * as THREE from '../vendor/three.module.min.js';
import { curved, mesh, at, blob, label, makeFerry, onFerryDock, FERRY } from './world.js';
import { makeRng } from './math/rng.js';

export const ISLE2 = { x: 0, z: 0, r: 30 };
export const PLACES2 = { phare: [19, -17], atelier: [10, -16], kiosque: [6, 20], quai: [10, 35.4] };
export const DOCK2 = { x0: 8.8, x1: 11.2, z0: 26.5, z1: 36.2 };
// Rivière (de la colline nord jusqu’au lac, au sud-ouest) ; passerelle en (0, 0)
const RIVER = [[3, -31], [5, -21], [4, -10], [0, 0], [-5, 10], [-8, 20], [-9, 32]];
export const FOOTBRIDGE = { x0: -2.8, x1: 2.8, z0: -1.25, z1: 1.25 };
const FALLS = [0.36, 0.66]; // positions des chutes le long de la rivière (0 → 1)

export function buildIsland2(scene, G) {
  const rng = makeRng(G.state.seed ^ 0x2b2b);
  const root = new THREE.Group(); root.name = 'ile2'; scene.add(root);
  const interactables = [], obstacles = [];

  // ---------- Sol : sable gris, gazon plus foncé (forêt boréale)
  { const seg = 42; const sand = new THREE.CylinderGeometry(ISLE2.r + 1.6, ISLE2.r + 2.6, 1.6, seg, 1), grass = new THREE.CylinderGeometry(ISLE2.r, ISLE2.r + 0.4, 0.8, seg, 1);
    for (const [g, j] of [[sand, 0.7], [grass, 0.5]]) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x); const k = 1 + (Math.sin(a * 4 + 2) * 0.03 + Math.sin(a * 9) * 0.015) * j; if (Math.hypot(x, z) > 0.5) { p.setX(i, x * k); p.setZ(i, z * k); } } g.computeVertexNormals(); }
    root.add(at(mesh(sand, '#d9cdb0'), 0, -0.85, 0)); root.add(at(mesh(grass, '#86b873'), 0, -0.4, 0)); }

  // ---------- Rivière : ruban qui descend par deux petites chutes
  const curve3 = new THREE.CatmullRomCurve3(RIVER.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const N = 140, pts = curve3.getSpacedPoints(N);
  const riverY = t => 0.1 + (t < FALLS[0] ? 0.34 : t < FALLS[1] ? 0.17 : 0);
  const rpos = [], ridx = [];
  for (let i = 0; i <= N; i++) { const t = i / N, p = pts[i], q = pts[Math.min(N, i + 1)], o = pts[Math.max(0, i - 1)]; const dx = q.x - o.x, dz = q.z - o.z, L = Math.hypot(dx, dz) || 1; const nx = -dz / L, nz = dx / L, w = 1.3;
    const y = riverY(t); rpos.push(p.x + nx * w, y, p.z + nz * w, p.x - nx * w, y, p.z - nz * w);
    if (i < N) { const a = i * 2; ridx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
  const rgeo = new THREE.BufferGeometry(); rgeo.setAttribute('position', new THREE.Float32BufferAttribute(rpos, 3)); rgeo.setIndex(ridx); rgeo.computeVertexNormals();
  const riverMat = curved(new THREE.MeshLambertMaterial({ color: 0x5fb6cc, emissive: 0x0b2a35, side: THREE.DoubleSide }));
  root.add(new THREE.Mesh(rgeo, riverMat));
  // berges : galets
  const bankRocks = [];
  for (let i = 0; i <= N; i += 3) { const p = pts[i]; for (const s of [-1, 1]) if (rng.chance(0.6)) bankRocks.push([p.x + s * (1.5 + rng.next() * 0.4) + (rng.next() - 0.5) * 0.5, p.z + (rng.next() - 0.5), 0.25 + rng.next() * 0.25]); }
  // chutes : rebord de roches, écume animée
  const foams = [];
  for (const ft of FALLS) { const i = Math.round(ft * N), p = pts[i], q = pts[i + 1]; const ang = Math.atan2(q.x - p.x, q.z - p.z);
    const g = new THREE.Group(); g.position.set(p.x, 0, p.z); g.rotation.y = ang;
    for (let k = -2; k <= 2; k++) g.add(at(mesh(new THREE.DodecahedronGeometry(0.42 + (k % 2 ? 0.1 : 0), 0), '#8f8a80'), k * 0.62, riverY(ft) - 0.05, -0.15, k));
    const fall = mesh(new THREE.PlaneGeometry(2.6, 0.24), '#e8f6fa', { emissive: 0x4a6a74, side: THREE.DoubleSide }); fall.position.set(0, riverY(ft + 0.01) + 0.11, 0.05); g.add(fall);
    for (let k = 0; k < 5; k++) { const f = mesh(new THREE.IcosahedronGeometry(0.16, 0), '#ffffff', { emissive: 0x667f88 }); f.position.set(-1 + k * 0.5, riverY(ft + 0.01) + 0.05, 0.35); g.add(f); foams.push(f); }
    root.add(g); }
  const nearRiver = (x, z, w) => { for (let i = 0; i <= N; i += 2) { const p = pts[i]; if ((p.x - x) ** 2 + (p.z - z) ** 2 < w * w) return true; } return false; };
  // passerelle
  { const g = new THREE.Group(), b = FOOTBRIDGE, cz = (b.z0 + b.z1) / 2, L = b.x1 - b.x0;
    for (let i = 0; i < L / 0.5; i++) { const t = (i + 0.5) * 0.5; g.add(at(mesh(new THREE.BoxGeometry(0.44, 0.14, 2.5), i % 2 ? '#b88a5c' : '#a77a4f'), b.x0 + t, 0.42 + Math.sin(t / L * Math.PI) * 0.25, cz)); }
    for (const side of [b.z0, b.z1]) { g.add(at(mesh(new THREE.BoxGeometry(L, 0.1, 0.1), '#8a5a36'), 0, 1.35, side)); for (const px of [b.x0, 0, b.x1]) g.add(at(mesh(new THREE.BoxGeometry(0.12, 1, 0.12), '#7a5236'), px, 0.85, side)); }
    root.add(g); }

  // ---------- Lieux
  const placeNear = (x, z, r) => Object.values(PLACES2).some(([px, pz]) => Math.hypot(px - x, pz - z) < r) || Math.hypot(x - 14, z - 12) < 3 || (x < -24 && Math.abs(z - 4) < 4) || Math.hypot(x, z) < 4 || (Math.abs(x - 10) < 3 && z > 22);

  // ---------- Phare de Rosalie
  const phare = new THREE.Group(); const [phx, phz] = PLACES2.phare;
  { const H = 9; const tower = new THREE.Group(); phare.add(tower);
    for (let i = 0; i < 6; i++) tower.add(at(mesh(new THREE.CylinderGeometry(1.95 - (i + 1) * 0.08, 1.95 - i * 0.08, H / 6, 14), i % 2 ? '#d64545' : '#f6f2ea'), 0, (i + 0.5) * H / 6, 0));
    phare.add(at(mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.2, 14), '#3a3a40'), 0, H + 0.1, 0));
    for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; phare.add(at(mesh(new THREE.BoxGeometry(0.06, 0.6, 0.06), '#3a3a40'), Math.cos(a) * 1.65, H + 0.5, Math.sin(a) * 1.65)); }
    phare.add(at(mesh(new THREE.TorusGeometry(1.65, 0.04, 4, 20), '#3a3a40'), 0, H + 0.8, 0)).children.at(-1).rotation.x = Math.PI / 2;
    phare.add(at(mesh(new THREE.BoxGeometry(0.9, 1.5, 0.1), '#5b3a24'), 0, 0.75, 1.83)).children.at(-1).rotation.y = 0;
    phare.add(blob(3)); }
  const lanternOff = mat2('#5d6a74'), lanternOn = curved(new THREE.MeshBasicMaterial({ color: 0xfff1a8 }));
  function mat2(c) { return curved(new THREE.MeshLambertMaterial({ color: c, flatShading: true, transparent: true, opacity: 0.85 })); }
  const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 1.4, 10), lanternOff); lantern.position.y = 9.9; phare.add(lantern);
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), lanternOn); lens.position.y = 9.9; lens.visible = false; phare.add(lens);
  { const roof = mesh(new THREE.ConeGeometry(1.35, 1.2, 10), '#d64545'); roof.position.y = 11.2; phare.add(roof); phare.add(at(mesh(new THREE.SphereGeometry(0.16, 6, 4), '#3a3a40'), 0, 11.9, 0)); }
  // faisceaux (nuit, phare réparé)
  const beams = new THREE.Group(); beams.position.y = 9.9; phare.add(beams);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff1b0, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false });
  for (const s of [1, -1]) { const b = new THREE.Mesh(new THREE.ConeGeometry(2.4, 26, 14, 1, true), beamMat); b.rotation.z = s * Math.PI / 2; b.position.x = s * 13; beams.add(b); }
  beams.visible = false;
  const light = new THREE.PointLight(0xffd98a, 0, 46, 1.3); light.position.y = 9.9; light.visible = false; phare.add(light); // visible seulement la nuit : une lumière de plus coûte cher à chaque pixel
  // chantier (avant réparation) : planches et échafaudage
  const chantier = new THREE.Group();
  for (const [x, z, r] of [[-2.6, 1.2, 0.3], [-2.9, 1.6, 0.2]]) chantier.add(at(mesh(new THREE.BoxGeometry(2.2, 0.12, 0.4), '#c4a070'), x, 0.1 + r * 0.4, z, r));
  for (const [x, z] of [[2.2, 0.6], [2.2, -0.9]]) chantier.add(at(mesh(new THREE.BoxGeometry(0.12, 6, 0.12), '#8a5a36'), x, 3, z));
  for (let k = 1; k < 4; k++) chantier.add(at(mesh(new THREE.BoxGeometry(0.12, 0.12, 1.6), '#8a5a36'), 2.2, k * 1.5, -0.15));
  phare.add(chantier);
  { const sg = label('Phare de Rosalie', { size: 30 }); sg.position.set(0, 13, 0); phare.add(sg); }
  root.add(at(phare, phx, 0, phz, -0.7)); obstacles.push({ x: phx, z: phz, r: 2.2 });
  interactables.push({ id: 'phare', kind: 'phare', pos: new THREE.Vector3(phx - 1.6, 0, phz + 2.3), r: 2.4, label: 'Réparer le phare', obj: phare });
  function setPhare(done) { chantier.visible = !done; lantern.material = done ? lanternOn : lanternOff; lens.visible = done; interactables.find(i => i.id === 'phare').label = done ? 'Admirer le phare' : 'Réparer le phare'; }

  // ---------- Atelier de Rosalie (niveau 4 des outils)
  { const [x, z] = PLACES2.atelier; const g = new THREE.Group();
    g.add(at(mesh(new THREE.BoxGeometry(4, 2.4, 2.6), '#e9e1cf'), 0, 1.2, -0.4));
    const roof = mesh(new THREE.BoxGeometry(4.6, 0.2, 3.4), '#2f5d8a'); roof.position.set(0, 2.6, -0.3); roof.rotation.x = 0.2; g.add(roof);
    g.add(at(mesh(new THREE.BoxGeometry(3.2, 0.2, 1.1), '#b07b4f'), 0, 1, 1.4));
    for (const lx of [-1.4, 1.4]) g.add(at(mesh(new THREE.BoxGeometry(0.16, 1, 0.16), '#8a5a36'), lx, 0.5, 1.4));
    g.add(at(mesh(new THREE.TorusGeometry(0.32, 0.08, 6, 12), '#f08a24'), -1.2, 1.9, 0.92)); // bouée
    g.add(at(mesh(new THREE.BoxGeometry(0.6, 0.4, 0.4), '#c9a227'), 0.9, 1.3, 1.4)); g.add(at(mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.4, 8), '#9aa3ad'), 0.2, 1.3, 1.4));
    const sg = label('Atelier de Rosalie', { size: 28 }); sg.position.set(0, 3.6, 0); g.add(sg); g.add(blob(2.8));
    root.add(at(g, x, 0, z)); obstacles.push({ x: x - 1, z: z - 0.3, r: 1.4 }, { x: x + 1, z: z - 0.3, r: 1.4 }, { x, z: z + 1.4, r: 1 });
    interactables.push({ id: 'atelier', kind: 'atelier', pos: new THREE.Vector3(x, 0, z + 2.6), r: 2.4, label: 'Atelier de Rosalie', obj: g }); }

  // ---------- Kiosque de pêche de Bernard + quai
  { const [x, z] = PLACES2.kiosque; const g = new THREE.Group();
    g.add(at(mesh(new THREE.BoxGeometry(3.2, 1.1, 1.4), '#2f7a6a'), 0, 0.55, 0));
    g.add(at(mesh(new THREE.BoxGeometry(3.4, 0.12, 1.6), '#b07b4f'), 0, 1.15, 0));
    for (const lx of [-1.5, 1.5]) g.add(at(mesh(new THREE.BoxGeometry(0.14, 2.4, 0.14), '#8a5a36'), lx, 1.2, -0.6));
    for (let k = 0; k < 6; k++) { const s = mesh(new THREE.BoxGeometry(0.6, 0.12, 1.9), k % 2 ? '#f6f2ea' : '#d64545'); s.position.set(-1.5 + k * 0.6, 2.5, -0.1); s.rotation.x = 0.3; g.add(s); }
    g.add(at(mesh(new THREE.CylinderGeometry(0.3, 0.24, 0.42, 10), '#9aa3ad'), 0.8, 1.42, 0.1)); // la chaudière à piger
    for (let k = 0; k < 4; k++) g.add(at(mesh(new THREE.SphereGeometry(0.07, 6, 4), k % 2 ? '#d64545' : '#3d4f9e'), 0.7 + (k % 2) * 0.18, 1.62, 0.02 + (k > 1 ? 0.15 : 0)));
    g.add(at(mesh(new THREE.BoxGeometry(0.5, 0.3, 0.3), '#c9a227'), -0.8, 1.36, 0.1));
    const sg = label('Kiosque de pêche', { size: 28, bg: 'rgba(47,122,106,0.95)', color: '#fff6e0' }); sg.position.set(0, 3.3, 0); g.add(sg); g.add(blob(2.4));
    root.add(at(g, x, 0, z)); obstacles.push({ x: x - 0.8, z, r: 1.1 }, { x: x + 0.8, z, r: 1.1 });
    interactables.push({ id: 'kiosque', kind: 'kiosk', pos: new THREE.Vector3(x, 0, z + 1.9), r: 2.2, label: 'Piger au kiosque', obj: g }); }
  { const g = new THREE.Group(), len = DOCK2.z1 - DOCK2.z0, cx = (DOCK2.x0 + DOCK2.x1) / 2;
    for (let i = 0; i < len / 0.6; i++) g.add(at(mesh(new THREE.BoxGeometry(2.6, 0.16, 0.52), i % 3 ? '#a98a6c' : '#97785b'), cx, 0.05, DOCK2.z0 + 0.3 + i * 0.6));
    for (let i = 0; i <= 3; i++) for (const px of [DOCK2.x0 - 0.05, DOCK2.x1 + 0.05]) g.add(at(mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.8, 6), '#6b4a30'), px, -0.5, DOCK2.z0 + 2 + i * (len - 2) / 3));
    g.add(at(mesh(new THREE.BoxGeometry(0.7, 0.5, 0.5), '#2f5d8a'), DOCK2.x1 - 0.5, 0.35, DOCK2.z0 + 4)); // glacière
    root.add(g);
    interactables.push({ id: 'quai2', kind: 'fish', pos: new THREE.Vector3(cx, 0, DOCK2.z1 - 0.8), r: 1.8, label: 'Pêcher', obj: g }); }
  const bobber = at(mesh(new THREE.SphereGeometry(0.16, 8, 6), '#ff5a4a'), 10, -0.55, DOCK2.z1 + 2.4); bobber.visible = false; root.add(bobber);

  // ---------- Érables rouges (questions de secondaire 2)
  const RED = ['#c0262d', '#d7352b', '#a91f2a', '#e0482f', '#b5302a'];
  const MAPLES = [[-16, -12], [-20, 12], [-10, -21], [14, 3], [21, 7], [-13, 23]];
  for (const [x, z] of MAPLES) { const s = 0.95 + rng.next() * 0.3; const g = new THREE.Group();
    g.add(at(mesh(new THREE.CylinderGeometry(0.22 * s, 0.34 * s, 2.4 * s, 6), '#6b4a30'), 0, 1.2 * s, 0));
    const crown = new THREE.Group(); crown.position.y = 2.6 * s; g.add(crown); const c1 = rng.pick(RED), c2 = rng.pick(RED);
    for (const [dx, dy, dz, r, c] of [[0, 0.6, 0, 1.5, c1], [-0.8, 0, 0.3, 1.1, c2], [0.85, 0.1, -0.2, 1.05, c2], [0.1, 1.5, 0.1, 0.95, c1]]) crown.add(at(mesh(new THREE.IcosahedronGeometry(r * s, 0), c), dx * s, dy * s, dz * s, rng.next() * 3));
    g.add(blob(1.8 * s)); root.add(at(g, x, 0, z, rng.next() * 6)); obstacles.push({ x, z, r: 0.55 * s });
    interactables.push({ id: `erable_rouge_${interactables.length}`, kind: 'tree', red: true, pos: new THREE.Vector3(x, 0, z), r: 1.9 * s, label: 'Secouer l’érable rouge', obj: g, crown, ready: 0 }); }

  // ---------- Trous à creuser
  const digs = [[-14, -3], [17, -5], [-21, -16], [22, 15]].map(([x, z], i) => { const g = new THREE.Group(); g.add(at(mesh(new THREE.CylinderGeometry(0.6, 0.75, 0.2, 7), '#7d6248'), 0, 0.05, 0));
    const xm = new THREE.Group(); xm.add(at(mesh(new THREE.BoxGeometry(0.8, 0.06, 0.14), '#5a3b26'), 0, 0.17, 0, 0.785)); xm.add(at(mesh(new THREE.BoxGeometry(0.8, 0.06, 0.14), '#5a3b26'), 0, 0.17, 0, -0.785)); g.add(xm);
    root.add(at(g, x, 0, z)); const it = { id: `trou2_${i}`, kind: 'dig', pos: new THREE.Vector3(x, 0, z), r: 1.6, label: 'Creuser', obj: g, mark: xm, ready: 0, zone: 'ile2' }; interactables.push(it); return it; });

  // ---------- Conifères et rochers (instanciés : peu d’appels de dessin)
  const firs = [], rocks = []; // 46 sapins : au-delà, le remplissage de pixels fait chuter les FPS sur mobile
  const busy = (x, z, r) => placeNear(x, z, r) || nearRiver(x, z, 2.8) || MAPLES.some(([mx, mz]) => Math.hypot(mx - x, mz - z) < 3) || interactables.some(it => it.pos.distanceTo(new THREE.Vector3(x, 0, z)) < 3.2) || firs.some(f => Math.hypot(f[0] - x, f[1] - z) < 2.2);
  for (let tries = 0; firs.length < 46 && tries < 900; tries++) { const a = rng.next() * 6.283, d = 4 + Math.sqrt(rng.next()) * (ISLE2.r - 5.5); const x = Math.cos(a) * d, z = Math.sin(a) * d; if (busy(x, z, 5)) continue; firs.push([x, z, 0.8 + rng.next() * 0.6, rng.next() * 6]); }
  for (let tries = 0; rocks.length < 30 && tries < 600; tries++) { const a = rng.next() * 6.283, d = 3 + Math.sqrt(rng.next()) * (ISLE2.r - 3.5); const x = Math.cos(a) * d, z = Math.sin(a) * d; if (placeNear(x, z, 4) || nearRiver(x, z, 2) || firs.some(f => Math.hypot(f[0] - x, f[1] - z) < 1.5)) continue; rocks.push([x, z, 0.35 + rng.next() * 0.6, rng.next() * 6]); }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  function inst(geo, color, list, place) { const im = new THREE.InstancedMesh(geo, curved(new THREE.MeshLambertMaterial({ color, flatShading: true })), list.length);
    list.forEach((e, i) => { place(e); q.setFromAxisAngle(up, e[3]); m4.compose(ps, q, sc); im.setMatrixAt(i, m4); }); im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); root.add(im); return im; }
  inst(new THREE.CylinderGeometry(0.16, 0.24, 1.4, 5), '#5c4033', firs, ([x, z, s]) => { ps.set(x, 0.7 * s, z); sc.setScalar(s); });
  inst(new THREE.ConeGeometry(1.5, 2.6, 7), '#2f6b4a', firs, ([x, z, s]) => { ps.set(x, 2.3 * s, z); sc.setScalar(s); });
  inst(new THREE.ConeGeometry(1.15, 2.2, 7), '#3b7d55', firs, ([x, z, s]) => { ps.set(x, 3.6 * s, z); sc.setScalar(s); });
  inst(new THREE.ConeGeometry(0.7, 1.6, 7), '#4a8f61', firs, ([x, z, s]) => { ps.set(x, 4.7 * s, z); sc.setScalar(s); });
  inst(new THREE.DodecahedronGeometry(1, 0), '#9b968c', [...rocks, ...bankRocks.map(([x, z, s]) => [x, z, s, x * 3])], ([x, z, s]) => { ps.set(x, s * 0.25, z); sc.set(s, s * 0.7, s); });
  firs.forEach(([x, z, s]) => obstacles.push({ x, z, r: 0.45 * s })); rocks.forEach(([x, z, s]) => { if (s > 0.6) obstacles.push({ x, z, r: s * 0.7 }); });
  // quelques bouleaux blancs pour la couleur
  for (let i = 0; i < 6; i++) { const a = i * 1.1 + 0.4, d = 12 + (i % 3) * 5, x = Math.cos(a) * d, z = Math.sin(a) * d; if (busy(x, z, 4)) continue; const g = new THREE.Group();
    g.add(at(mesh(new THREE.CylinderGeometry(0.12, 0.16, 3, 5), '#f1efe8'), 0, 1.5, 0)); g.add(at(mesh(new THREE.IcosahedronGeometry(0.9, 0), '#e8c13a'), 0, 3.2, 0)); g.add(at(mesh(new THREE.IcosahedronGeometry(0.6, 0), '#f0d35a'), 0.4, 3.9, 0.1));
    root.add(at(g, x, 0, z)); obstacles.push({ x, z, r: 0.35 }); }

  // ---------- Traversier (retour vers l’île 1)
  const ferry = makeFerry(root, false);
  interactables.push({ id: 'traversier2', kind: 'ferry', pos: new THREE.Vector3(FERRY.x0 + 3, 0, (FERRY.z0 + FERRY.z1) / 2), r: 2.4, label: 'Prendre le traversier (retour)', obj: ferry.group });

  // ---------- Marcher
  const inBox = (x, z, b, m = 0.2) => x > b.x0 + m && x < b.x1 - m && z > b.z0 + m && z < b.z1 - m;
  function walkable(x, z) {
    const onIsland = Math.hypot(x, z) < ISLE2.r - 0.3;
    const onBridge = inBox(x, z, { ...FOOTBRIDGE, x0: FOOTBRIDGE.x0 - 1, x1: FOOTBRIDGE.x1 + 1 }, 0.25);
    const onDock = onFerryDock(x, z) || (x > DOCK2.x0 + 0.2 && x < DOCK2.x1 - 0.2 && z > DOCK2.z0 - 1 && z < DOCK2.z1 - 0.3);
    if (!(onIsland || onDock)) return false;
    if (!onBridge && !onDock && nearRiver(x, z, 1.55)) return false;
    return !obstacles.some(o => Math.hypot(x - o.x, z - o.z) < o.r + 0.35);
  }

  let wt = 0;
  function update(dt, G) {
    wt += dt;
    riverMat.color.copy(G.world.water.material.color).offsetHSL(0, 0.04, 0.05);
    foams.forEach((f, i) => { f.position.y += Math.sin(wt * 6 + i) * 0.004; f.scale.setScalar(0.8 + Math.abs(Math.sin(wt * 4 + i * 1.7)) * 0.5); });
    for (const it of interactables) {
      if (it.kind === 'tree' && it.shake > 0) { it.shake = Math.max(0, it.shake - dt); const s = Math.sin(it.shake * 40) * it.shake * 0.25; it.crown.rotation.z = s; it.crown.rotation.x = s * 0.5; }
      if (it.kind === 'dig') it.mark.visible = G.time >= it.ready;
    }
    const lit = G.state.phare.done;
    if (lit) { const n = G.night; light.intensity = n * 60; light.visible = n > 0.05; beams.visible = n > 0.05; beamMat.opacity = n * 0.22; beams.rotation.y += dt * 0.6; lens.scale.setScalar(1 + n * 0.4); }
    else { light.intensity = 0; light.visible = false; beams.visible = false; }
  }
  setPhare(!!G.state.phare.done);
  const fishSpot = { x: (DOCK2.x0 + DOCK2.x1) / 2, z: DOCK2.z1 - 0.8, fx: (DOCK2.x0 + DOCK2.x1) / 2, fz: DOCK2.z1 + 3 };
  return { isle: 2, root, interactables, obstacles, walkable, update, setPhare, bobber, fishSpot, digs, beds: [], butterflies: [], ferry, phare, light, beams,
    counts: { firs: firs.length, rocks: rocks.length + bankRocks.length } };
}
