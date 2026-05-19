// ============================================================
// CANVAS SETUP
// ============================================================
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ============================================================
// DEV FLAGS
// ============================================================
const DEV_IMMORTAL = false; // [TWEAK] disable death during testing
const DEV_MODE     = false; // [TWEAK] shows hitbox overlays and other debug visuals when true

// ============================================================
// ASSETS — [TWEAK] add/remove entries here to load new images
// ============================================================
const assets = {
  roomBackground:    "RoomImages/DungeonRoom3.png",
  roomCleared:       "RoomImages/ClearedDungeonRoom3.png",
  bossRoom1:         "RoomImages/WardenRoom.png",
  bossRoom1Cleared:  "RoomImages/WardenRoomCleared.png",
  bossRoom2:         "RoomImages/ArchmageRoom.png",
  bossRoom2Cleared:  "RoomImages/ArchmageRoomCleared.png",
  healthBarEmpty:    "UserInterface/EmptyHealthBar.png",
  healthBarFull:     "UserInterface/FullHealthBar.png",
  shopImage:         "UserInterface/MerchantTable.png",
  deathScreen:       "UserInterface/DeathScreen.png",
  menuScreen:        "UserInterface/MenuScreen.png",
  shopPanel:         "UserInterface/ShopPanel.png",
  coinSheet:         "Animations/CoinAnimation.png",
  playerSheet:       "Animations/PlayerWalking.png",
  playerAttackSheet: "Animations/PlayerAttack.png",
  playerSlashSheet:  "Animations/PlayerSlash.png",
  enemyCommonSheet:  "Animations/GoblinEnemy.png",
  enemyTankSheet:    "Animations/OgreEnemy.png", 
  enemyMageSheet:    "Animations/MageEnemy.png",
  fireballSheet:     "Animations/Fireball.png",
  boss2OrbSheet:     "Animations/BossFireball.png",
  enemySlimeSheet:   "Animations/RedSlime.png",
  beamHead:          "Animations/BeamHead.png",
  beamBody:          "Animations/BeamBody.png",
  enemyMinionSheet:  "Animations/SkeletonMinion.png",
  boss1Sheet:        "Animations/WardenBoss.png",
  boss2Sheet:        "Animations/ArchmageBoss.png",
};

// Preload all assets into img{}
const img = {};
const imageLoads = Object.entries(assets).map(([key, src]) => {
  img[key] = new Image();
  img[key].src = src;
  return new Promise(res => { img[key].onload = res; img[key].onerror = res; });
});

// Safe image draw — falls back to a solid color rect if the image failed to load 
// usage: safeDrawImage(img.menuScreen, 0, 0, w, h, "#111111")
function safeDrawImage(image, x, y, w, h, fallbackColor = "#111111") {
  if (image && image.complete && image.naturalWidth > 0) {
    ctx.drawImage(image, x, y, w, h);
  } else {
    ctx.fillStyle = fallbackColor;
    ctx.fillRect(x, y, w, h);
  }
}

// ============================================================
// SOUND SYSTEM
// ============================================================
const BGM_VOLUME = 0.4; // [TWEAK] background music volume

const SFX = {
  bgMusic:          null,
  playerAttack:     'Sounds/SwordHit.wav',
  playerHit:        null,
  playerDeath:      'Sounds/PlayerDeath.wav',
  enemyHit:         'Sounds/EnemyHit.wav',
  enemyDeath:       'Sounds/EnemyDeath.wav',
  coinPickup:       'Sounds/CoinCollect.wav',
  roomCleared:      'Sounds/RoomCleared.wav',
  doorTransition:   'Sounds/RoomFade.wav',
  shopOpen:         'Sounds/ShopOpen.wav',
  shopBuy:          'Sounds/ShopBuy.wav',
  shopFail:         'Sounds/ShopFail.wav',
  bossEnter:        null,
  bossMusic:        'Sounds/BossEnter.mp3',
  bossHit:          'Sounds/EnemyHit.wav',
  bossCharge:       'Sounds/Charge.wav',
  bossAoe:          'Sounds/AOE.wav',
  bossBeamWindup:   'Sounds/BeamWindup.wav',
  bossBeamFire:     'Sounds/LaserShot.wav',
  bossDefeated:     'Sounds/BossDefeat.wav',
  projectileShoot:  null,
  projectileHit:    null,
  menuStart:        null,
  healPickup:       null,
};

// Preload real audio files so they're ready on first play
const audioCache = {};
Object.entries(SFX).forEach(([key, src]) => {
  if (src) {
    const a = new Audio(src);
    a.preload = "auto";
    audioCache[key] = a;
  }
});

// Tiny synth engine — kept as a utility
// freq=pitch, dur=seconds, type=waveform, delay=seconds before start
let audioCtx = null;
function synth(freq, dur, type = "sine", delay = 0) {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.connect(g); g.connect(audioCtx.destination);
  o.type = type; o.frequency.value = freq;
  const t = audioCtx.currentTime + delay;
  g.gain.setValueAtTime(0.18, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.start(t); o.stop(t + dur + 0.05);
}

// Master play function — uses real file if set, null entries play nothing
function playSound(key) {
  if (SFX[key]) {
    const a = audioCache[key] || new Audio(SFX[key]);
    a.currentTime = 0;
    a.play().catch(() => {});
  }
}

// ============================================================
// BACKGROUND MUSIC — loops constantly, pauses during boss music
// ============================================================
let bgMusicNode = null;

function startBGMusic() {
  if (bgMusicNode) return; // already playing
  if (!SFX.bgMusic) return;
  bgMusicNode = new Audio(SFX.bgMusic);
  bgMusicNode.loop   = true;
  bgMusicNode.volume = BGM_VOLUME; // [TWEAK] BGM_VOLUME constant at top of file
  bgMusicNode.play().catch(() => {});
}

function stopBGMusic() {
  if (!bgMusicNode) return;
  bgMusicNode.pause();
  bgMusicNode.currentTime = 0;
  bgMusicNode = null;
}

let bossMusicNode = null;
function startBossMusic() {
  stopBossMusic();
  // Pause BGM while boss music plays
  if (bgMusicNode) bgMusicNode.pause();
  if (!SFX.bossMusic) return;
  bossMusicNode = new Audio(SFX.bossMusic);
  bossMusicNode.loop   = true;
  bossMusicNode.volume = BGM_VOLUME; // [TWEAK] boss music shares the same volume constant
  bossMusicNode.play().catch(() => {});
}
function stopBossMusic() {
  if (bossMusicNode) { bossMusicNode.pause(); bossMusicNode.currentTime = 0; bossMusicNode = null; }
  // Resume BGM after boss music ends
  if (bgMusicNode) bgMusicNode.play().catch(() => {});
}

// ============================================================
// BOSS ROOM HELPERS
// ============================================================
const getBossType       = room => room % 20 === 0 ? "boss2" : room % 10 === 0 ? "boss1" : null;
const isBossRoomNumber  = room => getBossType(room) !== null;
const isShopRoomNumber  = room => room % 5 === 0 && !isBossRoomNumber(room);

// ============================================================
// GAME STATE
// ============================================================
let gameState = "menu"; // "menu" | "playing" | "dead"
let deathScreenTimer = 0;
let roomNumber = 1;
let roomIsCleared = false;
let fadeAlpha = 0, fading = false, fadeDirection = "out";
let isShopRoom = false, isBossRoom = false;
let shopOpen = false, shopHealMessage = "";

// ============================================================
// COIN SPRITE ANIMATION
// [TWEAK] set COIN_FRAME_COUNT to match how many frames are in coinSheet
// [TWEAK] raise COIN_ANIM_SPEED to slow the spin, lower to speed it up
// ============================================================
const COIN_MAGNET_DELAY    = 20;   // [TWEAK] frames before magnet activates after room clear
const COIN_MAGNET_ACCEL    = 0.4;  // [TWEAK] how fast coins accelerate toward player
const COIN_MAGNET_MAX_SPEED = 12;  // [TWEAK] max coin travel speed
let coinMagnetTimer = 0;
const COIN_FRAME_COUNT = 1;        // [TWEAK] update when you add more coin frames
const COIN_ANIM_SPEED  = 6;        // [TWEAK] game-loop ticks per coin frame
let coinAnimFrame = 0, coinAnimTimer = 0;

// Projectile arrays
const projectiles      = [];
const boss2Projectiles = [];

const PLAYER_FRAME_COUNT = 4;
const PLAYER_FRAME_W     = 300; // width of each frame in pixels
const PLAYER_FRAME_H     = 300; // height of each frame in pixels
const PLAYER_ANIM_SPEED  = 8;   // ticks per frame — lower = faster
let playerAnimFrame = 0;
let playerAnimTimer = 0;
let playerIsMoving  = false;

const PLAYER_ROW = { down: 0, left: 1, right: 2, up: 3 };

const ATTACK_FRAME_COUNT = 3;
let attackAnimFrame = 0;
let attackAnimTimer = 0;
const ATTACK_ANIM_SPEED = 6; // [TWEAK] lower = faster attack animation

const TANK_FRAME_COUNT = 4;
const TANK_ANIM_SPEED  = 12;

const COMMON_FRAME_COUNT = 4;  // [TWEAK] match frame count in NormalEnemy.png
const COMMON_ANIM_SPEED  = 12; // [TWEAK] ticks per frame

const MAGE_FRAME_COUNT = 4;
const MAGE_ANIM_SPEED  = 10; // [TWEAK] ticks per frame

const SLIME_FRAME_COUNT = 4;
const SLIME_ANIM_SPEED  = 8; // [TWEAK] ticks per frame

const BOSS1_FRAME_COUNT = 4; // [TWEAK] update when confirmed
const BOSS1_ANIM_SPEED  = 25;  // [TWEAK] ticks per frame

const FIREBALL_FRAME_COUNT = 1;  // [TWEAK] match frame count in Fireball.png
const FIREBALL_ANIM_SPEED  = 6;  // [TWEAK] ticks per frame

// ============================================================
// SLASH VFX ANIMATION
// Plays the PlayerSlash sprite over the hitbox area when attacking.
// The sprite is drawn facing right (0°) and rotated for other directions.
// [TWEAK] SLASH_FRAME_COUNT = number of frames in PlayerSlash.png
// [TWEAK] SLASH_DRAW_SIZE   = how large the slash renders on canvas
// [TWEAK] SLASH_OFFSET      = how far from player center the slash is placed
// ============================================================
const SLASH_FRAME_COUNT = 4;   // [TWEAK] match frame count in PlayerSlash.png
const SLASH_ANIM_SPEED  = 4;   // [TWEAK] ticks per frame — lower = faster slash
const SLASH_DRAW_SIZE   = 110; // [TWEAK] rendered size of the slash sprite (px)
const SLASH_OFFSET      = 48;  // [TWEAK] distance from player center to slash center
let slashAnimFrame = 0;
let slashAnimTimer = 0;

// Rotation per facing direction — sprite is drawn rightward at 0°
const SLASH_ROTATION = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };

