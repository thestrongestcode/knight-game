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
const DEV_IMMORTAL = false;
const DEV_MODE     = false;

// ============================================================
// ASSETS
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
  coinSheet:         "Animations/CoinAnimation1.png",
  playerSheet:       "Animations/PlayerWalking.png",
  playerAttackSheet: "Animations/PlayerAttack.png",
  playerSlashSheet:  "Animations/PlayerSlash.png",
  esqueleto:         "Animations/esqueleto.png",
  goblin:            "Animations/goblin.png",
  trol:              "Animations/trol.png",
  fireSheet:         "Animations/fuego1.png",
  fireballSheet:     "Animations/Fireball.png",
  boss2OrbSheet:     "Animations/BossFireball.png",
  enemyMinionSheet:  "Animations/SkeletonMinion.png",
  beamHead:          "Animations/BeamHead.png",
  beamBody:          "Animations/BeamBody.png",
  boss1Sheet:        "Animations/boss1.png",
  boss2Sheet:        "Animations/boss2.png",
};

const img = {};
const imageLoads = Object.entries(assets).map(([key, src]) => {
  img[key] = new Image();
  img[key].src = src;
  return new Promise(res => { img[key].onload = res; img[key].onerror = res; });
});

function safeDrawImage(image, x, y, w, h, fallbackColor = "#111111") {
  if (image && image.complete && image.naturalWidth > 0) {
    ctx.drawImage(image, x, y, w, h);
  } else {
    ctx.fillStyle = fallbackColor;
    ctx.fillRect(x, y, w, h);
  }
}

// ============================================================
// ENEMY SPRITE SHEETS (tu sistema)
// ============================================================
const ENEMY_SPRITE_SIZE = {
  ranged:  { frameW: 136, frameH: 114 },
  common:  { frameW: 136, frameH: 114 },
  speeder: { frameW: 136, frameH: 114 },
  tank:    { frameW: 120, frameH: 114 },
};
const ENEMY_DIR_COL    = { up: 1, down: 0, left: 2, right: 2 };
const ENEMY_ANIM_FRAMES = 3;
const ENEMY_ANIM_SPEED  = 8;

const ENEMY_IMG = {
  ranged:  () => img.esqueleto,
  common:  () => img.goblin,
  speeder: () => img.goblin,
  tank:    () => img.trol,
};

function getEnemyFrame(type, dir, animFrame) {
  const s = ENEMY_SPRITE_SIZE[type] || ENEMY_SPRITE_SIZE.common;
  if (dir === "up") return { srcX: 0, srcY: 3 * s.frameH, fw: s.frameW, fh: s.frameH };
  const col   = (dir === "left" || dir === "right") ? 2 : 0;
  const frame = type === "ranged" ? animFrame % 2 : animFrame;
  return { srcX: col * s.frameW, srcY: frame * s.frameH, fw: s.frameW, fh: s.frameH };
}

function getEnemyDir(e) {
  const dx = player.x - e.x, dy = player.y - e.y;
  const absDx = Math.abs(dx), absDy = Math.abs(dy);
  if (absDx > absDy * 1.4) return dx > 0 ? "right" : "left";
  if (absDy > absDx * 1.4) return dy > 0 ? "down"  : "up";
  return e.lastDir || "down";
}

// ============================================================
// BOSS SPRITE HELPERS (tu sistema)
// ============================================================
function updateBossDir(boss) {
  const dx = player.x - boss.x, dy = player.y - boss.y;
  if (Math.abs(dx) > Math.abs(dy) * 2) boss.lastDir = dx > 0 ? "right" : "left";
  else if (Math.abs(dy) > Math.abs(dx) * 2) boss.lastDir = dy > 0 ? "down" : "up";
}

function drawBossSprite(sheet, boss) {
  const dir    = boss.lastDir || "down";
  const col    = ENEMY_DIR_COL[dir] ?? 0;
  const drawW  = 180, drawH = 180;
  const centerX = boss.x + boss.width  / 2;
  const centerY = boss.y + boss.height / 2;
  ctx.save();
  if (dir === "right") {
    ctx.scale(-1, 1);
    ctx.drawImage(sheet, col * 125, (boss.animFrame || 0) * 125, 125, 100,
      -Math.round(centerX + drawW / 2), Math.round(centerY - drawH / 2), drawW, drawH);
  } else {
    ctx.drawImage(sheet, col * 125, (boss.animFrame || 0) * 125, 125, 100,
      Math.round(centerX - drawW / 2), Math.round(centerY - drawH / 2), drawW, drawH);
  }
  ctx.restore();
}

// ============================================================
// SOUND SYSTEM
// ============================================================
const BGM_VOLUME = 0.4;

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

const audioCache = {};
Object.entries(SFX).forEach(([key, src]) => {
  if (src) { const a = new Audio(src); a.preload = "auto"; audioCache[key] = a; }
});

