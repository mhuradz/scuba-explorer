import './style.css';
import { updateDeepMonster } from './deep-monster.js';
import { renderCharacterPortraits } from './character-portraits.js';
import { characters, animateCharacter } from './characters.js';
import { unlockDiveAudio, updateDiveAudio, diamondSound } from './dive-audio.js';
window.addEventListener('pointerdown', unlockDiveAudio);
window.addEventListener('keydown', unlockDiveAudio);
import { createExploration } from './exploration.js';
import './game-hud.css';
import './modal-game.css';
import { rebuildOcean } from './ocean-environment.js';
import { updateHeartbeat } from './heartbeat.js';
import { updateSharkEncounter } from './shark-encounter.js';
import { equipVisuals } from './worn-equipment.js';
import { createAnimatedDiver } from './animated-diver.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const STORAGE_KEY = 'scuba-explorer-save';
const DEFAULT_SAVE = {
  saveVersion: 1,
  spendablePoints: 0,
  lifetimePoints: 0,
  ownedEquipment: ['starter_tank', 'starter_fins'],
  equipped: { tank: 'starter_tank', fins: 'starter_fins', light: null, scooter: null },
  completedMaps: [],
  bestDepthByMap: {},
  settings: { soundEnabled: true, reducedMotion: false }
};

const equipment = {
  starter_tank: { slot: 'tank', name: 'Starter tank', price: 0, detail: '100 oxygen units · safe to 15 ft', capacity: 100, maxDepthFeet: 15 },
  improved_tank: { slot: 'tank', name: 'Improved tank', price: 600, detail: '140 oxygen units · safe to 30 ft', capacity: 140, maxDepthFeet: 30 },
  advanced_tank: { slot: 'tank', name: 'Advanced tank', price: 1200, detail: '180 oxygen units · safe to 55 ft', capacity: 180, maxDepthFeet: 55 },
  oxygen_tank: { slot: 'tank', name: 'Oxygen scuba tank', price: 1500, detail: '200 oxygen units · reliable deep-dive air supply', capacity: 200, maxDepthFeet: 90, model: '/assets/equipment/oxygen-scuba-diving-tank.glb' },
  deep_tank: { slot: 'tank', name: 'Deep-water tank', price: 2200, detail: '240 oxygen units · safe to 150 ft', capacity: 240, maxDepthFeet: 150 },
  abyss_tank: { slot: 'tank', name: 'Abyss tank', price: 4000, detail: '300 oxygen units · safe to 300 ft', capacity: 300, maxDepthFeet: 300 },
  starter_fins: { slot: 'fins', name: 'Starter fins', price: 0, detail: 'Standard swimming effort', speedFactor: 1, effortFactor: 1 },
  efficient_fins: { slot: 'fins', name: 'Efficient fins', price: 500, detail: 'Faster kick with 10% less effort', speedFactor: 1.12, effortFactor: .9 },
  scuba_flippers: { slot: 'fins', name: 'Open-heel scuba flippers', price: 900, detail: 'Longer blades · 18% faster swimming', speedFactor: 1.18, effortFactor: .82, model: '/assets/equipment/scuba-flippers.glb' },
  dive_light: { slot: 'light', name: 'Dive light', price: 400, detail: 'Improves visibility in dark maps' },
  sea_scooter: { slot: 'scooter', name: 'Yamaha RDS200 Sea Scooter', price: 1800, originalPrice: 2400, detail: 'Underwater propulsion · 28% faster swimming', speedFactor: 1.28, effortFactor: .72, model: '/assets/equipment/sea-scooter.glb' }
};

const maps = [
  {
    id: 1, level: 'LEVEL 01', name: 'Open Ocean', depth: '2–12M', objective: 'Recover three training markers',
    goal: 'Cross the surface buoy with all three markers', finishLabel: 'SURFACE BUOY',
    finish: { x: 18, y: 4.5, z: 0 }, markerPositions: [[-8, .6], [0, -1.8], [9, -3.8]],
    bounds: { min: -20, max: 22 }, difficulty: 'EASY', difficultyFactor: 1, reward: 250, color: 'lagoon', theme: 'open-ocean'
  },
  {
    id: 2, level: 'LEVEL 02', name: 'Coral Reef', depth: '12–28M', objective: 'Recover three reef samples',
    goal: 'Pass the reef gate after recovering every sample', finishLabel: 'REEF GATE',
    finish: { x: 30, y: -2.2, z: 0 }, markerPositions: [[-10, -.8], [4, -3.4], [18, -5.8]],
    bounds: { min: -20, max: 34 }, difficulty: 'MEDIUM', difficultyFactor: 1.14, reward: 400, color: 'reef', theme: 'coral-reef', requirement: 'Complete Open Ocean · Basic swimmer or better', requiredTank: 'improved_tank'
  },
  {
    id: 3, level: 'LEVEL 03', name: 'Sunken Wreck', depth: '24–42M', objective: 'Recover the wreck log',
    goal: 'Reach the wreck beacon after recovering every marker', finishLabel: 'WRECK BEACON',
    finish: { x: 42, y: -5.4, z: 0 }, markerPositions: [[-10, -1.8], [7, -5.1], [27, -7.1]],
    bounds: { min: -20, max: 46 }, difficulty: 'HARD', difficultyFactor: 1.32, reward: 600, color: 'wreck', theme: 'sunken-wreck', requirement: 'Complete Coral Reef · Select Explorer or better', requiredTank: 'advanced_tank', requiredFins: 'efficient_fins'
  },
  {
    id: 4, level: 'LEVEL 04', name: 'Kelp Labyrinth', depth: '28–62M', objective: 'Recover three research capsules',
    goal: 'Navigate the kelp maze and reach the research beacon', finishLabel: 'RESEARCH BEACON',
    finish: { x: 54, y: -18, z: 0 }, markerPositions: [[-8, -12], [16, -18], [38, -22]],
    bounds: { min: -20, max: 58 }, difficulty: 'EXTREME', difficultyFactor: 1.52, reward: 850, color: 'kelp', theme: 'kelp-forest', requirement: 'Complete Sunken Wreck · Select Explorer or better', requiredTank: 'deep_tank', requiredFins: 'efficient_fins'
  },
  {
    id: 5, level: 'LEVEL 05', name: 'Abyssal Trench', depth: '45–90M', objective: 'Recover three abyss samples',
    goal: 'Cross the trench and reach the abyss beacon alive', finishLabel: 'ABYSS BEACON',
    finish: { x: 70, y: -32, z: 0 }, markerPositions: [[-8, -24], [24, -32], [52, -38]],
    bounds: { min: -20, max: 74 }, difficulty: 'LEGENDARY', difficultyFactor: 1.78, reward: 1200, color: 'abyss', theme: 'abyssal-trench', requirement: 'Complete Kelp Labyrinth · Select Abyss swimmer', requiredTank: 'abyss_tank', requiredFins: 'efficient_fins'
  }
];

function cloneDefault() { return JSON.parse(JSON.stringify(DEFAULT_SAVE)); }
function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!raw || typeof raw !== 'object') return cloneDefault();
    const save = cloneDefault();
    if ('points' in raw) { save.spendablePoints = Number(raw.points) || 0; save.lifetimePoints = Number(raw.lifetime) || 0; save.equipped.tank = raw.tank || 'starter_tank'; save.equipped.suit = raw.suit || 'starter_suit'; save.completedMaps = Array.isArray(raw.completed) ? raw.completed : []; }
    else Object.assign(save, raw, { equipped: { ...save.equipped, ...(raw.equipped || {}) }, settings: { ...save.settings, ...(raw.settings || {}) } });
    save.spendablePoints = Math.max(0, Number(save.spendablePoints) || 0);
    save.lifetimePoints = Math.max(0, Number(save.lifetimePoints) || 0);
    save.ownedEquipment = Array.from(new Set(Array.isArray(save.ownedEquipment) ? save.ownedEquipment.filter(id => equipment[id]) : cloneDefault().ownedEquipment));
    save.completedMaps = Array.from(new Set(Array.isArray(save.completedMaps) ? save.completedMaps.filter(id => maps.some(m => m.id === id)) : []));
    for (const slot of ['tank', 'fins', 'light', 'scooter']) if (save.equipped[slot] && !equipment[save.equipped[slot]]) save.equipped[slot] = slot === 'tank' || slot === 'fins' ? DEFAULT_SAVE.equipped[slot] : null;
    delete save.equipped.suit;
    return save;
  } catch { return cloneDefault(); }
}
function persist() { localStorage.setItem(STORAGE_KEY, JSON.stringify(save)); }
function bankDiscovery(points) { state.explorationPoints=(state.explorationPoints||0)+points;save.spendablePoints+=points;save.lifetimePoints+=points;persist(); }
function currentMap() { return maps.find(map => map.id === state.mapId) || maps[0]; }
function isUnlocked(map) { return map.id===1 || (save.completedMaps.includes(map.id-1)&&activeCharacter().stage>=map.id); }
function equipped(slot) { return equipment[save.equipped?.[slot]] || null; }
function oxygenCapacity() { return equipped('tank')?.capacity || 0; }
function oxygenPercent() { const capacity = oxygenCapacity(); return capacity ? Math.round(clamp(state.oxygen / capacity * 100, 0, 100)) : 0; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

const save = loadSave();
save.unlockedCharacters=Array.from(new Set(['basic',...(save.unlockedCharacters||[]).filter(id=>characters[id])]));
save.characterId=save.unlockedCharacters.includes(save.characterId)?save.characterId:'basic';
persist();
function activeCharacter(){return characters[save.characterId]||characters.basic;}
let state = { screen: 'menu', modal: null, toast: '', running: false, paused: false, loading: false, loadingProgress: 100, mapId: 1, oxygen: 100, stamina: 100, battery: 100, fatigue: 0, health: 100, heart: 76, depth: 4, provisional: 0, markers: 0, time: 0, keys: {}, last: 0, sprintLocked: false, checkpoints: new Set(), result: null };
function scooterActive() { return !!equipped('scooter'); }
function movementResource() { return scooterActive() && state.battery > 0 ? state.battery : state.stamina; }
function movementExhausted() { return scooterActive() ? state.battery <= 0 && state.stamina <= 15 : state.stamina <= 15; }
let scene3d = null;
let characterPreview = null;
let previewTimer = null;
let previewRequest = 0;

function icon(name) { const paths = { compass: 'M12 2 8.5 8.5 2 12l6.5 3.5L12 22l3.5-6.5L22 12l-6.5-3.5L12 2Z', check: 'm5 12 4 4L19 6', lock: 'M6 10h12v10H6zM8 10V7a4 4 0 0 1 8 0v3' }; return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name] || paths.compass}"/></svg>`; }
function brand() { return `<a class="brand" href="#" data-action="home" aria-label="Scuba Explorer home"><span class="brand-icon">${icon('compass')}</span><span><b>SCUBA</b><small>EXPLORER</small></span></a>`; }
function topbar(showBack = false) { return `<header class="topbar">${showBack ? '<button class="icon-btn" data-action="back" aria-label="Back to dock">←</button>' : ''}${brand()}<div class="top-actions"><span class="wallet"><span class="wallet-dot">✦</span><strong>${Math.floor(save.spendablePoints).toLocaleString()}</strong> pts</span>${showBack ? '<button class="ghost-btn" data-action="home">MAIN MENU</button>' : ''}</div></header>`; }

function menu() { return `<main class="game-front"><canvas id="scene" aria-label="Live underwater background"></canvas><div class="front-shade"></div><section class="front-content"><p>SCUBA EXPLORER</p><h1>Into the<br>blue.</h1><nav aria-label="Main menu"><button data-action="choose-map">PLAY <small>CHOOSE MAP</small></button><button data-action="settings">SETTINGS</button><button data-action="open-shop">MARKET</button><button data-action="character">CHARACTER <small>VIEW LOADOUT 360°</small></button></nav><span class="front-wallet">✦ ${save.spendablePoints.toLocaleString()} POINTS</span></section>${overlay()}</main>`; }
function mapCard(map) { const unlocked = isUnlocked(map); const stars = '★'.repeat(map.difficultyFactor > 1.25 ? 3 : map.difficultyFactor > 1 ? 2 : 1); return `<button class="map-card ${map.color} ${unlocked ? '' : 'locked'}" ${unlocked ? `data-map="${map.id}"` : 'disabled'}><span class="map-number">0${map.id}</span><span class="map-symbol">${unlocked ? '◌' : icon('lock')}</span><strong>${map.name}</strong><small>${map.depth} · ${unlocked ? map.objective : map.requirement}</small><span class="map-difficulty">${map.difficulty} <i>${stars}</i></span><i>${unlocked ? 'SELECT ZONE →' : 'LOCKED'}</i></button>`; }
function dock() { const selected = currentMap(); return `<main class="app-shell">${topbar()}<section class="dock-hero"><div class="dock-intro"><p class="kicker">DIVE PREPARATION · ${selected.level}</p><h1>Read the water.<br><em>Respect the limits.</em></h1><p>${selected.goal}. Every zone has its own route, hazards, and pace.</p><button class="primary-btn" data-action="start">BEGIN ${selected.name.toUpperCase()} <span>→</span></button></div><div class="hero-window"><div class="window-label">LIVE CONDITIONS <span>${selected.difficulty}</span></div><div class="hero-grid"></div><div class="hero-diver"></div><div class="hero-marker">✦</div><div class="hero-seabed"></div><div class="hero-kelp"></div></div></section><section class="dock-layout single-loadout"><div class="panel loadout-panel"><div class="section-head"><div><p class="kicker">SELECTED ROUTE · ${selected.level}</p><h2>${selected.name}</h2></div><button class="text-btn" data-action="choose-map">CHANGE MAP →</button></div><p class="muted route-summary">${selected.depth} · ${selected.difficulty} · ${selected.objective}</p>${loadoutRow('tank', 'Tank')} ${loadoutRow('fins', 'Fins')}${save.equipped.scooter ? loadoutRow('scooter', 'Scooter') : ''}${save.equipped.light ? loadoutRow('light', 'Light') : '<div class="empty-slot"><span>+</span><div><strong>Optional dive light</strong><small>Improves darker zones</small></div><button class="text-btn" data-action="open-shop">ADD</button></div>'}</div></section><footer class="footer"><span>SCUBA EXPLORER · SCHOOL PROJECT BUILD</span><span>WASD / ARROWS SWIM · SHIFT SPRINT · E INTERACT · ESC PAUSE</span></footer>${overlay()}</main>`; }
function loadoutRow(slot, label) { const item = equipped(slot); return `<div class="loadout-row ${item ? '' : 'unequipped'}"><span class="loadout-icon">${slot === 'tank' ? '◉' : slot === 'suit' ? '◇' : slot === 'fins' ? '≈' : '▣'}</span><div><span class="row-label">${label}</span><strong>${item ? item.name : 'Nothing equipped'}</strong><small>${item ? item.detail : 'Choose equipment in the store'}</small></div><span class="equipped-badge">${item ? 'EQUIPPED' : 'EMPTY'}</span></div>`; }
function shopItem([id, item]) { const preview = item.slot === 'scooter' ? '/assets/equipment/sea-scooter-preview.png' : item.slot === 'tank' ? '/assets/equipment/oxygen-tank-preview.png' : item.slot === 'fins' ? '/assets/equipment/scuba-flippers-preview.png' : '/assets/diver-renderings/diver-front.jpg'; const owned = save.ownedEquipment.includes(id); const isEquipped = save.equipped[item.slot] === id; const affordable = owned || item.price <= save.spendablePoints; const managing=state.shopTab==='loadout'||item.slot==='scooter'||item.slot==='tank'||item.slot==='fins'; const action = !managing ? 'buy' : isEquipped ? 'unequip' : owned ? 'equip' : 'buy'; const label = !managing ? owned ? 'OWNED' : affordable ? 'BUY' : 'LOCKED' : isEquipped ? 'UNEQUIP' : owned ? 'EQUIP' : affordable ? 'BUY' : 'LOCKED'; const sale = item.originalPrice && item.originalPrice > item.price; return `<article class="shop-item ${owned ? 'owned' : ''} ${isEquipped ? 'equipped' : ''}">${sale ? '<span class="sale-badge">SALE</span>' : ''}<img class="shop-item-preview equipment-preview ${item.slot === 'tank' ? 'tank-preview' : ''}" src="${preview}" alt="${item.name} preview"><div class="shop-item-copy"><span class="item-slot">${item.slot.toUpperCase()}</span><h3>${item.name}</h3><p>${item.detail}</p></div><div class="shop-item-foot"><strong>${isEquipped ? 'EQUIPPED' : owned ? 'OWNED' : sale ? `<s>${item.originalPrice} pts</s> ${item.price} pts` : `${item.price} pts`}</strong><button class="small-btn" data-action="${action}" data-item="${id}" ${action === 'buy' && (!affordable || owned) ? 'disabled' : ''}>${label}</button></div></article>`; }