// ============================================================
// DEV CONTROL PANEL — listens for messages from a dev panel page
// ============================================================
const devChannel = new BroadcastChannel("dev_controls");
devChannel.onmessage = ({ data: { type, value } }) => {
  if (type === "setHealth")    player.health = Math.min(value, player.maxHealth);
  if (type === "setMaxHealth") { player.maxHealth = value; player.health = value; }
  if (type === "setDamage")    player.damage = value;
  if (type === "setSpeed")     player.speed  = Math.min(value, player.maxSpeed);
  if (type === "setCoins")     coinCount = value;
  if (type === "setRoom")      { roomNumber = value - 1; advanceRoom(); }
  if (type === "godMode")      { player.health = player.maxHealth = 99999; player.damage = 99999; coinCount = 9999; }
  if (type === "heal")         player.health = player.maxHealth;
};

// ============================================================
// PLAYER BASE STATS — [TWEAK] change starting values here
// ============================================================
const playerBase = { damage: 30, maxHealth: 100, speed: 4 };

const player = {
  x: canvas.width / 2.08, y: canvas.height / 1.35,
  width: 50, height: 50,
  speed: 4, maxSpeed: 13, // [TWEAK] maxSpeed caps shop upgrades
  color: "slategray",
  health: 100, maxHealth: 100,
  facing: "right",
  attackTimer: 0, attackCooldown: 0, attackHits: [],
  damage: 30
};

// ============================================================
// KNOCKBACK CONFIG — [TWEAK] force = launch power, decay = how fast it slows
// ============================================================
const knockbackConfig = {
  speeder: { force: 28, decay: 0.72 },
  common:  { force: 14, decay: 0.75 },
  ranged:  { force: 12, decay: 0.74 },
  tank:    { force:  2, decay: 0.65 },
};

// ============================================================
// COIN SYSTEM
// ============================================================
const coins = [];
let coinCount = 0;

// ============================================================
// SHOP SYSTEM
// [TWEAK] shopProximity = how close player must be to open shop
// ============================================================
const shopBox       = { x: canvas.width / 2 - 25, y: canvas.height / 2 - 25, width: 50, height: 50 };
const shopProximity = 150;

// [TWEAK] price scaling — mult grows by 0.5 every 5 rooms
function getShopPrices() {
  const mult = 1 + (Math.floor(roomNumber / 5) * 0.5);
  return {
    damagePrice: Math.floor(9.5 * mult),
    healthPrice: Math.floor(5 * mult),
    speedPrice:  Math.floor(5  * mult),
  };
}

// ============================================================
// BOSS STATE
// ============================================================
let boss = null;
let bossChargeState = "idle", bossChargeTimer = 0, bossChargeCooldown = 0;
let bossChargeTargetX = 0, bossChargeTargetY = 0;
let bossTelegraphFlash = 0, bossChargeDamageDealt = false;
let bossAoeState = "idle", bossAoeRadius = 0;
let bossAoeCenterX = 0, bossAoeCenterY = 0, bossAoeDamageDealt = false;
const bossAoeMaxRadius = 300;
let boss1MinionTimer = 0;
const BOSS1_MINION_INTERVAL = 800; // [TWEAK] minion spawn rate (frames)

let boss2ShootTimer = 0, boss2ShootCooldown = 160;
let boss2RainTimer  = 0, boss2RainCooldown  = 240;
let boss2RainWarnings = [];
let boss2BeamState = "idle", boss2BeamTimer = 0, boss2BeamCooldown = 0;
let boss2BeamX = 0, boss2BeamY = 0, boss2BeamDamageDealt = false;
const BOSS2_RAIN_RADIUS = 100; // [TWEAK] radius of rain puddles

// [TWEAK] charge cooldown range — enraged halves the wait window
const getChargeCooldown = () => {
  const enraged = boss && isBossEnraged();
  return Math.floor(Math.random() * (enraged ? 100 : 140)) + (enraged ? 40 : 80);
};

let boss1Count = 0, boss2Count = 0;

// ============================================================
// BOSS ENRAGE HELPER
// Single source of truth for enrage threshold used by both
// update logic and rendering so they can never drift apart.
// [TWEAK] adjust thresholds here — they apply to both behavior and visuals
// ============================================================
function isBossEnraged() {
  if (!boss) return false;
  if (boss.type === "boss1") return boss.health <= boss.maxHealth * 0.25; // [TWEAK] boss1 enrage threshold
  if (boss.type === "boss2") return boss.health <= boss.maxHealth * 0.50; // [TWEAK] boss2 enrage threshold
  return false;
}

// ============================================================
// BOSS CONFIG
// Boss HP is derived from player.damage at spawn time so every
// encounter takes roughly the same number of hits to clear,
// regardless of how upgraded the player is.
//
// Boss contact/ability damage is scaled from player.maxHealth
// so it stays threatening no matter how much HP the player has.
// ============================================================
const BOSS1_TARGET_HITS = 18; // [TWEAK] hits to beat boss1
const BOSS2_TARGET_HITS = 20; // [TWEAK] hits to beat boss2

function createBoss(bossType) {
  const base = { x: canvas.width / 2 - 60, y: canvas.height / 2 - 200, width: 120, height: 120, type: bossType };

  if (bossType === "boss1") {
    const n   = boss1Count;
    const hp  = Math.floor(player.damage * BOSS1_TARGET_HITS);
    const spd = Math.min(0.8 + n * 0.55, 5.0);
    return { ...base, speed: spd, baseSpeed: spd, color: "#8B0000", enraged: false,
      health: hp, maxHealth: hp,
      damage:     (0.06 + n * 0.015) * player.maxHealth,
      dashDamage: (0.18 + n * 0.04)  * player.maxHealth,
      aoeDamage:  (0.35 + n * 0.025) * player.maxHealth,
      coinDrop: 30 + n * 20, animFrame: 0, animTimer: 0, facingLeft: true, moveDir: "down" };
  }

  const n   = boss2Count;
  const hp  = Math.floor(player.damage * BOSS2_TARGET_HITS);
  const spd = Math.min(1.2 + n * 0.65, 5.5);
  return { ...base, speed: spd, baseSpeed: spd, color: "#4400aa", enraged: false,
    health: hp, maxHealth: hp,
    damage:           (0.05 + n * 0.012) * player.maxHealth,  // contact dps   [TWEAK]
    projectileDamage: (0.10 + n * 0.025) * player.maxHealth,  // orb hit       [TWEAK]
    rainDamage:       (0.03 + n * 0.008) * player.maxHealth,  // puddle dps    [TWEAK]
    beamDamage:       (0.8)  * player.maxHealth,  // beam hit      [TWEAK]
    coinDrop: 50 + n * 30 };
}

// ============================================================
// ENEMY SYSTEM
// [TWEAK] enemy count caps, speed/hp growth per room below 
// ============================================================
const enemies = [];

// Stable ID counter — enemies get a unique ID at spawn so attackHits can reference them safely even if others die mid-swing
let nextEnemyId = 0;

function spawnEnemies() {
  if (isShopRoom || isBossRoom) return;
  const speed = 1.5 + roomNumber * 0.1; // [TWEAK] base enemy speed per room
  const hp    = 20  + roomNumber * 5;   // [TWEAK] base enemy HP per room
  const counts = {
    common:  Math.min(3 + Math.floor(roomNumber * 0.4), 4),
    tank:    Math.min(Math.floor(roomNumber / 4), 3),
    speeder: Math.min(Math.floor(roomNumber / 3), 3),
    ranged:  Math.min(Math.floor(roomNumber / 4), 3),
  };
  const configs = {
    common:  { width: 40, height: 40, speedMult: 1,   hpMult: 1,   color: "crimson"  },
    tank:    { width: 55, height: 55, speedMult: 0.5,  hpMult: 3,   color: "#8B0000"  },
    speeder: { width: 25, height: 25, speedMult: 2,   hpMult: 0.5,  color: "#ff8800"  },
    ranged:  { width: 35, height: 35, speedMult: 0.8, hpMult: 0.9,  color: "#66ccff"  },
  };

  // Pick up to 10 enemies, shuffled
  const list = Object.entries(counts)
    .flatMap(([type, n]) => Array(n).fill(type))
    .sort(() => Math.random() - 0.5)
    .slice(0, 15);

  list.forEach(type => {
    let ex, ey, attempts = 0;
    do {
      ex = Math.random() * (canvas.width  - 550) + 275;
      ey = Math.random() * (canvas.height - 340) + 180;
    } while (Math.sqrt((ex - player.x) ** 2 + (ey - player.y) ** 2) < 200 && ++attempts < 20);
    const c     = configs[type];
    const enemy = {
      id: nextEnemyId++,                             // stable unique ID for hit tracking
      x: ex, y: ey, width: c.width, height: c.height,
      speed: speed * c.speedMult, color: c.color, health: hp * c.hpMult,
      type, knockbackVx: 0, knockbackVy: 0, animFrame: 0, animTimer: 0,
    };
    if (type === "ranged") { enemy.shootTimer = 0; enemy.shootCooldown = 150; }
    enemies.push(enemy);
  });
}

