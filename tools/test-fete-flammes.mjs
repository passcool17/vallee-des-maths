// Flammes du gâteau avec le vrai three.js et le vrai makeFeteScene (toile 2D factice, aucun navigateur).
// Reproduit le test de visibilité du rendu (Frustum.intersectsObject) après chaque changement du nombre de bougies.
const ctx = new Proxy({}, { get: (t, k) => k === 'measureText' ? () => ({ width: 100 }) : () => ({ addColorStop() {} }), set: () => true });
globalThis.document ??= { createElement: () => ({ getContext: () => ctx, width: 0, height: 0 }) };
const THREE = await import('../vendor/three.module.min.js');
const { makeFeteScene, GATEAU } = await import('../js/fete-scene.js');
let pass = 0, fail = 0; const ok = (n, c, x = '') => { if (c) pass++; else { fail++; console.log('FAIL', n, x); } };
function monte() {
  const scene = new THREE.Scene(), world = { root: new THREE.Group(), obstacles: [] }; scene.add(world.root);
  const fs = makeFeteScene({ scene, world, active: true });
  let flames; world.root.traverse(o => { if (o.isInstancedMesh && o.material.color.getHexString() === 'ffcf4a') flames = o; });
  const cam = new THREE.PerspectiveCamera(34, 1, 0.5, 900); cam.position.set(GATEAU.x, 8, GATEAU.z + 10); cam.lookAt(GATEAU.x, 1, GATEAU.z); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  // comme WebGLRenderer : un objet frustumCulled n’est dessiné que si sa sphère englobante coupe la vue
  // (projectObject de r170 teste la sphère avant de regarder count : la 1re image calcule donc la sphère même à 0 flamme)
  const dessine = () => { scene.updateMatrixWorld(true); const vu = !flames.frustumCulled || fr.intersectsObject(flames); return flames.visible && flames.count > 0 && vu; };
  return { fs, flames, dessine };
}
for (const suite of [[0, 5, 9, 13], [4, 9, 13], [13], [0, 13]]) {
  const { fs, flames, dessine } = monte();
  for (const n of suite) { fs.setBougies(n); ok(`${suite.join('→')} : ${n} flammes ${n ? 'dessinées' : 'absentes'}`, dessine() === n > 0 && flames.count === n, `count=${flames.count}`); }
  fs.setBougies(0); ok(`${suite.join('→')} : 0 après souffle`, !dessine() && flames.count === 0);
  fs.setBougies(13); ok(`${suite.join('→')} : de nouveau 13 (rechargement ou reprise)`, dessine());
}
{ // flammes restées hors champ du sous-groupe initial : la vue ne voit que la 13e flamme
  const { fs, flames } = monte(); fs.setBougies(1); flames.updateMatrixWorld(true);
  const m = new THREE.Matrix4(), p = new THREE.Vector3(); flames.getMatrixAt(12, m); p.setFromMatrixPosition(m);
  const cam = new THREE.PerspectiveCamera(5, 1, 0.1, 50); cam.position.set(p.x, p.y + 0.5, p.z + 0.01); cam.lookAt(p); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
  fs.setBougies(13); ok('13e flamme visible seule dans la vue', !flames.frustumCulled || fr.intersectsObject(flames));
}
console.log(`${pass} PASS, ${fail} FAIL`);
if (fail) process.exit(1);
