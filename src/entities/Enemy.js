import * as THREE from 'three';

export class Enemy {
    constructor(scene, position, baseSpeed, baseMaxHp, baseDamage, baseColor) {
        this.scene = scene;
        this.baseSpeed = baseSpeed;
        this.baseMaxHp = baseMaxHp;
        this.baseDamage = baseDamage;
        
        // Giá trị hiện tại (sẽ bị buff thay đổi)
        this.speed = baseSpeed;
        this.maxHp = baseMaxHp;
        this.hp = baseMaxHp;
        this.damage = baseDamage;
        this.baseColor = baseColor;

        this.playerDamageCooldown = 0;
        this._hitFlashTimer = 0;

        this.material = new THREE.MeshStandardMaterial({
            color: this.baseColor,
            emissive: 0x220000,
            metalness: 0.15,
            roughness: 0.75,
        });

        const geometry = new THREE.BoxGeometry(0.9, 1.5, 0.7);
        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.position.copy(position);
        this.mesh.castShadow = true;
        scene.add(this.mesh);
    }

    takeDamage(amount) {
        this.hp = Math.max(0, this.hp - amount);
        if (this.hp <= 0) return true;
        
        // Flash trắng khi bị đánh
        this.material.emissive.setHex(0xffffff);
        this._hitFlashTimer = 0.08;
        return false;
    }

    update(deltaTime, playerPos) {
        const direction = new THREE.Vector3().subVectors(playerPos, this.mesh.position);
        if (direction.length() > 0.01) direction.normalize();

        this.mesh.position.x += direction.x * this.speed * deltaTime;
        this.mesh.position.z += direction.z * this.speed * deltaTime;
        this.mesh.lookAt(playerPos);

        if (this._hitFlashTimer > 0) {
            this._hitFlashTimer -= deltaTime;
            if (this._hitFlashTimer <= 0) {
                this.material.emissive.setHex(0x220000);
            }
        }

        if (this.playerDamageCooldown > 0) {
            this.playerDamageCooldown -= deltaTime;
        }
    }

    // Áp dụng buff theo wave (hệ số nhân dồn)
    applyBuff(multHp, multDamage, multSpeed) {
        this.maxHp = Math.floor(this.baseMaxHp * multHp);
        this.hp = this.maxHp;
        this.damage = Math.floor(this.baseDamage * multDamage);
        this.speed = this.baseSpeed * multSpeed;
    }

    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.material.dispose();
    }
}