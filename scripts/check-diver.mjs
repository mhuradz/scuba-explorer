import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import { rigDiver } from '../src/diver-animation.js';

const file = fs.readFileSync(new URL('../public/assets/diver/32MDY1IR0WFSA2YU0GHA1YTV6.glb', import.meta.url));
const jsonLength = file.readUInt32LE(12);
const gltf = JSON.parse(file.subarray(20, 20 + jsonLength).toString());
const binaryStart = 20 + jsonLength + 8;
const model = new THREE.Group();
for (const mesh of gltf.meshes) {
  const accessor = gltf.accessors[mesh.primitives[0].attributes.POSITION];
  const view = gltf.bufferViews[accessor.bufferView];
  const positions = new Float32Array(accessor.count * 3);
  for (let i = 0; i < accessor.count; i++) {
    for (let axis = 0; axis < 3; axis++) positions[i * 3 + axis] = file.readFloatLE(binaryStart + (view.byteOffset || 0) + (accessor.byteOffset || 0) + i * (view.byteStride || 12) + axis * 4);
  }
  model.add(new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(positions, 3)), new THREE.MeshBasicMaterial()));
}
const animator = rigDiver(model);
const player = new THREE.Group();
player.add(model);
animator.update(0);
const meshes = model.children.filter(mesh => mesh.isSkinnedMesh);
assert.equal(meshes.length, 8);
for (const mesh of meshes) {
  const weights = mesh.geometry.attributes.skinWeight;
  for (let i = 0; i < weights.count; i++) assert.ok(Math.abs(weights.getX(i) + weights.getY(i) + weights.getZ(i) - 1) < 1e-6);
}
const bones = meshes[0].skeleton.bones;
const hip = bones.find(b => b.name === 'hip1');
const shoulder = bones.find(b => b.name === 'shoulder1');
assert.ok(Math.abs(shoulder.rotation.z) > 1, 'Arms must leave the T-pose');
const idleHip = hip.rotation.x;
for (let i = 0; i < 60; i++) animator.update(1 / 60, { horizontal: 1, sprinting: true });
assert.notEqual(hip.rotation.x, idleHip, 'Swimming must articulate legs');
const frozen = hip.rotation.x;
animator.update(0, { horizontal: 1, sprinting: true });
assert.equal(hip.rotation.x, frozen, 'Zero elapsed time must preserve pose');
for (let i = 0; i < 90; i++) animator.update(1 / 60, { horizontal: -1 });
assert.ok(new THREE.Vector3(1, 0, 0).applyQuaternion(player.quaternion).x < -.99, 'Turn to face left');
const facing = player.quaternion.clone();
for (let i = 0; i < 90; i++) animator.update(1 / 60);
assert.ok(player.quaternion.angleTo(facing) < .01, 'Keep facing direction at rest');
console.log('PASS: eight skinned meshes, normalized weights, bent arms, animated legs, zero-delta pose, turning and idle facing.');
