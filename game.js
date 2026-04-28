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
const DEV_IMMORTAL = true; // [dev] set true to disable death during testing

// ============================================================
// ASSETS
// ============================================================
const assets = {
  roomBackground:   "RoomImages/DungeonRoom3.png",
  roomCleared:      "RoomImages/ClearedDungeonRoom3.png",
  bossRoom1:        "RoomImages/WardenRoom.png",
  bossRoom1Cleared: "RoomImages/WardenRoomCleared.png",
  bossRoom2:        "RoomImages/ArchmageRoom.png",
  bossRoom2Cleared: "RoomImages/ArchmageRoomCleared.png",
  healthBarEmpty:   "UserInterface/EmptyHealthBar.png",
  healthBarFull:    "UserInterface/FullHealthBar.png",
  shopImage:        "UserInterface/MerchantTable.png",
  deathScreen:      "UserInterface/DeathScreen.png",
  menuScreen:       "UserInterface/MenuScreen.png",
  shopPanel:        "UserInterface/ShopPanel.png",
};

const img = {};
const imageLoads = Object.entries(assets).map(([key, src]) => {
  img[key] = new Image();
  img[key].src = src;
  return new Promise(res => img[key].onload = res);
});

// ============================================================
// SPRITE ANIMATION
                                             
// ============================================================
// SPRITE ANIMATION
// ============================================================
const FRAME_H = 24;
const spriteSheets = {};
const spriteLoads = [
  { key: "idle",   src: "Combat Ready Idle.png", frames: 5,  fw: 22 },
  { key: "walk",   src: "Walk.png",              frames: 6,  fw: 22 },
  { key: "run",    src: "Run.png",               frames: 6,  fw: 22 },
  { key: "attack", src: "Attack 1.png",          frames: 8,  fw: 22 },
  { key: "hit",    src: "Hit Front.png",         frames: 4,  fw: 22 },
  { key: "dead",   src: "Fall.png",              frames: 4,  fw: 22 },
].map(({ key, src, frames, fw }) => {
  

let currentAnim = "idle";
let currentFrame = 0;
let frameTimer = 0;
const FRAME_SPEED = 8;

function updateAnimation(animName) {
  if (currentAnim !== animName) { currentAnim = animName; currentFrame = 0; frameTimer = 0; }
  if (++frameTimer >= FRAME_SPEED) { frameTimer = 0; currentFrame = (currentFrame + 1) % spriteSheets[currentAnim].frames; }
}


function drawKnight(x, y, facingLeft) {
  const sheet = spriteSheets[currentAnim];
  const sx = currentFrame * sheet.fw;
  ctx.save();
  if (facingLeft) {
    ctx.translate(x + player.width, y);
    ctx.scale(-1, 1);
    ctx.drawImage(sheet.img, sx, 0, sheet.fw, FRAME_H, 0, 0, player.width, player.height);
  } else {
    ctx.drawImage(sheet.img, sx, 0, sheet.fw, FRAME_H, x, y, player.width, player.height);
  }
  ctx.restore();
}
  img[key] = new Image();
  img[key].src = src;
  return new Promise(res => img[key].onload = res);
});

// ============================================================
// BOSS ROOM HELPERS
// [Warden spawns every 10 rooms, Archmage every 20 rooms.
//  Archmage takes priority on multiples of 20.]
// ============================================================
function getBossType(room) {
  if (room % 20 === 0) return "boss2"; // Archmage every 20 rooms
  if (room % 10 === 0) return "boss1"; // Warden every 10 rooms
  return null;
}

function isBossRoomNumber(room) { return getBossType(room) !== null; }
function isShopRoomNumber(room) { return room % 5 === 0 && !isBossRoomNumber(room); }

// ============================================================
// GAME STATE
// ============================================================
let gameState = "menu"; // "menu" | "playing" | "dead"
let deathScreenTimer = 0;
let roomNumber = 1;
let roomIsCleared = false;
let fadeAlpha = 0;
let fading = false;
let fadeDirection = "out";
let isShopRoom = false;
let isBossRoom = false;
let shopOpen = false;
let shopHealMessage = "";

// [projectile arrays]
const projectiles = [];
const boss2Projectiles = [];

// [dev control panel listener]
const devChannel = new BroadcastChannel("dev_controls");
devChannel.onmessage = (e) => {
  const { type, value } = e.data;
  if (type === "setHealth")    player.health = Math.min(value, player.maxHealth);
  if (type === "setMaxHealth") { player.maxHealth = value; player.health = value; }
  if (type === "setDamage")    player.damage = value;
  if (type === "setSpeed")     player.speed = Math.min(value, player.maxSpeed);
  if (type === "setCoins")     coinCount = value;
  if (type === "setRoom")      { roomNumber = value - 1; advanceRoom(); }
  if (type === "godMode")      { player.health = 99999; player.maxHealth = 99999; player.damage = 99999; coinCount = 9999; }
  if (type === "heal")         player.health = player.maxHealth;
};

// ============================================================
// PLAYER BASE STATS
// ============================================================
const playerBase = { damage: 30, maxHealth: 100, speed: 4 };

// ============================================================
// PLAYER OBJECT
// ============================================================
const player = {
  x: canvas.width / 2.08,
  y: canvas.height / 1.35,
  width: 50, height: 50,
  speed: 4,
  maxSpeed: 13,
  color: "slategray",
  health: 100, maxHealth: 100,
  facing: "right",
  attackTimer: 0, attackCooldown: 0, attackHits: [],
  damage: 30
};

// ============================================================
// KNOCKBACK CONFIG
// Per enemy type: force = initial pixel push, decay = multiplier per frame (lower = stops faster)
// Bosses are intentionally excluded — no knockback applied to boss entities.
// ============================================================
const knockbackConfig = {
  speeder: { force: 28, decay: 0.72 }, // [speeder knockback] lightest enemy, flies back the most
  common:  { force: 14, decay: 0.75 }, // [common knockback]  standard bounce
  ranged:  { force: 12, decay: 0.74 }, // [ranged knockback]  similar to common, slightly less
  tank:    { force:  4, decay: 0.65 }, // [tank knockback]    heavy, barely budges
};