function statRow(id, label, value, tone, suffix = '%') { return `<div class="stat-row"><div><span>${label}</span><b id="${id}-value">${Math.round(value)}${suffix}</b></div><div class="meter"><i id="${id}-bar" class="${tone}" style="width:${clamp(value, 0, 100)}%"></i></div></div>`; }
function dive() { const map = maps.find(m => m.id === state.mapId) || maps[0]; return `<main class="dive-screen arcade-dive"><div class="water-world"><canvas id="scene" aria-label="Underwater training lagoon"></canvas><div class="water-vignette"></div><div class="direction-marker" id="direction-marker">↑ <span>BUOY</span></div><div class="interaction-hint" id="interaction-hint">E TO INTERACT</div></div><div class="arcade-hud"><div class="arcade-top"><div class="arcade-left"><button class="round-control" data-action="toggle-pause" aria-label="Pause dive"><svg viewBox="0 0 24 24"><path d="M7 5v14M17 5v14"/></svg></button><button class="round-control" data-action="camera" aria-label="Camera view"><svg viewBox="0 0 24 24"><path d="M4 8h3l2-2h6l2 2h3v11H4zM12 10a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"/></svg></button></div><div class="oxygen-display"><span class="tank-icon">◉</span><div class="oxygen-track"><i id="oxygen-bar" style="width:${oxygenPercent()}%"></i></div><b id="oxygen-value">${oxygenPercent()}%</b></div><button class="round-control exit-control" data-action="abort" aria-label="Abort dive">×</button></div><div class="mission-chip"><span class="mode-dot"></span><strong>${map.name.toUpperCase()}</strong><span id="marker-count">${state.markers}/3</span><span id="depth-count">${Math.round(state.depth)}M</span></div><div class="resource-strip"><span>STAMINA <b id="stamina-value">${Math.round(state.stamina)}%</b></span><span>HEALTH <b id="health-value">${Math.round(state.health)}%</b></span><span>HEART <b id="heart-value">${Math.round(state.heart)} BPM</b></span><span id="oxygen-warning" class="warning"></span></div><div class="arcade-controls"><button class="round-control move-control" data-move="up" aria-label="Swim up">▲</button><button class="round-control action-control" data-move="swim" aria-label="Swim forward"><span>≈</span></button><button class="round-control move-control" data-move="down" aria-label="Swim down">▼</button></div><div class="free-mode">FREE MODE</div><div class="arcade-help">WASD / ARROWS · SHIFT SPRINT · E COLLECT</div><div class="toast" id="toast" aria-live="polite">${state.toast}</div>${state.paused ? pauseOverlay() : ''}${overlay()}</div></main>`; }
function pauseOverlay() { return `<div class="pause-overlay" role="dialog" aria-modal="true" aria-label="Paused"><div class="pause-card"><h2>Dive paused</h2><p>Collected: <strong>${state.explorationPoints || 0} points</strong></p><p>Saved wallet: ${save.spendablePoints} points. Resources are frozen while paused.</p><button class="primary-btn" data-action="resume">RESUME</button><button class="secondary-btn" data-action="confirm-abort">RETURN TO DOCK</button></div></div>`; }
function results() { const r = state.result || { success: false, markers: 0, depth: 0, points: 0, breakdown: [] }; return `<main class="results-screen app-shell">${topbar(true)}<section class="results-wrap"><div class="result-status ${r.success ? 'success' : 'failure'}"><span>${r.success ? icon('check') : '!'}</span><p class="kicker">DIVE REPORT · ${maps[state.mapId - 1]?.name.toUpperCase() || 'TRAINING LAGOON'}</p><h1>${r.success ? 'Mission complete.' : 'Dive ended.'}</h1><p>${r.success ? 'You returned safely. Your field data is now banked.' : 'Collected rewards are saved. Visit the shop to upgrade.'}</p></div><div class="result-grid"><div><span>MARKERS</span><strong>${r.markers}</strong></div><div><span>DEEPEST POINT</span><strong>${Math.round(r.depth)}m</strong></div><div><span>POINTS BANKED</span><strong>${r.points}</strong></div></div><div class="reward-panel"><div class="section-head"><div><p class="kicker">REWARD BREAKDOWN</p><h2>${r.success ? 'Good choices add up.' : 'Rewards saved.'}</h2></div><span class="total-points">+${r.points} pts</span></div>${r.breakdown.length ? r.breakdown.map(item => `<div class="reward-row"><span>${item.label}</span><strong>+${item.points}</strong></div>`).join('') : '<p class="muted">Complete the objective and reach the buoy to bank your provisional points.</p>'}</div><div class="result-actions"><button class="primary-btn" data-action="dock">RETURN TO DOCK <span>→</span></button><button class="secondary-btn" data-action="home">MAIN MENU</button></div></section>${overlay()}</main>`; }
function overlay() { if (state.modal === 'maps') return mapSelectionOverlay(); if (state.modal === 'character') return characterOverlay(); if (state.modal === 'mission-complete') return missionCompleteOverlay(); return legacyOverlay(); }
function missionCompleteOverlay() { const map=currentMap(), next=maps.find(candidate=>candidate.id===map.id+1); return `<div class="modal-backdrop mission-complete-backdrop"><section class="modal-card mission-complete-modal"><div class="mission-complete-seal">✓</div><p class="kicker">PROGRESS SAVED · ${map.level}</p><h2>${map.name} cleared</h2><p class="muted">All objectives secured. <strong class="accent-text">+${state.result?.points || 0} points</strong> were added to your wallet.</p><div class="mission-complete-actions">${next ? isUnlocked(next) ? `<button class="primary-btn" data-action="next-stage">CONTINUE · ${next.level} <span>→</span></button>` : `<button class="primary-btn" disabled>CONTINUE · ${next.level}</button><p class="muted">${next.requirement}</p>` : ''}<button class="secondary-btn" data-action="open-loadout">LOADOUT</button><button class="secondary-btn" data-action="home">BACK TO MAIN MENU</button></div></section></div>`; }
function characterStatsMarkup(scooter, tank, fins) {
  const diver = activeCharacter();
  const beforeSpeed = diver.speedFactor;
  const afterSpeed = beforeSpeed * (scooter?.speedFactor ?? 1) * (fins?.speedFactor ?? 1);
  const beforeEffort = diver.effortFactor * 100;
  const afterEffort = beforeEffort * (scooter?.effortFactor ?? 1) * (fins?.effortFactor ?? 1);
  const stat = (key, label, before, after, suffix = '×', lowerIsBetter = false) => `<div class="character-stat"><span>${label}</span><b data-character-stat="${key}-before">${before.toFixed(2)}${suffix}</b><i>→</i><strong data-character-stat="${key}-after" class="${after !== before ? (lowerIsBetter ? after < before : after > before) ? 'improved' : 'reduced' : ''}">${after.toFixed(2)}${suffix}</strong></div>`;
  const beforeAir = equipment.starter_tank.capacity;
  const beforeDepth = equipment.starter_tank.maxDepthFeet;
  const afterAir = tank?.capacity ?? beforeAir;
  const afterDepth = tank?.maxDepthFeet ?? beforeDepth;
  return `<aside class="character-stats"><p class="kicker">EQUIPMENT EFFECT</p><h3>Before <span>→</span> Equipped</h3><div class="character-stat-head"><span>STAT</span><span>BASE</span><span>NEW</span></div>${stat('speed', 'SPEED', beforeSpeed, afterSpeed)}${stat('effort', 'EFFORT', beforeEffort, afterEffort, '%', true)}${stat('air', 'AIR', beforeAir, afterAir, '', false)}${stat('depth', 'DEPTH', beforeDepth, afterDepth, ' FT', false)}<p class="character-stats-note" data-character-stat="note">${scooter || tank ? 'Toggle the equipment below to compare its effect.' : 'Equip an upgrade in the market to compare its effect.'}</p></aside>`;
}
function characterOverlay() { const scooter = equipped('scooter'); const tank = equipped('tank'); const fins = equipped('fins'); return `<div class="modal-backdrop character-backdrop"><section class="modal-card character-modal"><button class="modal-close" data-action="close-modal" aria-label="Close">×</button><h2>${activeCharacter().name}</h2><div class="character-preview-layout"><div class="character-preview-stage"><div class="character-turntable" data-character-turn><canvas id="character-preview" aria-label="Interactive 3D diver preview"></canvas><span class="turntable-ring"></span></div></div><div class="character-control-panel">${characterStatsMarkup(scooter, tank, fins)}<label class="character-equipment-toggle"><input type="checkbox" data-character-equipment="tank" ${tank ? 'checked' : ''} ${tank ? '' : 'disabled'}><span><strong>${tank ? tank.name : 'No tank equipped'}</strong><small>Show equipped tank in preview</small></span></label><label class="character-equipment-toggle"><input type="checkbox" data-character-equipment="scooter" ${scooter ? 'checked' : ''} ${scooter ? '' : 'disabled'}><span><strong>${scooter ? scooter.name : 'No upgrade equipped'}</strong><small>Show equipped item in preview</small></span></label><label class="character-equipment-toggle"><input type="checkbox" data-character-equipment="fins" ${fins ? 'checked' : ''} ${fins ? '' : 'disabled'}><span><strong>${fins ? fins.name : 'No fins equipped'}</strong><small>Show equipped fins in preview</small></span></label></div></div></section></div>`; }
function equipmentCategory(slot, title, description) { const entries = Object.entries(equipment).filter(([id, item]) => item.slot === slot && (slot !== 'tank' || id === 'oxygen_tank') && (slot !== 'fins' || id === 'scuba_flippers')); return `<section class="shop-category"><div class="shop-category-head"><div><p class="kicker">SHOP CATEGORY</p><h4>${title}</h4><p>${description}</p></div><span>${entries.length} ITEMS</span></div><div class="shop-grid">${entries.map(shopItem).join('')}</div></section>`; }
function equippedSlotCard(slot, label) { const item = equipped(slot); return `<article class="equipped-slot-card ${item ? 'active' : 'empty'}"><div><span class="item-slot">${label}</span><strong>${item ? item.name : 'Nothing equipped'}</strong><small>${item ? item.detail : 'Choose an item from the shop catalog.'}</small></div>${item ? `<button class="small-btn" data-action="unequip" data-item="${save.equipped[slot]}">UNEQUIP</button>` : '<span class="loadout-empty">EMPTY</span>'}</article>`; }
function shopOverlay() { return `<div class="modal-backdrop"><section class="modal-card shop-modal"><button class="modal-close" data-action="close-modal" aria-label="Close">×</button><p class="kicker">MARKET</p><h2>Underwater upgrades</h2><p class="muted">${save.spendablePoints.toLocaleString()} points · Improve your dive equipment.</p><div class="shop-category-grid">${equipmentCategory('tank','Tanks','Carry more air and reach deeper water.')}${equipmentCategory('scooter','Underwater Upgrades','Equipment that improves your movement in the water.')}${equipmentCategory('fins','Fins','Move farther with every kick.')}</div></section></div>`; }
function legacyOverlay() { if (!state.modal) return ''; if (state.modal === 'how-to') return `<div class="modal-backdrop"><section class="modal-card"><button class="modal-close" data-action="close-modal" aria-label="Close">×</button><p class="kicker">FIELD GUIDE</p><h2>How to play</h2><div class="guide-list"><p><b>1</b><span>Swim with WASD or arrow keys. Hold Shift to sprint, but watch stamina and oxygen.</span></p><p><b>2</b><span>Move close to a glowing marker, and it is collected automatically.</span></p><p><b>3</b><span>Recover all three markers, then swim through the level finish gate. Completion is automatic.</span></p><p><b>4</b><span>Press Escape to pause. A dive can end safely at the goal, or fail if health reaches zero.</span></p></div><button class="primary-btn" data-action="close-modal">GOT IT <span>→</span></button></section></div>`; if (state.modal === 'settings') return `<div class="modal-backdrop"><section class="modal-card"><button class="modal-close" data-action="close-modal" aria-label="Close">×</button><p class="kicker">PREFERENCES</p><h2>Settings</h2><div class="settings-list"><label><span>Sound effects</span><input type="checkbox" data-setting="soundEnabled" ${save.settings.soundEnabled ? 'checked' : ''}></label><label><span>Reduced motion</span><input type="checkbox" data-setting="reducedMotion" ${save.settings.reducedMotion ? 'checked' : ''}></label></div><button class="primary-btn" data-action="close-modal">DONE <span>→</span></button></section></div>`; if (state.modal === 'new-game') return `<div class="modal-backdrop"><section class="modal-card"><p class="kicker">ABANDON DIVE</p><h2>Leave the water?</h2><p class="muted">Your provisional points will be lost, but saved equipment and currency remain safe.</p><div class="modal-actions"><button class="secondary-btn" data-action="close-modal">KEEP DIVING</button><button class="danger-btn" data-action="confirm-abort">ABANDON DIVE</button></div></section></div>`; if (state.modal === 'reset-save') return `<div class="modal-backdrop"><section class="modal-card"><p class="kicker">RESET PROGRESS</p><h2>Start a new expedition?</h2><p class="muted">This clears saved points, equipment, and map progress from this browser.</p><div class="modal-actions"><button class="secondary-btn" data-action="close-modal">CANCEL</button><button class="danger-btn" data-action="reset-save">RESET SAVE</button></div></section></div>`; return shopOverlay(); }

