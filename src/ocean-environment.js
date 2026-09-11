import * as THREE from 'three';
import { createOceanLight } from './ocean-light.js';
import { createCoralColony } from './coral-colony.js';

// All scenery uses world coordinates. Fish and the diver never enter this group.
export function rebuildOcean(game) {
  const { scene } = game;
  const old = scene.children.filter(o =>
    (o.isGroup && o !== game.player && o !== game.goal && !game.fish.includes(o)) ||
    (o.isMesh && (o.geometry.type === 'BoxGeometry' || o.geometry.type === 'IcosahedronGeometry')) ||
    Object.values(game.surface).includes(o));
  old.forEach(o => scene.remove(o));
  const environment = new THREE.Group();
  scene.add(environment);
  let seed = 72;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  const profiles = {
    'open-ocean': { background: 0x062f3b, fog: 0x14616b, fogDensity: .024, exposure: 1.08, rockCount: 36, coralCount: 34, grassCount: 170, sand: [150, 143, 119], coral: [0x977b61, 0x9f786b, 0x657d75, 0x8b6b79, 0xa17a5f], grass: [0x365d48, 0x466b49, 0x5d7951], waterDeep: 'vec3(.006,.045,.07)', waterMid: 'vec3(.025,.2,.25)' },
    'coral-reef': { background: 0x0b4b52, fog: 0x28756f, fogDensity: .027, exposure: 1.16, rockCount: 30, coralCount: 58, grassCount: 235, sand: [118, 137, 111], coral: [0xd17469, 0xe29a63, 0x5fb7a4, 0xb978a9, 0xd8c16d], grass: [0x2d6e52, 0x3f8c65, 0x6c9e5b], waterDeep: 'vec3(.006,.06,.075)', waterMid: 'vec3(.035,.28,.27)' },
    'sunken-wreck': { background: 0x073744, fog: 0x145b64, fogDensity: .028, exposure: 1.02, rockCount: 44, coralCount: 18, grassCount: 112, sand: [125, 118, 96], coral: [0x80634e, 0x856757, 0x5e746d, 0x75626d, 0x886b50], grass: [0x31533f, 0x3d6546, 0x526e4c], waterDeep: 'vec3(.007,.055,.078)', waterMid: 'vec3(.028,.19,.22)', deepSea: true },
    'kelp-forest': { background: 0x073442, fog: 0x145764, fogDensity: .03, exposure: .98, rockCount: 52, coralCount: 12, grassCount: 340, sand: [118, 113, 92], coral: [0x75604f, 0x796257, 0x55706a, 0x6d5f6d, 0x7c684f], grass: [0x2c4e3d, 0x386047, 0x4b6849], waterDeep: 'vec3(.006,.05,.072)', waterMid: 'vec3(.025,.18,.21)', deepSea: true },
    'abyssal-trench': { background: 0x042129, fog: 0x0e444b, fogDensity: .038, exposure: .76, rockCount: 66, coralCount: 8, grassCount: 46, sand: [105, 100, 83], coral: [0x6a5543, 0x6f554b, 0x485750, 0x61505a, 0x715640], grass: [0x264132, 0x324b33, 0x415438], waterDeep: 'vec3(.004,.032,.049)', waterMid: 'vec3(.018,.14,.175)', deepSea: true }
  };
  const profile = profiles[game.mapTheme] || profiles['open-ocean'];
  const depthOffset = game.mapId === 4 ? -14 : game.mapId === 5 ? -28 : 0;
  const heightAt = (x, z) => -8.65 + depthOffset - 24 * THREE.MathUtils.smoothstep(x, 5, 32) + (game.mapTheme === 'sunken-wreck' ? .38 : .22) * Math.sin(x * .31 + z * .18) + .12 * Math.sin(x * .8 - z * .36);
  scene.background.set(profile.background);
  scene.fog = new THREE.FogExp2(profile.fog, profile.fogDensity);
  game.renderer.toneMappingExposure = profile.exposure;
  const wreckLight = game.mapId === 3 || game.mapId === 4;
  scene.children.filter(o => o.isHemisphereLight).forEach(o => { o.intensity = profile.deepSea ? (wreckLight ? 1.3 : 1.02) : 1.25; o.color.set(profile.deepSea ? 0x7198ad : 0xb1e6e0); o.groundColor.set(0x102635); });
  scene.children.filter(o => o.isDirectionalLight).forEach(o => { o.intensity = profile.deepSea ? (wreckLight ? 1.55 : 1.18) : 2.6; o.color.set(profile.deepSea ? 0x8eabc0 : 0xffffff); o.position.set(-15, 25, 8); o.shadow.mapSize.set(2048, 2048); Object.assign(o.shadow.camera, { left: -30, right: 30, top: 18, bottom: -18 }); o.shadow.camera.updateProjectionMatrix(); o.shadow.bias = -.0005; });

  // Fine grain and ripples are generated once and shared by sand and rock.
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d'); const pixels = ctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const i = (y * 256 + x) * 4;
    const grain = random() * 30 + Math.sin(y * .32 + Math.sin(x * .035) * 2) * 9;
    pixels.data[i] = profile.sand[0] + grain; pixels.data[i + 1] = profile.sand[1] + grain; pixels.data[i + 2] = profile.sand[2] + grain; pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  const loader = new THREE.TextureLoader();
  function texture(asset, channel, repeatX, repeatY) {
    const result = loader.load(`/assets/ocean/${asset}-${channel}.jpg`);
    result.wrapS = result.wrapT = THREE.RepeatWrapping;
    result.repeat.set(repeatX, repeatY);
    result.anisotropy = Math.min(8, game.renderer.capabilities.getMaxAnisotropy());
    if (channel === 'Diffuse') result.colorSpace = THREE.SRGBColorSpace;
    return result;
  }
  const sand = texture('sand_01', 'Diffuse', 36, 20);
  const ground = new THREE.PlaneGeometry(180, 100, 240, 120); ground.rotateX(-Math.PI / 2);
  const positions = ground.attributes.position;
  for (let i = 0; i < positions.count; i++) positions.setY(i, heightAt(positions.getX(i), positions.getZ(i)));
  ground.computeVertexNormals();
  const environmentTime = { value: 0 };
  // The wreck is still within normal sunlight; reserve the dark ceiling for
  // the deeper kelp and abyss maps.
  const ceiling = createOceanLight(scene, game.mapId >= 5);
  const bedMaterial = new THREE.MeshStandardMaterial({ map: sand, normalMap: texture('sand_01', 'nor_gl', 36, 20), normalScale: new THREE.Vector2(.65,.65), roughnessMap: texture('sand_01', 'rough',36,20), roughness: .94, color: 0xb9e1df });
  bedMaterial.onBeforeCompile = shader => {
    shader.uniforms.uEnvironmentTime = environmentTime;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vEnvironmentWorldPosition;');
    shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvEnvironmentWorldPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vEnvironmentWorldPosition;\nuniform float uEnvironmentTime;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `float rippleA = sin(vEnvironmentWorldPosition.x * 3.6 + sin(vEnvironmentWorldPosition.z * 2.2 + uEnvironmentTime*.5));
      float rippleB = sin(vEnvironmentWorldPosition.z * 4.1 + sin(vEnvironmentWorldPosition.x * 1.8 - uEnvironmentTime*.65));
      float caustic = pow(1.0-abs(sin(rippleA + rippleB + uEnvironmentTime*.35)), 14.0);
      outgoingLight += vec3(.06,.24,.3) * caustic;
      #include <opaque_fragment>`);
  };
  const bed = new THREE.Mesh(ground, bedMaterial);
  bed.receiveShadow = true; environment.add(bed);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x95b3b3, map: texture('coast_sand_rocks_02','Diffuse',2,2), normalMap: texture('coast_sand_rocks_02','nor_gl',2,2), normalScale: new THREE.Vector2(1.1,1.1), roughnessMap: texture('coast_sand_rocks_02','rough',2,2), roughness: 1, vertexColors: true });
  for (let i = 0; i < profile.rockCount; i++) {
    const geo = new THREE.IcosahedronGeometry(1, 3); const p = geo.attributes.position; const colors = [];
    for (let j = 0; j < p.count; j++) {
      const x = p.getX(j), y = p.getY(j), z = p.getZ(j);
      const noise = 1 + .12 * Math.sin(x * 9 + z * 5) * Math.cos(y * 7) + .06 * Math.sin(z * 17);
      p.setXYZ(j, x * noise, y * noise, z * noise);
      const shade = .65 + .25 * Math.sin(x * 5 + y * 4) ** 2; colors.push(shade, shade, shade * .9);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geo.computeVertexNormals();
    const rock = new THREE.Mesh(geo, rockMat); const x = -34 + random() * 68, z = -12 + random() * 24;
    const scale = .3 + random() * .9; rock.scale.set(scale * 1.4, scale * .6, scale);
    rock.position.set(x, heightAt(x, z) + scale * .25, z); rock.rotation.y = random() * 6.28;
    rock.castShadow = rock.receiveShadow = true; environment.add(rock);
  }
  // Receding reef banks establish depth without obstructing the swim lane.
  const bankGeometry = new THREE.IcosahedronGeometry(1, 2);
  for (let layer=0; layer<3; layer++) {
    const bankMaterial = rockMat.clone(); bankMaterial.vertexColors=false;
    bankMaterial.color.set(layer===0 ? 0x86b8c4 : 0x5099b7);
    for(let i=0; i<30; i++) {
      const x=-60+i*4.5+random()*2, z=-13-layer*10-random()*3;
      const h=.6+random()*1.9;
      const rock=new THREE.Mesh(bankGeometry,bankMaterial);
      rock.scale.set(2+random()*3,h,1.8+random()*2);
      rock.position.set(x,heightAt(x,z)+h*.25,z);
      rock.rotation.y=random()*6.28; rock.castShadow=rock.receiveShadow=true;
      environment.add(rock);
    }
  }
  if (game.mapTheme === 'coral-reef') {
    const reefSpine = new THREE.Group();
    for (let i = 0; i < 9; i++) { const reef = createCoralColony(random, new THREE.MeshStandardMaterial({ color: 0x9e9480, normalMap: rockMat.normalMap, normalScale: new THREE.Vector2(.35,.35), roughness: .95 }), i%2); const x=-20+i*5.2,z=-10+random()*20; reef.position.set(x,heightAt(x,z),z); reefSpine.add(reef); }
    environment.add(reefSpine);
  }
  const coralMaterials = [0x9f8c74,0x9d8076,0x778c80,0x8e7f91,0xab956e].map(color => new THREE.MeshStandardMaterial({ color, normalMap: rockMat.normalMap, normalScale: new THREE.Vector2(.28,.28), roughness: .96 }));
  for (let i = 0; i < profile.coralCount; i++) {
    const x = -33 + random() * 66, z = -12 + random() * 24;
    if(i%3!==2){const colony=createCoralColony(random,coralMaterials[i%coralMaterials.length],i%3);colony.position.set(x,heightAt(x,z),z);colony.scale.setScalar(.55+random()*.8);environment.add(colony);continue;}
    const colony = new THREE.Group(); colony.position.set(x, heightAt(x, z) - .03, z);
    const branch = (start, direction, length, radius, depth) => {
      const end = start.clone().addScaledVector(direction, length);
      const mid = start.clone().lerp(end, .5).add(new THREE.Vector3(.08 * (random() - .5), 0, .07));
      const curve = new THREE.CatmullRomCurve3([start, mid, end]);
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 5, radius, 5, false), coralMaterials[i % coralMaterials.length]);
      mesh.castShadow = true; colony.add(mesh);
      if (depth > 0) for (const side of [-1, 1]) branch(end, new THREE.Vector3(direction.x + side * (.25 + random() * .4), .7, (random() - .5) * .45).normalize(), length * .68, radius * .65, depth - 1);
    };
    colony.scale.set(.75 + random() * .7, .72 + random() * .9, .75 + random() * .7);
    branch(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), .4 + random() * .34, .055, random() < .22 ? 2 : 3);
    environment.add(colony);
  }
  const grassMaterials = profile.grass.map(color => new THREE.MeshStandardMaterial({ color, roughness: .95, side: THREE.DoubleSide }));
  const grasses = [];
  // Dense thin seagrass fills the seabed; authored coral GLB grass is excluded.
  const grassMultiplier = 5;
  for (let i = 0; i < profile.grassCount * grassMultiplier; i++) {
    const x = -35 + random() * 70, z = -14 + random() * 28;
    const tuft = new THREE.Group(); tuft.position.set(x, heightAt(x, z) - .025, z);
    for (let j = 0, blades = 4 + Math.floor(random() * 4); j < blades; j++) {
      const h = .25 + random() * 1.05, bend = (random() - .5) * .48;
      const geo = new THREE.PlaneGeometry(.065, h, 1, 6); geo.translate(0, h / 2, 0);
      const p = geo.attributes.position;
      for (let k = 0; k < p.count; k++) { const ratio = p.getY(k) / h; p.setX(k, p.getX(k) * (1 - ratio * .92) + bend * ratio * ratio); }
      geo.computeVertexNormals(); const blade = new THREE.Mesh(geo, grassMaterials[(i + j) % grassMaterials.length]); blade.rotation.y = random() * Math.PI; tuft.add(blade);
    }
    environment.add(tuft); grasses.push(tuft);
  }
  const shafts = [];
  for (let i = 0; i < 7; i++) {
    const shaftUniforms = { time: { value: 0 }, phase: { value: random() * Math.PI * 2 } };
    const shaft = new THREE.Mesh(
      new THREE.PlaneGeometry(3.5 + random() * 4.5, 26 + random() * 12),
      new THREE.ShaderMaterial({
        uniforms: shaftUniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        vertexShader: 'varying vec2 vShaftUv; void main(){vShaftUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader: `varying vec2 vShaftUv; uniform float time; uniform float phase;
          void main(){
            float edge=smoothstep(0.,.32,vShaftUv.x)*smoothstep(1.,.68,vShaftUv.x);
            float depth=smoothstep(.04,.86,vShaftUv.y);
            float shimmer=.72+.28*sin(time*.22+vShaftUv.y*6.+phase);
            gl_FragColor=vec4(vec3(.24,.7,1.),edge*depth*shimmer*.105);
          }`
      })
    );
    shaft.position.set(-31 + i * 10.5 + random() * 3, 3.4 + random() * 2, -15 - i * .45);
    shaft.rotation.z = (random() - .5) * .16;
    shaft.renderOrder = -.5;
    environment.add(shaft);
    shafts.push({ shaft, baseX: shaft.position.x, baseRotation: shaft.rotation.z, uniforms: shaftUniforms, phase: shaftUniforms.phase.value });
  }
  const motePositions = new Float32Array(220 * 3);
  for (let i = 0; i < 220; i++) {
    motePositions[i * 3] = -42 + random() * 84;
    motePositions[i * 3 + 1] = -8 + random() * 17;
    motePositions[i * 3 + 2] = -8 + random() * 10;
  }
  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  const motes = new THREE.Points(moteGeometry, new THREE.PointsMaterial({ color: 0xc0eee6, size: .025, transparent: true, opacity: .2, depthWrite: false, sizeAttenuation: true }));
  environment.add(motes);
  const uniforms = { time: { value: 0 } };
  const water = new THREE.Mesh(new THREE.PlaneGeometry(240, 120), new THREE.ShaderMaterial({
    uniforms, depthWrite: false,
    vertexShader: 'varying vec2 v; void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec2 v; uniform float time;
      void main(){
        float h=smoothstep(.18,.8,v.y);
        vec3 deep=${profile.waterDeep};
        vec3 mid=${profile.waterMid};
        vec3 c=mix(deep,mid,h);
        float waveA=sin(v.x*78.+v.y*24.+sin(time*.16+v.y*7.)*2.4);
        float waveB=cos(v.x*41.-v.y*57.+time*.1);
        float caustic=pow(max(0.,waveA*.55+waveB*.45),12.);
        c+=vec3(.13,.25,.22)*caustic*smoothstep(.34,.82,v.y)*${profile.deepSea ? '.16' : '.32'};
        float haze=sin(v.x*13.-time*.08+sin(v.y*18.)*.7)*.5+.5;
        c+=vec3(.015,.045,.05)*haze*smoothstep(.22,.75,v.y)*${profile.deepSea ? '.6' : '1.'};
        float sun=exp(-length((v-vec2(.46,.68))*vec2(1.,1.7))*112.);
        c+=vec3(.8,.82,.58)*sun*${profile.deepSea ? '.32' : '1.'};
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
    ceiling.update(environmentTime.value, x);
    const center = Math.round(x / 40) * 40;
    if (bed.position.x !== center) {
      bed.position.x = center;
      for (let i=0;i<positions.count;i++) positions.setY(i,heightAt(positions.getX(i)+center,positions.getZ(i)));
      positions.needsUpdate=true; ground.computeVertexNormals();
    }
  }, update(time) { uniforms.time.value = time; environmentTime.value = time; grasses.forEach((g, i) => { g.rotation.z = Math.sin(time * .8 + i * .7) * .08; }); shafts.forEach(({ shaft, baseX, baseRotation, uniforms: shaftUniforms, phase }) => { shaft.position.x = baseX + Math.sin(time * .08 + phase) * .5; shaft.rotation.z = baseRotation + Math.sin(time * .12 + phase) * .018; shaftUniforms.time.value = time; }); motes.rotation.y = time * .0015; motes.rotation.z = Math.sin(time * .12) * .004; } };
}
