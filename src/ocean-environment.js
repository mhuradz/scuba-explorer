import * as THREE from 'three';

// All scenery uses world coordinates. Fish and the diver never enter this group.
export function rebuildOcean(game) {
  const { scene } = game;
  const old = scene.children.filter(o =>
    (o.isGroup && o !== game.player && !game.fish.includes(o)) ||
    (o.isMesh && (o.geometry.type === 'BoxGeometry' || o.geometry.type === 'IcosahedronGeometry')) ||
    Object.values(game.surface).includes(o));
  old.forEach(o => scene.remove(o));
  const environment = new THREE.Group();
  scene.add(environment);
  let seed = 72;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const heightAt = (x, z) => -8.65 + .22 * Math.sin(x * .31 + z * .18) + .12 * Math.sin(x * .8 - z * .36);
  scene.background.set(0x083842);
  scene.fog = new THREE.FogExp2(0x14616b, .027);
  game.renderer.toneMappingExposure = 1.05;
  scene.children.filter(o => o.isHemisphereLight).forEach(o => { o.intensity = 1.25; o.color.set(0xb1e6e0); o.groundColor.set(0x102d33); });
  scene.children.filter(o => o.isDirectionalLight).forEach(o => { o.intensity = 2.6; o.position.set(-15, 25, 8); o.shadow.mapSize.set(2048, 2048); Object.assign(o.shadow.camera, { left: -30, right: 30, top: 18, bottom: -18 }); o.shadow.camera.updateProjectionMatrix(); o.shadow.bias = -.0005; });

  // Fine grain and ripples are generated once and shared by sand and rock.
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d'); const pixels = ctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const i = (y * 256 + x) * 4;
    const grain = random() * 30 + Math.sin(y * .32 + Math.sin(x * .035) * 2) * 9;
    pixels.data[i] = 150 + grain; pixels.data[i + 1] = 143 + grain; pixels.data[i + 2] = 119 + grain; pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  const sand = new THREE.CanvasTexture(canvas); sand.wrapS = sand.wrapT = THREE.RepeatWrapping; sand.repeat.set(65, 40); sand.colorSpace = THREE.SRGBColorSpace;
  const ground = new THREE.PlaneGeometry(180, 100, 240, 120); ground.rotateX(-Math.PI / 2);
  const positions = ground.attributes.position;
  for (let i = 0; i < positions.count; i++) positions.setY(i, heightAt(positions.getX(i), positions.getZ(i)));
  ground.computeVertexNormals();
  const bed = new THREE.Mesh(ground, new THREE.MeshStandardMaterial({ map: sand, bumpMap: sand, bumpScale: .055, roughness: .98, color: 0xa9b39b }));
  bed.receiveShadow = true; environment.add(bed);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x70796a, roughness: 1, vertexColors: true });
  for (let i = 0; i < 36; i++) {
    const geo = new THREE.IcosahedronGeometry(1, 3); const p = geo.attributes.position; const colors = [];
    for (let j = 0; j < p.count; j++) {
      const x = p.getX(j), y = p.getY(j), z = p.getZ(j);
      const noise = 1 + .12 * Math.sin(x * 9 + z * 5) * Math.cos(y * 7) + .06 * Math.sin(z * 17);
      p.setXYZ(j, x * noise, y * noise, z * noise);
      const shade = .65 + .25 * Math.sin(x * 5 + y * 4) ** 2; colors.push(shade, shade, shade * .9);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.computeVertexNormals();
    const rock = new THREE.Mesh(geo, rockMat); const x = -34 + random() * 68, z = -5 + random() * 7;
    const scale = .3 + random() * .9; rock.scale.set(scale * 1.4, scale * .6, scale);
    rock.position.set(x, heightAt(x, z) + scale * .25, z); rock.rotation.y = random() * 6.28;
    rock.castShadow = rock.receiveShadow = true; environment.add(rock);
  }
  const coralMaterials = [0x977b61, 0x9f786b, 0x657d75].map(color => new THREE.MeshStandardMaterial({ color, roughness: .95 }));
  for (let i = 0; i < 23; i++) {
    const x = -30 + random() * 60, z = -4 + random() * 5;
    const colony = new THREE.Group(); colony.position.set(x, heightAt(x, z) - .03, z);
    const branch = (start, direction, length, radius, depth) => {
      const end = start.clone().addScaledVector(direction, length);
      const mid = start.clone().lerp(end, .5).add(new THREE.Vector3(.08 * (random() - .5), 0, .07));
      const curve = new THREE.CatmullRomCurve3([start, mid, end]);
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 5, radius, 5, false), coralMaterials[i % 3]);
      mesh.castShadow = true; colony.add(mesh);
      if (depth > 0) for (const side of [-1, 1]) branch(end, new THREE.Vector3(direction.x + side * (.25 + random() * .4), .7, (random() - .5) * .45).normalize(), length * .68, radius * .65, depth - 1);
    };
    branch(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), .4 + random() * .3, .055, 3);
    environment.add(colony);
  }
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x466b49, roughness: .95, side: THREE.DoubleSide });
  const grasses = [];
  for (let i = 0; i < 95; i++) {
    const x = -35 + random() * 70, z = -5 + random() * 8;
    const tuft = new THREE.Group(); tuft.position.set(x, heightAt(x, z) - .025, z);
    for (let j = 0; j < 5; j++) {
      const h = .25 + random() * .75, bend = (random() - .5) * .4;
      const geo = new THREE.PlaneGeometry(.065, h, 1, 6); geo.translate(0, h / 2, 0);
      const p = geo.attributes.position;
      for (let k = 0; k < p.count; k++) { const ratio = p.getY(k) / h; p.setX(k, p.getX(k) * (1 - ratio * .92) + bend * ratio * ratio); }
      geo.computeVertexNormals(); const blade = new THREE.Mesh(geo, grassMat); blade.rotation.y = random() * Math.PI; tuft.add(blade);
    }
    environment.add(tuft); grasses.push(tuft);
  }
  const uniforms = { time: { value: 0 } };
  const water = new THREE.Mesh(new THREE.PlaneGeometry(240, 120), new THREE.ShaderMaterial({
    uniforms, depthWrite: false,
    vertexShader: 'varying vec2 v; void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 v; uniform float time;
      void main(){
        float h=smoothstep(.28,.68,v.y);
        vec3 c=mix(vec3(.013,.09,.13),vec3(.13,.43,.47),h);
        float rays=pow(max(0.,sin(v.x*100.+v.y*19.+sin(time*.12+v.y*5.))),18.);
        c+=vec3(.14,.2,.17)*rays*smoothstep(.35,.7,v.y)*.22;
        float sun=exp(-length((v-vec2(.46,.63))*vec2(1.,1.6))*125.);
        c+=vec3(.7,.72,.5)*sun;
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  water.position.set(0, 0, -48); water.renderOrder = -1; environment.add(water);
  // Keep recovery items accessible above the new terrain.
  game.markers.forEach(m => { m.y = Math.max(m.y, heightAt(m.x, 0) + 1.2); });
  return { heightAt, follow(x) {
    water.position.x = x;
    const center = Math.round(x / 40) * 40;
    if (bed.position.x !== center) {
      bed.position.x = center;
      for (let i=0;i<positions.count;i++) positions.setY(i,heightAt(positions.getX(i)+center,positions.getZ(i)));
      positions.needsUpdate=true; ground.computeVertexNormals();
    }
  }, update(time) { uniforms.time.value = time; grasses.forEach((g, i) => { g.rotation.z = Math.sin(time * .8 + i * .7) * .08; }); } };
}
