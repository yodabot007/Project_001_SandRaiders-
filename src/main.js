// Sand Raiders — Phaser 3 prototype (double-click index.html to run)

// --- Embedded 16x16 PNG sprites (data URIs) ---
// These are tiny placeholders so the game works immediately.
// Later you can replace them with files in /assets and load from there.
const SPRITES = {
  player: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAQ0lEQVR4AWP4z8DwnwENMDEwMDDw/9+BAQYGBgYkGJgYGBiYgQn8Z2BgYGBgYFQhQ0AAKqkGm5uQyq7AAAAAElFTkSuQmCC",
  enemy:  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAS0lEQVR4AWP4z8DwnwENMDEwMDDw/9+BAQYGBgYkGJgYGBiYgQn8b2BgYGBgYFQhQ0AAKqkGm7mRrQwAAAAAElFTkSuQmCC",
  coin:   "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAUUlEQVR4AWP4z8DwnwENMDEwMDDw/9+BAQYGBgYkGJgYGBiYgQn8d2BgYGBgYFQhQ0AAKqkGm5gqgYxAAAAAElFTkSuQmCC",
  hit:    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAXUlEQVR4AWP4z8DwnwENMDEwMDDw/9+BAQYGBgYkGJgYGBiYgQn8f2BgYGBgYFQhQ0AAKqkGm7yR3bEAAAAAElFTkSuQmCC"
};

// --- Game config ---
const WIDTH = 800;
const HEIGHT = 480;

const config = {
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  parent: "game",
  backgroundColor: "#141018",
  physics: {
    default: "arcade",
    arcade: { debug: false }
  },
  scene: { preload, create, update }
};

new Phaser.Game(config);

let player, enemy, cursors, keys;
let coins, scoreText, hpText, infoText;
let score = 0;
let hp = 5;
let lastAttackTime = 0;

function preload() {
  this.load.image("player", SPRITES.player);
  this.load.image("enemy", SPRITES.enemy);
  this.load.image("coin", SPRITES.coin);
  this.load.image("hit", SPRITES.hit);
}

function create() {
  // Simple “arena” bounds
  this.physics.world.setBounds(0, 0, WIDTH, HEIGHT);

  // Player
  player = this.physics.add.sprite(WIDTH * 0.25, HEIGHT * 0.5, "player").setScale(3);
  player.setCollideWorldBounds(true);

  // Enemy (chaser)
  enemy = this.physics.add.sprite(WIDTH * 0.75, HEIGHT * 0.5, "enemy").setScale(3);
  enemy.setCollideWorldBounds(true);

  // Coins group
  coins = this.physics.add.group();
  for (let i = 0; i < 8; i++) spawnCoin.call(this);

  // Input
  cursors = this.input.keyboard.createCursorKeys();
  keys = this.input.keyboard.addKeys("W,A,S,D,SPACE");

  // UI
  scoreText = this.add.text(14, 12, "Score: 0", { fontSize: "18px", color: "#e6e6e6" });
  hpText = this.add.text(14, 36, "HP: 5", { fontSize: "18px", color: "#e6e6e6" });
  infoText = this.add.text(14, 60, "Goal: collect coins. SPACE = attack (short range).", { fontSize: "14px", color: "#bfbfbf" });

  // Collisions / overlaps
  this.physics.add.overlap(player, coins, collectCoin, null, this);
  this.physics.add.overlap(player, enemy, onPlayerHit, null, this);

  // Make enemy slightly “heavier” so it feels different
  enemy.setDrag(50, 50);
}

function update(time) {
  // Movement
  const speed = 220;
  let vx = 0, vy = 0;

  const left  = cursors.left.isDown || keys.A.isDown;
  const right = cursors.right.isDown || keys.D.isDown;
  const up    = cursors.up.isDown || keys.W.isDown;
  const down  = cursors.down.isDown || keys.S.isDown;

  if (left)  vx = -speed;
  if (right) vx = speed;
  if (up)    vy = -speed;
  if (down)  vy = speed;

  // Diagonal normalization
  if (vx !== 0 && vy !== 0) {
    vx *= 0.7071;
    vy *= 0.7071;
  }

  player.setVelocity(vx, vy);

  // Enemy chases player
  const chaseSpeed = 140 + Math.min(score * 4, 120);
  this.physics.moveToObject(enemy, player, chaseSpeed);

  // Attack (simple melee hitbox)
  if (keys.SPACE.isDown && time - lastAttackTime > 350) {
    lastAttackTime = time;
    doAttack.call(this);
  }

  // Game over
  if (hp <= 0) {
    player.setVelocity(0, 0);
    enemy.setVelocity(0, 0);
    infoText.setText("Game Over. Refresh the page to restart.");
  }
}

function doAttack() {
  // Attack is a short-range hit: if enemy is close, it gets knocked back and you score.
  const dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
  if (dist < 85) {
    // Small “hit flash”
    const fx = this.add.sprite(enemy.x, enemy.y, "hit").setScale(2);
    this.time.delayedCall(120, () => fx.destroy());

    // Knockback
    const angle = Phaser.Math.Angle.Between(player.x, player.y, enemy.x, enemy.y);
    const knock = 260;
    enemy.setVelocity(Math.cos(angle) * knock, Math.sin(angle) * knock);

    // Reward
    score += 2;
    scoreText.setText("Score: " + score);

    // Respawn enemy farther away after a brief delay
    this.time.delayedCall(250, () => {
      enemy.x = Phaser.Math.Between(WIDTH * 0.55, WIDTH - 40);
      enemy.y = Phaser.Math.Between(40, HEIGHT - 40);
    });
  }
}

function collectCoin(_player, coin) {
  coin.destroy();
  score += 1;
  scoreText.setText("Score: " + score);

  // Spawn a new coin
  spawnCoin.call(this);

  // Small difficulty ramp: every 5 coins, +1 HP (cap)
  if (score % 5 === 0) {
    hp = Math.min(7, hp + 1);
    hpText.setText("HP: " + hp);
  }
}

function onPlayerHit() {
  // Prevent rapid HP drain if touching
  if (this._hitCooldown) return;
  this._hitCooldown = true;

  hp -= 1;
  hpText.setText("HP: " + hp);

  // Brief invulnerability
  player.setAlpha(0.55);
  this.time.delayedCall(500, () => {
    player.setAlpha(1);
    this._hitCooldown = false;
  });

  // Push enemy away slightly so it’s not glued
  const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, player.x, player.y);
  enemy.setVelocity(Math.cos(angle) * 220, Math.sin(angle) * 220);
}

function spawnCoin() {
  const x = Phaser.Math.Between(40, WIDTH - 40);
  const y = Phaser.Math.Between(80, HEIGHT - 40);
  const coin = coins.create(x, y, "coin").setScale(2);
  coin.body.setAllowGravity(false);
}