// ============================================================
// COIN SYSTEM
// ============================================================
const coins = [];
let coinCount = 0;

// ============================================================
// SHOP SYSTEM
// ============================================================
const shopBox = {
  x: canvas.width / 2 - 25,
  y: canvas.height / 2 - 25,
  width: 50, height: 50
};
const shopProximity = 150;

function getShopPrices() {
  const mult = 1 + (Math.floor(roomNumber / 5) * 0.5);
  return {
    damagePrice: Math.floor(8  * mult),
    healthPrice: Math.floor(12 * mult),
    speedPrice:  Math.floor(8  * mult)
  };
}

// ============================================================
// BOSS STATE (shared by boss1 + boss2)
// ============================================================
let boss = null;

// [boss1 charge state]
let bossChargeState = "idle";
let bossChargeTimer = 0;
let bossChargeCooldown = 0;
let bossChargeTargetX = 0, bossChargeTargetY = 0;
let bossTelegraphFlash = 0;
let bossChargeDamageDealt = false;

// [boss1 aoe state]
let bossAoeState = "idle";
let bossAoeRadius = 0;
const bossAoeMaxRadius = 300; // [boss1 aoe size]
let bossAoeCenterX = 0, bossAoeCenterY = 0;
let bossAoeDamageDealt = false;

// [boss1 timed minion wave]
let boss1MinionTimer = 0;
const BOSS1_MINION_INTERVAL = 400; // [boss1 minion wave interval] ~15 sec at 60fps

// [boss2 attack state]
let boss2ShootTimer = 0;
let boss2ShootCooldown = 160;  // [boss2 shoot cooldown] frames
let boss2RainTimer = 0;
let boss2RainCooldown = 240;   // [boss2 rain cooldown] 4 sec at 60fps
let boss2RainWarnings = [];
let boss2BeamState = "idle";   // "idle" | "windup" | "firing" | "stunned"
let boss2BeamTimer = 0;
let boss2BeamCooldown = 0;
let boss2BeamX = 0, boss2BeamY = 0;
let boss2BeamDamageDealt = false;
const BOSS2_RAIN_RADIUS = 100; // [magic rain radius]

function getChargeCooldown() {
  const enraged = boss && boss.health <= boss.maxHealth * 0.25;
  return Math.floor(Math.random() * (enraged ? 100 : 140)) + (enraged ? 40 : 80);
}

// ============================================================
// BOSS ENCOUNTER COUNTERS
// 0-based: n=0 on first encounter, n=1 on second, etc.
// Counter is read INSIDE createBoss, then incremented AFTER in advanceRoom.
// ============================================================
let boss1Count = 0; // [warden encounter index, 0-based]
let boss2Count = 0; // [archmage encounter index, 0-based]

// [boss factory] — bossType: "boss1" | "boss2"
function createBoss(bossType) {
  const base = {
    x: canvas.width / 2 - 60,
    y: canvas.height / 2 - 200,
    width: 120, height: 120,
    type: bossType
  };

  if (bossType === "boss1") {
    const n = boss1Count; // [0 = first Warden, 1 = second, ...]
    // [boss1 HP] ~20-100 hits at expected ATK. Formula: 1400 * 4^n
    // n=0:1 400 | n=1:5 600 | n=2:22 400 | n=3:89 600 | n=4:358 400
    const hp  = Math.floor(1400 * Math.pow(4, n));
    const spd = Math.min(0.8 + n * 0.55, 5.0); // [boss1 speed] cap 5.0
    return {
      ...base,
      speed: spd, baseSpeed: spd,
      color: "#8B0000",
      health: hp, maxHealth: hp,
      damage:     1.5 + n * 2.5,   // [boss1 contact damage per frame]
      dashDamage: 0.35 + n * 0.07, // [boss1 dash damage] % of player max HP
      aoeDamage:  0.22 + n * 0.05, // [boss1 aoe damage]  % of player max HP
      coinDrop:   30 + n * 20
    };
  }

  // boss2 — Archmage
  const n = boss2Count; // [0 = first Archmage, 1 = second, ...]
  // [boss2 HP] ~33-200 hits at expected ATK. Formula: 5000 * 3.8^n
  // n=0:5 000 | n=1:19 000 | n=2:72 200 | n=3:274 360 | n=4:1 042 568
  const hp  = Math.floor(5000 * Math.pow(3.8, n));
  const spd = Math.min(1.2 + n * 0.65, 5.5); // [boss2 speed] cap 5.5
  return {
    ...base,
    speed: spd, baseSpeed: spd,
    color: "#4400aa",
    health: hp, maxHealth: hp,
    damage:           1.2 + n * 2.0,   // [boss2 contact damage per frame]
    projectileDamage: 10  + n * 18,    // [boss2 projectile damage]
    rainDamage:       0.6  + n * 0.5,  // [boss2 rain damage per frame inside circle]
    beamDamage:       0.75 + n * 0.10, // [boss2 beam damage] % of player max HP
    coinDrop:         45 + n * 30
  };
}

// ============================================================
// ENEMY SYSTEM
// ============================================================
const enemies = [];