let audioCtx = null;
function synth(freq, dur, type = "sine", delay = 0) {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.connect(g); g.connect(audioCtx.destination);
  o.type = type; o.frequency.value = freq;
  const t = audioCtx.currentTime + delay;
  g.gain.setValueAtTime(0.18, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.start(t); o.stop(t + dur + 0.05);
}

function playSound(key) {
  if (SFX[key]) { const a = audioCache[key] || new Audio(SFX[key]); a.currentTime = 0; a.play().catch(() => {}); }
}

let bgMusicNode = null;
function startBGMusic() {
  if (bgMusicNode || !SFX.bgMusic) return;
  bgMusicNode = new Audio(SFX.bgMusic);
  bgMusicNode.loop = true; bgMusicNode.volume = BGM_VOLUME;
  bgMusicNode.play().catch(() => {});
}
function stopBGMusic() {
  if (!bgMusicNode) return;
  bgMusicNode.pause(); bgMusicNode.currentTime = 0; bgMusicNode = null;
}

let bossMusicNode = null;
function startBossMusic() {
  stopBossMusic();
  if (bgMusicNode) bgMusicNode.pause();
  if (!SFX.bossMusic) return;
  bossMusicNode = new Audio(SFX.bossMusic);
  bossMusicNode.loop = true; bossMusicNode.volume = BGM_VOLUME;
  bossMusicNode.play().catch(() => {});
}
function stopBossMusic() {
  if (bossMusicNode) { bossMusicNode.pause(); bossMusicNode.currentTime = 0; bossMusicNode = null; }
  if (bgMusicNode) bgMusicNode.play().catch(() => {});
}

// ============================================================
// BOSS ROOM HELPERS
// ============================================================
const getBossType      = room => room % 20 === 0 ? "boss2" : room % 10 === 0 ? "boss1" : null;
const isBossRoomNumber = room => getBossType(room) !== null;
const isShopRoomNumber = room => room % 5 === 0 && !isBossRoomNumber(room);

// ============================================================
// GAME STATE
// ============================================================
let gameState = "menu";
let deathScreenTimer = 0;
let roomNumber = 1;
let roomIsCleared = false;
let fadeAlpha = 0, fading = false, fadeDirection = "out";
let isShopRoom = false, isBossRoom = false;
let shopOpen = false, shopHealMessage = "";

// ============================================================
// COIN ANIMATION
// ============================================================
const COIN_MAGNET_DELAY    = 20;
const COIN_MAGNET_ACCEL    = 0.4;
const COIN_MAGNET_MAX_SPEED = 12;
let coinMagnetTimer = 0;
const COIN_FRAME_COUNT = 1;
const COIN_ANIM_SPEED  = 6;
let coinAnimFrame = 0, coinAnimTimer = 0;

const projectiles      = [];
const boss2Projectiles = [];

// ============================================================
// PLAYER ANIMATION
// ============================================================
const PLAYER_FRAME_COUNT = 4;
const PLAYER_FRAME_W     = 300;
const PLAYER_FRAME_H     = 300;
const PLAYER_ANIM_SPEED  = 8;
let playerAnimFrame = 0, playerAnimTimer = 0, playerIsMoving = false;

const PLAYER_ROW = { down: 0, left: 1, right: 2, up: 3 };

const ATTACK_FRAME_COUNT = 3;
let attackAnimFrame = 0, attackAnimTimer = 0;
const ATTACK_ANIM_SPEED = 6;

const SLASH_FRAME_COUNT = 4;
const SLASH_ANIM_SPEED  = 4;
const SLASH_DRAW_SIZE   = 110;
const SLASH_OFFSET      = 48;
let slashAnimFrame = 0, slashAnimTimer = 0;
const SLASH_ROTATION = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };

const FIREBALL_FRAME_COUNT = 1;
const FIREBALL_ANIM_SPEED  = 6;

const BOSS1_FRAME_COUNT = 4;
const BOSS1_ANIM_SPEED  = 25;

// ============================================================
// DEV PANEL
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
// PLAYER
// ============================================================
const playerBase = { damage: 30, maxHealth: 100, speed: 4 };
const player = {
  x: canvas.width / 2.08, y: canvas.height / 1.35,
  width: 50, height: 50, speed: 4, maxSpeed: 13,
  color: "slategray", health: 100, maxHealth: 100, facing: "right",
  attackTimer: 0, attackCooldown: 0, attackHits: [], damage: 30
};

const knockbackConfig = {
  speeder: { force: 28, decay: 0.72 },
  common:  { force: 14, decay: 0.75 },
  ranged:  { force: 12, decay: 0.74 },
  tank:    { force:  2, decay: 0.65 },
};

// ============================================================
// COINS & SHOP
// ============================================================
const coins = [];
let coinCount = 0;

const shopBox       = { x: canvas.width / 2 - 25, y: canvas.height / 2 - 25, width: 50, height: 50 };
const shopProximity = 150;

function getShopPrices() {
  const mult = 1 + (Math.floor(roomNumber / 5) * 0.5);
  return {
    damagePrice: Math.floor(9.5 * mult),
    healthPrice: Math.floor(5   * mult),
    speedPrice:  Math.floor(5   * mult),
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
const BOSS1_MINION_INTERVAL = 800;

let boss2ShootTimer = 0, boss2ShootCooldown = 160;
let boss2RainTimer  = 0, boss2RainCooldown  = 240;
let boss2RainWarnings = [];
let boss2BeamState = "idle", boss2BeamTimer = 0, boss2BeamCooldown = 0;
let boss2BeamX = 0, boss2BeamY = 0, boss2BeamDamageDealt = false;
const BOSS2_RAIN_RADIUS = 100;

const getChargeCooldown = () => {
  const enraged = boss && isBossEnraged();
  return Math.floor(Math.random() * (enraged ? 100 : 140)) + (enraged ? 40 : 80);
};

let boss1Count = 0, boss2Count = 0;
const BOSS1_TARGET_HITS = 18;
const BOSS2_TARGET_HITS = 20;

function isBossEnraged() {
  if (!boss) return false;
  if (boss.type === "boss1") return boss.health <= boss.maxHealth * 0.25;
  if (boss.type === "boss2") return boss.health <= boss.maxHealth * 0.50;
  return false;
}

function createBoss(bossType) {
  const base = { x: canvas.width / 2 - 60, y: canvas.height / 2 - 200, width: 120, height: 120, type: bossType };
  if (bossType === "boss1") {
    const n = boss1Count, hp = Math.floor(player.damage * BOSS1_TARGET_HITS), spd = Math.min(0.8 + n * 0.55, 5.0);
    return { ...base, speed: spd, baseSpeed: spd, color: "#8B0000", enraged: false,
      health: hp, maxHealth: hp,
      damage:     (0.06 + n * 0.015) * player.maxHealth,
      dashDamage: (0.18 + n * 0.04)  * player.maxHealth,
      aoeDamage:  (0.35 + n * 0.025) * player.maxHealth,
      animFrame: 0, animTimer: 0, lastDir: "down", coinDrop: 30 + n * 20 };
  }
  const n = boss2Count, hp = Math.floor(player.damage * BOSS2_TARGET_HITS), spd = Math.min(1.2 + n * 0.65, 5.5);
  return { ...base, speed: spd, baseSpeed: spd, color: "#4400aa", enraged: false,
    health: hp, maxHealth: hp,
    damage:           (0.05 + n * 0.012) * player.maxHealth,
    projectileDamage: (0.10 + n * 0.025) * player.maxHealth,
    rainDamage:       (0.03 + n * 0.008) * player.maxHealth,
    beamDamage:       0.8 * player.maxHealth,
    animFrame: 0, animTimer: 0, lastDir: "down", coinDrop: 50 + n * 30 };
}

// ============================================================
// ENEMIES
// ============================================================
const enemies = [];
let nextEnemyId = 0;

function spawnEnemies() {
  if (isShopRoom || isBossRoom) return;
  const speed = 1.5 + roomNumber * 0.1;
  const hp    = 20  + roomNumber * 5;
  const counts = {
    common:  Math.min(3 + Math.floor(roomNumber * 0.4), 4),
    tank:    Math.min(Math.floor(roomNumber / 4), 3),
    speeder: Math.min(Math.floor(roomNumber / 3), 3),
    ranged:  Math.min(Math.floor(roomNumber / 4), 3),
  };
  const configs = {
    common:  { width: 40, height: 40, speedMult: 1,   hpMult: 1,   color: "crimson"  },
    tank:    { width: 55, height: 55, speedMult: 0.5,  hpMult: 3,   color: "#8B0000"  },
    speeder: { width: 25, height: 25, speedMult: 2,    hpMult: 0.5, color: "#ff8800"  },
    ranged:  { width: 35, height: 35, speedMult: 0.8,  hpMult: 0.9, color: "#66ccff"  },
  };
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
    const c = configs[type];
    const enemy = {
      id: nextEnemyId++,
      x: ex, y: ey, width: c.width, height: c.height,
      speed: speed * c.speedMult, color: c.color, health: hp * c.hpMult,
      type, knockbackVx: 0, knockbackVy: 0,
      animFrame: Math.floor(Math.random() * ENEMY_ANIM_FRAMES),
      animTimer: Math.floor(Math.random() * ENEMY_ANIM_SPEED),
      lastDir: "down",
    };
    if (type === "ranged") { enemy.shootTimer = 0; enemy.shootCooldown = 150; }
    enemies.push(enemy);
  });
}

