import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { characters,animateCharacter } from './characters.js';
const cache=new Map();
let generation=0;
function fallbackPortrait(character) {
  const label=character?.name||'Character';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="280" viewBox="0 0 480 280"><rect width="480" height="280" fill="#092c38"/><path d="M55 220h370" stroke="#2d7380"/><circle cx="240" cy="112" r="34" fill="#63c8c1" opacity=".85"/><path d="M190 188c18-42 82-42 100 0" fill="none" stroke="#b8f36b" stroke-width="10" stroke-linecap="round"/><text x="240" y="250" text-anchor="middle" fill="#d8f7ee" font-family="Arial" font-size="18" letter-spacing="2">${label.toUpperCase()}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
export async function renderCharacterPortraits() {
  const token=++generation,images=[...document.querySelectorAll('[data-character-portrait]')];
  if(!images.length)return;
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setSize(480,280);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
  try{for(const image of images){
    const id=image.dataset.characterPortrait;
    const character=characters[id];
    if(!character){image.src=fallbackPortrait({name:'Unknown'});continue;}
    if(cache.has(id)){image.src=cache.get(id);continue;}
    try {
      const gltf=await new GLTFLoader().loadAsync(character.url);
      const scene=new THREE.Scene();scene.background=new THREE.Color(0x092c38);
      scene.add(new THREE.HemisphereLight(0xe7ffff,0x34414b,2));
      const key=new THREE.DirectionalLight(0xffefdd,3);key.position.set(2,4,6);scene.add(key);
      const root=new THREE.Group();scene.add(root);const animator=animateCharacter(gltf,root,id);animator.update(.1);root.updateMatrixWorld(true);
      const bounds=new THREE.Box3().setFromObject(root),center=bounds.getCenter(new THREE.Vector3()),size=bounds.getSize(new THREE.Vector3());
      const maxDim=Math.max(size.x,size.y,size.z,1);
      const camera=new THREE.PerspectiveCamera(35,480/280,.01,100);camera.position.set(center.x,center.y+.05,maxDim*1.75);camera.lookAt(center);
      renderer.render(scene,camera);const url=renderer.domElement.toDataURL('image/png');cache.set(id,url);
      if(image.isConnected)image.src=url;
      scene.traverse(n=>{n.geometry?.dispose();if(n.material)for(const m of Array.isArray(n.material)?n.material:[n.material]){for(const v of Object.values(m))if(v?.isTexture)v.dispose();m.dispose();}});
    } catch(error) {
      console.warn(`Character portrait failed for ${id}`,error);
      const url=fallbackPortrait(character);cache.set(id,url);if(image.isConnected)image.src=url;
    }
    if(token!==generation)break;
  }}catch(error){console.warn('Character portrait failed',error);}finally{renderer.dispose();}
}
