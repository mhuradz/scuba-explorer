import * as THREE from 'three';

export function createAnimatedDiver(gltf, target) {
  const model = gltf.scene;
  // This download includes its own floor; the game supplies the environment.
  model.traverse(node => { if (/SeaBottom/i.test(node.name)) node.visible = false; });
  const mixer = new THREE.AnimationMixer(model);
  const clip = gltf.animations[0];
  if (!clip) throw new Error('The replacement diver has no animation clip.');
  mixer.clipAction(clip).play();
  mixer.update(0);
  const pivot = new THREE.Group();
  pivot.add(model);
  model.rotation.y = Math.PI / 2;
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3();
  model.traverse(node => {
    if (node.isSkinnedMesh) {
      node.frustumCulled = false;
      node.computeBoundingBox();
      bounds.union(node.boundingBox.clone().applyMatrix4(node.matrixWorld));
    }
  });
  const size = bounds.getSize(new THREE.Vector3());
  const scale = 3 / Math.max(size.x, size.y, size.z);
  pivot.scale.setScalar(scale);
  model.position.sub(bounds.getCenter(new THREE.Vector3()));
  target.add(pivot);
  const turnDuration = .68;
  let facing = 1, pendingFacing = 1, pitch = 0, yaw = 0, turnStartYaw = 0, turnTargetYaw = 0, roll = 0, rate = .35, turnTimer = 0;
  target.rotation.order = 'YXZ';
  target.scale.setScalar(1);
  // The bubble emitter reads these without inheriting the diver's pitch/roll.
  // This keeps the emission point at the mask while bubbles rise in world-up.
  target.userData.facing = facing;
  target.userData.headOffset = { x: .94, y: .22, z: .18 };
  const root = model.getObjectByName('CATRigHub001_07');
  const anchor = root?.position.clone();
  const armL = model.getObjectByName('CATRigLArm1_022');
  const armR = model.getObjectByName('CATRigRArm1_045');
  const armLRest = armL?.rotation.clone();
  const armRRest = armR?.rotation.clone();
  const wake = new THREE.Group();
  const wakeMaterial = new THREE.MeshBasicMaterial({ color: 0x9be7e8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let i = 0; i < 3; i++) { const ring = new THREE.Mesh(new THREE.RingGeometry(.08, .13, 32), wakeMaterial.clone()); ring.position.x = (i - 1) * .35; ring.rotation.z = (i - 1) * .12; wake.add(ring); }
  target.parent?.add(wake);
  let wakeAge = 2;
  return {
    update(dt, { horizontal = 0, vertical = 0, sprinting = false, strokeRate } = {}) {
      const blend = 1 - Math.exp(-7 * dt);
      if (horizontal && Math.sign(horizontal) !== facing && turnTimer <= 0) { pendingFacing = Math.sign(horizontal); turnStartYaw = yaw; turnTargetYaw = pendingFacing > 0 ? 0 : Math.PI; turnTimer = turnDuration; wakeAge = 0; }
      const wasTurning = turnTimer > 0;
      turnTimer = Math.max(0, turnTimer - dt);
      const turnProgress = wasTurning ? 1 - turnTimer / turnDuration : 1;
      if (wasTurning) {
        const turnEase = turnProgress * turnProgress * (3 - 2 * turnProgress);
        const yawDelta = Math.atan2(Math.sin(turnTargetYaw - turnStartYaw), Math.cos(turnTargetYaw - turnStartYaw));
        yaw = turnStartYaw + yawDelta * turnEase;
      } else {
        yaw = facing > 0 ? 0 : Math.PI;
      }
      if (turnTimer === 0 && pendingFacing !== facing) { facing = pendingFacing; target.userData.facing = facing; }
      pitch += (vertical * .18 - pitch) * blend;
      const turnRoll = wasTurning ? Math.sin(turnProgress * Math.PI) * .2 * (pendingFacing - facing) : 0;
      roll += ((wasTurning ? turnRoll : -horizontal * .06) - roll) * blend;
      const normalRate = strokeRate ?? (horizontal || vertical ? sprinting ? 1.5 : 1 : .35);
      rate += ((wasTurning ? .18 : normalRate) - rate) * blend;
      mixer.update(dt * rate);
      // Keep authored strokes, but let the game's movement own translation.
      if (root && anchor) root.position.copy(anchor);
      if (wasTurning && armL && armR && armLRest && armRRest) {
        const wave = Math.sin(turnProgress * Math.PI * 2) * Math.sin(turnProgress * Math.PI) * .28;
        armL.rotation.set(armLRest.x, armLRest.y, armLRest.z + wave);
        armR.rotation.set(armRRest.x, armRRest.y, armRRest.z - wave);
      }
      target.rotation.set(pitch, yaw, roll, 'YXZ');
      wakeAge += dt;
      wake.visible = wakeAge < .9;
      wake.position.copy(target.position).add(new THREE.Vector3(0, 0, 1.1));
      wake.children.forEach((ring, index) => { const age = Math.max(0, wakeAge - index * .08); const progress = Math.min(1, age / .8); ring.scale.setScalar(.35 + progress * 3.1); ring.material.opacity = Math.max(0, .42 * (1 - progress)); });
    }
  };
}