// ============================================================
// DOOR / EXIT
// ============================================================
const getExitDoor = () => ({
  x: canvas.width / 2 - 60,
  y: isBossRoom ? 150 : 120,
  width: 120, height: 40,
});

// ============================================================
// BOSS STATE RESET
// ============================================================
function resetBossState() {
  stopBossMusic();
  boss = null;
  bossChargeState = "idle"; bossChargeTimer = bossChargeCooldown = 0; bossChargeDamageDealt = false;
  bossAoeState    = "idle"; bossAoeRadius   = 0;                      bossAoeDamageDealt    = false;
  boss2BeamState  = "idle"; boss2BeamTimer  = boss2ShootTimer = 0;
  boss2RainTimer  = boss2RainCooldown;
  boss1MinionTimer = BOSS1_MINION_INTERVAL;
  boss2BeamDamageDealt = false;
  boss2Projectiles.length = 0;
  boss2RainWarnings = [];
}

// ============================================================
// ROOM TRANSITION
// ============================================================
function advanceRoom() {
  roomNumber++;
  roomIsCleared = false; shopOpen = false; shopHealMessage = "";
  resetBossState();
  isBossRoom = isBossRoomNumber(roomNumber);
  isShopRoom = isShopRoomNumber(roomNumber);

  if (isShopRoom) {
    roomIsCleared = true;
    const heal = player.maxHealth * 0.5; // [TWEAK] HP restored on entering a shop room
    player.health = Math.min(player.maxHealth, player.health + heal);
    shopHealMessage = "You were healed for " + Math.floor(heal) + " HP!";
    playSound("healPickup");
  }
  if (isBossRoom) {
    const bossType = getBossType(roomNumber);
    boss = createBoss(bossType);
    if (bossType === "boss1") boss1Count++;
    if (bossType === "boss2") boss2Count++;
    bossChargeCooldown = 60;
    boss2BeamCooldown  = 180;
    playSound("bossEnter"); // one-shot entrance sting
    startBossMusic();       // looping BGM (if SFX.bossMusic is set)
  }

  player.x = canvas.width  / 2.08;
  player.y = canvas.height / 1.35;
  enemies.length = coins.length = projectiles.length = 0;
  coinMagnetTimer = 0;
  spawnEnemies();
}

// ============================================================
// RESTART
// ============================================================
function restartGame() {
  startBGMusic(); // start looping background music on game start
  Object.assign(player, {
    x: canvas.width / 2.08, y: canvas.height / 1.35,
    health: 100, maxHealth: 100, damage: 30, speed: 4,
    attackTimer: 0, attackCooldown: 0, attackHits: [],
  });
  roomNumber = 1;
  roomIsCleared = isShopRoom = isBossRoom = shopOpen = false;
  shopHealMessage = "";
  coinCount = 0;
  fading = false; fadeAlpha = 0;
  boss1Count = boss2Count = 0;
  nextEnemyId = 0;
  resetBossState();
  enemies.length = coins.length = projectiles.length = 0;
  coinMagnetTimer = 0;
  spawnEnemies();
  gameState = "playing";
}

// ============================================================
// INPUT
// ============================================================
const keys = {};

// Normalize all keys to lowercase so CapsLock doesn't cause stuck movement
window.addEventListener("keydown", e => {
  const key = e.key.toLowerCase();
  keys[key] = true;

  // Prevent Space and arrow keys from scrolling the page during gameplay
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
    e.preventDefault();
  }
});
window.addEventListener("keyup", e => { keys[e.key.toLowerCase()] = false; });

// Clear ALL held keys when the window loses focus (Tab, Alt+Tab, etc.)
window.addEventListener("blur", () => { Object.keys(keys).forEach(k => keys[k] = false); });

window.addEventListener("mousedown", e => { if (e.button === 0) keys["click"] = true;  });
window.addEventListener("mouseup",   e => { if (e.button === 0) keys["click"] = false; });

window.addEventListener("keydown", e => {
  const key = e.key.toLowerCase();
  if (gameState === "menu" && key === " ") { playSound("menuStart"); restartGame(); return; }
  if (gameState === "dead" && deathScreenTimer <= 0 && key === " ") restartGame();
});

window.addEventListener("keydown", e => {
  if (!shopOpen) return;
  const { damagePrice, healthPrice, speedPrice } = getShopPrices();
  if (e.key === "1") {
    if (coinCount >= damagePrice) { coinCount -= damagePrice; player.damage = Math.floor(player.damage * 1.25); playSound("shopBuy"); }
    else playSound("shopFail");
  }
  if (e.key === "2") {
    if (coinCount >= healthPrice) { coinCount -= healthPrice; player.maxHealth = Math.floor(player.maxHealth * 1.25); player.health = player.maxHealth; playSound("shopBuy"); }
    else playSound("shopFail");
  }
  if (e.key === "3") {
    if (coinCount >= speedPrice && player.speed < player.maxSpeed) { coinCount -= speedPrice; player.speed = Math.min(parseFloat((player.speed * 1.25).toFixed(2)), player.maxSpeed); playSound("shopBuy"); }
    else playSound("shopFail");
  }
});

canvas.addEventListener("click", e => { if (gameState === "dead" && deathScreenTimer <= 0) restartGame(); });

// ============================================================
// COLLISION HELPERS
// ============================================================
const rectsOverlap = (a, b) =>
  a.x < b.x + b.width  && a.x + a.width  > b.x &&
  a.y < b.y + b.height && a.y + a.height > b.y;

function contactDamage(entity, dmg) {
  const dx = entity.x - player.x, dy = entity.y - player.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  entity.x += (dx / dist) * (entity.speed + (entity === boss ? 4 : 3));
  entity.y += (dy / dist) * (entity.speed + (entity === boss ? 4 : 3));
  player.health -= dmg;
}

// ============================================================
// UPDATE
// ============================================================
function update() {
  if (gameState === "menu") return;
  if (gameState === "dead") { if (deathScreenTimer > 0) deathScreenTimer--; return; }

  if (!fading) {
    if (keys["w"] || keys["arrowup"])    player.y -= player.speed;
    if (keys["s"] || keys["arrowdown"])  player.y += player.speed;
    if (keys["a"] || keys["arrowleft"])  player.x -= player.speed;
    if (keys["d"] || keys["arrowright"]) player.x += player.speed;

    const moving = keys["w"] || keys["arrowup"]  || keys["s"] || keys["arrowdown"]
                || keys["a"] || keys["arrowleft"] || keys["d"] || keys["arrowright"];

    if (moving) {
      playerIsMoving = true;
      if (++playerAnimTimer >= PLAYER_ANIM_SPEED) {
        playerAnimTimer = 0;
        playerAnimFrame = (playerAnimFrame + 1) % PLAYER_FRAME_COUNT;
      }
    } else {
      playerIsMoving  = false;
      playerAnimFrame = 0;
      playerAnimTimer = 0;
    }

    // [TWEAK] player movement bounds differ in boss rooms vs normal rooms
    if (isBossRoom) {
      player.x = Math.max(160, Math.min(canvas.width  - player.width  - 160, player.x));
      player.y = Math.max(180, Math.min(canvas.height - player.height -  80, player.y));
    } else {
      player.x = Math.max( 90, Math.min(canvas.width  - player.width  -  90, player.x));
      player.y = Math.max(100, Math.min(canvas.height - player.height -  70, player.y));
    }

    if (!isShopRoom) {
      const prevHealth = player.health;

      updateEnemies();
      updateAttack();
      updateBoss();

      // Attack animation
      if (player.attackTimer > 0) {
        if (++attackAnimTimer >= ATTACK_ANIM_SPEED) {
          attackAnimTimer = 0;
          attackAnimFrame = Math.min(attackAnimFrame + 1, ATTACK_FRAME_COUNT - 1);
        }
      } else {
        attackAnimFrame = 0;
        attackAnimTimer = 0;
      }

      // Slash VFX frame advance — runs for the full attackTimer duration
      if (player.attackTimer > 0) {
        if (++slashAnimTimer >= SLASH_ANIM_SPEED) {
          slashAnimTimer = 0;
          if (slashAnimFrame < SLASH_FRAME_COUNT - 1) slashAnimFrame++;
        }
      } else {
        slashAnimFrame = 0;
        slashAnimTimer = 0;
      }

      // Player hit / death sounds
      if (player.health < prevHealth) playSound("playerHit");

      if (DEV_IMMORTAL) {
        player.health = Math.max(1, player.health);
      } else {
        player.health = Math.max(0, player.health);
        if (player.health <= 0) { playSound("playerDeath"); gameState = "dead"; deathScreenTimer = 40; return; }
      }

      updateCoins();
      if (!isBossRoom && enemies.length === 0 && !roomIsCleared) {
        roomIsCleared = true;
        playSound("roomCleared");
      }
    }

    if (isShopRoom) {
      const px = player.x + player.width  / 2, py = player.y + player.height / 2;
      const sx = shopBox.x + shopBox.width / 2, sy = shopBox.y + shopBox.height / 2;
      const wasShopOpen = shopOpen;
      shopOpen = Math.sqrt((px - sx) ** 2 + (py - sy) ** 2) < shopProximity;
      if (shopOpen && !wasShopOpen) playSound("shopOpen");
    }

    if (roomIsCleared && rectsOverlap(player, getExitDoor())) {
      playSound("doorTransition");
      fading = true; fadeDirection = "out";
    }
  }

  if (fading) {
    if (fadeDirection === "out") {
      fadeAlpha += 0.05;
      if (fadeAlpha >= 1) { fadeAlpha = 1; advanceRoom(); fadeDirection = "in"; }
    } else {
      fadeAlpha -= 0.05;
      if (fadeAlpha <= 0) { fadeAlpha = 0; fading = false; }
    }
  }
}

