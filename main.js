import * as THREE from 'three';
import { SceneManager } from './src/core/SceneManager.js';
import { InputHandler } from './src/core/InputHandler.js';
import { PlayerController } from './src/core/PlayerController.js';
import { TerrainGenerator } from './src/world/TerrainGenerator.js';
import { VegetationGenerator } from './src/world/VegetationGenerator.js';
import { WorldChunk } from './src/world/WorldChunk.js';
import { Enemy } from './src/entities/Enemy.js';
import { FastEnemy } from './src/entities/FastEnemy.js';
import { TankEnemy } from './src/entities/TankEnemy.js';
import { WeaponManager } from './src/weapons/WeaponManager.js';
import { SafeZone } from './src/world/SafeZone.js';

// Khởi tạo core
const sceneManager = new SceneManager();
const inputHandler = new InputHandler(sceneManager.renderer.domElement);

// Terrain
const terrainGen = new TerrainGenerator('my_infinite_seed');
const vegGen = new VegetationGenerator(sceneManager.scene, terrainGen);

// HUD đạn
const ammoHudEl = document.getElementById('ammo-hud');

// Player
const playerController = new PlayerController(
    sceneManager.scene,
    sceneManager.camera,
    inputHandler,
    terrainGen,
    { x: 0, z: 0 }
);

// WeaponManager
const weaponManager = new WeaponManager(playerController, ammoHudEl);

// Chunk management
const chunks = new Map();
const renderDistance = 2;
const chunkSize = terrainGen.chunkSize;
const blockSize = terrainGen.blockSize;

function createChunk(cx, cz) {
    const terrainMesh = terrainGen.generateChunk(cx, cz);
    const vegGroup = vegGen.generateChunkVegetation(cx, cz);
    const chunk = new WorldChunk(cx, cz, terrainMesh, vegGroup);
    chunk.addToScene(sceneManager.scene);
    chunks.set(`${cx},${cz}`, chunk);
}

function deleteChunk(cx, cz) {
    const key = `${cx},${cz}`;
    const chunk = chunks.get(key);
    if (chunk) {
        chunk.removeFromScene(sceneManager.scene);
        chunks.delete(key);
    }
}

function updateChunks(playerPos) {
    const chunkX = Math.floor(playerPos.x / (chunkSize * blockSize));
    const chunkZ = Math.floor(playerPos.z / (chunkSize * blockSize));
    const chunksToKeep = new Set();
    for (let dx = -renderDistance; dx <= renderDistance; dx++) {
        for (let dz = -renderDistance; dz <= renderDistance; dz++) {
            const cx = chunkX + dx;
            const cz = chunkZ + dz;
            const key = `${cx},${cz}`;
            chunksToKeep.add(key);
            if (!chunks.has(key)) createChunk(cx, cz);
        }
    }
    for (const [key, chunk] of chunks) {
        if (!chunksToKeep.has(key)) deleteChunk(chunk.chunkX, chunk.chunkZ);
    }
}

// Game state
let enemies = [];
let droppedItems = [];
let score = 0;
let coin = 0;
const coinHudEl = document.getElementById('coin-hud');
let lastAttackTime = 0;
let currentSafeZone = null;
let isAiming = false;
let nextSafeZoneTime = 0;
const SAFE_ZONE_SPAWN_DELAY = 45;
const SAFE_ZONE_DURATION = 25;
const SAFE_ZONE_RADIUS = 6;
const attackCooldown = 0.3;
const raycaster = new THREE.Raycaster();

// HUD elements
const scoreValueEl = document.getElementById('score-value');
const killFeedEl = document.getElementById('kill-feed');
const crosshairEl = document.getElementById('crosshair');
const healthFillEl = document.getElementById('health-bar-fill');
const healthTextEl = document.getElementById('health-text');
const damageVigEl = document.getElementById('damage-vignette');
const gameOverEl = document.getElementById('game-over');
const finalScoreEl = document.getElementById('final-score');
const startScreenEl = document.getElementById('start-screen');
const startBtnEl = document.getElementById('start-btn');
const pauseMenuEl = document.getElementById('pause-menu');
const resumeBtnEl = document.getElementById('resume-btn');

// Player stats
const PLAYER_MAX_HP = 100;
let playerHp = PLAYER_MAX_HP;
let isGameOver = false;
let isPaused = false;
let gameStarted = false;

// Damage settings
const ENEMY_DAMAGE_AMOUNT = 20;
const ENEMY_DAMAGE_COOLDOWN = 0.9;
const ENEMY_MELEE_RANGE = 1.4;