function setToast(message) { state.toast = message; const el = document.querySelector('#toast'); if (el) { el.textContent = message; el.classList.add('visible'); clearTimeout(setToast.timer); setToast.timer = setTimeout(() => el.classList.remove('visible'), 3200); } }
function disposeCharacterPreview() { if (!characterPreview) return; cancelAnimationFrame(characterPreview.frame); window.removeEventListener('resize', characterPreview.resize); characterPreview.renderer.dispose(); characterPreview = null; }
function setupCharacterPreview() {
  const canvas = document.querySelector('#character-preview'); if (!canvas || characterPreview) return;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  const scene = new THREE.Scene(); scene.add(new THREE.HemisphereLight(0xc8ffff, 0x06151d, 2.4)); const key = new THREE.DirectionalLight(0xfff1cf, 3); key.position.set(-3, 5, 5); scene.add(key); const rim = new THREE.PointLight(0x57d9d0, 2, 12); rim.position.set(3, 1, -3); scene.add(rim);
  const camera = new THREE.PerspectiveCamera(35, 1, .1, 40); camera.position.set(0, .5, 8); camera.lookAt(0, 0, 0); const turntableRoot = new THREE.Group(); const modelRoot = new THREE.Group(); turntableRoot.add(modelRoot); scene.add(turntableRoot);
  characterPreview = { renderer, scene, camera, modelRoot, turntableRoot, frame: 0, angle: -.15, pitch: 0, dragging: false, lastX: 0, lastY: 0 };
  const resize = () => { if (!characterPreview) return; const width=canvas.clientWidth||520, height=canvas.clientHeight||300; renderer.setSize(width,height,false); camera.aspect=width/height; camera.updateProjectionMatrix(); }; resize(); characterPreview.resize=resize; window.addEventListener('resize',resize);
  new GLTFLoader().load(activeCharacter().url, gltf => {
    if (!characterPreview) return;
    const animator=animateCharacter(gltf,modelRoot,save.characterId);
    characterPreview.animator=animator;
    animator.update(0);
    loadTankModel(modelRoot, equipped('tank'), characterPreview);
    loadFinsModels(modelRoot, equipped('fins'), characterPreview);
    if (equipped('scooter')) {
      new GLTFLoader().load('/assets/equipment/sea-scooter.glb', scooterGltf => {
        if (!characterPreview) return;
        const scooter = scooterGltf.scene;
        scooter.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
        const bounds = new THREE.Box3().setFromObject(scooter);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        const scale = 1.15 / Math.max(size.x, size.y, size.z);
        scooter.scale.setScalar(scale);
        scooter.position.set(-center.x * scale + .55, -center.y * scale - .12, -center.z * scale);
        scooter.rotation.set(0, Math.PI / 2, 0);
        modelRoot.add(scooter);
        positionScooterAtHands(modelRoot, scooter);
        characterPreview.scooter = scooter;
        characterPreview.scooterGrips = modelRoot.userData.scooterGrips;
      }, undefined, error => console.warn('Character preview scooter could not load', error));
    }
  });
  const turn=canvas.parentElement; turn.addEventListener('pointerdown',event=>{characterPreview.dragging=true;characterPreview.lastX=event.clientX;characterPreview.lastY=event.clientY;turn.setPointerCapture(event.pointerId);}); turn.addEventListener('pointermove',event=>{if(!characterPreview?.dragging)return;characterPreview.angle+=(event.clientX-characterPreview.lastX)*.012;characterPreview.pitch=clamp(characterPreview.pitch+(event.clientY-characterPreview.lastY)*.009,-1.05,1.05);characterPreview.lastX=event.clientX;characterPreview.lastY=event.clientY;}); turn.addEventListener('wheel',event=>{event.preventDefault();characterPreview.camera.position.z=clamp(characterPreview.camera.position.z+event.deltaY*.008,4.5,12);characterPreview.camera.lookAt(0,0,0);},{passive:false}); ['pointerup','pointercancel','lostpointercapture'].forEach(type=>turn.addEventListener(type,()=>{if(characterPreview)characterPreview.dragging=false;}));
  const refreshMovementStats = () => {
    const diver = activeCharacter();
    const scooterEnabled = document.querySelector('[data-character-equipment="scooter"]')?.checked;
    const finsEnabled = document.querySelector('[data-character-equipment="fins"]')?.checked;
    const scooter = scooterEnabled ? equipped('scooter') : null;
    const fins = finsEnabled ? equipped('fins') : null;
    const speed = diver.speedFactor * (scooter?.speedFactor ?? 1) * (fins?.speedFactor ?? 1);
    const effort = diver.effortFactor * 100 * (scooter?.effortFactor ?? 1) * (fins?.effortFactor ?? 1);
    document.querySelector('[data-character-stat="speed-after"]')?.replaceChildren(document.createTextNode(`${speed.toFixed(2)}×`));
    document.querySelector('[data-character-stat="effort-after"]')?.replaceChildren(document.createTextNode(`${effort.toFixed(2)}%`));
    document.querySelector('[data-character-stat="speed-after"]')?.classList.toggle('improved', speed > diver.speedFactor);
    document.querySelector('[data-character-stat="effort-after"]')?.classList.toggle('improved', effort < diver.effortFactor * 100);
  };
  document.querySelector('[data-character-equipment="scooter"]')?.addEventListener('change', event => {
    if (!characterPreview?.scooter) return;
    const visible = event.target.checked;
    characterPreview.scooter.visible = visible;
    // The basic diver's IK uses this mount data to reach the scooter. Remove
    // it while hidden so the authored swim animation is restored completely.
    characterPreview.modelRoot.userData.scooterGrips = visible ? characterPreview.scooterGrips : null;
    characterPreview.animator?.update(0, { horizontal: 0, strokeRate: .75 });
    refreshMovementStats();
    const note = document.querySelector('[data-character-stat="note"]');
    if (note) note.textContent = visible ? `${equipped('scooter')?.name || 'Equipped upgrade'} changes your movement while equipped.` : 'Upgrade hidden — showing base diver stats.';
  });
  document.querySelector('[data-character-equipment="tank"]')?.addEventListener('change', event => {
    if (characterPreview?.tank) characterPreview.tank.visible = event.target.checked;
    const activeTank = event.target.checked ? equipped('tank') : equipment.starter_tank;
    document.querySelector('[data-character-stat="air-after"]')?.replaceChildren(document.createTextNode(`${activeTank.capacity}`));
    document.querySelector('[data-character-stat="depth-after"]')?.replaceChildren(document.createTextNode(`${activeTank.maxDepthFeet} FT`));
    document.querySelector('[data-character-stat="air-after"]')?.classList.toggle('improved', event.target.checked && activeTank.capacity > equipment.starter_tank.capacity);
    document.querySelector('[data-character-stat="depth-after"]')?.classList.toggle('improved', event.target.checked && activeTank.maxDepthFeet > equipment.starter_tank.maxDepthFeet);
  });
  document.querySelector('[data-character-equipment="fins"]')?.addEventListener('change', event => {
    characterPreview?.fins?.forEach(model => { model.visible = event.target.checked; });
    refreshMovementStats();
  });
  const draw=()=>{if(!characterPreview)return; characterPreview.animator?.update(.016,{horizontal:0,strokeRate:.75}); characterPreview.turntableRoot.rotation.y=characterPreview.angle; characterPreview.turntableRoot.rotation.x=characterPreview.pitch; renderer.render(scene,camera); characterPreview.frame=requestAnimationFrame(draw);}; draw();
}
function render() {
  const root=document.querySelector('#app');
  if (characterPreview && state.modal !== 'character') disposeCharacterPreview();
  const wantsScene=state.screen==='menu'||state.screen==='dive';
  if(scene3d && (!wantsScene || (state.screen==='dive' && scene3d.preview))){
    window.removeEventListener('resize',resizeScene);scene3d.renderer.dispose();scene3d=null;
  }
  const liveCanvas=wantsScene && scene3d?.renderer.domElement;
  root.innerHTML=state.screen==='menu'?menu():state.screen==='dock'?dock():state.screen==='dive'?dive():results();
  if(liveCanvas){document.querySelector('#scene')?.replaceWith(liveCanvas);resizeScene();}
  bind();
  if (state.modal === 'character') setupCharacterPreview();
  if (state.modal === 'shop') renderCharacterPortraits();

  if(state.screen==='menu'&&!scene3d)setupScene();
}
function goDock() { state.screen = 'menu'; state.modal = null; state.result = null; render(); }
function mapSelectionOverlay() { return `<div class="modal-backdrop map-select-backdrop"><section class="modal-card map-select-modal"><button class="modal-close" data-action="close-modal" aria-label="Close">×</button><p class="kicker">EXPEDITION SELECT</p><h2>Choose your depth</h2><p class="muted">Hover a stage to preview its waters. Select an unlocked stage to dive.</p><div class="map-select-grid maps">${maps.map(map=>`<button class="map-card ${map.color}" data-preview-map="${map.id}" data-map="${map.id}" aria-disabled="${!isUnlocked(map)}"><span class="map-number">STAGE 0${map.id}</span><strong>${map.name}</strong><small>${map.depth} · ${map.difficulty}</small><span class="map-access">${isUnlocked(map)?'DIVE →':map.requirement}</span></button>`).join('')}</div></section></div>`; }
function startDive(mapId = state.mapId) { const map = maps.find(m => m.id === Number(mapId)); if (!map || !isUnlocked(map)) return; if (!equipped('tank')) { state.modal = 'shop'; state.toast = 'Equip an oxygen tank before diving.'; render(); return; } state = { ...state, screen: 'dive', modal: null, loading: true, loadingProgress: 0, mapId: map.id, running: true, paused: false, oxygen: oxygenCapacity(), stamina: 100, battery: 100, fatigue: 0, health: 100, heart: 76, depth: map.id === 1 ? 4 : map.id === 2 ? 14 : map.id === 3 ? 25 : map.id === 4 ? 38 : 55, provisional: 0, markers: 0, time: 0, keys: {}, last: performance.now(), sprintLocked: false, checkpoints: new Set(), result: null, toast: '', explorationPoints: 0 }; render(); setupScene(); beginDiveLoading(); }
function beginDiveLoading() { const started = performance.now(); const tick = now => { if (!state.loading || !scene3d) return; state.loadingProgress = Math.min(100, (now - started) / 2600 * 100); const bar = document.querySelector('#dive-loading-bar'); const value = document.querySelector('#dive-loading-value'); if (bar) bar.style.width = `${state.loadingProgress}%`; if (value) value.textContent = `${Math.round(state.loadingProgress)}%`; if (state.loadingProgress >= 100) { state.loading = false; render(); requestAnimationFrame(loop); return; } requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
function finishDive(success, reason = '') {
  if (!state.running) return;
  if (!success && reason === 'health' && scene3d) { showDeathScene(); return; }
  const map = currentMap();
  const goalBonus = success ? map.reward : 0;
  const discoveryPoints = state.explorationPoints || 0;
  if (success) {
    bankDiscovery(goalBonus);
    if (!save.completedMaps.includes(map.id)) save.completedMaps.push(map.id);
    persist();
  }
  state.running = false; state.paused = false; state.modal = success ? 'mission-complete' : null;
  if (!success && scene3d) { window.removeEventListener('resize', resizeScene); scene3d.renderer.dispose(); scene3d = null; }
  state.result = {
    success: !!success, reason, markers: state.markers, depth: state.depth,
    points: state.explorationPoints || 0,
    breakdown: [
      { label: 'Discoveries saved to wallet', points: discoveryPoints },
      ...(goalBonus ? [{ label: `${map.level} goal bonus`, points: goalBonus }] : [])
    ]
  };
  state.screen = success ? 'dive' : 'results'; render();
}
function showDeathScene() {
  state.running=false;state.paused=false;state.keys={};
  const root=document.querySelector('.minimal-dive');
  root?.classList.add('death-scene');
  root?.querySelector('.pause-overlay')?.remove();
  const panel=document.createElement('section');
  panel.className='death-overlay';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-label','You died');
  panel.innerHTML=`<div class="death-title">WASTED</div><p>${scene3d.sharkAttack ? 'Killed by a shark' : scene3d.monsterAttack ? 'Swallowed by the deep-sea monster' : 'You died underwater'}</p><small>${state.explorationPoints || 0} collected points saved</small><div><button class="primary-btn" id="death-retry">RETRY LEVEL</button><button class="secondary-btn" id="death-dock">RETURN TO DOCK</button></div>`;
  root?.append(panel);
  const leave=retry=>{
    window.removeEventListener('resize',resizeScene);
    scene3d?.renderer.dispose();scene3d=null;panel.remove();
    if(retry)startDive();else goDock();
  };
  panel.querySelector('#death-retry').onclick=()=>leave(true);
  panel.querySelector('#death-dock').onclick=()=>leave(false);
  panel.querySelector('button').focus();
}
function trySurface() {
  if (!scene3d) return;
  const map = currentMap();
  const goal = scene3d.goal || scene3d.buoy;
  const distance = scene3d.player.position.distanceTo(goal.position);
  if (state.markers < scene3d.markers.length) { setToast(`Recover all ${scene3d.markers.length} markers before reaching ${map.finishLabel.toLowerCase()}.`); return; }
  if (distance > 1.6) { setToast(`Swim to the ${map.finishLabel.toLowerCase()} to finish this level.`); return; }
  finishDive(true, 'goal');
}
function abortDive() { state.modal = 'new-game'; render(); }
function bind() { document.querySelectorAll('[data-preview-map]').forEach(el=>{for(const event of ['pointerenter','focus'])el.addEventListener(event,()=>previewMap(Number(el.dataset.previewMap)));}); document.querySelectorAll('[data-action]').forEach(el => el.addEventListener('click', () => { const action = el.dataset.action; if(action==='select-character'){const id=el.dataset.item,c=characters[id];if(!c)return;if(!save.unlockedCharacters.includes(id)){if(save.spendablePoints<c.price)return;save.spendablePoints-=c.price;save.unlockedCharacters.push(id);}save.characterId=id;persist();if(scene3d){scene3d.player.clear();loadDiverModel(scene3d.player);}render();return;} if(action==='open-loadout'){state.shopTab='loadout';state.modal='shop';render();return;} if(action==='shop-tab'){state.shopTab=el.dataset.tab;render();return;} if (action === 'continue' || action === 'choose-map') { state.modal = 'maps'; render(); } else if (action === 'new-game') { state.modal = 'reset-save'; render(); } else if (action === 'settings') { state.modal = 'settings'; render(); } else if (action === 'how-to') { state.modal = 'how-to'; render(); } else if (action === 'open-shop') { state.shopTab='shop'; state.modal = 'shop'; render(); } else if (action === 'character') { state.modal = 'character'; render(); } else if (action === 'next-stage') { const next=maps.find(candidate=>candidate.id===state.mapId+1); if (next && isUnlocked(next)) startDive(next.id); } else if (action === 'toggle-pause') togglePause(); else if (action === 'camera') setToast('Camera view locked to side-on field mode.'); else if (action === 'close-modal') { const wasDive = state.screen === 'dive'; const returnToCompletion = wasDive && state.result?.success; state.modal = returnToCompletion ? 'mission-complete' : null; render(); if (wasDive && state.running) { state.last = performance.now(); requestAnimationFrame(loop); } } else if (action === 'home') { if (state.running) return; state.modal=null; state.result=null; state.screen = 'menu'; render(); } else if (action === 'dock' || action === 'back') goDock(); else if (action === 'start') startDive(); else if (action === 'surface') trySurface(); else if (action === 'resume') { state.paused = false; state.last = performance.now(); render(); requestAnimationFrame(loop); } else if (action === 'abort') abortDive(); else if (action === 'confirm-abort') finishDive(false, 'abandoned'); else if (action === 'reset-save') { localStorage.removeItem(STORAGE_KEY); Object.assign(save, cloneDefault()); state.modal = null; state.screen = 'menu'; render(); } else if (['buy', 'equip', 'unequip'].includes(action)) handleEquipment(action, el.dataset.item); })); document.querySelectorAll('[data-move]').forEach(el => { const key = { up: 'ArrowUp', down: 'ArrowDown', swim: 'ArrowRight' }[el.dataset.move]; el.style.touchAction = 'none'; el.addEventListener('pointerdown', event => { event.preventDefault(); el.setPointerCapture(event.pointerId); state.keys[key] = true; }); for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(type, () => { state.keys[key] = false; }); }); document.querySelectorAll('[data-character-zoom]').forEach(button => button.addEventListener('click', event => { event.stopPropagation(); if (!characterPreview) return; const action=button.dataset.characterZoom; characterPreview.camera.position.z=action === 'in' ? clamp(characterPreview.camera.position.z-.9,4.5,12) : action === 'out' ? clamp(characterPreview.camera.position.z+.9,4.5,12) : 8; characterPreview.camera.lookAt(0,0,0); })); document.querySelectorAll('[data-setting]').forEach(el => el.addEventListener('change', () => { save.settings[el.dataset.setting] = el.checked; persist(); })); document.querySelectorAll('[data-map]').forEach(el => el.addEventListener('click', () => { if (isUnlocked(maps.find(map => map.id === Number(el.dataset.map)))) { state.mapId = Number(el.dataset.map); state.modal = null; startDive(); } })); }
function renderShopPreservingScroll(scrollTop=0) { render(); requestAnimationFrame(() => { const modal=document.querySelector('.shop-modal'); if (modal) modal.scrollTop=scrollTop; }); }
function handleEquipment(action, id) { const scrollTop=document.querySelector('.shop-modal')?.scrollTop||0; const item = equipment[id]; if (!item) return; if (action === 'buy') { if (save.ownedEquipment.includes(id)) action = 'equip'; else { if (save.spendablePoints < item.price) { state.toast = 'Not enough points for this equipment.'; state.modal = 'shop'; renderShopPreservingScroll(scrollTop); return; } save.spendablePoints -= item.price; save.ownedEquipment.push(id); } } if (action === 'equip') save.equipped[item.slot] = id; if (action === 'unequip') save.equipped[item.slot] = null; persist();
  // Refresh the live menu diver as well as the HTML loadout. This keeps the
  // background character in sync without requiring a browser reload.
  if (scene3d?.player && !state.running) {
    scene3d.scooterBubbles?.forEach(bubble => bubble.removeFromParent());
    scene3d.scooterBubbles = [];
    scene3d.player.clear();
    scene3d.scooter = null;
    scene3d.scooterPrepared = false;
    loadDiverModel(scene3d.player);
    if (equipped('scooter')) { prepareScooter(scene3d); scene3d.scooterPrepared = true; }
  }
  state.modal = 'shop'; renderShopPreservingScroll(scrollTop); }

function makeFinishGoal(map) {
  const profile = {
    lagoon: { frame: 0xd8e5b5, glow: 0x9fe6aa, accent: 0xffcf74 },
    reef: { frame: 0x7be0c8, glow: 0x57f0c1, accent: 0xe7a86c },
    wreck: { frame: 0xd28d55, glow: 0xffbb62, accent: 0x8cd6cf }
  }[map.color] || { frame: 0xd8e5b5, glow: 0x9fe6aa, accent: 0xffcf74 };
  const group = new THREE.Group();
  group.position.set(map.finish.x, map.finish.y, map.finish.z);
  const frameMat = new THREE.MeshStandardMaterial({ color: profile.frame, roughness: .7, metalness: .15 });
  const glowMat = new THREE.MeshStandardMaterial({ color: profile.glow, emissive: profile.glow, emissiveIntensity: 1.7, roughness: .35 });
  const postGeo = new THREE.CylinderGeometry(.075, .12, 3.2, 10);
  [-1.45, 1.45].forEach(x => { const post = new THREE.Mesh(postGeo, frameMat); post.position.set(x, 0, 0); post.castShadow = true; group.add(post); });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(3.05, .13, .13), glowMat); beam.position.y = 1.55; beam.castShadow = true; group.add(beam);
  const line = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.9), new THREE.MeshBasicMaterial({ color: profile.glow, transparent: true, opacity: .08, depthWrite: false, side: THREE.DoubleSide }));
  line.position.z = .12; group.add(line);
  if (map.id === 2) {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.28, .085, 10, 28, Math.PI), glowMat);
    arch.rotation.z = Math.PI; arch.position.y = .05; group.add(arch);
    for (let i = 0; i < 5; i++) { const branch = new THREE.Mesh(new THREE.ConeGeometry(.07, .5 + i * .06, 7), new THREE.MeshStandardMaterial({ color: profile.accent, roughness: .9 })); branch.position.set(-1.15 + i * .55, -.9 + (i % 2) * .12, .08); branch.rotation.z = (i - 2) * .16; group.add(branch); }
  }
  if (map.id === 3) {
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(.22, .32, .7, 10), frameMat); beacon.position.set(0, 1.98, 0); beacon.castShadow = true; group.add(beacon);
    const light = new THREE.Mesh(new THREE.SphereGeometry(.16, 12, 8), new THREE.MeshBasicMaterial({ color: profile.accent })); light.position.set(0, 2.42, 0); group.add(light);
    group.userData.beacon = light;
  }
  group.userData.finishLabel = map.finishLabel;
  return group;
}
function previewMap(id) {
  if(state.screen!=='menu'||state.modal!=='maps'||scene3d?.mapId===id)return;
  const request = ++previewRequest;
  clearTimeout(previewTimer);
  document.querySelectorAll('[data-preview-map]').forEach(el=>el.classList.toggle('previewing',Number(el.dataset.previewMap)===id));
  previewTimer = setTimeout(() => {
    if (request !== previewRequest || state.screen !== 'menu' || state.modal !== 'maps') return;
    state.mapId=id;
    if(scene3d){window.removeEventListener('resize',resizeScene);scene3d.renderer.dispose();scene3d=null;}
    setupScene();
  }, 260);
}
function setupScene() {
  const map = currentMap();
  const canvas = document.querySelector('#scene');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.12; renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x176a79); scene.fog = new THREE.Fog(0x176a79, 18, 52);
  const camera = new THREE.PerspectiveCamera(58, 1, .1, 130); camera.position.set(0, 1.4, 18); camera.lookAt(0, .2, 0);
  scene.add(new THREE.HemisphereLight(0xb9f3ed, 0x061b25, 1.8)); const light = new THREE.DirectionalLight(0xfff0c2, 3.2); light.position.set(-8, 12, 10); light.castShadow = true; scene.add(light);
  const seabed = new THREE.Mesh(new THREE.BoxGeometry(Math.max(44, map.bounds.max - map.bounds.min), .7, 5), new THREE.MeshStandardMaterial({ color: 0x254d4b, roughness: 1 })); seabed.receiveShadow = true; seabed.position.set((map.bounds.min + map.bounds.max) / 2, -3.25, 0); scene.add(seabed);
  const coralCount = map.id === 2 ? 28 : map.id === 3 ? 12 : 19;
  for (let i = 0; i < coralCount; i++) { const coral = makeCoral([0xd27878, 0xd4a365, 0x8e7bd2][i % 3]); coral.position.set(map.bounds.min + 1 + i * ((map.bounds.max - map.bounds.min - 2) / coralCount), -2.9, -1 + (i % 3) * .5); coral.scale.setScalar(.55 + Math.random() * .65); scene.add(coral); }
  const fish = []; for (let i = 0; i < 18; i++) { const f = makeFish([0xf1c96c, 0x84dcd8, 0xef8d90][i % 3]); f.position.set(map.bounds.min + Math.random() * (map.bounds.max - map.bounds.min), -.8 + Math.random() * 4, -1 + Math.random() * 2); scene.add(f); fish.push(f); }
  const marineLife = []; const sharks = []; const player = new THREE.Group(); player.position.set(-3.5, map.id === 1 ? 1 : map.id === 2 ? -1.5 : map.id === 3 ? -4.8 : map.id === 4 ? -20.5 : -35.5, 1); scene.add(player); loadDiverModel(player);
  const bubbles = makeBubbleEmitter(scene); const particles = makeWaterParticles(scene); const rocks = makeRocks(scene);
  const markerMat = new THREE.MeshStandardMaterial({ color: 0xb8f36b, emissive: 0x4f9b52, emissiveIntensity: 2.5 });
  const markers = map.markerPositions.map(([x, y], index) => { const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(.3), markerMat); mesh.position.set(x, y, 0); scene.add(mesh); return { id: index + 1, mesh, x, y, collected: false }; });
  const goal = makeFinishGoal(map); scene.add(goal); const surface = makeSurface(scene);
  scene3d = { renderer, scene, camera, player, buoy: goal, goal, markers, fish, specialFish: [], whales: [], marineLife, sharks, bubbles, particles, rocks, surface, freeCam: false, mapId: map.id, mapTheme: map.theme, mapBounds: { ...map.bounds } };
  resizeScene(); window.addEventListener('resize', resizeScene); animateScene();
}
function resizeScene() { if (!scene3d) return; const canvas = scene3d.renderer.domElement; const width = canvas.clientWidth || canvas.parentElement.clientWidth; const height = canvas.clientHeight || canvas.parentElement.clientHeight; scene3d.renderer.setSize(width, height, false); scene3d.camera.aspect = width / height; scene3d.camera.updateProjectionMatrix(); }
function makeDiver() { const image = new Image(); image.src = '/assets/diver-renderings/diver-side.jpg'; const canvas = document.createElement('canvas'); const texture = new THREE.CanvasTexture(canvas); image.onload = () => { canvas.width = image.naturalWidth; canvas.height = image.naturalHeight; const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0); const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height); for (let i = 0; i < pixels.data.length; i += 4) { const r = pixels.data[i]; const g = pixels.data[i + 1]; const b = pixels.data[i + 2]; if (b > r * 1.05 && g > r * 1.02 && b > 125) pixels.data[i + 3] = 0; } ctx.putImageData(pixels, 0, 0); texture.needsUpdate = true; }; const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })); sprite.scale.set(3.5, 3.5, 1); sprite.center.set(.5, .5); return sprite; }
function loadDiverModel(target) {
  new GLTFLoader().load(activeCharacter().url, gltf => {
    if (!scene3d || scene3d.player !== target) return;
    const animator = animateCharacter(gltf,target,save.characterId);
    scene3d.diverAnimator = animator;
    animator.update(0);
    if (scene3d.scooter) positionScooterAtHands(target, scene3d.scooter);
    loadTankModel(target, equipped('tank'));
    loadFinsModels(target, equipped('fins'));

  }, undefined, error => { console.error('Diver could not load', error); if (scene3d?.player === target) target.add(makeDiver()); });
}
function loadTankModel(target, tank, preview = null) {
  if (!tank || target.userData.tankModel) return;
  // Use the supplied tank model for every equipped tank tier so the preview
  // and gameplay never fall back to an invisible/procedural-only tank.
  new GLTFLoader().load(tank.model || '/assets/equipment/oxygen-scuba-diving-tank.glb', gltf => {
    if (!target.parent || target.userData.tankModel) return;
    const model = gltf.scene;
    model.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; node.frustumCulled = false; } });
    const bounds = new THREE.Box3().setFromObject(model), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    const scale = .95 / Math.max(size.x, size.y, size.z);
    model.scale.setScalar(scale);
    // Rotate first, then center the transformed geometry. The authored origin
    // is offset: overwriting its correction placed the tank over the legs.
    model.rotation.set(0, 0, -Math.PI / 2);
    model.position.set(0, 0, 0);
    model.updateMatrixWorld(true);
    model.position.sub(new THREE.Box3().setFromObject(model).getCenter(new THREE.Vector3()));
    const mount = new THREE.Group();
    mount.name = 'tank-back-mount';
    mount.add(model);
    mount.position.set(.55, .08, 0);
    target.add(mount);
    target.userData.tankModel = mount;
    if (preview) {
      preview.tank = mount;
      mount.visible = document.querySelector('[data-character-equipment="tank"]')?.checked ?? true;
    }
  }, undefined, error => console.warn('Oxygen tank could not load', error));
}
function loadFinsModels(target, fins, preview = null) {
  if (!fins?.model || target.userData.finsModels) return;
  new GLTFLoader().load(fins.model, gltf => {
    if (!target.parent || target.userData.finsModels) return;
    const source = gltf.scene;
    source.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; node.frustumCulled = false; } });
    const models = [];
    source.updateMatrixWorld(true);
    const meshes = [];
    source.traverse(node => { if (node.isMesh) meshes.push(node); });
    target.updateWorldMatrix(true, true);
    // The pair is authored diagonally: heel to blade runs down Y and up Z.
    const lengthAxis = new THREE.Vector3(0, -.64, .768).normalize();
    const upAxis = new THREE.Vector3().crossVectors(lengthAxis, new THREE.Vector3(1, 0, 0)).normalize();
    for (const [side, name] of ['CATRigLLegAnkle_010', 'CATRigRLegAnkle_014'].entries()) {
      const ankle = target.getObjectByName(name);
      if (!ankle) continue;
      const mount = new THREE.Group();
      for (const mesh of meshes) {
        const geometry = mesh.geometry.clone();
        geometry.applyMatrix4(mesh.matrixWorld);
        const positions = geometry.attributes.position;
        const indices = geometry.index;
        const selected = [];
        // Retain just one side of the authored pair, including its UVs.
        for (let i = 0; i < (indices?.count ?? positions.count); i += 3) {
          const a = indices ? indices.getX(i) : i;
          const b = indices ? indices.getX(i + 1) : i + 1;
          const c = indices ? indices.getX(i + 2) : i + 2;
          const x = (positions.getX(a) + positions.getX(b) + positions.getX(c)) / 3;
          if ((x < 0) === (side === 0)) selected.push(a, b, c);
        }
        geometry.setIndex(selected);
        const box = new THREE.Box3();
        const point = new THREE.Vector3();
        for (let i = 0; i < positions.count; i++) {
          point.fromBufferAttribute(positions, i);
          positions.setXYZ(i, point.dot(lengthAxis), point.dot(upAxis), point.x);
        }
        for (const index of selected) box.expandByPoint(point.fromBufferAttribute(positions, index));
        const center = box.getCenter(new THREE.Vector3());
        const scale = .72 / (box.max.x - box.min.x);
        geometry.translate(-box.min.x, -center.y, -center.z);
        geometry.scale(scale, scale, scale);
        geometry.computeVertexNormals();
        const fin = new THREE.Mesh(geometry, mesh.material);
        fin.frustumCulled = false;
        fin.castShadow = true;
        // The mount follows the toe joint; extend the pocket back over the foot.
        fin.position.set(-.18, -.025, 0);
        mount.add(fin);
      }
      // Toe rotation contains the foot bend that the ankle frame omits.
      const foot = ankle.children.find(node => node.isBone && /Digit11/.test(node.name)) || ankle;
      const rigScale = foot.getWorldScale(new THREE.Vector3());
      mount.scale.set(1 / Math.abs(rigScale.x), 1 / Math.abs(rigScale.y), 1 / Math.abs(rigScale.z));
      foot.add(mount);
      models.push(mount);
    }
    target.userData.finsModels = models;
    if (preview) preview.fins = models;
  }, undefined, error => console.warn('Scuba flippers could not load', error));
}
function makeFish(color) { const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.SphereGeometry(.25, 20, 14), new THREE.MeshStandardMaterial({ color, roughness: .82, metalness: 0 })); body.scale.set(1.65, .62, .5); body.castShadow = true; g.add(body); const tail = new THREE.Mesh(new THREE.ConeGeometry(.22, .4, 8), new THREE.MeshStandardMaterial({ color: 0x8b5d54, roughness: .9 })); tail.rotation.z = Math.PI / 2; tail.position.x = -.5; g.add(tail); const eye = new THREE.Mesh(new THREE.SphereGeometry(.035, 8, 8), new THREE.MeshBasicMaterial({ color: 0x071218 })); eye.position.set(.31, .08, -.19); g.add(eye); return g; }
function makeCoral(color) { const g = new THREE.Group(); for (let i = 0; i < 6; i++) { const stem = new THREE.Mesh(new THREE.CylinderGeometry(.035, .14, .75 + Math.random() * 1.25, 10), new THREE.MeshStandardMaterial({ color, roughness: .96, metalness: 0 })); stem.position.set((i - 2.5) * .18, .45, (Math.random() - .5) * .15); stem.rotation.z = (i - 2.5) * .13; stem.rotation.x = (Math.random() - .5) * .14; stem.castShadow = true; g.add(stem); } return g; }
function makeWaterParticles(scene) { const count = 240; const positions = new Float32Array(count * 3); for (let i = 0; i < count; i++) { positions[i * 3] = -22 + Math.random() * 44; positions[i * 3 + 1] = -13 + Math.random() * 19; positions[i * 3 + 2] = -1.5 + Math.random() * 2; } const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); const material = new THREE.PointsMaterial({ color: 0xc9f5ef, size: .035, transparent: true, opacity: .28, depthWrite: false, sizeAttenuation: true }); const points = new THREE.Points(geometry, material); scene.add(points); return points; }function makeRocks(scene) { const rocks = []; for (let i = 0; i < 12; i++) { const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(.55 + Math.random() * .55, 1), new THREE.MeshStandardMaterial({ color: [0x315451, 0x3c5f59, 0x4c6257][i % 3], roughness: 1 })); rock.position.set(-20 + i * 3.6 + (Math.random() - .5), -2.75, -.5 + Math.random() * .7); rock.scale.set(1.5, .55 + Math.random() * .6, .9); rock.rotation.set(Math.random(), Math.random(), Math.random()); rock.castShadow = true; rock.receiveShadow = true; scene.add(rock); rocks.push(rock); } return rocks; }function makeSurface(scene) { const sky = new THREE.Mesh(new THREE.PlaneGeometry(44, 18), new THREE.MeshBasicMaterial({ color: 0x8de1e5, transparent: true, opacity: .26, side: THREE.DoubleSide, depthWrite: false })); sky.position.set(0, 13, -3); scene.add(sky); const surface = new THREE.Mesh(new THREE.BoxGeometry(44, .1, 1), new THREE.MeshBasicMaterial({ color: 0xd7fff2, transparent: true, opacity: .72 })); surface.position.set(0, 6, -1); scene.add(surface); const sun = new THREE.Mesh(new THREE.SphereGeometry(1.15, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffe28a, transparent: true, opacity: .95 })); sun.position.set(-9, 10.5, -2); scene.add(sun); const glow = new THREE.Mesh(new THREE.SphereGeometry(2.2, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffe9a6, transparent: true, opacity: .12, depthWrite: false })); glow.position.copy(sun.position); scene.add(glow); return { sky, surface, sun, glow }; }function makeBubbleEmitter(scene) { const material = new THREE.MeshBasicMaterial({ color: 0xe4ffff, transparent: true, opacity: .68, depthWrite: false }); return Array.from({ length: 13 }, (_, index) => { const mesh = new THREE.Mesh(new THREE.SphereGeometry(.035 + (index % 3) * .018, 10, 8), material.clone()); mesh.userData = { age: Math.random() * 2.5, life: 1.7 + Math.random() * 1.8, speed: .55 + Math.random() * .4, drift: (Math.random() - .5) * .22, seed: Math.random() * 9 }; mesh.visible = false; scene.add(mesh); return mesh; }); }
function resetBubble(bubble, index) { const p = scene3d.player.position; const offset = scene3d.player.userData.headOffset || { x: .94, y: .22, z: .18 }; const yaw = scene3d.player.rotation.y || 0; const cos = Math.cos(yaw); const sin = Math.sin(yaw); const headX = cos * offset.x + sin * offset.z; const headZ = -sin * offset.x + cos * offset.z; bubble.userData.age = 0; bubble.userData.life = 1.7 + Math.random() * 1.8; bubble.userData.speed = .55 + Math.random() * .4; bubble.userData.drift = (Math.random() - .5) * .16; bubble.userData.seed = Math.random() * 9; bubble.position.set(p.x + headX + (Math.random() - .5) * .1, p.y + offset.y + (index % 4) * .035, p.z + headZ + (Math.random() - .5) * .06); bubble.visible = true; }
function updateBubbles(dt, time) { if (!scene3d?.bubbles) return; scene3d.bubbles.forEach((bubble, index) => { if (!bubble.parent) scene3d.scene.add(bubble); bubble.userData.age += dt; const u = bubble.userData; if (!bubble.visible || u.age > u.life || bubble.position.y > 3.6) resetBubble(bubble, index); bubble.position.y += u.speed * dt; bubble.position.x += Math.sin(time * 2 + u.seed) * u.drift * dt; bubble.material.opacity = Math.max(0, .7 * (1 - u.age / u.life)); }); }
function interact() { /* Automatic proximity pickups. */ }
function updateCriticalFeedback() { const root = document.querySelector('.minimal-dive'); if (!root) return; const health = clamp(state.health, 0, 100); const warning = health <= 55; const critical = health <= 35; const danger = health <= 15; root.classList.toggle('health-warning', warning && !critical); root.classList.toggle('health-critical', critical); root.classList.toggle('health-danger', danger); root.style.setProperty('--critical-beat', `${clamp(60 / Math.max(state.heart, 55), .45, 1.1)}s`); const banner = document.querySelector('#health-critical'); if (!banner) return; const title = danger ? 'CRITICAL HEALTH' : critical ? 'HEALTH CRITICAL' : warning ? 'HEALTH LOW' : ''; const instruction = critical ? 'SURFACE IMMEDIATELY' : warning ? 'SWIM CALMLY · SURFACE SOON' : ''; if (banner.dataset.title !== title) { banner.dataset.title = title; banner.innerHTML = title ? `<strong>! ${title}</strong><span>${instruction}</span>` : ''; banner.setAttribute('aria-label', title ? `${title}. ${instruction}` : ''); } }
function toggleFreeCam() {
  if (!scene3d || !state.running) return;
  scene3d.freeCam = !scene3d.freeCam;
  state.keys = {};
  const button = document.querySelector('[data-action="camera"]');
  button?.setAttribute('aria-pressed', String(scene3d.freeCam));
  setToast(scene3d.freeCam ? 'FREE CAM · WASD/ARROWS MOVE · Q/E DEPTH · SHIFT SPEED · CAMERA TO EXIT' : 'FOLLOW CAM RESTORED');
}
function updateFreeCamera(game, dt) {
  const speed = game.freeCamSpeed || 5;
  const horizontal = Number(!!(state.keys.d || state.keys.ArrowRight)) - Number(!!(state.keys.a || state.keys.ArrowLeft));
  const vertical = Number(!!(state.keys.w || state.keys.ArrowUp)) - Number(!!(state.keys.s || state.keys.ArrowDown));
  const depth = Number(!!state.keys.q) - Number(!!state.keys.e);
  const multiplier = state.keys.Shift ? 2.5 : 1;
  game.camera.position.x = clamp(game.camera.position.x + horizontal * speed * multiplier * dt, game.mapBounds.min - 8, game.mapBounds.max + 8);
  game.camera.position.y = clamp(game.camera.position.y + vertical * speed * multiplier * dt, game.environment.heightAt(game.camera.position.x, game.camera.position.z) + 1, 8);
  game.camera.position.z = clamp(game.camera.position.z + depth * speed * multiplier * dt, 6, 30);
  game.camera.lookAt(game.camera.position.x, game.camera.position.y, 0);
}
function togglePause() { if (!state.running) return; state.keys = {}; state.paused = !state.paused; if (!state.paused) { state.last = performance.now(); render(); requestAnimationFrame(loop); } else render(); }
function updateHud() {
  if (!scene3d) return;
  const map = currentMap(); const pct = oxygenPercent();
  const ids = { oxygen: pct, stamina: state.stamina, battery: state.battery, fatigue: state.fatigue, health: state.health };
  for (const [id, value] of Object.entries(ids)) { const valueEl = document.querySelector(`#${id}-value`); const barEl = document.querySelector(`#${id}-bar`); if (valueEl) valueEl.textContent = `${Math.round(value)}%`; if (barEl) barEl.style.width = `${clamp(value, 0, 100)}%`; }
  const heart = document.querySelector('#heart-value'); if (heart) heart.innerHTML = `${Math.round(state.heart)} <small>BPM</small>`;
  const markers = document.querySelector('#marker-count'); if (markers) markers.textContent = `${state.markers}/3`;
  const depth = document.querySelector('#depth-count'); if (depth) depth.textContent = `${Math.round(state.depth)}M`;
  const warning = document.querySelector('#oxygen-warning'); if (warning) warning.textContent = pct <= 15 ? '⚠ CRITICAL OXYGEN' : pct <= 30 ? '⚠ OXYGEN LOW' : '';
  const hint = document.querySelector('#interaction-hint'); if (hint) { const nearMarker = scene3d.markers.some(m => !m.collected && Math.hypot(m.x - scene3d.player.position.x, m.y - scene3d.player.position.y) < .95); const nearGoal = scene3d.player.position.distanceTo(scene3d.goal.position) < 1.6; hint.textContent = nearMarker || nearGoal ? 'PRESS E TO INTERACT' : 'E TO INTERACT'; }
  const direction = document.querySelector('#direction-marker'); if (direction) { const dx = scene3d.goal.position.x - scene3d.player.position.x; const dy = scene3d.goal.position.y - scene3d.player.position.y; direction.style.transform = `rotate(${Math.atan2(dx, dy) * 180 / Math.PI}deg)`; direction.querySelector('span').textContent = map.finishLabel; direction.querySelector('span').style.transform = `rotate(${-Math.atan2(dx, dy) * 180 / Math.PI}deg)`; }
  const goalInstruction = document.querySelector('#goal-instruction'); if (goalInstruction) goalInstruction.textContent = state.markers < 3 ? `${state.markers}/3 MARKERS · COLLECT THEM` : `ALL MARKERS · REACH ${map.finishLabel}`;
  updateMiniMap();
}
function animateScene(now = performance.now()) {
  updateDiveAudio({active:state.running&&!state.paused&&!state.modal&&!document.hidden,enabled:save.settings.soundEnabled,moving:Object.entries(state.keys).some(([key,value])=>value&&['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key))&&movementResource()>15,sprinting:!!state.keys.Shift,tank:!!equipped('tank'),oxygen:oxygenPercent(),depth:state.depth});
  if (!scene3d) return;
  const map = currentMap();
  scene3d.preview=state.screen==='menu';
  if (!scene3d.environment) scene3d.environment = rebuildOcean(scene3d);
  if (!scene3d.sunkenShipPrepared) { prepareSunkenShip(scene3d); scene3d.sunkenShipPrepared = true; }
  if (!scene3d.deepSeaSceneryPrepared) { prepareDeepSeaScenery(scene3d); scene3d.deepSeaSceneryPrepared = true; }
  if (!scene3d.coralSceneryPrepared) { prepareCoralScenery(scene3d); scene3d.coralSceneryPrepared = true; }
  if (equipped('scooter') && !scene3d.scooterPrepared) { prepareScooter(scene3d); scene3d.scooterPrepared = true; }
  const dt = Math.min((now - (scene3d.lastFrame ?? now)) / 1000, .05);
  scene3d.lastFrame = now;
  if(scene3d.preview){
    const t=(scene3d.animationTime||0)+dt;scene3d.animationTime=t;
    if(!scene3d.fishPrepared){prepareFish(scene3d.fish);scene3d.fishPrepared=true;}
    if(!scene3d.specialFishPrepared){prepareSpecialFish(scene3d);scene3d.specialFishPrepared=true;}
    updateSpecialFish(scene3d,dt,t);
    if(scene3d.mapId>=3&&!scene3d.whalesPrepared){prepareWhales(scene3d);scene3d.whalesPrepared=true;}
    updateWhales(scene3d,dt,t);
    fixWhaleMotion(scene3d);
    updateFishSchool(scene3d,dt,t);
    scene3d.diverAnimator?.update(dt,{horizontal:1,strokeRate:.5});
    scene3d.environment.update(t);scene3d.environment.follow?.(0);
    const y=scene3d.mapId===4?-19:scene3d.mapId===5?-33:scene3d.mapId===3?-4:-1;
    scene3d.player.position.set(3,y+Math.sin(t*.3)*.3,1);
    scene3d.camera.position.set(0,y+1,state.modal==='maps'?12:18);
    scene3d.camera.lookAt(1,y-1,0);
    scene3d.markers.forEach(m=>m.mesh.visible=false);scene3d.goal.visible=false;
    updateBubbles(dt,t); updateScooterBubbles(dt,t);
  }
  if (state.running && !state.paused && !state.modal) {
    if (!scene3d.exploration) scene3d.exploration = createExploration(scene3d, {
      collect: () => { diamondSound(save.settings.soundEnabled);state.markers++; bankDiscovery(100); updateHud(); },
      reward: points=>{diamondSound(save.settings.soundEnabled);bankDiscovery(points);},
      reducedMotion:()=>save.settings.reducedMotion,
      pause: () => { state.paused = true; state.keys = {}; },
      resume: () => { state.paused = false; state.last = performance.now(); requestAnimationFrame(loop); },
      finish: () => finishDive(true)
    });
    scene3d.exploration.update();
    if (state.paused || !scene3d) return requestAnimationFrame(animateScene);
    scene3d.animationTime = (scene3d.animationTime || 0) + dt;
    const t = scene3d.animationTime;
    if (!scene3d.fishPrepared) { prepareFish(scene3d.fish); scene3d.fishPrepared = true; }
    if (!scene3d.specialFishPrepared) { prepareSpecialFish(scene3d); scene3d.specialFishPrepared = true; }
    updateSpecialFish(scene3d,dt,t);
    if(scene3d.mapId>=3&&!scene3d.whalesPrepared){prepareWhales(scene3d);scene3d.whalesPrepared=true;}
    updateWhales(scene3d,dt,t);
    fixWhaleMotion(scene3d);
    if (!scene3d.marineLifePrepared) { prepareMarineLife(scene3d); scene3d.marineLifePrepared = true; }
    if (!scene3d.sharksPrepared) { for (let i = 0; i < map.id; i++) prepareSharks(scene3d); scene3d.sharksPrepared = true; }
    updateFishSchool(scene3d, dt, t); updateMarineLife(scene3d, dt, t);
    updateSharkEncounter(scene3d, dt, t, {damage: amount => {state.health=clamp(state.health-amount,0,100);}});
    updateDeepMonster(scene3d,dt,t,amount=>{state.health=clamp(state.health-amount,0,100);});
    scene3d.sharks.forEach(shark=>updateTailMotion(shark.userData.model,t));
    scene3d.particles.rotation.y = t * .008; scene3d.particles.rotation.z = Math.sin(t * .25) * .02;
    scene3d.markers.forEach((m, i) => { if (!m.collected) { m.mesh.rotation.y = t; m.mesh.position.y = m.y + Math.sin(t * 2 + i) * .08; } });
    if (scene3d.goal) { scene3d.goal.rotation.y = Math.sin(t * .42) * .035; if (scene3d.goal.userData.beacon) scene3d.goal.userData.beacon.material.opacity = .72 + Math.sin(t * 3.2) * .2; }
    scene3d.diverAnimator?.update(dt, scene3d.swimInput);
    updateBubbles(dt, t); updateScooterBubbles(dt, t);
    if (scene3d.freeCam) updateFreeCamera(scene3d, dt);
    else {
      scene3d.camera.position.x += (scene3d.player.position.x - scene3d.camera.position.x) * Math.min(1, dt * 3);
      const cameraY = Math.min(1.4, scene3d.player.position.y + 5);
      scene3d.camera.position.y += (cameraY-scene3d.camera.position.y)*(1-Math.exp(-2*dt));
      scene3d.camera.position.z += (18-scene3d.camera.position.z) * (1-Math.exp(-4*dt));
    }
    scene3d.environment.update(t);
    scene3d.environment.follow?.(scene3d.player.position.x);
    scene3d.player.position.y = Math.max(scene3d.player.position.y, scene3d.environment.heightAt(scene3d.player.position.x, scene3d.player.position.z) + .85);
    state.oxygen = clamp(state.oxygen, 0, oxygenCapacity());
    document.querySelectorAll('[data-resource]').forEach(meter => {
      const id = meter.dataset.resource;
      const value = Math.round(clamp(id === 'oxygen' ? oxygenPercent() : state[id], 0, 100));
      const level = id === 'health' ? value <= 15 ? 'critical' : value <= 35 ? 'low' : 'normal' : value <= 15 ? 'critical' : value <= 30 ? 'low' : 'normal';
      meter.dataset.level = level;
      meter.querySelector('[role="meter"]').setAttribute('aria-valuenow', value);
      const alert = meter.querySelector('.meter-alert');
      const message = id === 'battery' ? '' : id === 'health' ? value <= 15 ? 'CRITICAL HEALTH' : value <= 35 ? 'HEALTH LOW' : '' : level === 'normal' ? '' : value === 0 ? 'DEPLETED' : level === 'critical' ? 'CRITICAL' : 'LOW';
      if (alert.textContent !== message) alert.textContent = message;
    });
    updateCriticalFeedback();
    updateHeartbeat((!scooterActive() || state.battery > 0) && (state.stamina <= 30 || state.health <= 35), save.settings.soundEnabled, state.heart);
    document.querySelector('.battery .meter-alert')?.replaceChildren();
    if(scene3d.exhausted && (!scooterActive() || state.stamina <= 15)) document.querySelector('.stamina .meter-alert')?.replaceChildren(document.createTextNode('EXHAUSTED · REST TO 30%'));
    scene3d.camera.lookAt(scene3d.camera.position.x, scene3d.camera.position.y-1.2, 0);
  }
  scene3d.renderer.render(scene3d.scene, scene3d.camera);
  const renderedScene=scene3d;
  requestAnimationFrame(now=>{if(scene3d===renderedScene)animateScene(now);});
}
function loop(now) {
  if (!state.running || state.paused || state.modal || !scene3d) return;
  if (scene3d.sharkAttack) {
    state.keys={}; state.last=now; updateHud();
    if(state.health<=0) { finishDive(false,'health'); return; }
    requestAnimationFrame(loop); return;
  }
  const map = currentMap(); const dt = Math.min((now - state.last) / 1000, .05); state.last = now;
  if (movementExhausted()) scene3d.exhausted = true;
  if (!movementExhausted() && (movementResource() >= 30 || (scooterActive() && state.battery > 0))) scene3d.exhausted = false;
  const horizontal = scene3d.freeCam || scene3d.exhausted ? 0 : Number(!!(state.keys.d || state.keys.ArrowRight)) - Number(!!(state.keys.a || state.keys.ArrowLeft));
  const vertical = scene3d.freeCam || scene3d.exhausted ? 0 : Number(!!(state.keys.w || state.keys.ArrowUp)) - Number(!!(state.keys.s || state.keys.ArrowDown));
  const moving = !!(horizontal || vertical), length = Math.hypot(horizontal, vertical) || 1;
  const directionChanged = !!horizontal && !!scene3d.lastHorizontal && Math.sign(horizontal) !== scene3d.lastHorizontal;
  if (directionChanged) scene3d.turnPause = .72;
  scene3d.lastHorizontal = horizontal || scene3d.lastHorizontal || 0; scene3d.turnPause = Math.max(0, (scene3d.turnPause || 0) - dt);
  if (movementResource() <= 8) state.sprintLocked = true;
  if (movementResource() >= 30) state.sprintLocked = false;
  const tank = equipped('tank'), fins = equipped('fins'), scooter = equipped('scooter'), capacity = tank?.capacity || 0, finSpeed = (fins?.speedFactor ?? .58) * (scooter?.speedFactor ?? 1), finEffort = (fins?.effortFactor ?? 1.35) * (scooter?.effortFactor ?? 1);
  const sprinting = !!state.keys.Shift && moving && !state.sprintLocked && state.oxygen > capacity * .15;
  const effort = (moving ? (sprinting ? 1 : .4) : .08) * finEffort * map.difficultyFactor;
  const energy = movementResource();
  const staminaCondition = energy < 20 ? .28 + energy / 20 * .35 : .63 + (energy - 20) / 80 * .37;
  const condition = staminaCondition * (.6 + .4 * state.health / 100);
  const desired = moving ? (sprinting ? 1.6 : .85) * finSpeed * condition * (scene3d.turnPause > 0 ? .18 : 1) : 0;
  scene3d.speed = (scene3d.speed || 0) + (desired - (scene3d.speed || 0)) * (1 - Math.exp(-3 * dt));
  scene3d.player.position.x = clamp(scene3d.player.position.x + horizontal / length * scene3d.speed * dt, map.bounds.min, map.bounds.max);
  const floor = scene3d.environment.heightAt(scene3d.player.position.x, scene3d.player.position.z) + .85;
  scene3d.player.position.y = clamp(scene3d.player.position.y + vertical / length * scene3d.speed * dt, floor, 5);
  const surfaced = scene3d.player.position.y >= 4.8;
  const batteryPowered = scooterActive() && state.battery > 0;
  if (batteryPowered) {
    state.battery = clamp(state.battery - (moving ? (sprinting ? 4.5 : 2.2) * map.difficultyFactor : 0) * dt, 0, 100);
  } else {
    // Stamina is untouched while the scooter still has charge.
    // Once the battery is empty, ordinary swimming stamina takes over.
    state.stamina = clamp(state.stamina + (sprinting ? -19 * map.difficultyFactor : moving ? -1.5 * map.difficultyFactor : surfaced ? 12 : 5) * activeCharacter().effortFactor * dt, 0, 100);
  }
  // A battery reaching zero never carries the previous exhausted state over.
  scene3d.exhausted = movementExhausted();
  const breathEffort = batteryPowered ? 0 : effort;
  const breathFatigue = batteryPowered ? 0 : (100 - state.stamina) * .005;
  state.oxygen = clamp(state.oxygen + (surfaced ? capacity * .16 : -(.65 + breathEffort * 1.35 + breathFatigue)) * dt, 0, capacity);
  if (!surfaced && state.oxygen === 0) state.health = clamp(state.health - 9 * map.difficultyFactor * dt, 0, 100);
  if (surfaced && !moving && state.oxygen > capacity * .65) state.health = clamp(state.health + 2 * dt, 0, 100);
  state.fatigue = 100 - movementResource();
  state.depth = Math.max(0, 5 - scene3d.player.position.y);
  const feet=state.depth*3.28084;
  const maxFeet = equipped('tank')?.maxDepthFeet || 0;
  const beyondEquipment = maxFeet > 0 && feet > maxFeet;
  if (beyondEquipment) { state.health = clamp(state.health - (8 + (feet - maxFeet) * .45) * map.difficultyFactor * dt, 0, 100); }
  scene3d.deepExposure = 0;
  // Depth damage is governed by the selected character limit above.
  let depthHud=document.querySelector('#depth-hud');
  if(!depthHud){depthHud=document.createElement('aside');depthHud.id='depth-hud';document.querySelector('.minimal-dive')?.append(depthHud);}
  depthHud.innerHTML=`<strong>${Math.round(feet)} <small>FT DEEP</small></strong><span>${beyondEquipment ? `⚠ CHARACTER LIMIT ${maxFeet} FT · ASCEND NOW · HEALTH FALLING` : feet>60 ? 'DEEP WATER · ASCEND WITH CARE' : feet>45 ? 'APPROACHING DEEP WATER' : 'DEPTH BELOW SURFACE'}</span>`;
  depthHud.dataset.danger=beyondEquipment||feet>100?'critical':feet>60?'warning':'normal';
  state.heart += (75 + effort * 65 + (oxygenPercent() < 20 ? 15 : 0) - state.heart) * (1 - Math.exp(-dt));
  scene3d.swimInput = { horizontal, vertical, sprinting, exhausted: !!scene3d.exhausted, distress: !surfaced && state.oxygen <= 0, strokeRate: moving ? (.55 + scene3d.speed * .65) * (.35 + .65 * movementResource() / 100) : .18 };
  const root = document.querySelector('.minimal-dive');
  root?.classList.toggle('stamina-exhausted', !!scene3d.exhausted);
  root?.classList.toggle('oxygen-distress', !surfaced && state.oxygen <= 0);
  const staminaAlert = document.querySelector('.stamina .meter-alert');
  if (staminaAlert && scene3d.exhausted) { staminaAlert.textContent = 'EXHAUSTED · REST TO 30%'; staminaAlert.style.display = 'block'; }
  else if (staminaAlert) staminaAlert.style.display = '';
  if (state.health <= 0) { finishDive(false, 'health'); return; }
  if (state.markers >= scene3d.markers.length && scene3d.player.position.distanceTo(scene3d.goal.position) < 1.6) { finishDive(true, 'goal'); return; }
  updateHud(); requestAnimationFrame(loop);
}

window.addEventListener('keydown', event => { const key = event.key.length === 1 ? event.key.toLowerCase() : event.key; if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Shift', 'Escape'].includes(event.key) || ['w', 'a', 's', 'd', 'e'].includes(key)) event.preventDefault(); if (key === 'Escape') { togglePause(); return; } if (key === 'e' && state.screen === 'dive' && !state.paused) { interact(); return; } state.keys[key] = true; });
window.addEventListener('keyup', event => { const key = event.key.length === 1 ? event.key.toLowerCase() : event.key; state.keys[key] = false; });
function miniMapMarkup(map) {
  const routes = {
    lagoon: 'M12 62 C45 53 63 68 91 56 S139 38 174 45 S202 29 208 18',
    reef: 'M12 62 C34 52 48 58 63 42 S92 20 111 38 S143 68 162 48 S190 28 208 18',
    wreck: 'M12 62 C38 65 51 48 71 55 S93 76 113 59 S131 22 153 34 S180 50 208 18'
  };
  return `<aside class="mini-map radar-map theme-${map.color}" id="mini-map" aria-label="${map.level} dive radar"><div class="mini-map-viewport"><svg viewBox="0 0 220 82" role="img" aria-label="Diver, collectibles and finish location; surface is up"><path id="radar-terrain" class="radar-terrain" d="${map.color === "lagoon" ? "M0 70 Q25 62 50 68 T100 66 T150 69 T220 64 V82 H0Z" : map.color === "reef" ? "M0 73 Q24 49 49 69 T96 56 Q122 42 145 65 T190 52 T220 61 V82 H0Z" : "M0 77 Q25 66 49 75 T90 58 Q118 74 141 52 T180 68 T220 46 V82 H0Z"}"/><path id="radar-contour" class="radar-contour" d="${map.color === "lagoon" ? "M0 76 Q28 67 52 74 T102 73 T153 75 T220 71" : map.color === "reef" ? "M0 78 Q25 61 51 76 T97 65 Q124 52 146 72 T190 61 T220 70" : "M0 80 Q26 72 50 79 T91 68 Q117 80 143 61 T181 74 T220 56"}"/><path class="radar-surface" d="M0 9 H220"/><path class="mini-map-route" id="radar-route" d="${routes[map.color] || routes.lagoon}"/><line id="mini-map-finish-line" x1="208" y1="12" x2="208" y2="26"/><circle id="mini-map-goal" cx="208" cy="18" r="4"/><path id="mini-map-player" d="M6 0 -4 -4 -2 0 -4 4Z" transform="translate(12 62)"/><circle id="mini-map-marker-1" class="mini-map-marker" r="2.5"/><circle id="mini-map-marker-2" class="mini-map-marker" r="2.5"/><circle id="mini-map-marker-3" class="mini-map-marker" r="2.5"/></svg><span class="radar-orientation">↑ SURFACE</span></div><div class="mini-map-footer"><span>${map.name.toUpperCase()}</span><strong id="mini-map-progress">${state.markers}/3</strong></div><div class="radar-resource-strip" aria-hidden="true"><i id="radar-health"></i><i id="radar-stamina"></i><i id="radar-oxygen"></i></div></aside>`;
}
function radarTerrainPath(game,map,mapX,mapY,contour=false) { const heightAt=game.environment?.heightAt || (x => -8.65 - 24 * THREE.MathUtils.smoothstep(x, 5, 32) + (map.id === 3 ? .38 : .22) * Math.sin(x * .31) + .12 * Math.sin(x * .8)); const samples=28; let path=''; for(let i=0;i<samples;i++){const x=map.bounds.min+(map.bounds.max-map.bounds.min)*i/(samples-1);const px=mapX(x),py=mapY(heightAt(x,0)+(contour?1.2:0));path+=i===0?`M${px.toFixed(1)} ${py.toFixed(1)}`:` L${px.toFixed(1)} ${py.toFixed(1)}`;} return contour?path+` L${mapX(map.bounds.max).toFixed(1)} ${mapY(heightAt(map.bounds.max,0)+1.2).toFixed(1)}`:path+' V82 H0Z'; }
function updateMiniMap() {
  if (!scene3d) return;
  const map = currentMap();
  const player = document.querySelector('#mini-map-player');
  const goal = document.querySelector('#mini-map-goal');
  const finishLine = document.querySelector('#mini-map-finish-line');
  const progress = document.querySelector('#mini-map-progress');
  if (!player || !goal || !finishLine) return;
  const mapX = x => 12 + clamp((x - map.bounds.min) / (map.bounds.max - map.bounds.min), 0, 1) * 196;
  const mapY = y => 68 - clamp((y + 34) / 39, 0, 1) * 54;
  document.querySelector('#radar-terrain')?.setAttribute('d',radarTerrainPath(scene3d,map,mapX,mapY));
  document.querySelector('#radar-contour')?.setAttribute('d',radarTerrainPath(scene3d,map,mapX,mapY,true));
  const svg=document.querySelector('.mini-map-viewport svg');
  scene3d.sharks.forEach((shark,index)=>{
    let marker=document.querySelector(`#radar-shark-${index}`);
    if(!marker && svg){marker=document.createElementNS('http://www.w3.org/2000/svg','circle');marker.id=`radar-shark-${index}`;marker.setAttribute('r','3.5');marker.setAttribute('fill','#ff343e');marker.setAttribute('stroke','#3a080b');svg.append(marker);}
    marker?.setAttribute('cx',mapX(shark.position.x));marker?.setAttribute('cy',mapY(shark.position.y));
  });
  const px = mapX(scene3d.player.position.x), py = mapY(scene3d.player.position.y);
  const gx = mapX(map.finish.x), gy = mapY(map.finish.y);
  const input = scene3d.swimInput;
  if (input && (input.horizontal || input.vertical)) scene3d.radarHeading = Math.atan2(-input.vertical, input.horizontal) * 180 / Math.PI;
  player.setAttribute('transform', `translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${scene3d.radarHeading || 0})`);
  // Record the actual swim path for this dive; never draw a shortcut to the goal.
  const trail = scene3d.radarTrail ||= [];
  const last = trail[trail.length - 1];
  if (!last || Math.hypot(px-last.x, py-last.y) >= .7) {
    trail.push({x:px,y:py});
    if (trail.length > 1600) trail.shift();
  }
  const points = [...trail, {x:px,y:py}];
  let path = points.length ? `M${points[0].x} ${points[0].y}` : '';
  for (let i=1;i<points.length-1;i++) {
    const a=points[i], b=points[i+1];
    path += ` Q${a.x} ${a.y} ${(a.x+b.x)/2} ${(a.y+b.y)/2}`;
  }
  if(points.length>1) path += ` L${px} ${py}`;
  document.querySelector('#radar-route')?.setAttribute('d', path);
  document.querySelector('.radar-surface')?.setAttribute('d','M0 9 Q5 5 10 9 T30 9 T50 9 T70 9 T90 9 T110 9 T130 9 T150 9 T170 9 T190 9 T210 9 T230 9');
  for (const resource of ['health','stamina','oxygen']) {
    const bar = document.querySelector(`#radar-${resource}`);
    if (bar) bar.style.setProperty('--fill', `${resource === 'oxygen' ? oxygenPercent() : clamp(state[resource],0,100)}%`);
  }
  goal.setAttribute('cx', gx.toFixed(1)); goal.setAttribute('cy', gy.toFixed(1));
  finishLine.setAttribute('x1', gx.toFixed(1)); finishLine.setAttribute('x2', gx.toFixed(1)); finishLine.setAttribute('y1', Math.max(6, gy - 8).toFixed(1)); finishLine.setAttribute('y2', Math.min(76, gy + 8).toFixed(1));
  scene3d.markers.forEach((marker, index) => { const markerEl = document.querySelector(`#mini-map-marker-${index + 1}`); if (!markerEl) return; markerEl.setAttribute('cx', mapX(marker.x).toFixed(1)); markerEl.setAttribute('cy', mapY(marker.y).toFixed(1)); markerEl.style.opacity = marker.collected ? '.18' : '1'; });
  if (progress) progress.textContent = `${state.markers}/3`;
}
function diveMinimal() {
  const paths = { health: 'M12 21 3 12C-2 5 7 1 12 7c5-6 14-2 9 5Z', stamina: 'm14 2-9 12h6l-1 8 9-12h-6Z', battery: 'M6 7h11v10H6zM17 10h2v4h-2M9 4h5v3H9Z', oxygen: 'M9 3h6M12 3v3M8 7h8v14H8ZM8 11h8M16 8h3v6' };
  const meter = (id, label, value) => `<div class="dive-meter ${id}" data-resource="${id}"><div class="meter-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[id]}"/></svg></div><div class="meter-content"><div class="meter-caption"><span>${label}</span><b id="${id}-value">${Math.round(value)}%</b></div><div class="game-meter-track" role="meter" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(value)}"><i id="${id}-bar" style="width:${clamp(value, 0, 100)}%"></i></div><span class="meter-alert" aria-live="polite"></span></div></div>`;
  const map = currentMap();
  const energyId = scooterActive() ? 'battery' : 'stamina';
  const energyLabel = scooterActive() ? 'BATTERY' : 'STAMINA';
  return `<main class="dive-screen arcade-dive minimal-dive"><div class="water-world"><canvas id="scene" aria-label="Underwater scene"></canvas><div class="water-vignette"></div><div class="health-pulse" aria-hidden="true"></div><div id="health-critical" class="health-critical-banner" role="alert" aria-live="assertive"></div></div>${miniMapMarkup(map)}<div class="dive-goal-hud"><span>${map.level} · ${map.difficulty}</span><strong>${map.finishLabel}</strong><small id="goal-instruction">${state.markers < 3 ? `${state.markers}/3 MARKERS · COLLECT THEM` : `ALL MARKERS · REACH ${map.finishLabel}`}</small></div><div class="game-vitals" aria-label="Diver vitals">${meter('health', 'HEALTH', state.health)}${meter('stamina', 'STAMINA', state.stamina)}${meter('oxygen', 'BREATH', oxygenPercent())}${scooterActive() ? meter('battery', 'BATTERY', state.battery) : ''}</div><button class="dive-pause dive-freecam" data-action="camera" aria-pressed="false">FREE CAM</button><button class="dive-pause" data-action="toggle-pause">Ⅱ PAUSE</button>${state.loading ? loadingOverlay() : state.paused ? pauseOverlay() : ''}${overlay()}</main>`;
}
function loadingOverlay() { return `<div class="dive-loading" role="status" aria-live="polite"><div class="loading-card"><div class="loading-spinner"><span></span><span></span><span></span></div><p class="kicker">GAME PREPARATION</p><h2>Preparing the dive</h2><p>Loading the map, wildlife, and equipment.</p><div class="loading-progress"><i id="dive-loading-bar" style="width:${state.loadingProgress}%"></i></div><strong id="dive-loading-value">${Math.round(state.loadingProgress)}%</strong><small>YOUR DIVER IS SWIMMING INTO POSITION</small></div></div>`; }
dive = diveMinimal;

// Natural-material pass used by the scene factory above.
function makeFishReal(color) { const palette = [0x9f8052, 0x6d9d9a, 0xa8766b]; const tint = palette[Math.abs(color) % palette.length]; const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.SphereGeometry(.25, 24, 16), new THREE.MeshStandardMaterial({ color: tint, roughness: .9 })); body.scale.set(1.5, .56, .42); body.castShadow = true; g.add(body); const tail = new THREE.Mesh(new THREE.ConeGeometry(.2, .42, 6), new THREE.MeshStandardMaterial({ color: 0x4b625f, roughness: 1 })); tail.rotation.z = Math.PI / 2; tail.position.x = -.47; tail.castShadow = true; g.add(tail); const fin = new THREE.Mesh(new THREE.ConeGeometry(.08, .25, 5), new THREE.MeshStandardMaterial({ color: tint, roughness: 1 })); fin.rotation.x = Math.PI / 2; fin.position.set(-.05, .14, 0); g.add(fin); const eye = new THREE.Mesh(new THREE.SphereGeometry(.028, 10, 8), new THREE.MeshBasicMaterial({ color: 0x071218 })); eye.position.set(.3, .07, -.17); g.add(eye); return g; }
function prepareWhales(game) { new GLTFLoader().load('/assets/sea-life/whale.glb', gltf => { if (scene3d !== game) return; const model=gltf.scene; model.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}}); const box=new THREE.Box3().setFromObject(model), size=box.getSize(new THREE.Vector3()), center=box.getCenter(new THREE.Vector3()); const scale=18/Math.max(size.x,size.y,size.z); model.scale.setScalar(scale); model.position.set(-center.x*scale,-center.y*scale,-center.z*scale); model.rotation.y=Math.PI/2; const whale=new THREE.Group(); whale.add(model); const depth=game.environment.heightAt(Math.max(18,game.player.position.x+13),-6)+6; whale.position.set(game.player.position.x+13,depth,-6); game.scene.add(whale); const parts=[];model.traverse(n=>{if(n.isMesh&&n.geometry?.attributes.position){n.geometry=n.geometry.clone();const p=n.geometry.attributes.position;parts.push({mesh:n,base:p.array.slice()});}});game.whales.push({group:whale,model,parts,direction:-1,speed:.45,phase:Math.random()*Math.PI*2}); }, undefined, error => console.warn('Whale could not load', error)); } function updateWhales(game,dt,time) { game.whales?.forEach(whale=>{const u=whale;u.group.position.x+=u.direction*u.speed*dt;const floor=game.environment.heightAt(u.group.position.x,-6);u.group.position.y+=(floor+6+Math.sin(time*.3+u.phase)*.3-u.group.position.y)*(1-Math.exp(-dt));for(const part of u.parts){const p=part.mesh.geometry.attributes.position;part.mesh.geometry.computeBoundingBox();const box=part.mesh.geometry.boundingBox,size=box.getSize(new THREE.Vector3());const axis=size.z>size.x?2:0;const span=Math.max(size.x,size.z);for(let i=0;i<p.count;i++){const c=part.base[i*3+axis];const low=axis===2?box.min.z:box.min.x;const weight=1-THREE.MathUtils.smoothstep((c-low)/span,.05,.6);p.array[i*3+1]=part.base[i*3+1]+Math.sin(time*1.8+u.phase+c/span*3)*span*.025*weight;}p.needsUpdate=true;}u.group.rotation.z=Math.sin(time*.22+u.phase)*.025;const left=18,right=65;if(u.group.position.x<left||u.group.position.x>right){u.direction*=-1;u.group.rotation.y=u.direction>0?Math.PI:0;u.group.position.x=clamp(u.group.position.x,left,right);}}); } function prepareSpecialFish(game) { new GLTFLoader().load('/assets/fish/special-fish.glb', gltf => { if (scene3d !== game) return; const model=gltf.scene; model.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true;}}); const box=new THREE.Box3().setFromObject(model), size=box.getSize(new THREE.Vector3()), center=box.getCenter(new THREE.Vector3()); const scale=6.2/Math.max(size.x,size.y,size.z); model.scale.setScalar(scale); model.position.set(-center.x*scale,-center.y*scale,-center.z*scale); const school=new THREE.Group(); school.add(model); school.position.set(game.player.position.x+9,(game.mapId===1?1.8:game.mapId===2?-1.7:game.mapId===3?-5.1:game.mapId===4?-17:-31),-2.8); game.scene.add(school); const mixer=gltf.animations[0]?new THREE.AnimationMixer(model):null; mixer?.clipAction(gltf.animations[0]).play(); game.specialFish.push({group:school,model,mixer,direction:-1,phase:Math.random()*Math.PI*2}); }, undefined, error => console.warn('Special fish could not load', error)); } function updateSpecialFish(game,dt,time) { game.specialFish?.forEach(fish=>{ fish.mixer?.update(dt*.9); fish.group.position.x += fish.direction*.22*dt; fish.group.position.y += Math.sin(time*.55+fish.phase)*.08*dt; fish.group.rotation.y = fish.direction > 0 ? Math.PI : 0; const left=game.player.position.x-24,right=game.player.position.x+24; if(fish.group.position.x<left||fish.group.position.x>right){fish.direction*=-1;fish.group.position.x=clamp(fish.group.position.x,left,right);} }); } function prepareFish(fish) { const urls = ['/assets/fish/fish-a.glb', '/assets/fish/fish-b.glb', '/assets/fish/fish-c.glb']; const playerX = scene3d?.player?.position.x || 0; const spread = 84; fish.forEach((f, index) => { f.visible = index < 18; if (!f.visible) return; const layer = index % 3; const slot = (index + .5) / fish.length; const jitter = (Math.random() - .5) * 3.2; f.userData.homeY = layer === 0 ? 2.25 + Math.random() * 1.35 : layer === 1 ? -.7 + Math.random() * 1.65 : -5.6 + Math.random() * 1.9; f.userData.homeZ = -3.2 + Math.random() * 5.2; f.userData.depthDrift = .04 + Math.random() * .08; f.userData.direction = Math.random() > .5 ? 1 : -1; f.userData.speed = .3 + Math.random() * .28; f.userData.waveSpeed = .75 + Math.random() * .45; f.userData.waveHeight = .08 + Math.random() * .14; f.userData.phase = Math.random() * Math.PI * 2; f.userData.targetYaw = f.userData.direction > 0 ? Math.PI : 0; f.userData.yaw = f.userData.targetYaw; f.position.set(playerX - spread / 2 + slot * spread + jitter, f.userData.homeY, f.userData.homeZ); f.rotation.y = f.userData.targetYaw; }); Promise.all(urls.map(url => new Promise(resolve => new GLTFLoader().load(url, gltf => resolve(gltf.scene), undefined, () => resolve(null))))).then(templates => fish.forEach((f, index) => { if (!f.visible) return; const source = templates[index % templates.length]; if (!source) return; const model = source.clone(true); model.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; if (node.material) node.material = Array.isArray(node.material) ? node.material.map(material => material.clone()) : node.material.clone(); } }); const bounds = new THREE.Box3().setFromObject(model); const size = bounds.getSize(new THREE.Vector3()); const center = bounds.getCenter(new THREE.Vector3()); const scale = .95 / Math.max(size.x, size.y, size.z); model.scale.setScalar(scale); model.position.set(-center.x * scale, -center.y * scale, -center.z * scale); installTailMotion(model, f.userData.phase, .095, 5.2, 'x'); f.clear(); f.add(model); f.userData.model = model; f.rotation.y = f.userData.yaw; f.scale.setScalar(.9 + Math.random() * .22); })); }
function updateFishSchool(game, dt, time) { const center = game.player.position.x; const edgeDistance = 42; game.fish.forEach(f => { if (!f.visible) return; const u = f.userData; f.position.x += u.direction * u.speed * dt; f.position.y = u.homeY + Math.sin(time * u.waveSpeed + u.phase) * u.waveHeight; f.position.z = u.homeZ + Math.sin(time * .42 + u.phase) * u.depthDrift; f.rotation.x = Math.sin(time * .9 + u.phase) * .018; f.rotation.z = Math.cos(time * u.waveSpeed + u.phase) * .035; updateTailMotion(u.model, time); const distance = f.position.x - center; if ((u.direction > 0 && distance >= edgeDistance) || (u.direction < 0 && distance <= -edgeDistance)) { u.direction *= -1; u.targetYaw = u.direction > 0 ? Math.PI : 0; } u.yaw = dampAngle(u.yaw, u.targetYaw, 1 - Math.exp(-4.2 * dt)); f.rotation.y = u.yaw + Math.sin(time * 2.2 + u.phase) * .025; }); }
function dampAngle(current, target, amount) { const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current)); return current + delta * amount; }
function installTailMotion(model, phase, amount, rate, axis = 'x') { if (!model) return; const coordinate = axis === 'z' ? 'transformed.z' : 'transformed.x'; const bendAxis = axis === 'z' ? 'transformed.x' : 'transformed.z'; model.userData.tailShaders = []; model.traverse(node => { if (!node.isMesh || !node.material) return; const materials = Array.isArray(node.material) ? node.material : [node.material]; materials.forEach(material => { const previous = material.onBeforeCompile; material.onBeforeCompile = (shader, renderer) => { previous?.(shader, renderer); shader.uniforms.uSwimTime = { value: 0 }; shader.uniforms.uSwimPhase = { value: phase }; shader.uniforms.uSwimAmount = { value: amount }; shader.uniforms.uSwimRate = { value: rate }; shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float uSwimTime;\nuniform float uSwimPhase;\nuniform float uSwimAmount;\nuniform float uSwimRate;'); shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\nfloat aquaticCoordinate = ${coordinate};\nfloat aquaticTail = 1.0 - smoothstep(-1.15, 0.1, aquaticCoordinate);\nfloat aquaticWave = sin(uSwimTime * uSwimRate + aquaticCoordinate * 4.4 + uSwimPhase);\n${bendAxis} += aquaticTail * aquaticWave * uSwimAmount;\ntransformed.y += aquaticTail * cos(uSwimTime * uSwimRate + aquaticCoordinate * 4.4 + uSwimPhase) * uSwimAmount * 0.18;`); model.userData.tailShaders.push(shader); }; material.needsUpdate = true; }); }); }
function updateTailMotion(model, time) { model?.userData.tailShaders?.forEach(shader => { shader.uniforms.uSwimTime.value = time; }); }
function prepareMarineLife(game) { new GLTFLoader().load('/assets/sea-life/manta-ray.glb', gltf => { if (scene3d !== game) return; const source = gltf.scene; source.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } }); const bounds = new THREE.Box3().setFromObject(source); const size = bounds.getSize(new THREE.Vector3()); const center = bounds.getCenter(new THREE.Vector3()); const baseScale = 4.8 / Math.max(size.x, size.y, size.z); for (let index = 0; index < 2; index++) { const ray = new THREE.Group(); const model = source.clone(true); const scale = baseScale * (index ? .78 : .92); model.scale.setScalar(scale); model.position.set(-center.x * scale, -center.y * scale, -center.z * scale); const wings = []; model.traverse(node => { if (node.isMesh) wings.push(node); }); ray.add(model); const direction = index ? -1 : 1; const targetYaw = direction > 0 ? Math.PI / 2 : -Math.PI / 2; ray.position.set(game.player.position.x + (index ? 7 : -7), index ? .9 : 2.7, -.9 - index * .4); ray.rotation.y = targetYaw; ray.userData = { baseY: ray.position.y, baseZ: ray.position.z, direction, speed: index ? .28 : .22, phase: Math.random() * Math.PI * 2, model, wings: wings.slice(-2), yaw: targetYaw, targetYaw }; game.scene.add(ray); game.marineLife.push(ray); } }, undefined, error => console.warn('Manta ray could not load', error)); }
function updateMarineLife(game, dt, time) { if (!game.marineLife?.length) return; const center = game.player.position.x; game.marineLife.forEach(ray => { const u = ray.userData; ray.position.x += u.direction * u.speed * dt; ray.position.y = u.baseY + Math.sin(time * .8 + u.phase) * .18; ray.position.z = u.baseZ + Math.sin(time * .55 + u.phase) * .12; ray.rotation.z = Math.sin(time * 1.2 + u.phase) * .1; ray.rotation.x = Math.sin(time * .65 + u.phase) * .035; u.model.rotation.x = Math.sin(time * 2.1 + u.phase) * .035; const flap = Math.sin(time * 2.15 + u.phase) * .11; u.wings?.forEach(wing => { wing.rotation.z = flap; }); const edge = center + (u.direction > 0 ? 20 : -20); if ((u.direction > 0 && ray.position.x >= edge) || (u.direction < 0 && ray.position.x <= edge)) { ray.position.x = edge; u.direction *= -1; u.targetYaw = u.direction > 0 ? Math.PI / 2 : -Math.PI / 2; } u.yaw = dampAngle(u.yaw, u.targetYaw, 1 - Math.exp(-2.8 * dt)); ray.rotation.y = u.yaw; }); }
function prepareSharks(game) { new GLTFLoader().load('/assets/shark/shark.glb', gltf => { if (scene3d !== game) return; const model = gltf.scene; model.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; if (node.material) node.material = Array.isArray(node.material) ? node.material.map(material => material.clone()) : node.material.clone(); } }); const bounds = new THREE.Box3().setFromObject(model); const size = bounds.getSize(new THREE.Vector3()); const center = bounds.getCenter(new THREE.Vector3()); const scale = 5.2 / Math.max(size.x, size.y, size.z); model.scale.setScalar(scale); model.position.set(-center.x * scale, -center.y * scale, -center.z * scale); const shark = new THREE.Group(); shark.add(model); const direction = -1; const targetYaw = -Math.PI / 2; const sharkIndex=game.sharks.length; const sharkDepth=(game.mapId===1?-.9:game.mapId===2?-2.4:game.mapId===3?-5.4:game.mapId===4?-17:-31); shark.position.set(game.player.position.x + 7 + sharkIndex * 5, sharkDepth + (sharkIndex % 2) * 1.4, -1.5 - (sharkIndex % 3) * 1.8); shark.rotation.y = targetYaw; shark.userData = { baseY: shark.position.y, baseZ: shark.position.z, direction, speed: .32 + game.mapId * .035, phase: Math.random() * Math.PI * 2, model, yaw: targetYaw, targetYaw }; installTailMotion(model, shark.userData.phase, .22, 4.4, 'z'); game.scene.add(shark); game.sharks.push(shark); }, undefined, error => console.warn('Shark could not load', error)); }
function updateSharks(game, dt, time) { if (!game.sharks?.length) return; const center = game.player.position.x; game.sharks.forEach(shark => { const u = shark.userData; shark.position.x += u.direction * u.speed * dt; shark.position.y = u.baseY + Math.sin(time * .62 + u.phase) * .12; shark.position.z = u.baseZ + Math.sin(time * .42 + u.phase) * .1; shark.rotation.z = Math.sin(time * .55 + u.phase) * .035 + Math.sin(time * 1.35 + u.phase) * .025; shark.rotation.x = Math.sin(time * .44 + u.phase) * .025 + Math.cos(time * 1.05 + u.phase) * .018; u.model.rotation.y = Math.sin(time * .9 + u.phase) * .012; updateTailMotion(u.model, time); const edge = center + (u.direction > 0 ? 38 : -38); if ((u.direction > 0 && shark.position.x >= edge) || (u.direction < 0 && shark.position.x <= edge)) { shark.position.x = edge; u.direction *= -1; u.targetYaw = u.direction > 0 ? Math.PI / 2 : -Math.PI / 2; } u.yaw = dampAngle(u.yaw, u.targetYaw, 1 - Math.exp(-2.4 * dt)); shark.rotation.y = u.yaw; }); }
function makeCoralReal(color) { const palette = [0x8b5b50, 0xa77a4c, 0x5d7e76]; const tint = palette[Math.abs(color) % palette.length]; const g = new THREE.Group(); const material = new THREE.MeshStandardMaterial({ color: tint, roughness: .98 }); for (let i = 0; i < 7; i++) { const height = .65 + Math.random() * 1.25; const stem = new THREE.Mesh(new THREE.CylinderGeometry(.045, .16, height, 12), material); stem.position.set((i - 3) * .17, height * .5, (Math.random() - .5) * .18); stem.rotation.z = (i - 3) * .12 + (Math.random() - .5) * .12; stem.rotation.x = (Math.random() - .5) * .16; stem.castShadow = true; g.add(stem); const tip = new THREE.Mesh(new THREE.SphereGeometry(.09 + Math.random() * .06, 12, 8), material); tip.position.set(stem.position.x + stem.rotation.z * height * .3, height + .02, stem.position.z); tip.scale.set(.8, 1.25, .8); tip.castShadow = true; g.add(tip); } return g; }
function makeSurfaceReal(scene) { const sky = new THREE.Mesh(new THREE.PlaneGeometry(120, 60), new THREE.MeshBasicMaterial({ color: 0x8de1e5, transparent: true, opacity: .18, side: THREE.DoubleSide, depthWrite: false })); sky.position.set(0, 18, -3); scene.add(sky); const surface = new THREE.Mesh(new THREE.PlaneGeometry(120, .28), new THREE.MeshBasicMaterial({ color: 0xd7fff2, transparent: true, opacity: .32, side: THREE.DoubleSide, depthWrite: false })); surface.position.set(0, 6, -1); scene.add(surface); const sun = new THREE.Mesh(new THREE.SphereGeometry(1.15, 32, 20), new THREE.MeshBasicMaterial({ color: 0xffe28a, transparent: true, opacity: .9 })); sun.position.set(-9, 10.5, -2); scene.add(sun); const glow = new THREE.Mesh(new THREE.SphereGeometry(2.6, 32, 20), new THREE.MeshBasicMaterial({ color: 0xffe9a6, transparent: true, opacity: .1, depthWrite: false })); glow.position.copy(sun.position); scene.add(glow); return { sky, surface, sun, glow }; }
function makeAnimatedGrass(scene) { const grass = []; const material = new THREE.MeshStandardMaterial({ color: 0x3f7f69, roughness: 1, side: THREE.DoubleSide }); for (let i = 0; i < 38; i++) { const tuft = new THREE.Group(); tuft.position.set(-42 + Math.random() * 84, -8.8, -.7 + Math.random() * 1.2); for (let blade = 0; blade < 4; blade++) { const height = .45 + Math.random() * .8; const stem = new THREE.Mesh(new THREE.ConeGeometry(.045, height, 5), material); stem.position.set((blade - 1.5) * .08, height * .5, (Math.random() - .5) * .08); stem.rotation.z = (blade - 1.5) * .12; stem.castShadow = true; tuft.add(stem); } scene.add(tuft); grass.push(tuft); } return grass; }
function fixWhaleMotion(game) {
  game.whales?.forEach(whale => {
    if (!whale.motionFixed) { whale.direction *= -1; whale.motionFixed = true; }
    whale.group.rotation.y = whale.direction > 0 ? 0 : Math.PI;
  });
}

