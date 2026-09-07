import * as THREE from 'three';

export function createCoralColony(random, material, type = 0) {
  const colony = new THREE.Group();
  if (type === 0) {
    // Lobed massive coral with fine folded ridges, rather than a smooth sphere.
    const geometry = new THREE.SphereGeometry(1, 36, 24);
    const p = geometry.attributes.position;
    for(let i=0;i<p.count;i++) {
      const x=p.getX(i), y=p.getY(i), z=p.getZ(i);
      const folds=.06*Math.sin(x*23+Math.sin(z*13)*2)*Math.sin(y*19+z*7);
      const lobes=1+.12*Math.sin(x*5+z*3)*Math.cos(y*6)+folds;
      p.setXYZ(i,x*lobes,y*lobes*.65+.4,z*lobes);
    }
    geometry.computeVertexNormals();
    colony.add(new THREE.Mesh(geometry,material));
  } else {
    // Overlapping, uneven plate coral with a thicker centre and thin edges.
    const count=4+Math.floor(random()*4);
    for(let plate=0;plate<count;plate++) {
      const geometry=new THREE.SphereGeometry(1,28,12);
      const p=geometry.attributes.position;
      for(let i=0;i<p.count;i++) {
        const x=p.getX(i),y=p.getY(i),z=p.getZ(i),a=Math.atan2(z,x);
        const wave=1+.08*Math.sin(a*7+plate)+.04*Math.cos(a*13);
        p.setXYZ(i,x*wave,y*.075+.06*Math.sin(a*5)*Math.hypot(x,z),z*wave);
      }
      geometry.computeVertexNormals();
      const mesh=new THREE.Mesh(geometry,material);
      mesh.scale.setScalar(.4+random()*.55);
      mesh.position.set((random()-.5)*.8,.15+plate*.16,(random()-.5)*.7);
      mesh.rotation.set((random()-.5)*.25,random()*6.28,(random()-.5)*.2);
      colony.add(mesh);
    }
  }
  colony.traverse(mesh=>{if(mesh.isMesh)mesh.castShadow=mesh.receiveShadow=true;});
  return colony;
}
