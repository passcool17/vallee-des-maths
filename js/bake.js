// Fusionne les pièces fixes d’un personnage : un seul maillage par couleur (moins d’appels de dessin, utile sur téléphone).
import * as THREE from '../vendor/three.module.min.js';
import { mat } from './world.js';

export function bake(group) {
  const byColor = new Map();
  for (const o of [...group.children]) {
    if (!o.isMesh || o.userData.keep) continue;
    o.updateMatrix();
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    g.applyMatrix4(o.matrix);
    const key = o.userData.color; if (!byColor.has(key)) byColor.set(key, []); byColor.get(key).push(g);
    group.remove(o);
  }
  for (const [color, list] of byColor) {
    let n = 0; for (const g of list) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let off = 0;
    for (const g of list) { pos.set(g.attributes.position.array, off * 3); nor.set(g.attributes.normal.array, off * 3); off += g.attributes.position.count; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.computeBoundingSphere(); group.add(new THREE.Mesh(geo, mat(color)));
  }
  return group;
}
// Pièce colorée (retient sa couleur pour bake)
export function part(geo, color, x = 0, y = 0, z = 0, s = null, r = null) {
  const m = new THREE.Mesh(geo, mat(color)); m.userData.color = color; m.position.set(x, y, z);
  if (s) m.scale.set(...s); if (r) m.rotation.set(...r); return m;
}