function makeScooterBubble() {
  return new THREE.Mesh(
    new THREE.SphereGeometry(.035 + Math.random() * .025, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xe4ffff, transparent: true, opacity: .78, depthWrite: false })
  );
}

function positionScooterAtHands(parent, scooter) {
  if (scooter.userData.gripMount) return;
  // Normalize in an identity parent: the GLB's authored origin is off-center.
  // Keep that correction on the asset, independently of the attachment point.
  scooter.removeFromParent();
  scooter.position.set(0, 0, 0);
  scooter.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(scooter);
  scooter.position.sub(bounds.getCenter(new THREE.Vector3()));
  const mount = new THREE.Group();
  mount.position.set(1.45, -.55, 0);
  // The cage is authored on +X; propulsion points back toward the swimmer.
  mount.rotation.y = Math.PI;
  mount.add(scooter);
  parent.add(mount);
  scooter.userData.gripMount = mount;
  // Left is negative Z in this character's normalized swimming frame.
  parent.userData.scooterGrips = [new THREE.Vector3(1.53, -.51, -.34), new THREE.Vector3(1.53, -.51, .34)];
}

function prepareScooter(game) {
  new GLTFLoader().load('/assets/equipment/sea-scooter.glb', gltf => {
    if (scene3d !== game) return;
    const model = gltf.scene;
    model.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 1.15 / Math.max(size.x, size.y, size.z);
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
    model.rotation.set(0, Math.PI / 2, 0);
    // Hold the scooter in front of the diver, with the spinner pointing forward.
    model.position.x += .55;
    model.position.y -= .12;
    game.player.add(model);
    positionScooterAtHands(game.player, model);
    game.scooter = model;
    game.scooterBubbles = Array.from({ length: 9 }, () => {
      const bubble = makeScooterBubble();
      bubble.visible = false;
      game.scene.add(bubble);
      return bubble;
    });
  }, undefined, error => console.warn('Sea scooter could not load', error));
}