// ============================================================
// DOOR
// ============================================================
const getExitDoor = () => ({ x: canvas.width / 2 - 60, y: isBossRoom ? 150 : 120, width: 120, height: 40 });

// ============================================================
// BOSS STATE RESET
// ============================================================
function resetBossState() {
  stopBossMusic(); boss = null;
  bossChargeState = "idle"; bossChargeTimer = bossChargeCooldown = 0; bossChargeDamageDealt = false;
  bossAoeState    = "idle"; bossAoeRadius   = 0;                      bossAoeDamageDealt    = false;
  boss2BeamState  = "idle"; boss2BeamTimer  = boss2ShootTimer = 0;
  boss2RainTimer  = boss2RainCooldown; boss1MinionTimer = BOSS1_MINION_INTERVAL;
  boss2BeamDamageDealt = false;
  boss2Projectiles.length = 0; boss2RainWarnings = [];
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
    const heal = player.maxHealth * 0.5;
    player.health = Math.min(player.maxHealth, player.health + heal);
    shopHealMessage = "You were healed for " + Math.floor(heal) + " HP!";
    playSound("healPickup");
  }
  if (isBossRoom) {
    const bossType = getBossType(roomNumber);
    boss = createBoss(bossType);
    if (bossType === "boss1") boss1Count++;
    if (bossType === "boss2") boss2Count++;
    bossChargeCooldown = 60; boss2BeamCooldown = 180;
    playSound("bossEnter"); startBossMusic();
  }
  player.x = canvas.width / 2.08; player.y = canvas.height / 1.35;
  enemies.length = coins.length = projectiles.length = 0;
  coinMagnetTimer = 0; spawnEnemies();
}

// ============================================================
// RESTART
// ============================================================
function restartGame() {
  startBGMusic();
  Object.assign(player, {
    x: canvas.width / 2.08, y: canvas.height / 1.35,
    health: 100, maxHealth: 100, damage: 30, speed: 4,
    attackTimer: 0, attackCooldown: 0, attackHits: [],
  });
  roomNumber = 1;
  roomIsCleared = isShopRoom = isBossRoom = shopOpen = false;
  shopHealMessage = ""; coinCount = 0; fading = false; fadeAlpha = 0;
  boss1Count = boss2Count = nextEnemyId = 0;
  resetBossState();
  enemies.length = coins.length = projectiles.length = 0;
  coinMagnetTimer = 0; spawnEnemies(); gameState = "playing";
}

// ============================================================
// INPUT
// ============================================================
const keys = {};
window.addEventListener("keydown", e => {
  const key = e.key.toLowerCase(); keys[key] = true;
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) e.preventDefault();
});
window.addEventListener("keyup",  e => { keys[e.key.toLowerCase()] = false; });
window.addEventListener("blur",   () => { Object.keys(keys).forEach(k => keys[k] = false); });
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
// COLLISION
// ============================================================
const rectsOverlap = (a, b) =>
  a.x < b.x + b.width && a.x + a.width > b.x &&
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
      if (++playerAnimTimer >= PLAYER_ANIM_SPEED) { playerAnimTimer = 0; playerAnimFrame = (playerAnimFrame + 1) % PLAYER_FRAME_COUNT; }
    } else { playerIsMoving = false; playerAnimFrame = 0; playerAnimTimer = 0; }

    if (isBossRoom) {
      player.x = Math.max(160, Math.min(canvas.width  - player.width  - 160, player.x));
      player.y = Math.max(180, Math.min(canvas.height - player.height -  80, player.y));
    } else {
      player.x = Math.max( 90, Math.min(canvas.width  - player.width  -  90, player.x));
      player.y = Math.max(100, Math.min(canvas.height - player.height -  70, player.y));
    }

    if (!isShopRoom) {
      const prevHealth = player.health;
      updateEnemies(); updateAttack(); updateBoss();

      if (player.attackTimer > 0) {
        if (++attackAnimTimer >= ATTACK_ANIM_SPEED) { attackAnimTimer = 0; attackAnimFrame = Math.min(attackAnimFrame + 1, ATTACK_FRAME_COUNT - 1); }
        if (++slashAnimTimer >= SLASH_ANIM_SPEED) { slashAnimTimer = 0; if (slashAnimFrame < SLASH_FRAME_COUNT - 1) slashAnimFrame++; }
      } else { attackAnimFrame = 0; attackAnimTimer = 0; slashAnimFrame = 0; slashAnimTimer = 0; }

      if (player.health < prevHealth) playSound("playerHit");
      if (DEV_IMMORTAL) { player.health = Math.max(1, player.health); }
      else {
        player.health = Math.max(0, player.health);
        if (player.health <= 0) { playSound("playerDeath"); gameState = "dead"; deathScreenTimer = 40; return; }
      }

      updateCoins();
      if (!isBossRoom && enemies.length === 0 && !roomIsCleared) { roomIsCleared = true; playSound("roomCleared"); }
    }

    if (isShopRoom) {
      const px = player.x + player.width / 2, py = player.y + player.height / 2;
      const sx = shopBox.x + shopBox.width / 2, sy = shopBox.y + shopBox.height / 2;
      const wasShopOpen = shopOpen;
      shopOpen = Math.sqrt((px - sx) ** 2 + (py - sy) ** 2) < shopProximity;
      if (shopOpen && !wasShopOpen) playSound("shopOpen");
    }

    if (roomIsCleared && rectsOverlap(player, getExitDoor())) { playSound("doorTransition"); fading = true; fadeDirection = "out"; }
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
    for (const axis of ["knockbackVx", "knockbackVy"]) {
      if (enemy[axis]) {
        const move = axis === "knockbackVx" ? "x" : "y";
        enemy[move] += enemy[axis];
        enemy[axis] *= knockbackConfig[enemy.type]?.decay ?? 0.75;
        if (Math.abs(enemy[axis]) < 0.1) enemy[axis] = 0;
      }
    }

    const dx = player.x - enemy.x, dy = player.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    enemy.lastDir = getEnemyDir(enemy);
    if (++enemy.animTimer >= ENEMY_ANIM_SPEED) { enemy.animTimer = 0; enemy.animFrame = (enemy.animFrame + 1) % ENEMY_ANIM_FRAMES; }

    if (enemy.type === "ranged") {
      const pref = 300;
      if (dist > pref + 40) { enemy.x += (dx / dist) * enemy.speed; enemy.y += (dy / dist) * enemy.speed; }
      else if (dist < pref - 40) {
        enemy.x -= (dx / dist) * enemy.speed; enemy.y -= (dy / dist) * enemy.speed;
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
      const dmg = enemy.type === "tank" ? 1.5 + roomNumber * 0.2 : enemy.type === "speeder" ? 0.2 + roomNumber * 0.05 : 0.5 + roomNumber * 0.1;
      contactDamage(enemy, dmg);
    }
  });

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i]; p.x += p.vx; p.y += p.vy;
    if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) { projectiles.splice(i, 1); continue; }
    if (rectsOverlap(p, player)) { player.health -= 8 + roomNumber * 0.4; projectiles.splice(i, 1); playSound("projectileHit"); }
  }
}