// Helper functions
function showKillFeed() {
    const msg = document.createElement('div');
    msg.className = 'kill-msg';
    msg.textContent = '✕ KILL';
    killFeedEl.appendChild(msg);
    setTimeout(() => {
        msg.style.transition = 'opacity 0.4s ease';
        msg.style.opacity = '0';
        setTimeout(() => msg.remove(), 420);
    }, 1800);
}

function flashScore() {
    scoreValueEl.classList.add('flash');
    setTimeout(() => scoreValueEl.classList.remove('flash'), 200);
}

function flashCrosshair() {
    crosshairEl.classList.add('recoil');
    setTimeout(() => crosshairEl.classList.remove('recoil'), 120);
}

function updateHealthHUD() {
    const ratio = Math.max(0, playerHp / PLAYER_MAX_HP);
    healthFillEl.style.width = (ratio * 100) + '%';
    healthTextEl.textContent = Math.ceil(playerHp);
    if (ratio > 0.5) {
        healthFillEl.style.background = 'linear-gradient(90deg, #22cc44, #44ff88)';
        healthTextEl.style.color = '#88ffaa';
    } else if (ratio > 0.25) {
        healthFillEl.style.background = 'linear-gradient(90deg, #cc8800, #ffcc00)';
        healthTextEl.style.color = '#ffcc44';
    } else {
        healthFillEl.style.background = 'linear-gradient(90deg, #cc2222, #ff4444)';
        healthTextEl.style.color = '#ff6666';
    }
}

let _vignetteTimer = null;
function flashDamageVignette() {
    damageVigEl.style.opacity = '1';
    if (_vignetteTimer) clearTimeout(_vignetteTimer);
    _vignetteTimer = setTimeout(() => {
        damageVigEl.style.transition = 'opacity 0.4s ease';
        damageVigEl.style.opacity = '0';
    }, 120);
}

function triggerGameOver() {
    isGameOver = true;
    finalScoreEl.textContent = score;
    gameOverEl.classList.add('visible');
    inputHandler.disableLock();
}

function pauseGame() {
    if (isGameOver || !gameStarted) return;
    isPaused = true;
    pauseMenuEl.classList.add('visible');
}

function resumeGame() {
    isPaused = false;
    pauseMenuEl.classList.remove('visible');
}

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement !== sceneManager.renderer.domElement) {
        if (gameStarted && !isGameOver) pauseGame();
    }
});

resumeBtnEl.addEventListener('click', () => {
    inputHandler.enableLock();
    resumeGame();
});

// Start game
function startGame() {
    gameStarted = true;
    startScreenEl.classList.add('hidden');
    inputHandler.enableLock();
    for (let i = 0; i < 2; i++) spawnEnemy();
    lastSpawnTime = performance.now() / 1000;
    lastFrameTime = performance.now();
    nextSafeZoneTime = performance.now() / 1000 + SAFE_ZONE_SPAWN_DELAY;
    gameLoop();
}
startBtnEl.addEventListener('click', startGame);

// Spawn enemy
function spawnEnemy() {
    const playerPos = playerController.getPosition();
    let x, z;
    let safe = true;
    let attempts = 0;
    do {
        const radius = 18 + Math.random() * 10;
        const angle = Math.random() * Math.PI * 2;
        x = playerPos.x + Math.cos(angle) * radius;
        z = playerPos.z + Math.sin(angle) * radius;
        safe = true;
        if (currentSafeZone) {
            const distToSafeZone = Math.hypot(x - currentSafeZone.position.x, z - currentSafeZone.position.z);
            if (distToSafeZone < SAFE_ZONE_RADIUS + 2) safe = false;
        }
        attempts++;
        if (attempts > 20) break;
    } while (!safe);
    const groundY = terrainGen.getHeight(x, z) + 1.2;
    let enemy;
    if (Math.random() < 0.5) {
        enemy = new FastEnemy(sceneManager.scene, new THREE.Vector3(x, groundY, z));
    } else {
        enemy = new TankEnemy(sceneManager.scene, new THREE.Vector3(x, groundY, z));
    }
    enemies.push(enemy);
}

// Safe zone
function spawnSafeZone() {
    if (currentSafeZone) return;
    const playerPos = playerController.getPosition();
    let x, z;
    do {
        const angle = Math.random() * Math.PI * 2;
        const distance = 25 + Math.random() * 15;
        x = playerPos.x + Math.cos(angle) * distance;
        z = playerPos.z + Math.sin(angle) * distance;
    } while (Math.hypot(x - playerPos.x, z - playerPos.z) < 20);
    const groundY = terrainGen.getHeight(x, z) + 1.2;
    currentSafeZone = new SafeZone(
        sceneManager.scene,
        new THREE.Vector3(x, groundY, z),
        SAFE_ZONE_RADIUS,
        SAFE_ZONE_DURATION,
        () => {
            currentSafeZone = null;
            nextSafeZoneTime = performance.now() / 1000 + SAFE_ZONE_SPAWN_DELAY;
        }
    );
}

