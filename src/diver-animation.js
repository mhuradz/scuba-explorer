import * as THREE from 'three';

// Anatomical weights for this asset's Y-up T-pose (height 2.5 units).
// Keep its original geometry and textures; add a small swimming skeleton.
export function rigDiver(model) {
  const bones = [];
  function joint(name, position, parent) {
    const bone = new THREE.Bone();
    bone.name = name;
    bone.position.fromArray(position);
    (parent || model).add(bone);
    bones.push(bone);
    return bone;
  }
  const root = joint('body', [0, 0, 0]);
  const limbs = [-1, 1].map(side => {
    const shoulder = joint(`shoulder${side}`, [side * .22, .76, 0], root);
    const elbow = joint(`elbow${side}`, [side * .38, 0, 0], shoulder);
    const hip = joint(`hip${side}`, [side * .13, .08, 0], root);
    const knee = joint(`knee${side}`, [0, -.59, 0], hip);
    const ankle = joint(`ankle${side}`, [0, -.48, 0], knee);
    return { side, shoulder, elbow, hip, knee, ankle };
  });
  model.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);
  const meshes = [];
  model.traverse(node => { if (node.isMesh) meshes.push(node); });
  const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
  for (const mesh of meshes) {
    const geometry = mesh.geometry.clone();
    const positions = geometry.attributes.position;
    const indices = new Uint16Array(positions.count * 4);
    const weights = new Float32Array(positions.count * 4);
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i);
      const limb = limbs[x < 0 ? 0 : 1];
      let parent = root, child = root, blend = 0, influence = 0;
      if (Math.abs(x) > .2 && y > .48) {
        parent = limb.shoulder; child = limb.elbow;
        influence = smooth(.20, .34, Math.abs(x));
        blend = smooth(.53, .67, Math.abs(x));
      } else if (y < .08) {
        influence = 1 - smooth(-.12, .08, y);
        parent = limb.hip; child = limb.knee;
        blend = 1 - smooth(-.59, -.43, y);
        if (y < -.87) {
          parent = limb.knee; child = limb.ankle;
          blend = 1 - smooth(-1.07, -.92, y);
        }
      }
      indices.set([0, bones.indexOf(parent), bones.indexOf(child), 0], i * 4);
      weights.set([1 - influence, influence * (1 - blend), influence * blend, 0], i * 4);
    }
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(indices, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
    const skinned = new THREE.SkinnedMesh(geometry, mesh.material);
    skinned.name = mesh.name;
    skinned.position.copy(mesh.position);
    skinned.quaternion.copy(mesh.quaternion);
    skinned.scale.copy(mesh.scale);
    mesh.parent.add(skinned);
    skinned.bind(skeleton, mesh.matrixWorld);
    skinned.frustumCulled = false;
    mesh.removeFromParent();
  }
  // ZYX applies the local side-view turn before laying the body horizontally.
  model.rotation.set(0, Math.PI / 2 - .18, -Math.PI / 2, 'ZYX');
  model.scale.setScalar(1.2);
  let phase = 0, strength = 0, yaw = 0, pitch = 0, facing = 1;
  const desired = new THREE.Quaternion();
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  return {
    update(dt, { horizontal = 0, vertical = 0, sprinting = false } = {}) {
      const moving = horizontal !== 0 || vertical !== 0;
      const blend = 1 - Math.exp(-dt * 7);
      strength += ((moving ? sprinting ? 1 : .65 : .12) - strength) * blend;
      phase += dt * (2 + strength * 7);
      if (horizontal) facing = Math.sign(horizontal);
      yaw += ((facing < 0 ? Math.PI : 0) - yaw) * blend;
      pitch += ((vertical * .42) - pitch) * blend;
      euler.set(0, yaw, pitch);
      desired.setFromEuler(euler);
      model.parent.quaternion.copy(desired);
      for (const limb of limbs) {
        const kick = Math.sin(phase + (limb.side < 0 ? Math.PI : 0));
        limb.shoulder.rotation.z = -limb.side * 1.22;
        limb.shoulder.rotation.y = limb.side * (.22 + Math.sin(phase * .5) * .04);
        limb.elbow.rotation.y = -limb.side * 1.05;
        limb.hip.rotation.x = kick * (.08 + strength * .30);
        limb.knee.rotation.x = -.12 - Math.max(0, -kick) * (.15 + strength * .42);
        limb.ankle.rotation.x = .10 + Math.sin(phase + .6 + (limb.side < 0 ? Math.PI : 0)) * strength * .16;
      }
      model.position.y = Math.sin(phase * .5) * .018;
    }
  };
}