// ============================================================
// BOSS UPDATE
// ============================================================
function updateBoss() {
  if (!boss) return;
  if (boss.type === "boss1") updateBoss1();
  if (boss.type === "boss2") updateBoss2();

  if (boss.type === "boss1" && boss.health > 0 && --boss1MinionTimer <= 0) {
    boss1MinionTimer = BOSS1_MINION_INTERVAL;
    const count = Math.floor(Math.random() * 8) + 8;
    for (let i = 0; i < count; i++) {
      let ex, ey, attempts = 0;
      do { ex = Math.random() * (canvas.width - 550) + 275; ey = Math.random() * (canvas.height - 340) + 180; }
      while (Math.sqrt((ex - player.x) ** 2 + (ey - player.y) ** 2) < 150 && ++attempts < 20);
      enemies.push({ id: nextEnemyId++, x: ex, y: ey, width: 25, height: 25,
        speed: (1.5 + roomNumber * 0.1) * 0.5, color: "#cc4400", health: 15 + roomNumber * 3,
        type: "common", isMinion: true, knockbackVx: 0, knockbackVy: 0, animFrame: 0, animTimer: 0, lastDir: "down" });
    }
  }

  if (boss.health <= 0) {
    playSound("bossDefeated");
    for (let i = 0; i < boss.coinDrop; i++)
      coins.push({ x: boss.x + Math.random() * boss.width, y: boss.y + Math.random() * boss.height, width: 10, height: 10, vx: 0, vy: 0 });
    player.health = player.maxHealth;
    resetBossState(); roomIsCleared = true;
  }
}

function updateBoss1() {
  if (++boss.animTimer >= ENEMY_ANIM_SPEED) { boss.animTimer = 0; boss.animFrame = (boss.animFrame + 1) % 3; }
  if (bossChargeState === "idle" || bossChargeState === "dashing") updateBossDir(boss);

  if (!boss.enraged && isBossEnraged()) { boss.enraged = true; boss.speed = boss.baseSpeed * 4; boss.damage *= 2; boss.color = "#ff0000"; }

  if (bossChargeState === "idle" && bossAoeState === "idle") {
    if (--bossChargeCooldown <= 0) {
      const dx = player.x + player.width / 2 - (boss.x + boss.width / 2);
      const dy = player.y + player.height / 2 - (boss.y + boss.height / 2);
      if (Math.sqrt(dx * dx + dy * dy) < 250) {
        bossAoeState = "expanding"; bossAoeRadius = 0;
        bossAoeCenterX = boss.x + boss.width / 2; bossAoeCenterY = boss.y + boss.height / 2;
        bossAoeDamageDealt = false; playSound("bossAoe");
      } else {
        bossChargeTargetX = player.x; bossChargeTargetY = player.y;
        bossChargeState = "telegraphing"; bossChargeTimer = 28;
        bossTelegraphFlash = 0; bossChargeDamageDealt = false; playSound("bossCharge");
      }
      bossChargeCooldown = getChargeCooldown();
    }
  }

  if (bossChargeState === "telegraphing") { bossTelegraphFlash++; if (--bossChargeTimer <= 0) { bossChargeState = "dashing"; bossChargeTimer = 30; } }

  if (bossChargeState === "dashing") {
    const dx = bossChargeTargetX - boss.x, dy = bossChargeTargetY - boss.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    boss.x += (dx / dist) * 60; boss.y += (dy / dist) * 60;
    if (!bossChargeDamageDealt && rectsOverlap(player, boss)) { player.health -= boss.dashDamage; bossChargeDamageDealt = true; bossChargeState = "cooldown"; bossChargeTimer = 40; }
    if (--bossChargeTimer <= 0) { bossChargeState = "cooldown"; bossChargeTimer = 40; }
  }

  if (bossChargeState === "cooldown" && --bossChargeTimer <= 0) bossChargeState = "idle";

  if (bossAoeState === "expanding") {
    bossAoeRadius += 4;
    if (!bossAoeDamageDealt) {
      const px = player.x + player.width / 2, py = player.y + player.height / 2;
      const d = Math.sqrt((px - bossAoeCenterX) ** 2 + (py - bossAoeCenterY) ** 2);
      if (bossAoeRadius >= d - 20 && bossAoeRadius <= d + 20) { player.health -= boss.aoeDamage; bossAoeDamageDealt = true; }
    }
    if (bossAoeRadius >= bossAoeMaxRadius) { bossAoeState = "idle"; bossAoeRadius = 0; bossChargeCooldown = getChargeCooldown(); }
  }

  if ((bossChargeState === "idle" || bossChargeState === "cooldown") && bossAoeState === "idle") {
    const dx = player.x - boss.x, dy = player.y - boss.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    boss.x += (dx / dist) * boss.speed; boss.y += (dy / dist) * boss.speed;
  }

  if (bossChargeState !== "dashing" && rectsOverlap(player, boss)) contactDamage(boss, boss.damage);
}