function updateScooterBubbles(dt, time) {
  if (!scene3d?.scooter || !scene3d.scooterBubbles) return;
  const spinner = new THREE.Vector3(-.56, 0, 0);
  const mount = scene3d.scooter.userData.gripMount;
  const worldSpinner = mount.localToWorld(spinner.set(.56, 0, 0));
  scene3d.scooterBubbles.forEach((bubble, index) => {
    const u = bubble.userData;
    u.age = (u.age ?? Math.random() * 1.5) + dt;
    u.life ??= 1.05 + Math.random() * .85;
    if (!bubble.visible || u.age > u.life) {
      u.age = 0;
      u.life = 1.05 + Math.random() * .85;
      u.seed = Math.random() * 10;
      u.speed = .4 + Math.random() * .35;
      bubble.position.copy(worldSpinner);
      bubble.position.x += (Math.random() - .5) * .1;
      bubble.position.y += (Math.random() - .5) * .08;
      bubble.position.z += (Math.random() - .5) * .1;
      bubble.visible = true;
    }
    bubble.position.y += u.speed * dt;
    bubble.position.x += Math.sin(time * 2.4 + (u.seed ?? index)) * .018 * dt;
    bubble.position.z += Math.cos(time * 2.1 + (u.seed ?? index)) * .014 * dt;
    bubble.material.opacity = Math.max(0, .78 * (1 - u.age / u.life));
  });
}