function spawnEnemies() {
  if (isShopRoom || isBossRoom) return;

  const speed  = 1.5 + roomNumber * 0.1;
  const hp     = 20  + roomNumber * 5;
  const counts = {
    common:  Math.min(3 + Math.floor(roomNumber * 0.4), 4),
    tank:    Math.min(Math.floor(roomNumber / 4), 3),
    speeder: Math.min(Math.floor(roomNumber / 3), 3),
    ranged:  Math.min(Math.floor(roomNumber / 4), 3)
  };

  const list = Object.entries(counts)
    .flatMap(([type, n]) => Array(n).fill(type))
    .sort(() => Math.random() - 0.5)
    .slice(0, 10); // [enemy total cap]

  const configs = {
    common:  { width: 40, height: 40, speedMult: 1,    hpMult: 1,   color: "crimson"  },
    tank:    { width: 55, height: 55, speedMult: 0.5,  hpMult: 3,   color: "#8B0000"  }, // [tank config]
    speeder: { width: 25, height: 25, speedMult: 2,    hpMult: 0.3, color: "#ff8800"  }, // [speeder config]
    ranged:  { width: 35, height: 35, speedMult: 0.8,  hpMult: 0.9, color: "#66ccff"  }  // [ranged config]
  };

  list.forEach(type => {
    let ex, ey, attempts = 0;
    do {
      ex = Math.random() * (canvas.width  - 550) + 275;
      ey = Math.random() * (canvas.height - 340) + 180;
    } while (Math.sqrt((ex - player.x) ** 2 + (ey - player.y) ** 2) < 200 && ++attempts < 20);

    const c = configs[type];
    const enemy = {
      x: ex, y: ey,
      width: c.width, height: c.height,
      speed: speed * c.speedMult,
      color: c.color,
      health: hp * c.hpMult,
      type,
      knockbackVx: 0, knockbackVy: 0 // [knockback velocity, initialised to 0]
    };
    if (type === "ranged") { enemy.shootTimer = 0; enemy.shootCooldown = 150; } // [ranged shoot cooldown]
    enemies.push(enemy);
  });
}

// ============================================================
// DOOR / EXIT (hoisted — reused in update + render)
// ============================================================
function getExitDoor() {
  return isBossRoom
    ? { x: canvas.width / 2 - 60, y: 150, width: 120, height: 40 }  // [boss room door y]
    : { x: canvas.width / 2 - 60, y: 120, width: 120, height: 40 }; // [normal room door y]
}

// ============================================================
// BOSS STATE RESET
// ============================================================
function resetBossState() {
  boss = null;
  bossChargeState = "idle"; bossChargeTimer = bossChargeCooldown = 0;
  bossChargeDamageDealt = false;
  bossAoeState = "idle";    bossAoeRadius = 0;
  bossAoeDamageDealt = false;
  boss2BeamState = "idle";  boss2BeamTimer = boss2ShootTimer = 0;
  boss2RainTimer = boss2RainCooldown;     // [start at full cooldown to avoid instant trigger]
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
  roomIsCleared = false;
  shopOpen = false;
  shopHealMessage = "";
  resetBossState(); // also clears boss2Projectiles

  // [boss / shop flags derived from room number helpers]
  isBossRoom = isBossRoomNumber(roomNumber);
  isShopRoom = isShopRoomNumber(roomNumber);

  if (isShopRoom) {
    roomIsCleared = true;
    const heal = player.maxHealth * 0.5;
    player.health = Math.min(player.maxHealth, player.health + heal);
    shopHealMessage = "You were healed for " + Math.floor(heal) + " HP!";
  }

  if (isBossRoom) {
    // [boss schedule] multiples of 20 = Archmage, other multiples of 10 = Warden
    // createBoss reads the counter BEFORE increment so n is 0-based correctly.
    const bossType = getBossType(roomNumber);
    boss = createBoss(bossType);
    if (bossType === "boss1") boss1Count++; // [increment AFTER create]
    if (bossType === "boss2") boss2Count++;
    bossChargeCooldown = 60;
    boss2BeamCooldown  = 180;
  }

  player.x = canvas.width / 2.08;
  player.y = canvas.height / 1.35;
  enemies.length = coins.length = projectiles.length = 0;
  spawnEnemies();
}

// ============================================================
// RESTART
// ============================================================
function restartGame() {
  player.x = canvas.width / 2.08;
  player.y = canvas.height / 1.35;
  player.health = player.maxHealth = 100;
  player.damage = 30;  // [player starting damage]
  player.speed  = 4;   // [player starting speed]
  player.attackTimer = player.attackCooldown = 0;
  player.attackHits = [];

  roomNumber = 1;
  roomIsCleared = isShopRoom = isBossRoom = shopOpen = false;
  shopHealMessage = "";
  coinCount = 0;
  fading = false; fadeAlpha = 0;
  boss1Count = boss2Count = 0; // [reset boss encounter counters on restart]
  resetBossState();

  enemies.length = coins.length = projectiles.length = 0;
  spawnEnemies();
  gameState = "playing";
}

// ============================================================
// INPUT
// ============================================================
const keys = {};
window.addEventListener("keydown", e => { keys[e.key] = true; });
window.addEventListener("keyup",   e => { keys[e.key] = false; });
window.addEventListener("mousedown", e => { if (e.button === 0) keys["click"] = true; });
window.addEventListener("mouseup",   e => { if (e.button === 0) keys["click"] = false; });

window.addEventListener("keydown", e => {
  if (gameState === "menu" && e.code === "Space") restartGame();
  else if (gameState === "dead" && deathScreenTimer <= 0 && e.code === "Space") restartGame();
});

window.addEventListener("keydown", e => {
  if (!shopOpen) return;
  const { damagePrice, healthPrice, speedPrice } = getShopPrices();
  if (e.key === "1" && coinCount >= damagePrice) { coinCount -= damagePrice; player.damage = Math.floor(player.damage * 1.25); }           // [shop damage multiplier]
  if (e.key === "2" && coinCount >= healthPrice) { coinCount -= healthPrice; player.maxHealth = Math.floor(player.maxHealth * 1.25); player.health = player.maxHealth; } // [shop health multiplier]
  if (e.key === "3" && coinCount >= speedPrice)  { coinCount -= speedPrice;  player.speed = Math.min(parseFloat((player.speed * 1.25).toFixed(2)), player.maxSpeed); }    // [shop speed multiplier]
});