let lastSpawnTime = 0;
const spawnInterval = 3.0;

// Enemy drop
function handleEnemyDrop(enemy, position) {
    // Random ammo drop
    const ammoAmount = Math.floor(5 + Math.random() * 10);
    weaponManager.addReserveAmmo(ammoAmount);

    // Random coin drop
    let coinAmount = 0;
    if (enemy instanceof FastEnemy) {
        coinAmount = Math.floor(5 + Math.random() * 6); // 5-10
    } else if (enemy instanceof TankEnemy) {
        coinAmount = Math.floor(10 + Math.random() * 6); // 10-15
    }
    if (coinAmount > 0) {
        // Tạo vật thể coin rơi
        const coinGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const coinMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0x442200 });
        const coinItem = new THREE.Mesh(coinGeometry, coinMaterial);
        coinItem.position.copy(position);
        coinItem.userData = { type: 'coin', amount: coinAmount };
        sceneManager.scene.add(coinItem);
        droppedItems.push(coinItem);
    }

    //Random weapon drop
    const rand = Math.random() * 100;
    if (rand < 10) {
        const dropGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const dropMaterial = new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0x442200 });
        const dropItem = new THREE.Mesh(dropGeometry, dropMaterial);
        dropItem.position.copy(position);
        dropItem.userData = { type: 'weapon', weaponName: 'pistol' };
        sceneManager.scene.add(dropItem);
        droppedItems.push(dropItem);
    } else if (rand < 15) {
        const dropGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const dropMaterial = new THREE.MeshStandardMaterial({ color: 0x44aaff, emissive: 0x004466 });
        const dropItem = new THREE.Mesh(dropGeometry, dropMaterial);
        dropItem.position.copy(position);
        dropItem.userData = { type: 'weapon', weaponName: 'rifle' };
        sceneManager.scene.add(dropItem);
        droppedItems.push(dropItem);
    }
}

// Shooting (left click)
window.addEventListener('click', (event) => {
    if (event.button !== 0) return;
    if (isPaused || isGameOver || !gameStarted) return;
    const shootResult = weaponManager.shoot();
    if (!shootResult) return;
    playerController.addRecoil(shootResult.recoil);
    playerController.muzzleFlash.intensity = 5;
    setTimeout(() => { playerController.muzzleFlash.intensity = 0; }, 50);
    flashCrosshair();
    sceneManager.camera.updateMatrixWorld();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), sceneManager.camera);
    let hit = null;
    const intersects = raycaster.intersectObjects(enemies.map(e => e.mesh));
    if (intersects.length > 0) {
        hit = intersects[0].object;
    } else {
        const playerPos = playerController.getPosition();
        const cameraDir = new THREE.Vector3();
        sceneManager.camera.getWorldDirection(cameraDir);
        let closestAngle = Math.cos(15 * Math.PI / 180);
        let closestEnemy = null;
        for (const enemy of enemies) {
            const toEnemy = new THREE.Vector3().subVectors(enemy.mesh.position, sceneManager.camera.position).normalize();
            const angle = cameraDir.dot(toEnemy);
            if (angle > closestAngle) {
                closestAngle = angle;
                closestEnemy = enemy;
            }
        }
        if (closestEnemy && playerPos.distanceTo(closestEnemy.mesh.position) < 4.0) {
            hit = closestEnemy.mesh;
        }
    }
    if (hit) {
        const index = enemies.findIndex(e => e.mesh === hit);
        if (index !== -1) {
            const isDead = enemies[index].takeDamage(shootResult.damage);
            if (isDead) {
                handleEnemyDrop(enemies[index], enemies[index].mesh.position);
                enemies[index].dispose();
                enemies.splice(index, 1);
                score++;
                scoreValueEl.textContent = score;
                flashScore();
                showKillFeed();
            }
        }
    }
});

