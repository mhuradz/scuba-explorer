import * as THREE from 'three';

export function createExploration(game, actions) {
  game.mapBounds = game.mapBounds || { min: -Infinity, max: Infinity };
  const chunks = new Map(), claimed = new Set();
  const bursts=[];
  function sparkle(mesh) {
    if(actions.reducedMotion?.())return;
    const origin=mesh.getWorldPosition(new THREE.Vector3()),group=new THREE.Group();
    const material=new THREE.MeshBasicMaterial({color:0x8affb1,transparent:true,opacity:.8,depthWrite:false});
    const geometry=new THREE.OctahedronGeometry(.035);
    for(let i=0;i<12;i++){const bit=new THREE.Mesh(geometry,material);const a=i/12*Math.PI*2;bit.userData.velocity=new THREE.Vector3(Math.cos(a),Math.sin(a),Math.sin(i)*.3);group.add(bit);}
    group.position.copy(origin);game.scene.add(group);bursts.push({group,material,geometry,age:0});
  }

  const rockGeo = new THREE.IcosahedronGeometry(1,2);
  const rockMat = new THREE.MeshStandardMaterial({color:0x465c58,roughness:1});
  const lootGeo = new THREE.OctahedronGeometry(.24,0);
  const kelpGeo = new THREE.PlaneGeometry(.18, 1.8, 1, 6);
  kelpGeo.translate(0,.9,0);
  const kelpMat = new THREE.MeshStandardMaterial({color:0x3b795c,roughness:1,side:THREE.DoubleSide});
  const lootMat = new THREE.MeshStandardMaterial({color:0x65e88a,emissive:0x16a957,emissiveIntensity:1.6,roughness:.42});
  function chunk(id) {
    const group = new THREE.Group(); group.position.x = id * 80;
    let seed = (id * 137 + 98765) >>> 0;
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    for(let i=0;i<18;i++) {
      const rock = new THREE.Mesh(rockGeo,rockMat); const x=rand()*80-40, z=rand()*5-3;
      rock.position.set(x,game.environment.heightAt(x+id*80,z)+.1,z);
      rock.scale.set(.5+rand(),.25+rand()*.6,.5+rand()); rock.rotation.y=rand()*6;
      rock.castShadow=rock.receiveShadow=true; group.add(rock);
    }
    // A side-view grotto: a recessed dark chamber behind a swim-through arch.
    const kelp=[];
    for(let i=0;i<32;i++) {
      const blade=new THREE.Mesh(kelpGeo,kelpMat),x=rand()*80-40,z=rand()*5-2;
      blade.position.set(x,game.environment.heightAt(x+id*80,z),z);
      blade.scale.setScalar(.4+rand()); group.add(blade);kelp.push(blade);
    }
    if (id % 2 !== 0) {
      const cave = new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshBasicMaterial({color:0x051b24}));
      cave.position.set(0,-6.6,-2); cave.scale.set(4,2.1,.3); group.add(cave);
      for(let i=0;i<=16;i++) {
        const a=i/16*Math.PI, rock=new THREE.Mesh(rockGeo,rockMat);
        rock.position.set(Math.cos(a)*4,-8.1+Math.sin(a)*3.5,-.7);
        rock.scale.set(.75,.65,.8); rock.rotation.z=a; group.add(rock);
      }
    }
    const loot = new THREE.Mesh(lootGeo,lootMat); loot.position.set(id%2 ? 14 : -14,id%2 ? -6.5 : -3.2,1);
    loot.visible=!claimed.has(id); group.add(loot); game.scene.add(group);
    return {group,loot,kelp};
  }
  return { update() {
    const dt=Math.min(.05,Math.max(0,((game.animationTime||0)-(game.lastSparkleTime||0))));game.lastSparkleTime=game.animationTime||0;
    for(let i=bursts.length-1;i>=0;i--){const b=bursts[i];b.age+=dt;b.group.children.forEach(bit=>bit.position.addScaledVector(bit.userData.velocity,dt*.9));b.material.opacity=.8*Math.max(0,1-b.age/.55);if(b.age>=.55){b.group.removeFromParent();b.geometry.dispose();b.material.dispose();bursts.splice(i,1);}}
    const p=game.player.position, section=Math.floor((p.x+40)/80);
    for(let id=section-2;id<=section+2;id++) if(!chunks.has(id)) chunks.set(id,chunk(id));
    for(const [id,c] of chunks) {
      if(Math.abs(id-section)>2){game.scene.remove(c.group); c.group.traverse(o=>{if(o.geometry?.type==='SphereGeometry'){o.geometry.dispose();o.material.dispose();} if(o.isSprite)o.material.dispose();});chunks.delete(id);continue;}
      c.loot.rotation.y+=.015;
      c.kelp.forEach((blade,i)=>{blade.rotation.z=Math.sin((game.animationTime||0)*.8+i)*.12;});
      if(c.loot.visible && Math.hypot(p.x-(id*80+c.loot.position.x),p.y-c.loot.position.y)<1.1){sparkle(c.loot);claimed.add(id);c.loot.visible=false;actions.reward(75);}
    }
    for(const m of game.markers) if(!m.collected && Math.hypot(p.x-m.x,p.y-m.mesh.position.y)<1.2){sparkle(m.mesh);m.collected=true;m.mesh.visible=false;actions.collect();break;}
  }};
}
