import * as THREE from 'three';

// Màu enemy theo HP (3→2→1)
const HP_COLORS = [
    null,                // index 0: unused
    { color: 0xcc4400, emissive: 0x331100 },  // 1 HP: cam tối (gần chết)
    { color: 0xdd2200, emissive: 0x2a0500 },  // 2 HP: đỏ cam
    { color: 0xbb1111, emissive: 0x220000 },  // 3 HP: đỏ đậm (full)
];

export class Enemy {
    constructor(scene, position, speed = 2.0) {
        this.scene  = scene;
        this.speed  = speed;
        this.maxHp  = 3;
        this.hp     = this.maxHp;

        // Cooldown để không gây damage liên tục cho player
        this.playerDamageCooldown = 0;

        // Timer cho hit flash
        this._hitFlashTimer = 0;

        // Material (dùng chung để có thể đổi màu)
        this.material = new THREE.MeshStandardMaterial({
            color:     HP_COLORS[this.maxHp].color,
            emissive:  new THREE.Color(HP_COLORS[this.maxHp].emissive),
            metalness: 0.15,
            roughness: 0.75,
        });

        const geometry = new THREE.BoxGeometry(0.9, 1.5, 0.7);
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.position.copy(position);
        this.mesh.castShadow = true;
        scene.add(this.mesh);
    }

    /**
     * Gây damage cho enemy.
     * @returns {boolean} true nếu enemy chết
     */
    takeDamage(amount) {
        this.hp = Math.max(0, this.hp - amount);

        if (this.hp <= 0) return true;

        // Cập nhật màu theo HP còn lại
        const palette = HP_COLORS[this.hp];
        this.material.color.setHex(palette.color);
        this.material.emissive.setHex(palette.emissive);

        // Flash trắng tức thì
        this.material.emissive.setHex(0xffffff);
        this._hitFlashTimer = 0.08;

        return false;
    }

    update(deltaTime, playerPos) {
        const direction = new THREE.Vector3()
            .subVectors(playerPos, this.mesh.position)
            .normalize();

        this.mesh.position.x += direction.x * this.speed * deltaTime;
        this.mesh.position.z += direction.z * this.speed * deltaTime;
        this.mesh.lookAt(playerPos);

        // Khôi phục màu sau khi flash trắng
        if (this._hitFlashTimer > 0) {
            this._hitFlashTimer -= deltaTime;
            if (this._hitFlashTimer <= 0) {
                const palette = HP_COLORS[Math.max(1, this.hp)];
                this.material.emissive.setHex(palette.emissive);
            }
        }

        // Giảm cooldown damage player
        if (this.playerDamageCooldown > 0) {
            this.playerDamageCooldown -= deltaTime;
        }
    }

    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.material.dispose();
    }
}