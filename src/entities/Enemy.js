import * as THREE from 'three';

export class Enemy {
    constructor(scene, position, speed = 2.0, maxHp = 3, baseColor = 0xcc3300) {
        this.scene = scene;
        this.speed = speed;
        this.maxHp = maxHp;
        this.hp = this.maxHp;
        this.baseColor = baseColor;  // màu gốc khi đầy máu

        this.playerDamageCooldown = 0;
        this._hitFlashTimer = 0;

        // Tạo material với màu gốc
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

        // Cập nhật màu ban đầu theo HP
        this.updateColor();
    }

    // Cập nhật màu dựa trên tỷ lệ HP (càng ít máu càng đỏ sậm)
    updateColor() {
        const ratio = this.hp / this.maxHp; // 1 = đầy máu, 0 = chết
        // Trộn màu gốc với màu đỏ (0xaa1111) theo tỷ lệ: càng ít máu càng đỏ
        const r = ((this.baseColor >> 16 & 255) / 255) * ratio + (0xaa / 255) * (1 - ratio);
        const g = ((this.baseColor >> 8 & 255) / 255) * ratio + (0x11 / 255) * (1 - ratio);
        const b = ((this.baseColor & 255) / 255) * ratio + (0x11 / 255) * (1 - ratio);
        const finalColor = (Math.floor(r * 255) << 16) | (Math.floor(g * 255) << 8) | Math.floor(b * 255);
        this.material.color.setHex(finalColor);
    }

    takeDamage(amount) {
        this.hp = Math.max(0, this.hp - amount);
        if (this.hp <= 0) return true;

        this.updateColor();
        // Flash trắng
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
                this.material.emissive.setHex(0x220000); // trả về màu tối
            }
        }

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