// ===================== ADS với mouseup (fix pointer lock) =====================
window.addEventListener('mouseup', (e) => {
    if (e.button !== 2) return; // chỉ chuột phải
    e.preventDefault();
    e.stopPropagation();

    console.log('=== RIGHT MOUSE UP (ADS) ===');
    if (!gameStarted || isPaused || isGameOver) {
        console.log('Blocked by game state');
        return;
    }

    const currentWeapon = weaponManager.getCurrentWeapon();
    console.log('Current weapon:', currentWeapon);
    if (currentWeapon && currentWeapon.name === 'Rifle') {
        isAiming = !isAiming;
        console.log('Toggling ADS to:', isAiming);
        playerController.setAiming(isAiming);
        const crosshair = document.getElementById('crosshair');
        if (isAiming) {
            crosshair.classList.add('ads');
        } else {
            crosshair.classList.remove('ads');
        }
    } else {
        console.log('Not Rifle or null, weapon name:', currentWeapon?.name);
    }
});

// Prevent default context menu entirely
window.addEventListener('contextmenu', (e) => e.preventDefault());
// ===================================================================

// Game loop
let lastFrameTime = performance.now();

function gameLoop() {
    if (isGameOver) return;
    if (isPaused) {
        lastFrameTime = performance.now();
        requestAnimationFrame(gameLoop);
        return;
    }

    const now = performance.now();
    let delta = Math.min(1 / 30, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    playerController.update(delta);
    weaponManager.update(delta);

    if (currentSafeZone) {
        currentSafeZone.update(delta);
        for (let i = 0; i < enemies.length; i++) {
            if (!currentSafeZone) break;
            const enemyPos = enemies[i].mesh.position;
            const push = currentSafeZone.pushEnemyOut(enemyPos);
            if (push) {
                enemies[i].mesh.position.x += push.x * delta;
                enemies[i].mesh.position.z += push.z * delta;
            }
        }
    }

    const nowSec = now / 1000;
    const playerPos = playerController.getPosition();

    const canSpawn = !currentSafeZone || !currentSafeZone.containsPoint(playerPos);
    if (canSpawn && nowSec - lastSpawnTime > spawnInterval && enemies.length < 25) {
        spawnEnemy();
        lastSpawnTime = nowSec;
    }

    if (!currentSafeZone && gameStarted && nowSec > nextSafeZoneTime) {
        spawnSafeZone();
    }

    updateChunks(playerPos);

    for (let i = 0; i < enemies.length; i++) {
        enemies[i].update(delta, playerPos);
        const dx = playerPos.x - enemies[i].mesh.position.x;
        const dz = playerPos.z - enemies[i].mesh.position.z;
        const dist2D = Math.sqrt(dx * dx + dz * dz);
        if (dist2D < ENEMY_MELEE_RANGE && enemies[i].playerDamageCooldown <= 0) {
            playerHp = Math.max(0, playerHp - ENEMY_DAMAGE_AMOUNT);
            enemies[i].playerDamageCooldown = ENEMY_DAMAGE_COOLDOWN;
            updateHealthHUD();
            flashDamageVignette();
            if (playerHp <= 0) {
                triggerGameOver();
                return;
            }
        }
    }

    // Auto pickup items (coin, weapon)
    for (let i = 0; i < droppedItems.length; i++) {
        const item = droppedItems[i];
        const dist = playerPos.distanceTo(item.position);
        if (dist < 1.5) {
            if (item.userData.type === 'coin') {
                coin += item.userData.amount;
                coinHudEl.textContent = `Coin: ${coin}`;
            } else if (item.userData.type === 'weapon') {
                weaponManager.addWeapon(item.userData.weaponName);
            }
            sceneManager.scene.remove(item);
            if (item.geometry) item.geometry.dispose();
            if (item.material) item.material.dispose();
            droppedItems.splice(i, 1);
            i--;
        }
    }

    sceneManager.renderer.render(sceneManager.scene, sceneManager.camera);
    requestAnimationFrame(gameLoop);
}

// Key bindings
window.addEventListener('keydown', (e) => {
    if (!gameStarted || isPaused || isGameOver) return;
    if (e.code === 'Digit1' && weaponManager.inventory.length >= 1) weaponManager.switchToWeapon(0);
    else if (e.code === 'Digit2' && weaponManager.inventory.length >= 2) weaponManager.switchToWeapon(1);
    else if (e.code === 'KeyR') weaponManager.startReload();
    else if (e.code == 'KeyH') {
        if (playerHp < PLAYER_MAX_HP && coin >= 50){
            playerHp = Math.min(PLAYER_MAX_HP, playerHp + 20);
            coin -= 50;
            coinHudEl.textContent = `Coin: ${coin}`;
            updateHealthHUD();
        } else{
            console.log('Not enough coins to heal or already at max HP');
        }
    }
});

window.addEventListener('resize', () => sceneManager.onWindowResize());