// ============================================================
// ENEMY UPDATE
// ============================================================
function updateEnemies() {
  enemies.forEach(enemy => {
    // Apply and decay knockback on both axes
    for (const axis of ["knockbackVx", "knockbackVy"]) {
      if (enemy[axis]) {
        const move = axis === "knockbackVx" ? "x" : "y";
        enemy[move] += enemy[axis];
        enemy[axis] *= knockbackConfig[enemy.type]?.decay ?? 0.75;
        if (Math.abs(enemy[axis]) < 0.1) enemy[axis] = 0;
      }
    }

    if (enemy.type === "tank") {
      if (++enemy.animTimer >= TANK_ANIM_SPEED) {
        enemy.animTimer = 0;
        enemy.animFrame = (enemy.animFrame + 1) % TANK_FRAME_COUNT;
      }
    } else if (enemy.type === "common") {
      if (++enemy.animTimer >= COMMON_ANIM_SPEED) {
        enemy.animTimer = 0;
        enemy.animFrame = (enemy.animFrame + 1) % COMMON_FRAME_COUNT;
      }
    }

    else if (enemy.type === "ranged") {
      if (++enemy.animTimer >= MAGE_ANIM_SPEED) {
        enemy.animTimer = 0;
        enemy.animFrame = (enemy.animFrame + 1) % MAGE_FRAME_COUNT;
      }
    }

    else if (enemy.type === "speeder") {
      if (++enemy.animTimer >= SLIME_ANIM_SPEED) {
        enemy.animTimer = 0;
        enemy.animFrame = (enemy.animFrame + 1) % SLIME_FRAME_COUNT;
      }
    }

    const dx   = player.x - enemy.x, dy = player.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    if (enemy.type === "ranged") {
      const pref = 300;
      if (dist > pref + 40) { enemy.x += (dx / dist) * enemy.speed; enemy.y += (dy / dist) * enemy.speed; }
      else if (dist < pref - 40) {
        enemy.x -= (dx / dist) * enemy.speed;
        enemy.y -= (dy / dist) * enemy.speed;
        enemy.x = Math.max(260, Math.min(canvas.width  - enemy.width  - 260, enemy.x));
        enemy.y = Math.max(170, Math.min(canvas.height - enemy.height - 140, enemy.y));
      }
      if (--enemy.shootTimer <= 0) {
        enemy.shootTimer = enemy.shootCooldown;
        projectiles.push({ x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2,
          vx: (dx / dist) * 4, vy: (dy / dist) * 4, width: 10, height: 10,
          animFrame: 0, animTimer: 0, angle: Math.atan2(dy, dx) });
        playSound("projectileShoot");
      }
    } else {
      enemy.x += (dx / dist) * enemy.speed;
      enemy.y += (dy / dist) * enemy.speed;
    }

    if (enemy.type !== "ranged" && rectsOverlap(player, enemy)) {
      // [TWEAK] melee contact damage per type, scales with room
      const dmg = enemy.type === "tank"    ? 1.5 + roomNumber * 0.2
                : enemy.type === "speeder" ? 0.2 + roomNumber * 0.05
                :                           0.5 + roomNumber * 0.1;
      contactDamage(enemy, dmg);
    }
  });

  // Ranged enemy projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) { projectiles.splice(i, 1); continue; }
    if (rectsOverlap(p, player)) {
      player.health -= 8 + roomNumber * 0.4; // [TWEAK] ranged projectile damage
      projectiles.splice(i, 1);
      playSound("projectileHit");
    }
  }
}

// ============================================================
// BOSS UPDATE
// ============================================================
function updateBoss() {
  if (!boss) return;
  if (boss.type === "boss1") updateBoss1();
  if (boss.type === "boss2") updateBoss2();

  // Boss1 minion spawning
  if (boss.type === "boss1" && boss.health > 0 && --boss1MinionTimer <= 0) {
    boss1MinionTimer = BOSS1_MINION_INTERVAL;
    const count = Math.floor(Math.random() * 8) + 8; // [TWEAK] minion wave size (8–15)
    for (let i = 0; i < count; i++) {
      let ex, ey, attempts = 0;
      do {
        ex = Math.random() * (canvas.width  - 550) + 275;
        ey = Math.random() * (canvas.height - 340) + 180;
      } while (Math.sqrt((ex - player.x) ** 2 + (ey - player.y) ** 2) < 150 && ++attempts < 20);
      enemies.push({
        id: nextEnemyId++,
        x: ex, y: ey, width: 25, height: 25,
        speed: (1.5 + roomNumber * 0.1) * 0.5, color: "#cc4400",
        health: 15 + roomNumber * 3, type: "common", isMinion: true, knockbackVx: 0, knockbackVy: 0, animFrame: 0, animTimer: 0,
      });
    }
  }

  if (boss.health <= 0) {
    playSound("bossDefeated");
    for (let i = 0; i < boss.coinDrop; i++)
      coins.push({ x: boss.x + Math.random() * boss.width, y: boss.y + Math.random() * boss.height, width: 10, height: 10, vx: 0, vy: 0 });
    player.health = player.maxHealth; // full heal on boss kill
    resetBossState();
    roomIsCleared = true;
  }
}

function updateBoss1() {
  // Advance animation every tick
  if (++boss.animTimer >= BOSS1_ANIM_SPEED) {
    boss.animTimer = 0;
    boss.animFrame = (boss.animFrame + 1) % BOSS1_FRAME_COUNT;
  }

  // Enrage: apply multipliers exactly once when threshold is crossed
  if (!boss.enraged && isBossEnraged()) {
    boss.enraged  = true;
    boss.speed    = boss.baseSpeed * 4;
    boss.damage  *= 2;
    boss.color    = "#ff0000";
  }

  if (bossChargeState === "idle" && bossAoeState === "idle") {
    if (--bossChargeCooldown <= 0) {
      const dx   = player.x + player.width  / 2 - (boss.x + boss.width  / 2);
      const dy   = player.y + player.height / 2 - (boss.y + boss.height / 2);
      if (Math.sqrt(dx * dx + dy * dy) < 250) { // close range → AOE instead of charge
        bossAoeState      = "expanding"; bossAoeRadius = 0;
        bossAoeCenterX    = boss.x + boss.width  / 2;
        bossAoeCenterY    = boss.y + boss.height / 2;
        bossAoeDamageDealt = false;
        playSound("bossAoe");
      } else {
        bossChargeTargetX  = player.x; bossChargeTargetY = player.y;
        bossChargeState    = "telegraphing"; bossChargeTimer = 28;
        bossTelegraphFlash = 0; bossChargeDamageDealt = false;
        playSound("bossCharge");
      }
      bossChargeCooldown = getChargeCooldown();
    }
  }

  if (bossChargeState === "telegraphing") {
    bossTelegraphFlash++;
    if (--bossChargeTimer <= 0) { bossChargeState = "dashing"; bossChargeTimer = 30; }
  }

  if (bossChargeState === "dashing") {
    const dx   = bossChargeTargetX - boss.x, dy = bossChargeTargetY - boss.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    boss.x += (dx / dist) * 60; boss.y += (dy / dist) * 60;
    boss.facingLeft = player.x < (boss.x + boss.width / 2); // [TWEAK] dash speed
    if (!bossChargeDamageDealt && rectsOverlap(player, boss)) {
      player.health -= boss.dashDamage;
      bossChargeDamageDealt = true; bossChargeState = "cooldown"; bossChargeTimer = 40;
    }
    if (--bossChargeTimer <= 0) { bossChargeState = "cooldown"; bossChargeTimer = 40; }
  }

  if (bossChargeState === "cooldown" && --bossChargeTimer <= 0) bossChargeState = "idle";

  if (bossAoeState === "expanding") {
    bossAoeRadius += 4; // [TWEAK] AOE expand speed
    if (!bossAoeDamageDealt) {
      const px = player.x + player.width  / 2, py = player.y + player.height / 2;
      const d  = Math.sqrt((px - bossAoeCenterX) ** 2 + (py - bossAoeCenterY) ** 2);
      if (bossAoeRadius >= d - 20 && bossAoeRadius <= d + 20) {
        player.health -= boss.aoeDamage;
        bossAoeDamageDealt = true;
      }
    }
    if (bossAoeRadius >= bossAoeMaxRadius) { bossAoeState = "idle"; bossAoeRadius = 0; bossChargeCooldown = getChargeCooldown(); }
  }

  if ((bossChargeState === "idle" || bossChargeState === "cooldown") && bossAoeState === "idle") {
    const dx   = player.x - boss.x, dy = player.y - boss.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    boss.x += (dx / dist) * boss.speed; boss.y += (dy / dist) * boss.speed;
    if (Math.abs(dx) >= Math.abs(dy)) {
      boss.moveDir   = "horizontal";
      boss.facingLeft = dx < 0;
    } else {
      boss.moveDir = dy < 0 ? "up" : "down";
    }
  }

  if (bossChargeState !== "dashing" && rectsOverlap(player, boss)) contactDamage(boss, boss.damage);
}

