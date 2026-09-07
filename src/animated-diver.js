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
  const palms = ['CATRigLArmPalm_025','CATRigRArmPalm_048'].map(name=>model.getObjectByName(name));
  const collars = ['CATRigLArmCollarbone_021','CATRigRArmCollarbone_044'].map(name=>model.getObjectByName(name));
  let restoreArmPose=[];
  function holdScooter() {
    const grips = target.userData.scooterGrips;
    if (!grips || !palms.every(Boolean)) return;
    target.updateWorldMatrix(true, true);
    palms.forEach((palm, index) => {
      const destination = target.localToWorld(grips[index].clone());
      const joints = [];
      for (let joint = palm.parent; joint && /Arm/.test(joint.name) && !/Collarbone/.test(joint.name); joint = joint.parent) {
        // Arm22 is the second half of the forearm, not another elbow.
        // Solving it as a hinge folds the forearm in the middle.
        if (joint.isBone && /Arm(?:1|21)_\d+$/.test(joint.name)) joints.push(joint);
      }
      joints.forEach(bone => restoreArmPose.push([bone, bone.quaternion.clone()]));
      for (let iteration = 0; iteration < 32; iteration++) {
        for (const bone of joints) {
          target.updateWorldMatrix(true, true);
          const hand = bone.worldToLocal(palm.getWorldPosition(new THREE.Vector3())).normalize();
          const goal = bone.worldToLocal(destination.clone()).normalize();
          if (hand.lengthSq() && goal.lengthSq()) bone.quaternion.multiply(new THREE.Quaternion().setFromUnitVectors(hand, goal));
        }
      }
      // Preserve the authored wrist twist, but remove its dangling bend.
      // Finger-base direction should continue along the forearm's local X.
      restoreArmPose.push([palm, palm.quaternion.clone()]);
      const fingerDirection = new THREE.Vector3();
      palm.children.filter(node => /Digit[234]1_/.test(node.name))
        .forEach(node => fingerDirection.add(node.position));
      if (fingerDirection.lengthSq()) {
        fingerDirection.normalize().applyQuaternion(palm.quaternion);
        const straighten = new THREE.Quaternion().setFromUnitVectors(fingerDirection, new THREE.Vector3(1, 0, 0));
        palm.quaternion.premultiply(straighten);
      }
    });
    target.updateWorldMatrix(true, true);
  }
  function holdThroat(weight) {
    if(weight<.01 || !collars.every(Boolean))return;
    target.updateMatrixWorld(true);
    const throat=collars[0].getWorldPosition(new THREE.Vector3()).add(collars[1].getWorldPosition(new THREE.Vector3())).multiplyScalar(.5);
    for(const palm of palms) {
      if(!palm)return;
      const joints=[];let joint=palm.parent;
      for(let i=0;i<4&&joint;i++,joint=joint.parent)if(joint.isBone)joints.push(joint);
      const originals=joints.map(b=>b.quaternion.clone());
      joints.forEach((bone,i)=>restoreArmPose.push([bone,originals[i].clone()]));
      for(let iteration=0;iteration<5;iteration++)for(const bone of joints){
        target.updateMatrixWorld(true);
        const hand=bone.worldToLocal(palm.getWorldPosition(new THREE.Vector3())).normalize();
        const destination=bone.worldToLocal(throat.clone()).normalize();
        if(hand.lengthSq() && destination.lengthSq())bone.quaternion.multiply(new THREE.Quaternion().setFromUnitVectors(hand,destination));
      }
      joints.forEach((bone,i)=>bone.quaternion.copy(originals[i].slerp(bone.quaternion.clone(),weight)));
    }
  }
  const wake = new THREE.Group();
  const wakeMaterial = new THREE.MeshBasicMaterial({ color: 0x9be7e8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let i = 0; i < 3; i++) { const ring = new THREE.Mesh(new THREE.RingGeometry(.08, .13, 32), wakeMaterial.clone()); ring.position.x = (i - 1) * .35; ring.rotation.z = (i - 1) * .12; wake.add(ring); }
  target.parent?.add(wake);
  let wakeAge = 2;
  let distressBlend = 0, distressTime = 0;
  return {
    update(dt, { horizontal = 0, vertical = 0, sprinting = false, strokeRate, exhausted = false, distress = false, attacked = false } = {}) {
      const blend = 1 - Math.exp(-7 * dt);
      distressBlend += ((distress ? 1 : 0) - distressBlend) * (1 - Math.exp(-3 * dt));
      distressTime += dt;
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
      const normalRate = distress ? .12 : exhausted ? .08 : strokeRate ?? (horizontal || vertical ? sprinting ? 1.5 : 1 : .35);
      rate += ((wasTurning ? .18 : normalRate) - rate) * blend;
      mixer.update(dt * rate);
      restoreArmPose.forEach(([bone,quaternion])=>bone.quaternion.copy(quaternion));
      restoreArmPose=[];
      // Keep authored strokes, but let the game's movement own translation.
      if (root && anchor) root.position.copy(anchor);
      if (wasTurning && armL && armR && armLRest && armRRest) {
        const wave = Math.sin(turnProgress * Math.PI * 2) * Math.sin(turnProgress * Math.PI) * .28;
        armL.rotation.set(armLRest.x, armLRest.y, armLRest.z + wave);
        armR.rotation.set(armRRest.x, armRRest.y, armRRest.z - wave);
      }
      // Blend a restrained, irregular distress pose over the authored stroke.
      // Mixer evaluation above resets the bone pose each frame, avoiding drift.
      const struggle = Math.sin(distressTime * 4.7) * Math.sin(distressTime * 1.3);
      if (armL) { armL.rotation.z += distressBlend * (.6 + struggle * .12); armL.rotation.x += distressBlend * .25; }
      if (armR) { armR.rotation.z -= distressBlend * (.55 - struggle * .1); armR.rotation.x -= distressBlend * .2; }
      if(attacked) {
        const tremble=Math.sin(distressTime*22)*.035;
        if(armL){armL.rotation.x+=.55+tremble;armL.rotation.z+=.3;}
        if(armR){armR.rotation.x-=.55-tremble;armR.rotation.z-=.3;}
      }
      target.rotation.set(pitch + distressBlend * (.12 + struggle * .04), yaw, roll + distressBlend * (.55 + Math.sin(distressTime * 1.7) * .06), 'YXZ');
      if(!attacked)holdThroat(distressBlend);
      if (!attacked && distressBlend < .1) holdScooter();
      wakeAge += dt;
      wake.visible = wakeAge < .9;
      wake.position.copy(target.position).add(new THREE.Vector3(0, 0, 1.1));
      wake.children.forEach((ring, index) => { const age = Math.max(0, wakeAge - index * .08); const progress = Math.min(1, age / .8); ring.scale.setScalar(.35 + progress * 3.1); ring.material.opacity = Math.max(0, .42 * (1 - progress)); });
    }
  };
}