function updateBoss2() {
  if (++boss.animTimer >= ENEMY_ANIM_SPEED) { boss.animTimer = 0; boss.animFrame = (boss.animFrame + 1) % 3; }
  if (boss2BeamState === "idle") updateBossDir(boss);

  if (!boss.enraged && isBossEnraged()) { boss.enraged = true; boss.speed = boss.baseSpeed * 2; boss.damage *= 2; boss.color = "#7700ff"; }

  const dx = player.x + player.width / 2 - (boss.x + boss.width / 2);
  const dy = player.y + player.height / 2 - (boss.y + boss.height / 2);
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const pref = 300;

  if (boss2BeamState === "idle" || boss2BeamState === "stunned") {
    if (dist > pref + 50) { boss.x += (dx / dist) * boss.speed; boss.y += (dy / dist) * boss.speed; }
    else if (dist < pref - 50) { boss.x -= (dx / dist) * boss.speed; boss.y -= (dy / dist) * boss.speed; }
    boss.x = Math.max(260, Math.min(canvas.width - boss.width - 260, boss.x));
    boss.y = Math.max(170, Math.min(canvas.height - boss.height - 140, boss.y));
  }

  if (rectsOverlap(player, boss)) contactDamage(boss, boss.damage);

  if (boss2BeamState !== "firing" && boss2BeamState !== "windup" && --boss2ShootTimer <= 0) {
    boss2ShootTimer = boss2ShootCooldown;
    const base = Math.atan2(dy, dx);
    [-0.2, 0, 0.2].forEach(offset => {
      const a = base + offset;
      boss2Projectiles.push({ x: boss.x + boss.width / 2, y: boss.y + boss.height / 2, vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, width: 22, height: 22, type: "normal" });
    });
  }

  if (--boss2RainTimer <= 0) {
    boss2RainTimer = boss2RainCooldown;
    const count = 5 + Math.floor(roomNumber / 10);
    for (let i = 0; i < count; i++)
      boss2RainWarnings.push({ x: Math.random() * (canvas.width - 550) + 275, y: Math.random() * (canvas.height - 340) + 180, timer: 40, radius: BOSS2_RAIN_RADIUS });
  }

  for (let i = boss2RainWarnings.length - 1; i >= 0; i--) {
    if (--boss2RainWarnings[i].timer <= 0) {
      const w = boss2RainWarnings[i];
      boss2Projectiles.push({ x: w.x, y: w.y, vx: 0, vy: 0, width: w.radius * 2, height: w.radius * 2, type: "rain", linger: 40 });
      boss2RainWarnings.splice(i, 1);
    }
  }

  if (boss2BeamState === "idle" && --boss2BeamCooldown <= 0) {
    boss2BeamState = "windup"; boss2BeamTimer = 25;
    boss2BeamX = player.x + player.width / 2; boss2BeamY = player.y + player.height / 2;
    boss2BeamDamageDealt = false; playSound("bossBeamWindup");
  }
  if (boss2BeamState === "windup" && --boss2BeamTimer <= 0) { boss2BeamState = "firing"; boss2BeamTimer = 20; playSound("bossBeamFire"); }
  if (boss2BeamState === "firing") {
    if (!boss2BeamDamageDealt) {
      const bcx = boss.x + boss.width / 2, bcy = boss.y + boss.height / 2;
      const angle = Math.atan2(boss2BeamY - bcy, boss2BeamX - bcx);
      const BEAM_HITBOX_W = 80, BEAM_HITBOX_LEN = 2000, HEAD_OFFSET = 150, BEAM_HEAD_RADIUS = 120;
      const cos = Math.cos(-angle), sin = Math.sin(-angle);
      const corners = [[player.x, player.y],[player.x + player.width, player.y],[player.x, player.y + player.height],[player.x + player.width, player.y + player.height]];
      const headCX = bcx + Math.cos(angle) * HEAD_OFFSET, headCY = bcy + Math.sin(angle) * HEAD_OFFSET;
      const headHit = corners.some(([cx, cy]) => Math.sqrt((cx - headCX) ** 2 + (cy - headCY) ** 2) < BEAM_HEAD_RADIUS);
      const bodyHit = corners.some(([cx, cy]) => {
        const lx = cx - bcx, ly = cy - bcy;
        const rotX = lx * cos - ly * sin, rotY = lx * sin + ly * cos;
        return rotX > 0 && rotX < BEAM_HITBOX_LEN && Math.abs(rotY) < BEAM_HITBOX_W / 2;
      });
      if (headHit || bodyHit) { player.health -= boss.beamDamage; boss2BeamDamageDealt = true; }
    }
    if (--boss2BeamTimer <= 0) { boss2BeamState = "stunned"; boss2BeamTimer = 180; boss2BeamCooldown = isBossEnraged() ? 300 : 480; }
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
  if (keys["w"] || keys["arrowup"])    player.facing = "up";
  if (keys["s"] || keys["arrowdown"])  player.facing = "down";
  if (keys["a"] || keys["arrowleft"])  player.facing = "left";
  if (keys["d"] || keys["arrowright"]) player.facing = "right";

  if ((keys[" "] || keys["click"]) && player.attackCooldown <= 0) {
    player.attackTimer = 18; player.attackCooldown = 30; player.attackHits = [];
    slashAnimFrame = 0; slashAnimTimer = 0; playSound("playerAttack");
  }
  if (player.attackTimer   > 0) player.attackTimer--;
  if (player.attackCooldown > 0) player.attackCooldown--;

  if (player.attackTimer > 0) {
    const attackBox = getAttackBox();
    enemies.forEach(enemy => {
      if (rectsOverlap(attackBox, enemy) && !player.attackHits.includes(enemy.id)) {
        enemy.health -= player.damage; player.attackHits.push(enemy.id); playSound("enemyHit");
        const kb = knockbackConfig[enemy.type] ?? knockbackConfig.common;
        const kbDx = enemy.x - player.x, kbDy = enemy.y - player.y;
        const kbDist = Math.sqrt(kbDx * kbDx + kbDy * kbDy) || 1;
        enemy.knockbackVx = (kbDx / kbDist) * kb.force; enemy.knockbackVy = (kbDy / kbDist) * kb.force;
      }
    });
    if (boss && rectsOverlap(attackBox, boss) && !player.attackHits.includes("boss")) { boss.health -= player.damage; player.attackHits.push("boss"); playSound("bossHit"); }
    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].health <= 0) {
        playSound("enemyDeath");
        const drop = enemies[i].type === "tank" ? 3 : enemies[i].type === "ranged" ? 2 : 1;
        for (let c = 0; c < drop; c++) coins.push({ x: enemies[i].x + Math.random() * enemies[i].width, y: enemies[i].y + Math.random() * enemies[i].height, width: 10, height: 10, vx: 0, vy: 0 });
        enemies.splice(i, 1);
      }
    }
  }
}