function updateBoss2() {
  // Enrage: apply multipliers exactly once when threshold is crossed
  if (!boss.enraged && isBossEnraged()) {
    boss.enraged = true;
    boss.speed   = boss.baseSpeed * 2;
    boss.damage *= 2;   // [TWEAK] enrage contact damage multiplier
    boss.color   = "#7700ff";
  }

  // Advance boss2 sprite animation
  if (!boss.animFrame) boss.animFrame = 0;
  if (!boss.animTimer) boss.animTimer = 0;
  if (++boss.animTimer >= 40 ) { // [TWEAK] ticks per frame
    boss.animTimer = 0;
    boss.animFrame = (boss.animFrame + 1) % 4; // [TWEAK] match cols in sheet
  }

  // Update facing direction for sprite row selection
  const facingDx = player.x - boss.x, facingDy = player.y - boss.y;
  if (Math.abs(facingDx) >= Math.abs(facingDy)) {
    boss.moveDir    = "right";
    boss.facingLeft = facingDx < 0;
  } else {
    boss.moveDir = facingDy < 0 ? "up" : "down";
  }

  const dx   = player.x + player.width  / 2 - (boss.x + boss.width  / 2);
  const dy   = player.y + player.height / 2 - (boss.y + boss.height / 2);
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const pref = 300; // [TWEAK] preferred distance boss2 tries to maintain

  if (boss2BeamState === "idle" || boss2BeamState === "stunned") {
    if (dist > pref + 50) { boss.x += (dx / dist) * boss.speed; boss.y += (dy / dist) * boss.speed; }
    else if (dist < pref - 50) { boss.x -= (dx / dist) * boss.speed; boss.y -= (dy / dist) * boss.speed; }
    boss.x = Math.max(260, Math.min(canvas.width  - boss.width  - 260, boss.x));
    boss.y = Math.max(170, Math.min(canvas.height - boss.height - 140, boss.y));
  }

  if (rectsOverlap(player, boss)) contactDamage(boss, boss.damage);

  if (boss2BeamState !== "firing" && boss2BeamState !== "windup" && --boss2ShootTimer <= 0) {
    boss2ShootTimer = boss2ShootCooldown;
    const base = Math.atan2(dy, dx);
    [-0.2, 0, 0.2].forEach(offset => { // [TWEAK] spread angles for triple shot
      const a = base + offset;
      boss2Projectiles.push({ x: boss.x + boss.width / 2, y: boss.y + boss.height / 2,
        vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, width: 22, height: 22, type: "normal" }); // [TWEAK] projectile speed (5)
    });
  }

  if (--boss2RainTimer <= 0) {
    boss2RainTimer = boss2RainCooldown;
    const count = 5 + Math.floor(roomNumber / 10); // [TWEAK] rain puddle count scales with room
    for (let i = 0; i < count; i++)
      boss2RainWarnings.push({
        x: Math.random() * (canvas.width  - 550) + 275,
        y: Math.random() * (canvas.height - 340) + 180,
        timer: 40, radius: BOSS2_RAIN_RADIUS,
      });
  }

  for (let i = boss2RainWarnings.length - 1; i >= 0; i--) {
    if (--boss2RainWarnings[i].timer <= 0) {
      const w = boss2RainWarnings[i];
      boss2Projectiles.push({ x: w.x, y: w.y, vx: 0, vy: 0,
        width: w.radius * 2, height: w.radius * 2, type: "rain", linger: 40 }); // [TWEAK] rain puddle linger time
      boss2RainWarnings.splice(i, 1);
    }
  }

  // Beam windup → firing → stun cycle
  if (boss2BeamState === "idle" && --boss2BeamCooldown <= 0) {
    boss2BeamState        = "windup"; boss2BeamTimer = 25; // [TWEAK] beam windup duration
    boss2BeamX            = player.x + player.width  / 2;
    boss2BeamY            = player.y + player.height / 2;
    boss2BeamDamageDealt  = false;
    playSound("bossBeamWindup");
  }
  if (boss2BeamState === "windup" && --boss2BeamTimer <= 0) {
    boss2BeamState = "firing"; boss2BeamTimer = 20;
    playSound("bossBeamFire");
  }
  if (boss2BeamState === "firing") {
    if (!boss2BeamDamageDealt) {
      const bcx   = boss.x + boss.width / 2, bcy = boss.y + boss.height / 2;
      const angle = Math.atan2(boss2BeamY - bcy, boss2BeamX - bcx);
      const BEAM_HITBOX_W = 80; // [TWEAK] beam hitbox width — set to match visual laser width
      const BEAM_HITBOX_LEN = 2000;
      const cos = Math.cos(-angle), sin = Math.sin(-angle);
      const corners = [
        [player.x,               player.y              ],
        [player.x + player.width, player.y              ],
        [player.x,               player.y + player.height],
        [player.x + player.width, player.y + player.height],
      ];
      const BEAM_HEAD_RADIUS = 120; // [TWEAK] radius of the burst circle at the beam tip (player-side end)
      // Check circular burst at the beam head sprite position (headW/2 along beam from boss center)
      const HEAD_OFFSET = 150; // [TWEAK] distance from boss center to burst circle center — match headW/2 in renderBoss
      const headCX = bcx + Math.cos(angle) * HEAD_OFFSET;
      const headCY = bcy + Math.sin(angle) * HEAD_OFFSET;
      const headHit = corners.some(([cx, cy]) => {
        return Math.sqrt((cx - headCX) ** 2 + (cy - headCY) ** 2) < BEAM_HEAD_RADIUS;
      });
      // Check rectangular beam body
      const bodyHit = corners.some(([cx, cy]) => {
        const lx = cx - bcx, ly = cy - bcy;
        const rotX = lx * cos - ly * sin;
        const rotY = lx * sin + ly * cos;
        return rotX > 0 && rotX < BEAM_HITBOX_LEN && Math.abs(rotY) < BEAM_HITBOX_W / 2;
      });
      if (headHit || bodyHit) { player.health -= boss.beamDamage; boss2BeamDamageDealt = true; }
    }
    if (--boss2BeamTimer <= 0) {
      boss2BeamState    = "stunned"; boss2BeamTimer = 180; // [TWEAK] stun duration after beam
      boss2BeamCooldown = isBossEnraged() ? 300 : 480;
    }
  }

  if (boss2BeamState === "stunned" && --boss2BeamTimer <= 0) boss2BeamState = "idle";

  for (let i = boss2Projectiles.length - 1; i >= 0; i--) {
    const p = boss2Projectiles[i];
    if (p.type === "rain") {
      const d = Math.sqrt((player.x + player.width / 2 - p.x) ** 2 + (player.y + player.height / 2 - p.y) ** 2);
      if (d < BOSS2_RAIN_RADIUS + 25) player.health -= boss.rainDamage + roomNumber * 0.05;
      if (--p.linger <= 0) boss2Projectiles.splice(i, 1);
      continue;
    }
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) { boss2Projectiles.splice(i, 1); continue; }
    if (rectsOverlap(p, player)) { player.health -= boss.projectileDamage + roomNumber * 0.3; boss2Projectiles.splice(i, 1); }
  }
}

// ============================================================
// ATTACK UPDATE
// ============================================================
function updateAttack() {
  // Update facing based on movement
  if (keys["w"] || keys["arrowup"])    player.facing = "up";
  if (keys["s"] || keys["arrowdown"])  player.facing = "down";
  if (keys["a"] || keys["arrowleft"])  player.facing = "left";
  if (keys["d"] || keys["arrowright"]) player.facing = "right";

  if ((keys[" "] || keys["click"]) && player.attackCooldown <= 0) {
    player.attackTimer    = 18; // [TWEAK] attack active hitbox duration (frames)
    player.attackCooldown = 30; // [TWEAK] attack cooldown (frames)
    player.attackHits     = [];
    slashAnimFrame = 0;
    slashAnimTimer = 0;
    playSound("playerAttack");
  }
  if (player.attackTimer   > 0) player.attackTimer--;
  if (player.attackCooldown > 0) player.attackCooldown--;

  if (player.attackTimer > 0) {
    const attackBox = getAttackBox();

    // Use enemy.id instead of array index — safe even if other enemies die mid-swing
    enemies.forEach(enemy => {
      if (rectsOverlap(attackBox, enemy) && !player.attackHits.includes(enemy.id)) {
        enemy.health -= player.damage;
        player.attackHits.push(enemy.id);
        playSound("enemyHit");
        const kb    = knockbackConfig[enemy.type] ?? knockbackConfig.common;
        const kbDx  = enemy.x - player.x, kbDy = enemy.y - player.y;
        const kbDist = Math.sqrt(kbDx * kbDx + kbDy * kbDy) || 1;
        enemy.knockbackVx = (kbDx / kbDist) * kb.force;
        enemy.knockbackVy = (kbDy / kbDist) * kb.force;
      }
    });

    if (boss && rectsOverlap(attackBox, boss) && !player.attackHits.includes("boss")) {
      boss.health -= player.damage;
      player.attackHits.push("boss");
      playSound("bossHit");
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].health <= 0) {
        playSound("enemyDeath");
        // [TWEAK] coin drops per enemy type
        const drop = enemies[i].type === "tank" ? 3 : enemies[i].type === "ranged" ? 2 : 1;
        for (let c = 0; c < drop; c++)
          coins.push({ x: enemies[i].x + Math.random() * enemies[i].width, y: enemies[i].y + Math.random() * enemies[i].height, width: 10, height: 10, vx: 0, vy: 0 });
        enemies.splice(i, 1);
      }
    }
  }
}