// ============================================================
// COLLISION
// ============================================================
function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}

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
    if (keys["w"] || keys["ArrowUp"])    player.y -= player.speed;
    if (keys["s"] || keys["ArrowDown"])  player.y += player.speed;
    if (keys["a"] || keys["ArrowLeft"])  player.x -= player.speed;
    if (keys["d"] || keys["ArrowRight"]) player.x += player.speed;

    // [wall bounds]
    if (isBossRoom) {
      player.x = Math.max(160, Math.min(canvas.width  - player.width  - 160, player.x));
      player.y = Math.max(180, Math.min(canvas.height - player.height - 80,  player.y));
    } else {
      player.x = Math.max(90,  Math.min(canvas.width  - player.width  - 90,  player.x));
      player.y = Math.max(100, Math.min(canvas.height - player.height - 70,  player.y));
    }

    if (!isShopRoom) {
      updateEnemies();
      updateAttack();
      updateBoss();
      if (DEV_IMMORTAL) {
        player.health = Math.max(1, player.health);
      } else {
        player.health = Math.max(0, player.health);
        if (player.health <= 0) { gameState = "dead"; deathScreenTimer = 120; return; }
      }
      updateCoins();
      if (!isBossRoom && enemies.length === 0 && !roomIsCleared) roomIsCleared = true;
    }

    if (isShopRoom) {
      const px = player.x + player.width  / 2, py = player.y + player.height / 2;
      const sx = shopBox.x + shopBox.width / 2, sy = shopBox.y + shopBox.height / 2;
      shopOpen = Math.sqrt((px - sx) ** 2 + (py - sy) ** 2) < shopProximity;
    }

    if (roomIsCleared && rectsOverlap(player, getExitDoor())) { fading = true; fadeDirection = "out"; }
  }

  // [fade transition]
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
    // [apply and decay knockback velocity before any other movement]
    if (enemy.knockbackVx) {
      enemy.x += enemy.knockbackVx;
      enemy.knockbackVx *= knockbackConfig[enemy.type]?.decay ?? 0.75;
      if (Math.abs(enemy.knockbackVx) < 0.1) enemy.knockbackVx = 0;
    }
    if (enemy.knockbackVy) {
      enemy.y += enemy.knockbackVy;
      enemy.knockbackVy *= knockbackConfig[enemy.type]?.decay ?? 0.75;
      if (Math.abs(enemy.knockbackVy) < 0.1) enemy.knockbackVy = 0;
    }

    const dx = player.x - enemy.x, dy = player.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    if (enemy.type === "ranged") {
      const pref = 300; // [ranged preferred distance]
      if (dist > pref + 40) {
        enemy.x += (dx / dist) * enemy.speed;
        enemy.y += (dy / dist) * enemy.speed;
      } else if (dist < pref - 40) {
        enemy.x -= (dx / dist) * enemy.speed;
        enemy.y -= (dy / dist) * enemy.speed;
        enemy.x = Math.max(260, Math.min(canvas.width  - enemy.width  - 260, enemy.x));
        enemy.y = Math.max(170, Math.min(canvas.height - enemy.height - 140, enemy.y));
      }
      if (--enemy.shootTimer <= 0) {
        enemy.shootTimer = enemy.shootCooldown;
        projectiles.push({ x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2,
          vx: (dx / dist) * 4, vy: (dy / dist) * 4,    // [ranged projectile speed]
          width: 10, height: 10 });
      }
    } else {
      enemy.x += (dx / dist) * enemy.speed;
      enemy.y += (dy / dist) * enemy.speed;
    }

    if (enemy.type !== "ranged" && rectsOverlap(player, enemy)) {
      const dmg = enemy.type === "tank"    ? 1.5 + roomNumber * 0.2   // [tank damage]
                : enemy.type === "speeder" ? 0.2 + roomNumber * 0.05  // [speeder damage]
                :                            0.5 + roomNumber * 0.1;  // [common damage]
      contactDamage(enemy, dmg);
    }
  });

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) { projectiles.splice(i, 1); continue; }
    if (rectsOverlap(p, player)) { player.health -= 8 + roomNumber * 0.4; projectiles.splice(i, 1); } // [ranged projectile damage]
  }
}

// ============================================================
// BOSS UPDATE
// ============================================================
function updateBoss() {
  if (!boss) return;

  if (boss.type === "boss1") updateBoss1();
  if (boss.type === "boss2") updateBoss2();

  // [boss1 timed minion waves] every ~15 sec, 8–15 minions
  if (boss.type === "boss1" && boss.health > 0) {
    if (--boss1MinionTimer <= 0) {
      boss1MinionTimer = BOSS1_MINION_INTERVAL;
      const count = Math.floor(Math.random() * 8) + 8; // [boss1 minion wave count] 8–15
      for (let i = 0; i < count; i++) {
        let ex, ey, attempts = 0;
        do {
          ex = Math.random() * (canvas.width  - 550) + 275;
          ey = Math.random() * (canvas.height - 340) + 180;
        } while (Math.sqrt((ex - player.x) ** 2 + (ey - player.y) ** 2) < 150 && ++attempts < 20);
        enemies.push({ x: ex, y: ey, width: 25, height: 25,
          speed: (1.5 + roomNumber * 0.1) * 0.5,
          color: "#cc4400", health: 20 + roomNumber * 3, type: "common",
          knockbackVx: 0, knockbackVy: 0 }); // [minions also have knockback fields]
      }
    }
  }

  // [boss death — coin drop + heal + clear]
  if (boss.health <= 0) {
    for (let i = 0; i < boss.coinDrop; i++)
      coins.push({ x: boss.x + Math.random() * boss.width, y: boss.y + Math.random() * boss.height, width: 10, height: 10 });
    player.health = player.maxHealth;
    resetBossState(); // clears boss, boss2Projectiles, warnings, etc.
    roomIsCleared = true;
  }
}

