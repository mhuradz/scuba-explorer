import * as THREE from 'three';
export function equipVisuals(target, loadout) {
  (target.userData.worn||[]).forEach(group=>{group.removeFromParent();group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});});
  const worn=[];target.userData.worn=worn;target.userData.stabilizeRightHand=!!loadout.light;
  const mat=color=>new THREE.MeshStandardMaterial({color,roughness:.5,metalness:.3});
  // Attach each item to the real skeleton anchor. This keeps the equipment
  // locked to the animated body instead of drifting in root/world space.
  function attach(group,name,pos){const bone=target.getObjectByName(name);if(!bone)return false;target.updateWorldMatrix(true,true);const scale=bone.getWorldScale(new THREE.Vector3());group.scale.set(1/Math.abs(scale.x),1/Math.abs(scale.y),1/Math.abs(scale.z));bone.add(group);group.position.copy(pos||new THREE.Vector3()).divide(scale);group.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.castShadow=true;}});worn.push(group);return true;}
  if(loadout.light){
    const torch=new THREE.Group();
    const grip=new THREE.Mesh(new THREE.CylinderGeometry(.047,.06,.3,16),mat(0x111b20)); grip.rotation.z=Math.PI/2; torch.add(grip);
    const head=new THREE.Mesh(new THREE.CylinderGeometry(.09,.068,.12,20),mat(0x344a50)); head.rotation.z=Math.PI/2; head.position.x=.2; torch.add(head);
    for(const x of [.12,.16]){const bezel=new THREE.Mesh(new THREE.TorusGeometry(.086,.009,8,20),mat(0x10191d));bezel.rotation.y=Math.PI/2;bezel.position.x=x;torch.add(bezel);}
    const lens=new THREE.Mesh(new THREE.CircleGeometry(.069,24),new THREE.MeshBasicMaterial({color:0xf2ffff,transparent:true,opacity:1,side:THREE.DoubleSide})); lens.rotation.y=Math.PI/2; lens.position.x=.265; torch.add(lens);
    // Use actual scene lighting rather than a solid cone mesh. The wide angle,
    // soft penumbra and physical falloff produce a natural underwater beam.
    // atan(5 * tan(.48)) gives roughly five times the original beam width.
    const spot=new THREE.SpotLight(0xd9ffff,105,22,1.2,.92,1.55); spot.position.set(.27,0,0); spot.target.position.set(9,0,0); spot.castShadow=false; torch.add(spot,spot.target);
    // A very soft additive volume makes suspended water visible without
    // drawing an opaque geometric cone over the scene.
    const waterBeam=new THREE.Mesh(new THREE.ConeGeometry(6.2,9,48,1,true),new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,vertexShader:'varying vec2 beamUv;void main(){beamUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 beamUv;void main(){float edge=smoothstep(0.,.24,beamUv.x)*smoothstep(1.,.76,beamUv.x);float fade=(1.-beamUv.y)*beamUv.y*4.;gl_FragColor=vec4(.55,.9,1.,.055*edge*fade);}'})); waterBeam.rotation.z=Math.PI/2; waterBeam.position.x=4.65; torch.add(waterBeam);
    const lensGlow=new THREE.PointLight(0xbffaff,5,2.2,2); lensGlow.position.x=.27; torch.add(lensGlow);
    attach(torch,'CATRigRArmPalm_048',new THREE.Vector3(.18,-.03,-.12));
  }
  if(loadout.tank){
    const tank=new THREE.Group();const body=new THREE.Mesh(new THREE.CapsuleGeometry(.14,.58,6,16),mat(loadout.tank==='advanced_tank'?0xe1c45b:loadout.tank==='improved_tank'?0x6cc8d9:0xa8b6bb));body.rotation.z=Math.PI/2;tank.add(body);
    for(const x of [-.22,.22]){const strap=new THREE.Mesh(new THREE.TorusGeometry(.18,.025,6,16),mat(0x172128));strap.rotation.y=Math.PI/2;strap.position.x=x;tank.add(strap);}
    const valve=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.12,8),mat(0x444444));valve.rotation.z=Math.PI/2;valve.position.x=.5;tank.add(valve);
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(.5,0,0),new THREE.Vector3(.75,.12,.15),new THREE.Vector3(.95,-.18,.22)]);
    tank.add(new THREE.Mesh(new THREE.TubeGeometry(curve,12,.025,6,false),mat(0x152027)));
    attach(tank,'CATRigSpine2_017',new THREE.Vector3(.12,-.23,0));
  }
  if(loadout.fins)for(const name of ['CATRigLLegAnkle_010','CATRigRLegAnkle_014']){
    const bone=target.getObjectByName(name);if(!bone)continue;
    const fin=new THREE.Group();
    const rubber=mat(0x17272c);
    const bladeMaterial=mat(loadout.fins==='efficient_fins'?0x517d76:0x304953);
    // A thin paddle widening from the toe, not a solid cone.
    const outline=new THREE.Shape();
    outline.moveTo(.13,-.065);outline.lineTo(.64,-.145);
    outline.quadraticCurveTo(.71,-.145,.72,-.1);
    outline.lineTo(.72,.1);outline.quadraticCurveTo(.71,.145,.64,.145);
    outline.lineTo(.13,.065);outline.closePath();
    const geometry=new THREE.ExtrudeGeometry(outline,{depth:.018,bevelEnabled:true,bevelThickness:.006,bevelSize:.008,bevelSegments:2,steps:1});
    geometry.rotateX(Math.PI/2);
    const blade=new THREE.Mesh(geometry,bladeMaterial);blade.position.y=-.025;fin.add(blade);
    const pocket=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),rubber);
    pocket.scale.set(.17,.055,.073);pocket.position.set(.09,.012,0);fin.add(pocket);
    for(const side of [-1,1]){
      const rib=new THREE.Mesh(new THREE.BoxGeometry(.53,.018,.014),rubber);
      rib.position.set(.43,-.027,side*.103);rib.rotation.y=-side*.13;fin.add(rib);
    }
    attach(fin,name,new THREE.Vector3(0,0,0));
  }
}
