import * as THREE from 'three';

export function updateSharkEncounter(game, dt, time, actions) {
  for (const shark of game.sharks) {
    const u=shark.userData, p=game.player.position;
    if(!u.seabedPatrol) {
      u.seabedPatrol=true;
      shark.position.set(p.x+10,game.environment.heightAt(p.x+10,1)+1.6,1);
    }
    const attack=game.sharkAttack;
    if(attack?.shark===shark) {
      attack.time+=dt;
      const bite=attack.time>.55;
      const tremor=bite ? Math.sin(time*23)*.055 : 0;
      shark.position.x=p.x-u.direction*(1.7+tremor);
      shark.position.y=p.y-.15+tremor; shark.position.z=p.z;
      shark.rotation.z=bite ? Math.sin(time*13)*.045 : 0;
      game.swimInput={horizontal:0,vertical:0,attacked:true,distress:true,strokeRate:.08};
      if(bite) {
        actions.damage(dt*45);
        attack.blood.visible=true;
        attack.blood.position.copy(p);
        attack.blood.children.forEach((drop,i)=>{
          const age=attack.time-.55;
          drop.position.set(Math.sin(i*2.4)*age*.25,Math.cos(i*1.7)*age*.18,Math.sin(i)*.3);
          drop.scale.setScalar(.4+age*.35);
          drop.material.opacity=Math.min(.22,age*.2);
        });
      }
      continue;
    }
    shark.position.x+=u.direction*.42*dt;
    if(shark.position.x>game.mapBounds.max-2 || shark.position.x<game.mapBounds.min+2)u.direction*=-1;
    shark.position.y=game.environment.heightAt(shark.position.x,1)+1.6+Math.sin(time*.7)*.1;
    shark.position.z=1;
    const target=u.direction>0?Math.PI/2:-Math.PI/2;
    u.yaw+=Math.atan2(Math.sin(target-u.yaw),Math.cos(target-u.yaw))*(1-Math.exp(-3*dt));
    shark.rotation.y=u.yaw;
    if(!attack && shark.position.distanceTo(p)<3 && p.y<game.environment.heightAt(p.x,p.z)+3.2) {
      u.direction=p.x>shark.position.x?1:-1;
      shark.rotation.y=u.yaw=u.direction>0?Math.PI/2:-Math.PI/2;
      const blood=new THREE.Group();
      const geometry=new THREE.SphereGeometry(.3,10,8);
      for(let i=0;i<12;i++)blood.add(new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:0x8f1428,transparent:true,opacity:0,depthWrite:false})));
      blood.visible=false;game.scene.add(blood);
      game.sharkAttack={shark,time:0,blood};
      game.speed=0;
    }
  }
}
