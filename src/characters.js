import * as THREE from 'three';
import { createAnimatedDiver } from './animated-diver.js';
export const characters = {
  basic:{name:'Character 1 · Basic swimmer',url:'/assets/diver/4f8b554364524095831b34b723f31682.glb',price:0,capacity:100,maxDepthFeet:45,speedFactor:1,effortFactor:1,stage:2}
};
function addUnderwaterColor(model,id) {
  if(id!=='abyss')return;
  model.traverse(node=>{
    if(!node.isMesh)return;
    const materials=node.material?(Array.isArray(node.material)?node.material:[node.material]):[new THREE.MeshStandardMaterial({color:0x3f6570,roughness:.72,metalness:.12})];
    if(!node.material)node.material=materials[0];
    materials.forEach(material=>{
      if(!material.color)return;
      // The supplied Deepwater Diver texture is grayscale. Tint it with a
      // natural deep-water palette while retaining its texture detail.
      const label=`${node.name||''} ${material.name||''}`.toLowerCase();
      const tint=/skin|face|hand|body/i.test(label)?0xd09b78:/tank|metal|knife/i.test(label)?0xb18446:/fin|flipper/i.test(label)?0x2c8584:0x3f6570;
      material.color.set(tint);
      material.needsUpdate=true;
    });
  });
}
export function animateCharacter(gltf,target,id) {
  if(id==='basic')return createAnimatedDiver(gltf,target);
  const model=gltf.scene, pivot=new THREE.Group();
  pivot.name=`${id}-character-root`;
  pivot.add(model);target.add(pivot);
  model.traverse(n=>{
    n.visible=true;
    if(n.isMesh){
      n.frustumCulled=false;
      n.castShadow=true;
      n.receiveShadow=true;
    }
  });
  addUnderwaterColor(model,id);
  model.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3());
  const maxDim=Math.max(size.x,size.y,size.z);
  // Some downloaded characters have an empty scene root until their mesh is
  // updated. Keep them renderable instead of producing a NaN scale.
  if(!Number.isFinite(maxDim)||maxDim<0.0001){
    pivot.scale.setScalar(1);
    return {update(){}};
  }
  model.position.sub(box.getCenter(new THREE.Vector3()));
  pivot.scale.setScalar(3/maxDim);
  // The supplied characters are already authored in a swimming pose. Only
  // correct a clearly vertical asset; do not force a camera-dependent turn.
  // The supplied diver is exported upright; lay it on its stomach for the
  // side-on underwater plane.
  if(size.y>size.x*1.35 && size.y>size.z*1.35)pivot.rotation.z=-Math.PI/2;
  const authoredMixer=gltf.animations?.length?new THREE.AnimationMixer(model):null;
  if(authoredMixer)authoredMixer.clipAction(gltf.animations[0]).play();
  // Animate only deform bones. The radz rig also contains IK, MCH, ORG and
  // twist controls; driving those together causes the broken pose seen in
  // the screenshot because several controls influence the same vertices.
  const limbPattern=/^DEF-(thigh|shin|upper_arm|forearm)\.([LR])$/i;
  const bones=[];model.traverse(n=>{
    const match=limbPattern.exec(n.name||'');
    if(!n.isBone||!match)return;
    bones.push({node:n,kind:match[1].toLowerCase(),rest:n.quaternion.clone(),phase:match[2].toUpperCase()==='L'?0:Math.PI});
  });
  let time=0,yaw=0;
  const animatedMeshlessModel=bones.length===0;
  return {update(dt,{horizontal=0,strokeRate=.6}={}){
    time+=dt;const goal=horizontal<0?Math.PI:horizontal>0?0:yaw;
    yaw+=Math.atan2(Math.sin(goal-yaw),Math.cos(goal-yaw))*(1-Math.exp(-3*dt));target.rotation.y=yaw;
    bones.forEach(({node,kind,rest,phase})=>{
    const arm=/arm/.test(kind), lower=kind==='shin'||kind==='forearm';
      const amplitude=arm?(lower?.12:.16):(lower?.16:.12);
      const angle=Math.sin(time*(2+strokeRate*1.8)+phase+(lower?Math.PI*.18:0))*amplitude;
      // Blender deformation bones in this rig bend around their local Z axis.
      if(!authoredMixer)node.quaternion.copy(rest).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),angle));
    });
    if(authoredMixer)authoredMixer.update(dt*(.8+Math.min(1.2,Math.max(0,strokeRate||.6))));
    // A static, unrigged mesh gets a restrained kick/bob so it never reads as
    // frozen in the roster or preview.
    if(animatedMeshlessModel){
      // A single authored mesh gets a continuous low-amplitude swim cycle.
      const effort=Math.min(1.35,Math.max(.55,Math.abs(horizontal)*.8+(strokeRate||.6)));
      const strokeTime=time*(2.6+effort*2.1);
      const kick=Math.sin(strokeTime)*.055;
      const breathe=Math.sin(strokeTime*.5)*.018;
      pivot.position.y=Math.sin(strokeTime*.72)*.045;
      pivot.position.z=Math.cos(strokeTime*.72)*.018;
      pivot.rotation.x=kick+breathe;
      pivot.rotation.z=Math.sin(strokeTime+.8)*.035;
      model.rotation.x=Math.sin(strokeTime*1.08)*.025;
    }
  }};
}
