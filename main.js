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

// Khởi tạo core
const sceneManager = new SceneManager();
const inputHandler = new InputHandler(sceneManager.renderer.domElement);

// --- Quan trọng: khởi tạo terrainGen trước PlayerController ---
const terrainGen = new TerrainGenerator('my_infinite_seed');
const vegGen = new VegetationGenerator(sceneManager.scene, terrainGen);

// Lấy element HUD đạn
const ammoHudEl = document.getElementById('ammo-hud');

// Tạo playerController trước
const playerController = new PlayerController(
    sceneManager.scene,
    sceneManager.camera,
    inputHandler,
    terrainGen,
    { x: 0, z: 0 }
);

// Tạo WeaponManager (sau khi playerController đã tồn tại)
const weaponManager = new WeaponManager(playerController, ammoHudEl);

// Quản lý chunk
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
            if (!chunks.has(key)) {
                createChunk(cx, cz);
            }
        }
    }
    for (const [key, chunk] of chunks) {
        if (!chunksToKeep.has(key)) {
            deleteChunk(chunk.chunkX, chunk.chunkZ);
        }
    }
}

// Enemies
let enemies = [];
let droppedItems = []; // các vật phẩm rơi trên đất
let score = 0;
let lastAttackTime = 0;
const attackCooldown = 0.3;
const raycaster = new THREE.Raycaster();

// --- HUD helpers ---
const scoreValueEl  = document.getElementById('score-value');
const killFeedEl    = document.getElementById('kill-feed');
const crosshairEl   = document.getElementById('crosshair');
const healthFillEl  = document.getElementById('health-bar-fill');
const healthTextEl  = document.getElementById('health-text');
const damageVigEl   = document.getElementById('damage-vignette');
const gameOverEl    = document.getElementById('game-over');
const finalScoreEl  = document.getElementById('final-score');
const startScreenEl = document.getElementById('start-screen');
const startBtnEl    = document.getElementById('start-btn');
const pauseMenuEl   = document.getElementById('pause-menu');
const resumeBtnEl   = document.getElementById('resume-btn');

// --- Player state ---
const PLAYER_MAX_HP    = 100;
let playerHp           = PLAYER_MAX_HP;
let isGameOver         = false;
let isPaused           = false;
let gameStarted        = false;

// --- Damage settings ---
const ENEMY_DAMAGE_AMOUNT   = 20;
const ENEMY_DAMAGE_COOLDOWN = 0.9;
const ENEMY_MELEE_RANGE     = 1.4;

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
        if (gameStarted && !isGameOver) {
            pauseGame();
        }
    }
});

resumeBtnEl.addEventListener('click', () => {
    inputHandler.enableLock();
    resumeGame();
});

// --- Start Screen ---
function startGame() {
    gameStarted = true;
    startScreenEl.classList.add('hidden');
    inputHandler.enableLock();

    for (let i = 0; i < 2; i++) spawnEnemy();
    lastSpawnTime = performance.now() / 1000;
    lastFrameTime = performance.now();
    gameLoop();
}

startBtnEl.addEventListener('click', startGame);

function spawnEnemy() {
    const playerPos = playerController.getPosition();
    const radius = 18 + Math.random() * 10;
    const angle = Math.random() * Math.PI * 2;
    const x = playerPos.x + Math.cos(angle) * radius;
    const z = playerPos.z + Math.sin(angle) * radius;
    const groundY = terrainGen.getHeight(x, z) + 1.2;

    let enemy;
    if (Math.random() < 0.5) {
        enemy = new FastEnemy(sceneManager.scene, new THREE.Vector3(x, groundY, z));
    } else {
        enemy = new TankEnemy(sceneManager.scene, new THREE.Vector3(x, groundY, z));
    }
    enemies.push(enemy);
}

let lastSpawnTime = 0;
const spawnInterval = 3.0;

function handleEnemyDrop(enemy, position) {
    // Rơi đạn (tự động cộng vào đạn dự trữ)
    const ammoAmount = Math.floor(5 + Math.random() * 10);
    weaponManager.addReserveAmmo(ammoAmount);
    
    // Rơi súng (tỷ lệ: 10% pistol, 5% rifle)
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

// Bắn
window.addEventListener('click', (event) => {
    if (isPaused || isGameOver || !gameStarted) return;
    
    const shootResult = weaponManager.shoot();
    if (!shootResult) return;
    
    playerController.addRecoil(0.045);
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
    updateChunks(playerController.getPosition());
    
    const playerPos = playerController.getPosition();

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

    // Tự động nhặt vật phẩm khi đến gần (không cần ấn F)
    for (let i = 0; i < droppedItems.length; i++) {
        const item = droppedItems[i];
        const dist = playerPos.distanceTo(item.position);
        if (dist < 1.5) {
            weaponManager.addWeapon(item.userData.weaponName);
            sceneManager.scene.remove(item);
            item.geometry.dispose();
            item.material.dispose();
            droppedItems.splice(i, 1);
            i--;
        }
    }
    
    const nowSec = now / 1000;
    if (nowSec - lastSpawnTime > spawnInterval && enemies.length < 25) {
        spawnEnemy();
        lastSpawnTime = nowSec;
    }
    
    sceneManager.renderer.render(sceneManager.scene, sceneManager.camera);
    requestAnimationFrame(gameLoop);
}

// Chuyển súng bằng phím số, reload bằng R
window.addEventListener('keydown', (e) => {
    if (!gameStarted || isPaused || isGameOver) return;
    
    if (e.code === 'Digit1') {
        if (weaponManager.inventory.length >= 1) {
            weaponManager.switchToWeapon(0);
        }
    } else if (e.code === 'Digit2') {
        if (weaponManager.inventory.length >= 2) {
            weaponManager.switchToWeapon(1);
        }
    } else if (e.code === 'KeyR') {
        weaponManager.startReload();
    }
});

window.addEventListener('resize', () => sceneManager.onWindowResize());