function updateBoss1() {
  const enraged = boss.health <= boss.maxHealth * 0.5;
  if (enraged) { boss.speed = boss.baseSpeed * 4; boss.damage = 3; boss.color = "#ff0000"; } // [boss1 enraged]

  if (bossChargeState === "idle" && bossAoeState === "idle") {
    if (--bossChargeCooldown <= 0) {
      const dx = player.x + player.width / 2 - (boss.x + boss.width / 2);
      const dy = player.y + player.height / 2 - (boss.y + boss.height / 2);
      if (Math.sqrt(dx * dx + dy * dy) < 200) {
        bossAoeState = "expanding"; bossAoeRadius = 0;
        bossAoeCenterX = boss.x + boss.width / 2;
        bossAoeCenterY = boss.y + boss.height / 2;
        bossAoeDamageDealt = false;
      } else {
        bossChargeTargetX = player.x; bossChargeTargetY = player.y;
        bossChargeState = "telegraphing"; bossChargeTimer = 28;
        bossTelegraphFlash = 0; bossChargeDamageDealt = false;
      }
      bossChargeCooldown = getChargeCooldown();
    }
  }

  if (bossChargeState === "telegraphing") {
    bossTelegraphFlash++;
    if (--bossChargeTimer <= 0) { bossChargeState = "dashing"; bossChargeTimer = 30; }
  }

  if (bossChargeState === "dashing") {
    const dx = bossChargeTargetX - boss.x, dy = bossChargeTargetY - boss.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    boss.x += (dx / dist) * 60; boss.y += (dy / dist) * 60; // [boss1 dash speed]
    if (!bossChargeDamageDealt && rectsOverlap(player, boss)) {
      player.health -= player.maxHealth * boss.dashDamage;
      bossChargeDamageDealt = true; bossChargeState = "cooldown"; bossChargeTimer = 40;
    }
    if (--bossChargeTimer <= 0) { bossChargeState = "cooldown"; bossChargeTimer = 40; }
  }

  if (bossChargeState === "cooldown" && --bossChargeTimer <= 0) bossChargeState = "idle";

  if (bossAoeState === "expanding") {
    bossAoeRadius += 4; // [boss1 aoe expansion speed]
    if (!bossAoeDamageDealt) {
      const px = player.x + player.width / 2, py = player.y + player.height / 2;
      const d = Math.sqrt((px - bossAoeCenterX) ** 2 + (py - bossAoeCenterY) ** 2);
      if (bossAoeRadius >= d - 20 && bossAoeRadius <= d + 20) {
        player.health -= player.maxHealth * boss.aoeDamage;
        bossAoeDamageDealt = true;
      }
    }
    if (bossAoeRadius >= bossAoeMaxRadius) {
      bossAoeState = "idle"; bossAoeRadius = 0; bossChargeCooldown = getChargeCooldown();
    }
  }

  if ((bossChargeState === "idle" || bossChargeState === "cooldown") && bossAoeState === "idle") {
    const dx = player.x - boss.x, dy = player.y - boss.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    boss.x += (dx / dist) * boss.speed; boss.y += (dy / dist) * boss.speed;
  }

  if (bossChargeState !== "dashing" && rectsOverlap(player, boss)) contactDamage(boss, boss.damage);
}

