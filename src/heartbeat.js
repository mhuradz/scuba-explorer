let context, nextBeat = 0;
// Browsers require a user gesture before audio can start.
function unlock() {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) return;
  context ||= new Audio();
  if(context.state==='suspended') context.resume().catch(()=>{});
}
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);
export function updateHeartbeat(active, enabled, bpm) {
  if(!context || !enabled || !active || context.state!=='running'){nextBeat=0;return;}
  const now=context.currentTime;
  if(now<nextBeat)return;
  nextBeat=now+60/Math.max(70,Math.min(140,bpm));
  for(const delay of [0,.14]) {
    const oscillator=context.createOscillator(), gain=context.createGain();
    oscillator.frequency.setValueAtTime(delay ? 52 : 65,now+delay);
    oscillator.frequency.exponentialRampToValueAtTime(35,now+delay+.12);
    gain.gain.setValueAtTime(0,now+delay);
    gain.gain.linearRampToValueAtTime(delay ? .07 : .11,now+delay+.015);
    gain.gain.exponentialRampToValueAtTime(.001,now+delay+.14);
    oscillator.connect(gain);gain.connect(context.destination);
    oscillator.start(now+delay);oscillator.stop(now+delay+.16);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }
}