// [TWEAK] attack hitbox size (hw x hh) and offsets per direction
function getAttackBox() {
  const hw = 60, hh = 60;
  const dirs = {
    right: { x: player.x + player.width,  y: player.y - 5  },
    left:  { x: player.x - hw,            y: player.y - 5  },
    down:  { x: player.x - 5,             y: player.y + player.height },
    up:    { x: player.x - 5,             y: player.y - hh },
  };
  return { ...dirs[player.facing], width: hw, height: hh };
}

// ============================================================
// COIN UPDATE — collection range is 60px
// ============================================================
function updateCoins() {
  const px = player.x + player.width  / 2;
  const py = player.y + player.height / 2;

  if (roomIsCleared && coinMagnetTimer < COIN_MAGNET_DELAY) coinMagnetTimer++;

  const magnetActive = roomIsCleared && coinMagnetTimer >= COIN_MAGNET_DELAY;

  for (let i = coins.length - 1; i >= 0; i--) {
    const c  = coins[i];
    const cx = c.x + 5, cy = c.y + 5;
    const dx = px - cx, dy = py - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    if (magnetActive) {
      const targetSpd = Math.min(COIN_MAGNET_MAX_SPEED, COIN_MAGNET_ACCEL * dist);
      c.vx = (dx / dist) * targetSpd;
      c.vy = (dy / dist) * targetSpd;
      c.x += c.vx;
      c.y += c.vy;

      const newDist = Math.sqrt((px - (c.x + 5)) ** 2 + (py - (c.y + 5)) ** 2);
      if (newDist < 60) { // [TWEAK] coin pickup radius
        coinCount++;
        coins.splice(i, 1);
        playSound("coinPickup");
        continue;
      }
    }
  }
}