function updateBoss2() {
  const enraged = boss.health <= boss.maxHealth * 0.5;
  if (enraged) { boss.speed = boss.baseSpeed * 2; boss.damage = 2.5; boss.color = "#7700ff"; } // [boss2 enraged]

  const dx = player.x + player.width / 2 - (boss.x + boss.width / 2);
  const dy = player.y + player.height / 2 - (boss.y + boss.height / 2);
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const pref = 300; // [boss2 preferred distance]

  if (boss2BeamState === "idle" || boss2BeamState === "stunned") {
    if (dist > pref + 50)      { boss.x += (dx / dist) * boss.speed; boss.y += (dy / dist) * boss.speed; }
    else if (dist < pref - 50) { boss.x -= (dx / dist) * boss.speed; boss.y -= (dy / dist) * boss.speed; }
    boss.x = Math.max(260, Math.min(canvas.width  - boss.width  - 260, boss.x));
    boss.y = Math.max(170, Math.min(canvas.height - boss.height - 140, boss.y));
  }

  if (rectsOverlap(player, boss)) contactDamage(boss, boss.damage);

  // [boss2 spread shot]
  if (boss2BeamState !== "firing" && boss2BeamState !== "windup" && --boss2ShootTimer <= 0) {
    boss2ShootTimer = boss2ShootCooldown;
    const base = Math.atan2(dy, dx);
    [-0.2, 0, 0.2].forEach(offset => { // [boss2 spread angles]
      const a = base + offset;
      boss2Projectiles.push({ x: boss.x + boss.width / 2, y: boss.y + boss.height / 2,
        vx: Math.cos(a) * 5, vy: Math.sin(a) * 5, // [boss2 projectile speed]
        width: 22, height: 22, type: "normal" });
    });
  }

  // [magic rain trigger]
  if (--boss2RainTimer <= 0) {
    boss2RainTimer = boss2RainCooldown;
    const count = 5 + Math.floor(roomNumber / 10); // [magic rain count]
    for (let i = 0; i < count; i++)
      boss2RainWarnings.push({
        x: Math.random() * (canvas.width  - 550) + 275,
        y: Math.random() * (canvas.height - 340) + 180,
        timer: 30, radius: BOSS2_RAIN_RADIUS // [magic rain warning duration] 0.5 sec
      });
  }

  // [magic rain warnings tick + land]
  for (let i = boss2RainWarnings.length - 1; i >= 0; i--) {
    if (--boss2RainWarnings[i].timer <= 0) {
      const w = boss2RainWarnings[i];
      boss2Projectiles.push({ x: w.x, y: w.y, vx: 0, vy: 0,
        width: w.radius * 2, height: w.radius * 2,
        type: "rain", linger: 40 }); // [magic rain linger duration] frames
      boss2RainWarnings.splice(i, 1);
    }
  }

  // [beam cooldown / windup / fire / stun cycle]
  if (boss2BeamState === "idle" && --boss2BeamCooldown <= 0) {
    boss2BeamState = "windup"; boss2BeamTimer = 45; // [beam windup duration] frames
    boss2BeamX = player.x + player.width / 2;
    boss2BeamY = player.y + player.height / 2;
    boss2BeamDamageDealt = false;
  }
  if (boss2BeamState === "windup" && --boss2BeamTimer <= 0) {
    boss2BeamState = "firing"; boss2BeamTimer = 20; // [beam fire duration] frames
  }
  if (boss2BeamState === "firing") {
    if (!boss2BeamDamageDealt) {
      const beamW = boss.width * 1.5; // [beam width]
      const bcx = boss.x + boss.width / 2, bcy = boss.y + boss.height / 2;
      const angle = Math.atan2(boss2BeamY - bcy, boss2BeamX - bcx);
      const pdx = player.x + player.width / 2 - bcx;
      const pdy = player.y + player.height / 2 - bcy;
      const proj = pdx * Math.cos(angle) + pdy * Math.sin(angle);
      const perp = Math.abs(-pdx * Math.sin(angle) + pdy * Math.cos(angle));
      if (proj > 0 && perp < beamW / 2) {
        player.health -= player.maxHealth * boss.beamDamage;
        boss2BeamDamageDealt = true;
      }
    }
    if (--boss2BeamTimer <= 0) {
      boss2BeamState = "stunned";
      boss2BeamTimer    = 180;                        // [beam stun duration] 3 sec
      boss2BeamCooldown = enraged ? 300 : 480;        // [beam cooldown]
    }
  }
  if (boss2BeamState === "stunned" && --boss2BeamTimer <= 0) boss2BeamState = "idle";

  // [boss2 projectile movement + damage]
  for (let i = boss2Projectiles.length - 1; i >= 0; i--) {
    const p = boss2Projectiles[i];
    if (p.type === "rain") {
      const d = Math.sqrt((player.x + player.width / 2 - p.x) ** 2 + (player.y + player.height / 2 - p.y) ** 2);
      if (d < BOSS2_RAIN_RADIUS + 25) player.health -= boss.rainDamage + roomNumber * 0.05; // [boss2 rain damage]
      if (--p.linger <= 0) boss2Projectiles.splice(i, 1);
      continue;
    }
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) { boss2Projectiles.splice(i, 1); continue; }
    if (rectsOverlap(p, player)) {
      player.health -= boss.projectileDamage + roomNumber * 0.3; // [boss2 projectile damage]
      boss2Projectiles.splice(i, 1);
    }
  }
}

// ============================================================
// ATTACK UPDATE
// ============================================================
function updateAttack() {
  if (keys["w"] || keys["ArrowUp"])    player.facing = "up";
  if (keys["s"] || keys["ArrowDown"])  player.facing = "down";
  if (keys["a"] || keys["ArrowLeft"])  player.facing = "left";
  if (keys["d"] || keys["ArrowRight"]) player.facing = "right";

  if ((keys[" "] || keys["click"]) && player.attackCooldown <= 0) {
    player.attackTimer    = 8;  // [attack duration]
    player.attackCooldown = 18; // [attack cooldown]
    player.attackHits = [];
  }
  if (player.attackTimer    > 0) player.attackTimer--;
  if (player.attackCooldown > 0) player.attackCooldown--;
  const animName = player.attackTimer > 0 ? "attack"
    : (keys["w"] || keys["s"] || keys["a"] || keys["d"] || keys["ArrowUp"] || keys["ArrowDown"] || keys["ArrowLeft"] || keys["ArrowRight"]) ? (player.speed > 6 ? "run" : "walk")
    : "idle";
  updateAnimation(animName);

  if (player.attackTimer > 0) {
    const attackBox = getAttackBox();

    enemies.forEach((enemy, i) => {
      if (rectsOverlap(attackBox, enemy) && !player.attackHits.includes(i)) {
        enemy.health -= player.damage;
        player.attackHits.push(i);

        // [apply knockback — direction away from player, force varies by enemy type]
        const kb = knockbackConfig[enemy.type] ?? knockbackConfig.common;
        const kbDx = enemy.x - player.x, kbDy = enemy.y - player.y;
        const kbDist = Math.sqrt(kbDx * kbDx + kbDy * kbDy) || 1;
        enemy.knockbackVx = (kbDx / kbDist) * kb.force;
        enemy.knockbackVy = (kbDy / kbDist) * kb.force;
      }
    });

    // [bosses intentionally receive no knockback — they are too large to be pushed]
    if (boss && rectsOverlap(attackBox, boss) && !player.attackHits.includes("boss")) {
      boss.health -= player.damage;
      player.attackHits.push("boss");
    }

    for (let i = enemies.length - 1; i >= 0; i--) {
      if (enemies[i].health <= 0) {
        const drop = enemies[i].type === "tank" ? 3 : enemies[i].type === "ranged" ? 2 : 1;
        for (let c = 0; c < drop; c++)
          coins.push({ x: enemies[i].x + Math.random() * enemies[i].width, y: enemies[i].y + Math.random() * enemies[i].height, width: 10, height: 10 });
        enemies.splice(i, 1);
      }
    }
  }
}

function getAttackBox() {
  const hw = 60, hh = 60;
  const dirs = {
    right: { x: player.x + player.width, y: player.y - 5 },
    left:  { x: player.x - hw,           y: player.y - 5 },
    down:  { x: player.x - 5,            y: player.y + player.height },
    up:    { x: player.x - 5,            y: player.y - hh }
  };
  return { ...dirs[player.facing], width: hw, height: hh };
}