function prepareSunkenShip(game) {
  new GLTFLoader().load('/assets/ships/old-rusted-abandoned-vessel.glb', gltf => {
    if (scene3d !== game) return;
    const model = gltf.scene;
    model.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = 18 / Math.max(size.x, size.y, size.z);
    model.scale.setScalar(scale);
    model.position.set(-center.x * scale, -bounds.min.y * scale, -center.z * scale);
    model.rotation.set(.08, -.18, -.12);
    const ship = new THREE.Group();
    ship.add(model);
    const x = game.mapBounds.max - 4;
    const z = -1.6;
    ship.position.set(x, game.environment.heightAt(x, z) + .12, z);
    ship.userData.deepWater = true;
    game.scene.add(ship);
    game.sunkenShip = ship;
  }, undefined, error => console.warn('Sunken ship could not load', error));
}

function prepareDeepSeaScenery(game) {
  new GLTFLoader().load('/assets/deep-sea/deep-sea-scenery.glb', gltf => {
    if (scene3d !== game) return;
    const source = gltf.scene;
    source.traverse(node => { if (node.name === '_gltfNode_1') node.visible = false; if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
    const bounds = new THREE.Box3().setFromObject(source);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const baseScale = 18 / Math.max(size.x, size.y, size.z);
    const placements = [
      { x: game.mapBounds.min + 8, z: -4.5, scale: .78, yaw: .35 },
      { x: (game.mapBounds.min + game.mapBounds.max) / 2, z: -6.5, scale: 1, yaw: -1.05 },
      { x: game.mapBounds.max - 7, z: -3.8, scale: .88, yaw: .72 }
    ];
    game.deepSeaScenery = placements.map(({ x, z, scale, yaw }) => {
      const model = source.clone(true);
      model.scale.setScalar(baseScale * scale);
      model.position.set(-center.x * baseScale * scale, -bounds.min.y * baseScale * scale, -center.z * baseScale * scale);
      const detail = new THREE.Group();
      detail.add(model);
      detail.position.set(x, game.environment.heightAt(x, z) + .08, z);
      detail.rotation.set(.04, yaw, (yaw - .35) * .08);
      detail.userData.deepWaterDetail = true;
      game.scene.add(detail);
      return detail;
    });
  }, undefined, error => console.warn('Deep-sea scenery could not load', error));
}

function prepareCoralScenery(game) {
  new GLTFLoader().load('/assets/environment/corals.glb', gltf => {
    if (scene3d !== game) return;
    const source = gltf.scene;
    source.traverse(node => {
      if (/WaterSurfaceTest|^wsp/i.test(node.name || '')) node.visible = false;
      if (node.name === '_gltfNode_1') node.visible = false;
      if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; }
    });
    const bounds = new THREE.Box3().setFromObject(source);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const baseScale = 4.6 / Math.max(size.x, size.y, size.z);
    const placements = [
      { x: game.mapBounds.min + 5, z: -1.2, scale: .8, yaw: .3 },
      { x: game.mapBounds.min + 13, z: -3.1, scale: 1.05, yaw: -1.1 },
      { x: (game.mapBounds.min + game.mapBounds.max) / 2 - 4, z: -2.2, scale: .72, yaw: .8 },
      { x: game.mapBounds.max - 10, z: -3.7, scale: 1.15, yaw: -.45 },
      { x: game.mapBounds.max - 3, z: -.8, scale: .66, yaw: 1.4 }
    ];
    game.coralScenery = placements.map(({ x, z, scale, yaw }) => {
      const model = source.clone(true);
      const finalScale = baseScale * scale;
      model.scale.setScalar(finalScale);
      model.position.set(-center.x * finalScale, -bounds.min.y * finalScale, -center.z * finalScale);
      const coral = new THREE.Group();
      coral.add(model);
      coral.position.set(x, game.environment.heightAt(x, z) + .06, z);
      coral.rotation.y = yaw;
      game.scene.add(coral);
      return coral;
    });
    const grassSource = gltf.scene.getObjectByName('_gltfNode_1');
    if (false && grassSource) {
      grassSource.visible = true;
      const grassBounds = new THREE.Box3().setFromObject(grassSource);
      const grassSize = grassBounds.getSize(new THREE.Vector3());
      const grassCenter = grassBounds.getCenter(new THREE.Vector3());
      const grassScale = 1.35 / Math.max(grassSize.x, grassSize.y, grassSize.z);
      game.coralGrass = [];
      for (let i = 0; i < 360; i++) {
        const blade = grassSource.clone(true);
        const scale = grassScale * (.65 + Math.random() * .55);
        blade.scale.setScalar(scale);
        blade.position.set(-grassCenter.x * scale, -grassBounds.min.y * scale, -grassCenter.z * scale);
        const tuft = new THREE.Group();
        tuft.add(blade);
        const x = game.mapBounds.min + 1.5 + Math.random() * (game.mapBounds.max - game.mapBounds.min - 3);
        const z = -3.2 + Math.random() * 5.4;
        tuft.position.set(x, game.environment.heightAt(x, z) + .04, z);
        tuft.rotation.y = Math.random() * Math.PI * 2;
        game.scene.add(tuft);
        game.coralGrass.push(tuft);
      }
      grassSource.visible = false;
    }
  }, undefined, error => console.warn('Coral scenery could not load', error));
}

makeFish = makeFishReal;
makeCoral = makeCoralReal;
makeSurface = makeSurfaceReal;
window.addEventListener('keydown', event => {
  if (!scene3d?.freeCam) return;
  const key = event.key.toLowerCase();
  if (key !== 'q' && key !== 'e') return;
  event.preventDefault();
  event.stopPropagation();
  state.keys[key] = true;
}, true);
document.addEventListener('click', event => {
  const cameraButton = event.target.closest?.('[data-action="camera"]');
  if (!cameraButton) return;
  event.preventDefault();
  event.stopPropagation();
  toggleFreeCam();
}, true);
render();