// ============================================================
// RENDER
// ============================================================
function render() {
  if (gameState === "menu") {
    safeDrawImage(img.menuScreen, 0, 0, canvas.width, canvas.height, "#0d0d1a");
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, canvas.height - 80, canvas.width, 80);
    const pulse = 0.6 + Math.sin(Date.now() / 500) * 0.4;
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(255,220,100,${pulse})`;
    ctx.font = "bold 26px Courier New";
    ctx.fillText("Press SPACE to Play", canvas.width / 2, canvas.height - 30);
    ctx.restore();
    return;
  }

  // Background — chooses cleared variant when room is done
  const bossType = getBossType(roomNumber);
  const bgImage  = bossType === "boss1" ? (roomIsCleared ? img.bossRoom1Cleared : img.bossRoom1)
                 : bossType === "boss2" ? (roomIsCleared ? img.bossRoom2Cleared : img.bossRoom2)
                 :                        (roomIsCleared ? img.roomCleared       : img.roomBackground);
  safeDrawImage(bgImage, 0, 0, canvas.width, canvas.height, "#1a1a1a");

  // Coin sprite animation
  if (++coinAnimTimer >= COIN_ANIM_SPEED) { coinAnimTimer = 0; coinAnimFrame = (coinAnimFrame + 1) % COIN_FRAME_COUNT; }

  // Draw coins first so everything renders on top
  coins.forEach(c => {
    if (img.coinSheet.complete && img.coinSheet.naturalWidth > 0) {
      const frameW   = img.coinSheet.naturalWidth / COIN_FRAME_COUNT;
      const frameH   = img.coinSheet.naturalHeight;
      const drawSize = 28; // [TWEAK] coin render size on canvas
      ctx.drawImage(img.coinSheet, coinAnimFrame * frameW, 0, frameW, frameH, c.x - drawSize / 2, c.y - drawSize / 2, drawSize, drawSize);
    } else {
      ctx.fillStyle = "#FFD700";
      ctx.fillRect(c.x, c.y, c.width, c.height);
    }
  });

  // Enemies and boss drawn above coins
  enemies.forEach(e => {
    if (e.type === "tank" && img.enemyTankSheet.complete && img.enemyTankSheet.naturalWidth > 0) {
      const frameW  = img.enemyTankSheet.naturalWidth / TANK_FRAME_COUNT;
      const frameH  = img.enemyTankSheet.naturalHeight;
      const drawW   = e.width  + 80;
      const drawH   = e.height + 80;
      const centerX = e.x + e.width  / 2;
      const centerY = e.y + e.height / 2;
      ctx.save();
      const facingLeft = player.x < e.x;
      if (facingLeft) {
        ctx.translate(centerX, centerY);
        ctx.scale(-1, 1);
        ctx.drawImage(img.enemyTankSheet,
          e.animFrame * frameW, 0, frameW, frameH,
          -drawW / 2, -drawH / 2, drawW, drawH);
      } else {
        ctx.drawImage(img.enemyTankSheet,
          e.animFrame * frameW, 0, frameW, frameH,
          centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
      }
      ctx.restore();
    } else if (e.type === "common" && e.isMinion && img.enemyMinionSheet.complete && img.enemyMinionSheet.naturalWidth > 0) {
    const frameW  = img.enemyMinionSheet.naturalWidth / SLIME_FRAME_COUNT;
    const frameH  = img.enemyMinionSheet.naturalHeight;
    const drawW   = e.width  + 40;
    const drawH   = e.height + 40;
    const centerX = e.x + e.width  / 2;
    const centerY = e.y + e.height / 2;
    ctx.save();
    const facingLeft = player.x < e.x;
    if (facingLeft) {
      ctx.translate(centerX, centerY);
      ctx.scale(-1, 1);
      ctx.drawImage(img.enemyMinionSheet,
        e.animFrame * frameW, 0, frameW, frameH,
        -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.drawImage(img.enemyMinionSheet,
        e.animFrame * frameW, 0, frameW, frameH,
        centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
    }
      ctx.restore();
    } else if (e.type === "common" && img.enemyCommonSheet.complete && img.enemyCommonSheet.naturalWidth > 0) {
      const frameW  = img.enemyCommonSheet.naturalWidth / COMMON_FRAME_COUNT;
      const frameH  = img.enemyCommonSheet.naturalHeight;
      const drawW   = e.width  + 50;
      const drawH   = e.height + 50;
      const centerX = e.x + e.width  / 2;
      const centerY = e.y + e.height / 2;
      ctx.save();
      const facingLeft = player.x < e.x;
      if (facingLeft) {
        ctx.translate(centerX, centerY);
        ctx.scale(-1, 1);
        ctx.drawImage(img.enemyCommonSheet,
          e.animFrame * frameW, 0, frameW, frameH,
          -drawW / 2, -drawH / 2, drawW, drawH);
      } else {
        ctx.drawImage(img.enemyCommonSheet,
          e.animFrame * frameW, 0, frameW, frameH,
          centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
      }
      ctx.restore();
    } else if (e.type === "ranged" && img.enemyMageSheet.complete && img.enemyMageSheet.naturalWidth > 0) {
      const frameW  = img.enemyMageSheet.naturalWidth / MAGE_FRAME_COUNT;
      const frameH  = img.enemyMageSheet.naturalHeight;
      const drawW   = e.width  + 50;
      const drawH   = e.height + 50;
      const centerX = e.x + e.width  / 2;
      const centerY = e.y + e.height / 2;
      ctx.save();
      const facingLeft = player.x < e.x;
      if (facingLeft) {
        ctx.translate(centerX, centerY);
        ctx.scale(-1, 1);
        ctx.drawImage(img.enemyMageSheet,
          e.animFrame * frameW, 0, frameW, frameH,
          -drawW / 2, -drawH / 2, drawW, drawH);
      } else {
        ctx.drawImage(img.enemyMageSheet,
          e.animFrame * frameW, 0, frameW, frameH,
          centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
      }
      ctx.restore();
    } else if (e.type === "speeder" && img.enemySlimeSheet.complete && img.enemySlimeSheet.naturalWidth > 0) {
      const frameW  = img.enemySlimeSheet.naturalWidth / SLIME_FRAME_COUNT;
      const frameH  = img.enemySlimeSheet.naturalHeight;
      const drawW   = e.width  + 40;
      const drawH   = e.height + 40;
      const centerX = e.x + e.width  / 2;
      const centerY = e.y + e.height / 2;
      ctx.save();
      const facingLeft = player.x < e.x;
      if (facingLeft) {
        ctx.translate(centerX, centerY);
        ctx.scale(-1, 1);
        ctx.drawImage(img.enemySlimeSheet,
          e.animFrame * frameW, 0, frameW, frameH,
          -drawW / 2, -drawH / 2, drawW, drawH);
      } else {
        ctx.drawImage(img.enemySlimeSheet,
          e.animFrame * frameW, 0, frameW, frameH,
          centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
      }
      ctx.restore();
    } else {
      ctx.fillStyle = e.color;
      ctx.fillRect(e.x, e.y, e.width, e.height);
    }
  });
  if (boss) renderBoss();

  // Player drawn above everything except UI
  if (player.attackTimer > 0 && img.playerAttackSheet.complete && img.playerAttackSheet.naturalWidth > 0) {
    const row    = PLAYER_ROW[player.facing];
    const drawW  = player.width  + 28;
    const drawH  = player.height + 28;
    const centerX = player.x + player.width  / 2;
    const centerY = player.y + player.height / 2;
    ctx.drawImage(img.playerAttackSheet,
      attackAnimFrame * PLAYER_FRAME_W, row * PLAYER_FRAME_H, PLAYER_FRAME_W, PLAYER_FRAME_H,
      Math.round(centerX - drawW / 2), Math.round(centerY - drawH / 2), drawW, drawH);
  } else if (img.playerSheet.complete && img.playerSheet.naturalWidth > 0) {
    const row     = PLAYER_ROW[player.facing];
    const frame   = playerIsMoving ? playerAnimFrame : 0;
    const drawW   = player.width  + 28;
    const drawH   = player.height + 28;
    const centerX = player.x + player.width  / 2;
    const centerY = player.y + player.height / 2;
    ctx.drawImage(img.playerSheet,
      frame * PLAYER_FRAME_W, row * PLAYER_FRAME_H, PLAYER_FRAME_W, PLAYER_FRAME_H,
      Math.round(centerX - drawW / 2), Math.round(centerY - drawH / 2), drawW, drawH);
  } else {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
  }

  // Slash VFX — drawn above player, rotated to match facing direction
  if (player.attackTimer > 0 && img.playerSlashSheet.complete && img.playerSlashSheet.naturalWidth > 0) {
    const frameW   = img.playerSlashSheet.naturalWidth / SLASH_FRAME_COUNT;
    const frameH   = img.playerSlashSheet.naturalHeight;
    const cx       = player.x + player.width  / 2;
    const cy       = player.y + player.height / 2;
    const rotation = SLASH_ROTATION[player.facing];
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);
    ctx.drawImage(
      img.playerSlashSheet,
      slashAnimFrame * frameW, 0, frameW, frameH,
      SLASH_OFFSET - SLASH_DRAW_SIZE / 2,
      -SLASH_DRAW_SIZE / 2,
      SLASH_DRAW_SIZE,
      SLASH_DRAW_SIZE
    );
    ctx.restore();
  }

  // Ranged enemy projectiles
  projectiles.forEach(p => {
    if (++p.animTimer >= FIREBALL_ANIM_SPEED) {
      p.animTimer = 0;
      p.animFrame = (p.animFrame + 1) % FIREBALL_FRAME_COUNT;
    }
    if (img.fireballSheet.complete && img.fireballSheet.naturalWidth > 0) {
      const frameW  = img.fireballSheet.naturalWidth / FIREBALL_FRAME_COUNT;
      const frameH  = img.fireballSheet.naturalHeight;
      const drawSize = 60; // [TWEAK] fireball render size
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.drawImage(img.fireballSheet,
        p.animFrame * frameW, 0, frameW, frameH,
        -drawSize / 2, -drawSize / 2, drawSize, drawSize);
      ctx.restore();
    } else {
      ctx.fillStyle = "#ff6600";
      ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
    }
  });

  renderHUD();

  // Attack hitbox debug overlay — only shown when DEV_MODE is on
  if (DEV_MODE && player.attackTimer > 0) {
    const b = getAttackBox();
    ctx.fillStyle = "rgba(255,220,0,0.4)";
    ctx.fillRect(b.x, b.y, b.width, b.height);
  }

  // Shop
  if (isShopRoom) {
    safeDrawImage(img.shopImage, shopBox.x - 100, shopBox.y - 50, 250, 200, "#2a1a0a");
    ctx.save();
    ctx.fillStyle = "#FFFFFF"; ctx.font = "bold 20px Courier New"; ctx.textAlign = "center";
    ctx.fillText("SHOP", shopBox.x + shopBox.width / 2, shopBox.y - 55);
    ctx.restore();
  }
  if (shopOpen) renderShop();

  // Death screen
  if (gameState === "dead") {
    safeDrawImage(img.deathScreen, 0, 0, canvas.width, canvas.height, "#1a0000");
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, canvas.height - 70, canvas.width, 70);
    ctx.save();
    ctx.textAlign = "center";
    ctx.fillStyle = "#888888"; ctx.font = "18px Courier New";
    ctx.fillText("Reached Room " + roomNumber + " | Press SPACE to Restart", canvas.width / 2, canvas.height - 28);
    ctx.restore();
  }

  if (fadeAlpha > 0) { ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
}

// ============================================================
// BOSS RENDER
// ============================================================
function renderBoss() {
  // isBossEnraged() is the single source of truth — behavior and rendering
  // are now guaranteed to use the same threshold
  const enraged = isBossEnraged();
  if (boss.type === "boss1" && img.boss1Sheet.complete && img.boss1Sheet.naturalWidth > 0) {
    const cols    = 4; // [TWEAK] columns in sheet
    const rows    = 4; // [TWEAK] rows in sheet
    const frameW  = img.boss1Sheet.naturalWidth  / cols;
    const frameH  = img.boss1Sheet.naturalHeight / rows;
    const col     = boss.animFrame % cols;
    // [TWEAK] set these row numbers to match your sprite sheet layout
    const rowMap  = { horizontal: 0, down: 3, up: 2 };
    const row     = rowMap[boss.moveDir] ?? 0;
    const drawW   = boss.width  + 60;
    const drawH   = boss.height + 60;
    const centerX = boss.x + boss.width  / 2;
    const centerY = boss.y + boss.height / 2;
    ctx.save();
    const facingLeft = boss.facingLeft;
    if (facingLeft) {
      ctx.translate(centerX, centerY);
      ctx.scale(-1, 1);
      ctx.drawImage(img.boss1Sheet,
        col * frameW, row * frameH, frameW, frameH,
        -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.drawImage(img.boss1Sheet,
        col * frameW, row * frameH, frameW, frameH,
        centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
    }
    ctx.restore(); 
  } else if (boss.type === "boss2" && img.boss2Sheet && img.boss2Sheet.complete && img.boss2Sheet.naturalWidth > 0) {
    const cols   = 4; // [TWEAK] columns in boss2 sheet
    const rows   = 4; // [TWEAK] rows in boss2 sheet
    const frameW = img.boss2Sheet.naturalWidth  / cols;
    const frameH = img.boss2Sheet.naturalHeight / rows;
    const col    = boss.animFrame % cols;
    // [TWEAK] row mapping — adjust to match your sheet layout
    const rowMap = { right: 0, left: 1, up: 2, down: 3 };
    const row    = rowMap[boss.moveDir] ?? 0;
    const drawW  = boss.width  + 120; // [TWEAK] rendered sprite width
    const drawH  = boss.height + 120; // [TWEAK] rendered sprite height
    const centerX = boss.x + boss.width  / 2;
    const centerY = boss.y + boss.height / 2;
    ctx.save();
    if (boss.facingLeft) {
      ctx.translate(centerX, centerY);
      ctx.scale(-1, 1);
      ctx.drawImage(img.boss2Sheet,
        col * frameW, row * frameH, frameW, frameH,
        -drawW / 2, -drawH / 2, drawW, drawH);
    } else {
      ctx.drawImage(img.boss2Sheet,
        col * frameW, row * frameH, frameW, frameH,
        centerX - drawW / 2, centerY - drawH / 2, drawW, drawH);
    }
    ctx.restore();
  } else {
    ctx.fillStyle = boss.color;
    ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
    ctx.strokeStyle = enraged ? "#ffff00" : "#ff0000";
    ctx.lineWidth   = enraged ? 5 : 3;
    ctx.strokeRect(boss.x, boss.y, boss.width, boss.height);
  }

  if (boss.type === "boss1") {
    // Charge telegraph flash
    if (bossChargeState === "telegraphing" && Math.floor(bossTelegraphFlash / 3) % 2 === 0) {
      ctx.fillStyle   = "rgba(255,0,0,0.25)";
      ctx.fillRect(bossChargeTargetX - 30, bossChargeTargetY - 30, player.width + 60, player.height + 60);
      ctx.strokeStyle = "rgba(255,0,0,0.9)"; ctx.lineWidth = 2;
      ctx.strokeRect(bossChargeTargetX - 30, bossChargeTargetY - 30, player.width + 60, player.height + 60);
    }
    // AOE ring
    if (bossAoeState === "expanding" && bossAoeCenterX) {
      const alpha = Math.max(0, 1 - bossAoeRadius / bossAoeMaxRadius);
      ctx.save();
      ctx.beginPath(); ctx.arc(bossAoeCenterX, bossAoeCenterY, Math.max(1, bossAoeRadius), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,80,0,${alpha})`; ctx.lineWidth = 8; ctx.stroke();
      ctx.beginPath(); ctx.arc(bossAoeCenterX, bossAoeCenterY, Math.max(1, bossAoeRadius - 6), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,200,0,${alpha * 0.5})`; ctx.lineWidth = 4; ctx.stroke();
      ctx.restore();
    }
  }

  if (boss.type === "boss2") {
    // Rain warnings
    boss2RainWarnings.forEach(w => {
      const alpha = 0.3 + (1 - w.timer / 30) * 0.5;
      ctx.save();
      ctx.beginPath(); ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
      ctx.fillStyle   = `rgba(255,0,0,${alpha})`; ctx.fill();
      ctx.strokeStyle = "rgba(255,100,0,0.8)"; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    });

    // Boss2 projectiles (rain puddles + normal shots)
    boss2Projectiles.forEach(p => {
      ctx.save();
      ctx.beginPath();
      if (p.type === "rain") {
        ctx.arc(p.x, p.y, BOSS2_RAIN_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle   = "rgba(0,150,255,0.5)"; ctx.fill();
        ctx.strokeStyle = "#66ccff"; ctx.lineWidth = 2; ctx.stroke();
      } else {
        if (img.boss2OrbSheet.complete && img.boss2OrbSheet.naturalWidth > 0) {
          const drawSize = 100; // [TWEAK] orb render size
          const angle = Math.atan2(p.vy, p.vx);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(angle);
          ctx.drawImage(img.boss2OrbSheet, 0, 0, img.boss2OrbSheet.naturalWidth, img.boss2OrbSheet.naturalHeight,
            -drawSize / 2, -drawSize / 2, drawSize, drawSize);
          ctx.restore();
        } else {
          ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
          ctx.fillStyle = "#cc88ff"; ctx.fill();
        }
      } 
      ctx.restore();
    });

    // Beam windup preview
    if (boss2BeamState === "windup" && Math.floor(Date.now() / 80) % 2 === 0) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(boss.x + boss.width / 2, boss.y + boss.height / 2);
      ctx.lineTo(boss2BeamX, boss2BeamY);
      ctx.strokeStyle = "rgba(200,100,255,0.5)"; ctx.lineWidth = 4; ctx.stroke();
      ctx.restore();
    }

    // Beam firing
    if (boss2BeamState === "firing") {
      const bcx   = boss.x + boss.width / 2, bcy = boss.y + boss.height / 2;
      const angle = Math.atan2(boss2BeamY - bcy, boss2BeamX - bcx);
      const beamW = 400;    // [TWEAK] beam visual width in pixels
      const beamLen = 2000; // [TWEAK] how far the beam extends
      const headW = 480;    // [TWEAK] width of the head sprite
      ctx.save();
      ctx.translate(bcx, bcy);
      ctx.rotate(angle);

      // Draw body first (underneath), from boss edge outward
      if (img.beamBody.complete && img.beamBody.naturalWidth > 0) {
        const segW = img.beamBody.naturalWidth;
        for (let sx = headW; sx < beamLen; sx += segW) {
          ctx.drawImage(img.beamBody, sx, -beamW / 2, Math.min(segW, beamLen - sx), beamW);
        }
      } else {
        ctx.fillStyle = "rgba(180,80,255,0.6)";
        ctx.fillRect(headW, -beamW / 2, beamLen, beamW);
      }

      // Draw head on top at position 0 (boss edge closest to player)
      if (img.beamHead.complete && img.beamHead.naturalWidth > 0) {
        ctx.save();
        ctx.translate(headW / 2, 0);
        ctx.rotate(Math.PI);
        ctx.drawImage(img.beamHead, -headW / 2, -beamW / 2, headW, beamW);
        ctx.restore();
      }

      ctx.restore();
    }

    // DEV: beam hitbox overlay — matches the rotated rectangle used for damage
    if (DEV_MODE && (boss2BeamState === "firing" || boss2BeamState === "windup")) {
      const bcx   = boss.x + boss.width / 2, bcy = boss.y + boss.height / 2;
      const angle = Math.atan2(boss2BeamY - bcy, boss2BeamX - bcx);
      const BEAM_HITBOX_W = 80;   // [TWEAK] keep in sync with updateBoss2
      const BEAM_HITBOX_LEN = 2000;
      const BEAM_HEAD_RADIUS = 240; // [TWEAK] keep in sync with updateBoss2
      ctx.save();
      ctx.translate(bcx, bcy);
      ctx.rotate(angle);
      ctx.fillStyle   = "rgba(255,220,0,0.25)";
      ctx.strokeStyle = "rgba(255,220,0,0.9)";
      ctx.lineWidth   = 2;
      // Beam body rectangle
      ctx.fillRect(0,   -BEAM_HITBOX_W / 2, BEAM_HITBOX_LEN, BEAM_HITBOX_W);
      ctx.strokeRect(0, -BEAM_HITBOX_W / 2, BEAM_HITBOX_LEN, BEAM_HITBOX_W);
      ctx.restore(); // end rotated beam body context before drawing circle in screen space

      // Circular burst at the beam tip — center is boss2BeamX/Y (the player-side end)
      // [TWEAK] change BEAM_HEAD_RADIUS in updateBoss2 AND here to adjust the circle size
      const BEAM_HEAD_RADIUS_VIS = 120; // [TWEAK] keep in sync with updateBoss2's BEAM_HEAD_RADIUS
      ctx.save();
      ctx.beginPath();
      // Circle center is HEAD_OFFSET px along the beam from boss center — keep in sync with updateBoss2
      const HEAD_OFFSET_VIS = 150; // [TWEAK] match HEAD_OFFSET in updateBoss2
      const headCircleCX = bcx + Math.cos(angle) * HEAD_OFFSET_VIS;
      const headCircleCY = bcy + Math.sin(angle) * HEAD_OFFSET_VIS;
      ctx.arc(headCircleCX, headCircleCY, BEAM_HEAD_RADIUS_VIS, 0, Math.PI * 2);
      ctx.fillStyle   = "rgba(255,220,0,0.25)";
      ctx.strokeStyle = "rgba(255,220,0,0.9)";
      ctx.lineWidth   = 2;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Stunned label
    if (boss2BeamState === "stunned") {
      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = "bold 16px Courier New";
      ctx.textAlign = "center"; ctx.fillText("STUNNED", boss.x + boss.width / 2, boss.y - 10);
      ctx.restore();
    }
  }
}

// ============================================================
// HUD RENDER
// ============================================================
function renderHUD() {
  // Health bar
  const bx = 20, by = 20, bw = 250, bh = 28;
  ctx.fillStyle = "#1a0000"; ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = "#cc0000"; ctx.fillRect(bx, by, bw * (player.health / player.maxHealth), bh);
  ctx.strokeStyle = "#888"; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
  ctx.save();
  ctx.fillStyle = "#FFF"; ctx.font = "bold 14px Arial"; ctx.textAlign = "center";
  ctx.fillText(Math.ceil(player.health) + " / " + player.maxHealth, bx + bw / 2, by + bh - 8);
  ctx.restore();

  // Room & coin counters
  ctx.fillStyle = "#FFF";    ctx.font = "bold 18px Courier New"; ctx.fillText("Room: "  + roomNumber, 20, by + bh + 25);
  ctx.fillStyle = "#FFD700"; ctx.font = "bold 16px Courier New"; ctx.fillText("Coins: " + coinCount,  20, by + bh + 50);

  // Stat panel (top right) — shows % above base
  const base = playerBase, sx = canvas.width - 220, sy = 20;
  const pct  = (val, b) => { const p = Math.round(((val - b) / b) * 100); return p > 0 ? ` (+${p}%)` : ""; };
  ctx.font = "bold 15px Courier New";
  ctx.fillStyle = "#ff6644"; ctx.fillText("ATK: " + player.damage         + pct(player.damage,    base.damage),    sx, sy + 20);
  ctx.fillStyle = "#4488ff"; ctx.fillText("HP: "  + player.maxHealth      + pct(player.maxHealth, base.maxHealth), sx, sy + 45);
  ctx.fillStyle = "#00ff88"; ctx.fillText("SPD: " + player.speed.toFixed(1) + pct(player.speed,   base.speed),     sx, sy + 70);

  // Boss health bar
  if (boss) {
    const bBarW = 400, bBarH = 30;
    const bBarX = canvas.width / 2 - bBarW / 2, bBarY = canvas.height - 80;
    const ratio = boss.health / boss.maxHealth;
    ctx.fillStyle = "#1a0000"; ctx.fillRect(bBarX, bBarY, bBarW, bBarH);
    ctx.fillStyle = ratio > 0.5 ? "#cc0000" : ratio > 0.25 ? "#cc6600" : "#ffff00";
    ctx.fillRect(bBarX, bBarY, bBarW * ratio, bBarH);
    ctx.strokeStyle = isBossEnraged() ? "#ffff00" : "#ff0000"; ctx.lineWidth = 2; ctx.strokeRect(bBarX, bBarY, bBarW, bBarH);
    ctx.save();
    ctx.fillStyle = "#FFF"; ctx.font = "bold 14px Courier New"; ctx.textAlign = "center";
    const label = boss.type === "boss2" ? "ARCHMAGE" : "WARDEN"; // [TWEAK] boss display names
    ctx.fillText((isBossEnraged() ? "⚠ ENRAGED ⚠ " : label + " ") + Math.ceil(boss.health) + " / " + boss.maxHealth, canvas.width / 2, bBarY + bBarH - 8);
    ctx.restore();
  }

  // Room cleared overlay
  if (roomIsCleared && !isShopRoom) {
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.font = "bold 36px Courier New"; ctx.textAlign = "center";
    ctx.fillText(isBossRoom ? "Boss Defeated!" : "Room Cleared!", canvas.width / 2, canvas.height / 2);
    ctx.font = "20px Courier New";
    ctx.fillText("Walk through the door to advance.", canvas.width / 2, canvas.height / 2 + 40);
    ctx.restore();
  }
}

// ============================================================
// SHOP RENDER
// ============================================================
function renderShop() {
  const { damagePrice, healthPrice, speedPrice } = getShopPrices();
  const pw = 420, ph = 520;
  const px = canvas.width  / 2 - pw / 2, py = canvas.height / 2 - ph / 2;
  safeDrawImage(img.shopPanel, px, py, pw, ph, "#1a1200");
  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "#FFD700"; ctx.font = "bold 20px Courier New";
  ctx.fillText("Coins: " + coinCount, canvas.width / 2, py + 130);

  const items = [
    { label: "[1] +25% Damage — " + damagePrice + " coins", color: "#ff6644", can: coinCount >= damagePrice,                                 y: py + 190 },
    { label: "[2] +25% Max HP — " + healthPrice + " coins", color: "#4488ff", can: coinCount >= healthPrice,                                 y: py + 250 },
    { label: player.speed >= player.maxSpeed ? "[3] Speed MAX" : "[3] +25% Speed — " + speedPrice + " coins",
                                                             color: "#00ff88", can: coinCount >= speedPrice && player.speed < player.maxSpeed, y: py + 310 },
  ];
  items.forEach(({ label, color, can, y }) => {
    ctx.fillStyle = can ? color : "#666666";
    ctx.fillText(label, canvas.width / 2, y);
  });

  ctx.fillStyle = "#13d013"; ctx.font = "18px Courier New"; ctx.fillText(shopHealMessage,                              canvas.width / 2, py + 390);
  ctx.fillStyle = "#c9eb1c"; ctx.font = "15px Courier New"; ctx.fillText("Press 1, 2 or 3 to buy. Walk away to close.", canvas.width / 2, py + 460);
  ctx.restore();
}

// ============================================================
// GAME LOOP
// ============================================================
function gameLoop() { update(); render(); requestAnimationFrame(gameLoop); }
Promise.all(imageLoads).then(() => gameLoop());