// ============================================================
// COIN UPDATE
// ============================================================
function updateCoins() {
  const px = player.x + player.width / 2, py = player.y + player.height / 2;
  for (let i = coins.length - 1; i >= 0; i--) {
    const d = Math.sqrt((coins[i].x + 5 - px) ** 2 + (coins[i].y + 5 - py) ** 2);
    if (d < 60) { coinCount++; coins.splice(i, 1); } // [coin pickup radius]
  }
}

// ============================================================
// RENDER
// ============================================================
function render() {
  if (gameState === "menu") {
    ctx.drawImage(img.menuScreen, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, canvas.height - 80, canvas.width, 80);
    const pulse = 0.6 + Math.sin(Date.now() / 500) * 0.4;
    ctx.textAlign = "center";
    ctx.fillStyle = `rgba(255,220,100,${pulse})`;
    ctx.font = "bold 26px Courier New";
    ctx.fillText("Press Space to Play", canvas.width / 2, canvas.height - 30);
    ctx.textAlign = "left";
    return;
  }

  // [background — pick based on room type, boss type, and cleared state]
  let bgImage;
  const bossType = getBossType(roomNumber);
  if (bossType === "boss1") bgImage = roomIsCleared ? img.bossRoom1Cleared : img.bossRoom1;
  else if (bossType === "boss2") bgImage = roomIsCleared ? img.bossRoom2Cleared : img.bossRoom2;
  else bgImage = roomIsCleared ? img.roomCleared : img.roomBackground;
  ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);

 // [draw player]
  drawKnight(player.x, player.y, player.facing === "left");
  enemies.forEach(e => { ctx.fillStyle = e.color; ctx.fillRect(e.x, e.y, e.width, e.height); });

  if (boss) renderBoss();

  ctx.fillStyle = "#FFD700";
  coins.forEach(c => ctx.fillRect(c.x, c.y, c.width, c.height));

  ctx.fillStyle = "#66ccff";
  projectiles.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill(); });

  renderHUD();

  if (player.attackTimer > 0) {
    const b = getAttackBox();
    ctx.fillStyle = "rgba(255,220,0,0.4)";
    ctx.fillRect(b.x, b.y, b.width, b.height);
  }

  if (isShopRoom) {
    ctx.drawImage(img.shopImage, shopBox.x - 100, shopBox.y - 50, 250, 200);
    ctx.fillStyle = "#FFFFFF"; ctx.font = "bold 20px Courier New"; ctx.textAlign = "center";
    ctx.fillText("SHOP", shopBox.x + shopBox.width / 2, shopBox.y - 55);
    ctx.textAlign = "left";
  }

  if (shopOpen) renderShop();

  if (gameState === "dead") {
    ctx.drawImage(img.deathScreen, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, canvas.height - 70, canvas.width, 70);
    ctx.textAlign = "center";
    ctx.fillStyle = "#888888"; ctx.font = "18px Courier New";
    ctx.fillText("Reached Room " + roomNumber + "   |   Press any key to Restart", canvas.width / 2, canvas.height - 28);
    ctx.textAlign = "left";
  }

  if (fadeAlpha > 0) { ctx.fillStyle = `rgba(0,0,0,${fadeAlpha})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
}

// ============================================================
// BOSS RENDER
// ============================================================
function renderBoss() {
  const enraged = boss.health <= boss.maxHealth * 0.25;
  ctx.fillStyle = boss.color;
  ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
  ctx.strokeStyle = enraged ? "#ffff00" : "#ff0000";
  ctx.lineWidth   = enraged ? 5 : 3;
  ctx.strokeRect(boss.x, boss.y, boss.width, boss.height);

  if (boss.type === "boss1") {
    if (bossChargeState === "telegraphing" && Math.floor(bossTelegraphFlash / 3) % 2 === 0) {
      ctx.fillStyle = "rgba(255,0,0,0.25)";
      ctx.fillRect(bossChargeTargetX - 30, bossChargeTargetY - 30, player.width + 60, player.height + 60);
      ctx.strokeStyle = "rgba(255,0,0,0.9)"; ctx.lineWidth = 2;
      ctx.strokeRect(bossChargeTargetX - 30, bossChargeTargetY - 30, player.width + 60, player.height + 60);
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
    boss2RainWarnings.forEach(w => {
      const alpha = 0.3 + (1 - w.timer / 30) * 0.5;
      ctx.beginPath(); ctx.arc(w.x, w.y, w.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,0,0,${alpha})`; ctx.fill();
      ctx.strokeStyle = "rgba(255,100,0,0.8)"; ctx.lineWidth = 2; ctx.stroke();
    });

    boss2Projectiles.forEach(p => {
      ctx.beginPath();
      if (p.type === "rain") {
        ctx.arc(p.x, p.y, BOSS2_RAIN_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,150,255,0.5)"; ctx.fill();
        ctx.strokeStyle = "#66ccff"; ctx.lineWidth = 2; ctx.stroke();
      } else {
        ctx.arc(p.x, p.y, 14, 0, Math.PI * 2); // [boss2 projectile render size]
        ctx.fillStyle = "#cc88ff"; ctx.fill();
      }
    });

    if (boss2BeamState === "windup" && Math.floor(Date.now() / 80) % 2 === 0) {
      ctx.beginPath();
      ctx.moveTo(boss.x + boss.width / 2, boss.y + boss.height / 2);
      ctx.lineTo(boss2BeamX, boss2BeamY);
      ctx.strokeStyle = "rgba(200,100,255,0.5)"; ctx.lineWidth = 4; ctx.stroke();
    }

    if (boss2BeamState === "firing") {
      const bcx = boss.x + boss.width / 2, bcy = boss.y + boss.height / 2;
      const angle = Math.atan2(boss2BeamY - bcy, boss2BeamX - bcx);
      const beamW = boss.width * 1.5; // [beam render width]
      ctx.save(); ctx.translate(bcx, bcy); ctx.rotate(angle);
      ctx.fillStyle = "rgba(180,80,255,0.3)";   ctx.fillRect(0, -beamW,           2000, beamW * 2);
      ctx.fillStyle = "rgba(220,150,255,0.9)";  ctx.fillRect(0, -beamW / 3,       2000, (beamW / 3) * 2);
      ctx.fillStyle = "rgba(255,255,255,0.95)"; ctx.fillRect(0, -beamW / 8,       2000, (beamW / 8) * 2);
      ctx.restore();
    }

    if (boss2BeamState === "stunned") {
      ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.font = "bold 16px Courier New";
      ctx.textAlign = "center"; ctx.fillText("STUNNED", boss.x + boss.width / 2, boss.y - 10); ctx.textAlign = "left";
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
  ctx.fillStyle = "#FFF"; ctx.font = "bold 14px Arial"; ctx.textAlign = "center";
  ctx.fillText(Math.ceil(player.health) + " / " + player.maxHealth, bx + bw / 2, by + bh - 8);
  ctx.textAlign = "left";

  ctx.fillStyle  = "#FFF";    ctx.font = "bold 18px Courier New"; ctx.fillText("Room: "  + roomNumber, 20, by + bh + 25);
  ctx.fillStyle  = "#FFD700"; ctx.font = "bold 16px Courier New"; ctx.fillText("Coins: " + coinCount,  20, by + bh + 50);

  const base = playerBase, sx = canvas.width - 220, sy = 20;
  ctx.font = "bold 15px Courier New";
  const pct = (val, b) => { const p = Math.round(((val - b) / b) * 100); return p > 0 ? ` (+${p}%)` : ""; };
  ctx.fillStyle = "#ff6644"; ctx.fillText("ATK: " + player.damage             + pct(player.damage,    base.damage),     sx, sy + 20);
  ctx.fillStyle = "#4488ff"; ctx.fillText("HP:  " + player.maxHealth           + pct(player.maxHealth, base.maxHealth),  sx, sy + 45);
  ctx.fillStyle = "#00ff88"; ctx.fillText("SPD: " + player.speed.toFixed(1)   + pct(player.speed,     base.speed),      sx, sy + 70);

  if (boss) {
    const bBarW = 400, bBarH = 30;
    const bBarX = canvas.width / 2 - bBarW / 2, bBarY = canvas.height - 80;
    const ratio = boss.health / boss.maxHealth;
    ctx.fillStyle = "#1a0000"; ctx.fillRect(bBarX, bBarY, bBarW, bBarH);
    ctx.fillStyle = ratio > 0.5 ? "#cc0000" : ratio > 0.25 ? "#cc6600" : "#ffff00";
    ctx.fillRect(bBarX, bBarY, bBarW * ratio, bBarH);
    ctx.strokeStyle = ratio <= 0.25 ? "#ffff00" : "#ff0000"; ctx.lineWidth = 2; ctx.strokeRect(bBarX, bBarY, bBarW, bBarH);
    ctx.fillStyle = "#FFF"; ctx.font = "bold 14px Courier New"; ctx.textAlign = "center";
    const label = boss.type === "boss2" ? "ARCHMAGE" : "WARDEN"; // [boss names]
    ctx.fillText((ratio <= 0.25 ? "⚠ ENRAGED ⚠  " : label + "  ") + Math.ceil(boss.health) + " / " + boss.maxHealth, canvas.width / 2, bBarY + bBarH - 8);
    ctx.textAlign = "left";
  }

  if (roomIsCleared && !isShopRoom) {
    ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.font = "bold 36px Courier New"; ctx.textAlign = "center";
    ctx.fillText(isBossRoom ? "Boss Defeated!" : "Room Cleared!", canvas.width / 2, canvas.height / 2);
    ctx.font = "20px Courier New";
    ctx.fillText("Walk through the door to advance.", canvas.width / 2, canvas.height / 2 + 40);
    ctx.textAlign = "left";
  }
}

