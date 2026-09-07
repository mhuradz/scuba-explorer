// Procedural audio: no external downloads or audio licenses required.
let context, master, water, noise, lastStroke=0, lastBreath=0, lastWarning=0;
export function unlockDiveAudio() {
  if(!context) {
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
    context=new Audio();master=context.createGain();master.gain.value=0;master.connect(context.destination);
    noise=context.createBuffer(1,context.sampleRate*3,context.sampleRate);
    const data=noise.getChannelData(0);let brown=0;
    for(let i=0;i<data.length;i++){brown=(brown+Math.random()*.04-.02)/1.02;data[i]=brown*5;}
    const source=context.createBufferSource();source.buffer=noise;source.loop=true;
    const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=400;
    water=context.createGain();water.gain.value=.12;source.connect(filter);filter.connect(water);water.connect(master);source.start();
  }
  if(context.state==='suspended')context.resume().catch(()=>{});
}
function tone(frequency,delay,duration,volume) {
  if(!context)return;const t=context.currentTime+delay,o=context.createOscillator(),g=context.createGain();
  o.type='sine';o.frequency.setValueAtTime(frequency,t);g.gain.setValueAtTime(0,t);
  g.gain.linearRampToValueAtTime(volume,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
  o.connect(g);g.connect(master);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};
}
function wash(frequency,duration,volume) {
  const t=context.currentTime,source=context.createBufferSource(),filter=context.createBiquadFilter(),g=context.createGain();
  source.buffer=noise;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.6;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.12);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
  source.connect(filter);filter.connect(g);g.connect(master);source.start(t);source.stop(t+duration);source.onended=()=>{source.disconnect();filter.disconnect();g.disconnect();};
}
export function diamondSound(enabled) {if(!enabled||!context)return;[660,880,1320].forEach((f,i)=>tone(f,i*.055,.24,.065));}
export function updateDiveAudio({active,enabled,moving,sprinting,tank,oxygen,depth}) {
  if(!context)return;
  const t=context.currentTime;
  master.gain.setTargetAtTime(active&&enabled?.55:0,t,.08);
  if(!active||!enabled)return;
  water.gain.setTargetAtTime(depth<3?.2:.11,t,.5);
  if(moving&&t-lastStroke>(sprinting?.42:.85)){lastStroke=t;wash(sprinting?650:420,.42,sprinting?.32:.2);}
  if(tank&&oxygen>0&&t-lastBreath>(sprinting?2.1:3.8)){lastBreath=t;wash(1050,.9,.16);tone(160,.9,.16,.025);tone(220,1.08,.2,.02);}
  if(oxygen>0&&oxygen<=20&&t-lastWarning>7){lastWarning=t;tone(470,0,.12,.04);tone(470,.22,.12,.04);}
}