function getAttackBox() {
  const hw = 60, hh = 60;
  const dirs = { right: { x: player.x + player.width, y: player.y - 5 }, left: { x: player.x - hw, y: player.y - 5 }, down: { x: player.x - 5, y: player.y + player.height }, up: { x: player.x - 5, y: player.y - hh } };
  return { ...dirs[player.facing], width: hw, height: hh };
}

// ============================================================
// COIN UPDATE
// ============================================================
function updateCoins() {
  const px = player.x + player.width / 2, py = player.y + player.height / 2;
  if (roomIsCleared && coinMagnetTimer < COIN_MAGNET_DELAY) coinMagnetTimer++;
  const magnetActive = roomIsCleared && coinMagnetTimer >= COIN_MAGNET_DELAY;
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i], cx = c.x + 5, cy = c.y + 5;
    const dx = px - cx, dy = py - cy, dist = Math.sqrt(dx * dx + dy * dy) || 1;
    if (magnetActive) {
      const targetSpd = Math.min(COIN_MAGNET_MAX_SPEED, COIN_MAGNET_ACCEL * dist);
      c.vx = (dx / dist) * targetSpd; c.vy = (dy / dist) * targetSpd;
      c.x += c.vx; c.y += c.vy;
      if (Math.sqrt((px - (c.x + 5)) ** 2 + (py - (c.y + 5)) ** 2) < 60) { coinCount++; coins.splice(i, 1); playSound("coinPickup"); }
    }
  }
}

// ============================================================
// RENDER
// ============================================================
function render() {
  if (gameState === "menu") {
    safeDrawImage(img.menuScreen, 0, 0, canvas.width, canvas.height, "#0d0d1a");
    ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(0, canvas.height - 80, canvas.width, 80);
    const pulse = 0.6 + Math.sin(Date.now() / 500) * 0.4;
    ctx.save(); ctx.textAlign = "center";
    ctx.fillStyle = `rgba(255,220,100,${pulse})`; ctx.font = "bold 26px Courier New";
    ctx.fillText("Press SPACE to Play", canvas.width / 2, canvas.height - 30);
    ctx.restore(); return;
  }

  const bossType = getBossType(roomNumber);
  const bgImage  = bossType === "boss1" ? (roomIsCleared ? img.bossRoom1Cleared : img.bossRoom1)
                 : bossType === "boss2" ? (roomIsCleared ? img.bossRoom2Cleared : img.bossRoom2)
                 :                        (roomIsCleared ? img.roomCleared       : img.roomBackground);
  safeDrawImage(bgImage, 0, 0, canvas.width, canvas.height, "#1a1a1a");

  if (++coinAnimTimer >= COIN_ANIM_SPEED) { coinAnimTimer = 0; coinAnimFrame = (coinAnimFrame + 1) % COIN_FRAME_COUNT; }
  coins.forEach(c => {
    if (img.coinSheet.complete && img.coinSheet.naturalWidth > 0) {
      const frameW = img.coinSheet.naturalWidth / COIN_FRAME_COUNT;
      ctx.drawImage(img.coinSheet, coinAnimFrame * frameW, 0, frameW, img.coinSheet.naturalHeight, c.x - 14, c.y - 14, 28, 28);
    } else { ctx.fillStyle = "#FFD700"; ctx.fillRect(c.x, c.y, c.width, c.height); }
  });

  // ENEMY RENDER — tu sistema con goblin/trol/esqueleto
  enemies.forEach(e => {
    const sheet = ENEMY_IMG[e.type] ? ENEMY_IMG[e.type]() : null;
    if (sheet && sheet.complete && sheet.naturalWidth > 0) {
      const dir    = e.lastDir || "down";
      const frame  = getEnemyFrame(e.type, dir, e.animFrame);
      const srcW   = e.type === "tank" ? 120 : 136;
      const drawW  = e.type === "tank" ? 140 : e.type === "ranged" ? 78 : player.width + 28;
      const drawH  = e.type === "tank" ? 140 : e.type === "ranged" ? 78 : player.height + 28;
      const centerX = e.x + e.width / 2, centerY = e.y + e.height / 2;
      ctx.save();
      if (dir === "right") {
        ctx.scale(-1, 1);
        ctx.drawImage(sheet, frame.srcX, frame.srcY, srcW, 114, -Math.round(centerX + drawW / 2), Math.round(centerY - drawH / 2), drawW, drawH);
      } else {
        ctx.drawImage(sheet, frame.srcX, frame.srcY, srcW, 114, Math.round(centerX - drawW / 2), Math.round(centerY - drawH / 2), drawW, drawH);
      }
      ctx.restore();
    } else { ctx.fillStyle = e.color; ctx.fillRect(e.x, e.y, e.width, e.height); }
  });

  if (boss) renderBoss();

  // PLAYER
  if (player.attackTimer > 0 && img.playerAttackSheet.complete && img.playerAttackSheet.naturalWidth > 0) {
    const row = PLAYER_ROW[player.facing], drawW = player.width + 28, drawH = player.height + 28;
    const centerX = player.x + player.width / 2, centerY = player.y + player.height / 2;
    ctx.drawImage(img.playerAttackSheet, attackAnimFrame * PLAYER_FRAME_W, row * PLAYER_FRAME_H, PLAYER_FRAME_W, PLAYER_FRAME_H, Math.round(centerX - drawW / 2), Math.round(centerY - drawH / 2), drawW, drawH);
  } else if (img.playerSheet.complete && img.playerSheet.naturalWidth > 0) {
    const row = PLAYER_ROW[player.facing], frame = playerIsMoving ? playerAnimFrame : 0;
    const drawW = player.width + 28, drawH = player.height + 28;
    const centerX = player.x + player.width / 2, centerY = player.y + player.height / 2;
    ctx.drawImage(img.playerSheet, frame * PLAYER_FRAME_W, row * PLAYER_FRAME_H, PLAYER_FRAME_W, PLAYER_FRAME_H, Math.round(centerX - drawW / 2), Math.round(centerY - drawH / 2), drawW, drawH);
  } else { ctx.fillStyle = player.color; ctx.fillRect(player.x, player.y, player.width, player.height); }

  // SLASH VFX
  if (player.attackTimer > 0 && img.playerSlashSheet && img.playerSlashSheet.complete && img.playerSlashSheet.naturalWidth > 0) {
    const frameW = img.playerSlashSheet.naturalWidth / SLASH_FRAME_COUNT;
    const frameH = img.playerSlashSheet.naturalHeight;
    const cx = player.x + player.width / 2, cy = player.y + player.height / 2;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(SLASH_ROTATION[player.facing]);
    ctx.drawImage(img.playerSlashSheet, slashAnimFrame * frameW, 0, frameW, frameH, SLASH_OFFSET - SLASH_DRAW_SIZE / 2, -SLASH_DRAW_SIZE / 2, SLASH_DRAW_SIZE, SLASH_DRAW_SIZE);
    ctx.restore();
  }

  // PROYECTILES ENEMIGOS
  projectiles.forEach(p => {
    if (++p.animTimer >= FIREBALL_ANIM_SPEED) { p.animTimer = 0; p.animFrame = (p.animFrame + 1) % FIREBALL_FRAME_COUNT; }
    if (img.fireballSheet && img.fireballSheet.complete && img.fireballSheet.naturalWidth > 0) {
      const frameW = img.fireballSheet.naturalWidth / FIREBALL_FRAME_COUNT;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
      ctx.drawImage(img.fireballSheet, p.animFrame * frameW, 0, frameW, img.fireballSheet.naturalHeight, -30, -30, 60, 60);
      ctx.restore();
    } else { ctx.fillStyle = "#66ccff"; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill(); }
  });

  renderHUD();

  if (DEV_MODE && player.attackTimer > 0) {
    const b = getAttackBox(); ctx.fillStyle = "rgba(255,220,0,0.4)"; ctx.fillRect(b.x, b.y, b.width, b.height);
  }

  if (isShopRoom) {
    safeDrawImage(img.shopImage, shopBox.x - 100, shopBox.y - 50, 250, 200, "#2a1a0a");
    ctx.save(); ctx.fillStyle = "#FFFFFF"; ctx.font = "bold 20px Courier New"; ctx.textAlign = "center";
    ctx.fillText("SHOP", shopBox.x + shopBox.width / 2, shopBox.y - 55); ctx.restore();
  }
  if (shopOpen) renderShop();

  if (gameState === "dead") {
    safeDrawImage(img.deathScreen, 0, 0, canvas.width, canvas.height, "#1a0000");
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, canvas.height - 70, canvas.width, 70);
    ctx.save(); ctx.textAlign = "center"; ctx.fillStyle = "#888888"; ctx.font = "18px Courier New";
    ctx.fillText("Reached Room " + roomNumber + " | Press SPACE to Restart", canvas.width / 2, canvas.height - 28); ctx.restore();
  }

  if (fadeAlpha > 0) { ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
}