// ============================================================
// SHOP RENDER
// ============================================================
function renderShop() {
  const { damagePrice, healthPrice, speedPrice } = getShopPrices();
  const pw = 420, ph = 520;
  const px = canvas.width / 2 - pw / 2, py = canvas.height / 2 - ph / 2;
  ctx.drawImage(img.shopPanel, px, py, pw, ph);
  ctx.textAlign = "center";
  ctx.fillStyle = "#FFD700"; ctx.font = "bold 20px Courier New";
  ctx.fillText("Coins: " + coinCount, canvas.width / 2, py + 130);

  const items = [
    { label: "[1] +25% Damage — " + damagePrice + " coins", color: "#ff6644", can: coinCount >= damagePrice,                                    y: py + 190 },
    { label: "[2] +25% Max HP — " + healthPrice + " coins", color: "#4488ff", can: coinCount >= healthPrice,                                    y: py + 250 },
    { label: player.speed >= player.maxSpeed ? "[3] Speed MAX" : "[3] +25% Speed — " + speedPrice + " coins",
      color: "#00ff88", can: coinCount >= speedPrice && player.speed < player.maxSpeed,                                                          y: py + 310 }
  ];
  items.forEach(item => {
    ctx.fillStyle = item.can ? item.color : "#666666";
    ctx.fillText(item.label, canvas.width / 2, item.y);
  });

  ctx.fillStyle = "#13d013"; ctx.font = "18px Courier New"; ctx.fillText(shopHealMessage, canvas.width / 2, py + 390);
  ctx.fillStyle = "#c9eb1c"; ctx.font = "15px Courier New"; ctx.fillText("Press 1, 2 or 3 to buy. Walk away to close.", canvas.width / 2, py + 460);
  ctx.textAlign = "left";
}

// ============================================================
// GAME LOOP
// ============================================================
function gameLoop() { update(); render(); requestAnimationFrame(gameLoop); }

Promise.all([...imageLoads, ...spriteLoads]).then(() => gameLoop());
