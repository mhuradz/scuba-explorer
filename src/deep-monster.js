import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
export function updateDeepMonster(game,dt,time,damage) {
  if(game.mapId<3)return;
  if(!game.monsterRequested){
    game.monsterRequested=true;
    new GLTFLoader().load('/assets/sea-life/deep-sea-monster.glb',gltf=>{
      if(!game.renderer.domElement.isConnected)return;
      const model=gltf.scene,box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
      const root=new THREE.Group();model.position.sub(center);const scale=5/Math.max(size.x,size.y,size.z);root.scale.setScalar(scale);root.add(model);
      const body=new THREE.Group();body.add(root);game.scene.add(body);
      const mixer=new THREE.AnimationMixer(model);if(gltf.animations[0])mixer.clipAction(gltf.animations[0]).play();
      body.position.set(23,game.environment.heightAt(23,1)+3,1);
      // The game camera is a side-on 2D view. Keep the creature's model in
      // profile and flip it horizontally instead of turning its face toward
      // the camera like a free-roaming 3D character.
      game.monster={body,mixer,cooldown:0,direction:-1,yaw:Math.PI};
    },undefined,error=>console.warn('Monster load failed',error));
  }
  const m=game.monster;if(!m)return;
  m.cooldown=Math.max(0,m.cooldown-dt);
  const p=game.player.position,deep=p.y<-7,dist=m.body.position.distanceTo(p),chasing=deep&&dist<12;
  if (m.attack) {
    m.attack.time += dt;
    const bite = m.attack.time > .38;
    const attackDirection = Math.sign(p.x - m.body.position.x) || m.direction;
    m.body.position.x += (p.x - m.body.position.x - m.direction * 1.1) * Math.min(1, dt * 8);
    m.body.position.y += (p.y - m.body.position.y) * Math.min(1, dt * 8);
    m.body.rotation.y = attackDirection > 0 ? 0 : Math.PI;
    m.body.rotation.x = 0;
    m.body.rotation.z = Math.sin(m.attack.time * 18) * .08;
    m.body.scale.setScalar(1 + Math.sin(Math.min(1, m.attack.time / .8) * Math.PI) * .08);
    game.swimInput = { horizontal: 0, vertical: 0, attacked: true, distress: true, strokeRate: .04 };
    if (bite && !m.attack.bitten) { m.attack.bitten = true; damage(38); }
    if (m.attack.time > 1.15) { m.body.rotation.z = 0; m.body.scale.setScalar(1); m.attack = null; game.monsterAttack = null; }
    return;
  }
  const targetX=chasing?p.x:m.body.position.x+m.direction*3;
  if(!chasing&&(m.body.position.x<18||m.body.position.x>game.mapBounds.max-2))m.direction*=-1;
  const direction=Math.sign(targetX-m.body.position.x)||1;
  m.body.position.x+=direction*(chasing?1.05:.4)*dt;
  const floor=game.environment.heightAt(m.body.position.x,1)+2.8;
  const targetY=Math.min(-7,Math.max(floor,chasing?p.y:floor+.4*Math.sin(time*.6)));
  m.body.position.y+=(targetY-m.body.position.y)*(1-Math.exp(-dt*2));
  // Preserve the side-on silhouette: horizontal movement is represented by
  // a flip, never by rotating the model toward the camera.
  const yaw=direction>0?0:Math.PI;
  m.yaw+=Math.atan2(Math.sin(yaw-m.yaw),Math.cos(yaw-m.yaw))*(1-Math.exp(-dt*3));m.body.rotation.y=m.yaw;
  m.body.rotation.x=0;
  m.mixer.update(dt*(chasing?1.5:.75));
  if(chasing&&dist<2.5&&m.cooldown===0){
    m.cooldown=2.4;
    m.direction=direction;
    m.attack={time:0,bitten:false};
    game.monsterAttack={monster:m,time:0};
  }
}
