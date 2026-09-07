import * as THREE from 'three';

// A world-space water ceiling; the camera sees its underside while diving.
export function createOceanLight(scene, dark = false) {
  const uniforms = { time: { value: 0 }, strength: { value: dark ? .6 : 1 } };
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(220, 110, 1, 1), new THREE.ShaderMaterial({
    uniforms, side: THREE.DoubleSide, depthWrite: false, transparent: true,
    vertexShader: `varying vec2 p; void main(){p=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader: `varying vec2 p; uniform float time; uniform float strength;
      void main(){
        vec2 q=p*vec2(240.,120.);
        float a=sin(q.x*2.1+sin(q.y*1.7+time*.48)*1.8);
        float b=cos(q.y*2.8+sin(q.x*1.5-time*.37)*1.6);
        float cells=pow(1.-abs(sin(a+b)),10.);
        float fine=pow(1.-abs(sin(a*2.8-b*1.5)),18.);
        float sun=exp(-length((p-vec2(.48,.55))*vec2(8.,6.)));
        float reflectionBand=exp(-pow((p.x-.5+sin(p.y*18.+time*.32)*.025)*7.,2.));
        float reflectionGlint=pow(max(0.,sin(p.x*72.+sin(p.y*20.+time*.4)*2.)*.5+.5),18.)*reflectionBand;
        vec3 color=mix(vec3(.006,.12,.27),vec3(.11,.55,.78),sun);
        color+=(cells*.5+fine*.24)*vec3(.5,.9,1.);
        color+=reflectionBand*vec3(.08,.3,.38)+reflectionGlint*vec3(.7,.95,.86);
        color+=pow(sun,5.)*vec3(.9,1.,.82);
        float edge=smoothstep(0.,.18,p.y)*smoothstep(1.,.82,p.y);
        gl_FragColor=vec4(color*strength,edge*.88);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  surface.rotation.x=Math.PI/2; surface.position.set(0,9,-30); scene.add(surface);
  return { update(time, x){ uniforms.time.value=time; surface.position.x=x; } };
}
