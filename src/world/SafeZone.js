import * as THREE from 'three';

export class SafeZone {
    constructor(scene, position, radius, duration, onExpire) {
        this.scene = scene;
        this.position = position;
        this.radius = radius;
        this.duration = duration;
        this.onExpire = onExpire;  // callback khi safe zone biến mất
        
        this.timeRemaining = duration;
        this.isActive = true;
        
        // Tạo vòng tròn phát sáng trên mặt đất
        const ringGeometry = new THREE.RingGeometry(radius - 0.1, radius + 0.1, 32);
        const ringMaterial = new THREE.MeshStandardMaterial({
            color: 0x33ccff,
            emissive: 0x1166aa,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
        });
        this.groundRing = new THREE.Mesh(ringGeometry, ringMaterial);
        this.groundRing.rotation.x = -Math.PI / 2;
        this.groundRing.position.set(position.x, position.y + 0.05, position.z);
        this.scene.add(this.groundRing);
        
        // Tạo cột ánh sáng (trụ mờ) để dễ nhìn thấy từ xa
        const pillarGeometry = new THREE.CylinderGeometry(radius, radius, 5, 16, 1);
        const pillarMaterial = new THREE.MeshStandardMaterial({
            color: 0x44ccff,
            emissive: 0x2288aa,
            transparent: true,
            opacity: 0.25,
            side: THREE.DoubleSide
        });
        this.pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        this.pillar.position.set(position.x, position.y + 2.5, position.z);
        this.scene.add(this.pillar);
        
        // Tạo vài hạt sáng nhỏ (particle đơn giản) xung quanh rìa
        this.particles = [];
        for (let i = 0; i < 16; i++) {
            const angle = (i / 16) * Math.PI * 2;
            const px = position.x + Math.cos(angle) * radius;
            const pz = position.z + Math.sin(angle) * radius;
            const particleGeo = new THREE.SphereGeometry(0.1, 4, 4);
            const particleMat = new THREE.MeshStandardMaterial({ color: 0x88ddff, emissive: 0x4488aa });
            const particle = new THREE.Mesh(particleGeo, particleMat);
            particle.position.set(px, position.y + 0.3, pz);
            this.scene.add(particle);
            this.particles.push(particle);
        }
        
        // Hiệu ứng nhấp nháy (sẽ update mỗi frame)
        this.flashTimer = 0;
    }
    
    // Kiểm tra xem một điểm có nằm trong safe zone không
    containsPoint(point) {
        const dx = point.x - this.position.x;
        const dz = point.z - this.position.z;
        return Math.sqrt(dx * dx + dz * dz) < this.radius;
    }
    
    // Đẩy enemy ra khỏi vùng (trả về vector đẩy)
    pushEnemyOut(enemyPos) {
        const dx = enemyPos.x - this.position.x;
        const dz = enemyPos.z - this.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        
        if (dist < this.radius) {
            // Tính hướng từ tâm ra ngoài
            const pushDir = new THREE.Vector2(dx, dz).normalize();
            const pushStrength = 5.0; // m/s
            return { x: pushDir.x * pushStrength, z: pushDir.y * pushStrength };
        }
        return null;
    }
    
    update(deltaTime) {
        if (!this.isActive) return;
        
        this.timeRemaining -= deltaTime;
        
        // Hiệu ứng nhấp nháy (ring và pillar thay đổi độ sáng)
        this.flashTimer += deltaTime * 3;
        const alpha = 0.5 + Math.sin(this.flashTimer) * 0.25;
        this.groundRing.material.opacity = alpha;
        this.pillar.material.opacity = alpha * 0.6;
        
        // Xoay các hạt sáng
        this.particles.forEach((part, idx) => {
            const angle = (idx / this.particles.length) * Math.PI * 2 + this.flashTimer;
            const px = this.position.x + Math.cos(angle) * this.radius;
            const pz = this.position.z + Math.sin(angle) * this.radius;
            part.position.set(px, this.position.y + 0.3 + Math.sin(this.flashTimer * 2 + idx) * 0.1, pz);
        });
        
        // Hết thời gian, tự hủy
        if (this.timeRemaining <= 0) {
            this.dispose();
        }
    }
    
    // Hiển thị thời gian còn lại trên HUD (trả về số giây)
    getTimeRemaining() {
        return Math.max(0, Math.ceil(this.timeRemaining));
    }
    
    dispose() {
        if (!this.isActive) return;
        this.isActive = false;
        
        // Xóa khỏi scene và giải phóng bộ nhớ
        this.scene.remove(this.groundRing);
        this.scene.remove(this.pillar);
        this.groundRing.geometry.dispose();
        this.groundRing.material.dispose();
        this.pillar.geometry.dispose();
        this.pillar.material.dispose();
        
        this.particles.forEach(p => {
            this.scene.remove(p);
            p.geometry.dispose();
            p.material.dispose();
        });
        
        if (this.onExpire) this.onExpire();
    }
}