// ============================================================
// BOSS RENDER
// ============================================================
function renderBoss() {
  const enraged = isBossEnraged();

  if (boss.type === "boss1") {
    if (img.boss1Sheet && img.boss1Sheet.complete && img.boss1Sheet.naturalWidth > 0) drawBossSprite(img.boss1Sheet, boss);
    else { ctx.fillStyle = boss.color; ctx.fillRect(boss.x, boss.y, boss.width, boss.height); }

    if (bossChargeState === "telegraphing" && Math.floor(bossTelegraphFlash / 3) % 2 === 0) {
      ctx.fillStyle = "rgba(255,0,0,0.25)"; ctx.fillRect(bossChargeTargetX - 30, bossChargeTargetY - 30, player.width + 60, player.height + 60);
      ctx.strokeStyle = "rgba(255,0,0,0.9)"; ctx.lineWidth = 2; ctx.strokeRect(bossChargeTargetX - 30, bossChargeTargetY - 30, player.width + 60, player.height + 60);
    }
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
    if (img.boss2Sheet && img.boss2Sheet.complete && img.boss2Sheet.naturalWidth > 0) drawBossSprite(img.boss2Sheet, boss);
    else { ctx.fillStyle = boss.color; ctx.fillRect(boss.x, boss.y, boss.width, boss.height); }

    boss2RainWarnings.forEach(w => {
      const alpha = 0.3 + (1 - w.timer / 30) * 0.5;
      ctx.save(); ctx.beginPath(); ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,0,0,${alpha})`; ctx.fill();
      ctx.strokeStyle = "rgba(255,100,0,0.8)"; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    });

    boss2Projectiles.forEach(p => {
      ctx.save();
      if (p.type === "rain") {
        ctx.beginPath(); ctx.arc(p.x, p.y, BOSS2_RAIN_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(150,0,255,0.3)"; ctx.fill();
        ctx.strokeStyle = "rgba(200,100,255,0.8)"; ctx.lineWidth = 3; ctx.stroke();
      } else {
        if (img.boss2OrbSheet && img.boss2OrbSheet.complete && img.boss2OrbSheet.naturalWidth > 0) {
          const angle = Math.atan2(p.vy, p.vx);
          ctx.translate(p.x, p.y); ctx.rotate(angle);
          ctx.drawImage(img.boss2OrbSheet, 0, 0, img.boss2OrbSheet.naturalWidth, img.boss2OrbSheet.naturalHeight, -50, -50, 100, 100);
        } else { ctx.beginPath(); ctx.arc(p.x, p.y, 14, 0, Math.PI * 2); ctx.fillStyle = "#cc88ff"; ctx.fill(); }
      }
      ctx.restore();
    });

    if (boss2BeamState === "windup" && Math.floor(Date.now() / 80) % 2 === 0) {
      ctx.save(); ctx.beginPath();
      ctx.moveTo(boss.x + boss.width / 2, boss.y + boss.height / 2);
      ctx.lineTo(boss2BeamX, boss2BeamY);
      ctx.strokeStyle = "rgba(200,100,255,0.5)"; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
    }

    if (boss2BeamState === "firing") {
      const bcx = boss.x + boss.width / 2, bcy = boss.y + boss.height / 2;
      const angle = Math.atan2(boss2BeamY - bcy, boss2BeamX - bcx);
      const beamW = 400, beamLen = 2000, headW = 480;
      ctx.save(); ctx.translate(bcx, bcy); ctx.rotate(angle);
      if (img.beamBody && img.beamBody.complete && img.beamBody.naturalWidth > 0) {
        const segW = img.beamBody.naturalWidth;
        for (let sx = headW; sx < beamLen; sx += segW)
          ctx.drawImage(img.beamBody, sx, -beamW / 2, Math.min(segW, beamLen - sx), beamW);
      } else { ctx.fillStyle = "rgba(180,80,255,0.6)"; ctx.fillRect(headW, -beamW / 2, beamLen, beamW); }
      if (img.beamHead && img.beamHead.complete && img.beamHead.naturalWidth > 0) {
        ctx.save(); ctx.translate(headW / 2, 0); ctx.rotate(Math.PI);
        ctx.drawImage(img.beamHead, -headW / 2, -beamW / 2, headW, beamW); ctx.restore();
      }
      ctx.restore();
    }

    if (boss2BeamState === "stunned") {
      ctx.save(); ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = "bold 16px Courier New";
      ctx.textAlign = "center"; ctx.fillText("STUNNED", boss.x + boss.width / 2, boss.y - 10); ctx.restore();
    }
  }
}

// ============================================================
// HUD RENDER
// ============================================================
function renderHUD() {
  const bx = 20, by = 20, bw = 250, bh = 28;
  ctx.fillStyle = "#1a0000"; ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = "#cc0000"; ctx.fillRect(bx, by, bw * (player.health / player.maxHealth), bh);
  ctx.strokeStyle = "#888"; ctx.lineWidth = 2; ctx.strokeRect(bx, by, bw, bh);
  ctx.save(); ctx.fillStyle = "#FFF"; ctx.font = "bold 14px Arial"; ctx.textAlign = "center";
  ctx.fillText(Math.ceil(player.health) + " / " + player.maxHealth, bx + bw / 2, by + bh - 8); ctx.restore();

  ctx.fillStyle = "#FFF";    ctx.font = "bold 18px Courier New"; ctx.fillText("Room: "  + roomNumber, 20, by + bh + 25);
  ctx.fillStyle = "#FFD700"; ctx.font = "bold 16px Courier New"; ctx.fillText("Coins: " + coinCount,  20, by + bh + 50);

  const base = playerBase, sx = canvas.width - 220, sy = 20;
  const pct = (val, b) => { const p = Math.round(((val - b) / b) * 100); return p > 0 ? ` (+${p}%)` : ""; };
  ctx.font = "bold 15px Courier New";
  ctx.fillStyle = "#ff6644"; ctx.fillText("ATK: " + player.damage          + pct(player.damage,    base.damage),    sx, sy + 20);
  ctx.fillStyle = "#4488ff"; ctx.fillText("HP: "  + player.maxHealth       + pct(player.maxHealth, base.maxHealth), sx, sy + 45);
  ctx.fillStyle = "#00ff88"; ctx.fillText("SPD: " + player.speed.toFixed(1) + pct(player.speed,    base.speed),     sx, sy + 70);

  if (boss) {
    const bBarW = 400, bBarH = 30, bBarX = canvas.width / 2 - bBarW / 2, bBarY = canvas.height - 80;
    const ratio = boss.health / boss.maxHealth;
    ctx.fillStyle = "#1a0000"; ctx.fillRect(bBarX, bBarY, bBarW, bBarH);
    ctx.fillStyle = ratio > 0.5 ? "#cc0000" : ratio > 0.25 ? "#cc6600" : "#ffff00";
    ctx.fillRect(bBarX, bBarY, bBarW * ratio, bBarH);
    ctx.strokeStyle = isBossEnraged() ? "#ffff00" : "#ff0000"; ctx.lineWidth = 2; ctx.strokeRect(bBarX, bBarY, bBarW, bBarH);
    ctx.save(); ctx.fillStyle = "#FFF"; ctx.font = "bold 14px Courier New"; ctx.textAlign = "center";
    const label = boss.type === "boss2" ? "ARCHMAGE" : "WARDEN";
    ctx.fillText((isBossEnraged() ? "⚠ ENRAGED ⚠ " : label + " ") + Math.ceil(boss.health) + " / " + boss.maxHealth, canvas.width / 2, bBarY + bBarH - 8);
    ctx.restore();
  }

  if (roomIsCleared && !isShopRoom) {
    ctx.save(); ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.font = "bold 36px Courier New"; ctx.textAlign = "center";
    ctx.fillText(isBossRoom ? "Boss Defeated!" : "Room Cleared!", canvas.width / 2, canvas.height / 2);
    ctx.font = "20px Courier New"; ctx.fillText("Walk through the door to advance.", canvas.width / 2, canvas.height / 2 + 40);
    ctx.restore();
  }
}

// ============================================================
// SHOP RENDER
// ============================================================
function renderShop() {
  const { damagePrice, healthPrice, speedPrice } = getShopPrices();
  const pw = 420, ph = 520, px = canvas.width / 2 - pw / 2, py = canvas.height / 2 - ph / 2;
  safeDrawImage(img.shopPanel, px, py, pw, ph, "#1a1200");
  ctx.save(); ctx.textAlign = "center";
  ctx.fillStyle = "#FFD700"; ctx.font = "bold 20px Courier New";
  ctx.fillText("Coins: " + coinCount, canvas.width / 2, py + 130);
  const items = [
    { label: "[1] +25% Damage — " + damagePrice + " coins", color: "#ff6644", can: coinCount >= damagePrice, y: py + 190 },
    { label: "[2] +25% Max HP — " + healthPrice + " coins", color: "#4488ff", can: coinCount >= healthPrice, y: py + 250 },
    { label: player.speed >= player.maxSpeed ? "[3] Speed MAX" : "[3] +25% Speed — " + speedPrice + " coins", color: "#00ff88", can: coinCount >= speedPrice && player.speed < player.maxSpeed, y: py + 310 },
  ];
  items.forEach(({ label, color, can, y }) => { ctx.fillStyle = can ? color : "#666666"; ctx.fillText(label, canvas.width / 2, y); });
  ctx.fillStyle = "#13d013"; ctx.font = "18px Courier New"; ctx.fillText(shopHealMessage, canvas.width / 2, py + 390);
  ctx.fillStyle = "#c9eb1c"; ctx.font = "15px Courier New"; ctx.fillText("Press 1, 2 or 3 to buy. Walk away to close.", canvas.width / 2, py + 460);
  ctx.restore();
}

// ============================================================
// GAME LOOP
// ============================================================
function gameLoop() { update(); render(); requestAnimationFrame(gameLoop); }
Promise.all(imageLoads).then(() => gameLoop());
