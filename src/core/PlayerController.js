import * as THREE from 'three';

export class PlayerController {
    constructor(scene, camera, inputHandler, terrainGen, initialPosition = { x: 0, z: 0 }) {
        this.scene = scene;
        this.camera = camera;
        this.input = inputHandler;
        this.terrainGen = terrainGen;
        
        this.playerGroup = new THREE.Group();
        this.playerGroup.position.set(initialPosition.x, 0, initialPosition.z);
        this.scene.add(this.playerGroup);
        this.playerGroup.add(this.camera);
        this.camera.position.set(0, 1.6, 0);
        
        // Nhảy
        this.velocityY = 0;
        this.isGrounded = true;
        this.GRAVITY = 18;
        this.JUMP_POWER = 6.5;
        
        // Di chuyển
        this.currentVelocity = new THREE.Vector3(0, 0, 0);
        this.ACCELERATION = 25.0;
        this.DECELERATION = 20.0;
        this.MAX_SPEED = 5.0;
        
        // Headbob
        this.headBobTimer = 0;
        this.HEAD_BOB_SPEED = 10.0;
        this.HEAD_BOB_AMOUNT = 0.03;
        this.originalCameraY = 1.6;
        
        // Lean
        this.leanAngle = 0;
        this.LEAN_SPEED = 8.0;
        this.LEAN_MAX = 0.08;
        
        // Recoil
        this.recoilAmount = 0;
        this.RECOIL_RECOVERY_RATE = 0.92;

        // ADS (ngắm)
        this.isAiming = false;
        this.normalFov = 75;
        this.aimFov = 45;
        this.normalSpeed = this.MAX_SPEED;
        this.aimSpeed = this.MAX_SPEED * 0.65;
        this.aimRecoilFactor = 0.6;

        // Tạo mô hình súng
        const pistolGeo = new THREE.BoxGeometry(0.1, 0.15, 0.5);
        const pistolMat = new THREE.MeshStandardMaterial({ color: 0xccccdd, metalness: 0.7, roughness: 0.3 });
        this.pistolMesh = new THREE.Mesh(pistolGeo, pistolMat);
        this.pistolMesh.position.set(0.2, -0.2, -0.4);
        this.pistolMesh.castShadow = true;

        const rifleGeo = new THREE.BoxGeometry(0.12, 0.2, 0.8);
        const rifleMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.2 });
        this.rifleMesh = new THREE.Mesh(rifleGeo, rifleMat);
        this.rifleMesh.position.set(0.25, -0.2, -0.6);
        this.rifleMesh.castShadow = true;

        this.camera.add(this.pistolMesh);
        this.camera.add(this.rifleMesh);
        this.rifleMesh.visible = false;
        this.pistolMesh.visible = true;
        this.currentGunMesh = this.pistolMesh;

        // Muzzle flash
        this.muzzleFlash = new THREE.PointLight(0xffaa00, 0, 5);
        this.muzzleFlash.position.set(0.2, -0.15, -0.8);
        this.camera.add(this.muzzleFlash);
    }
    
    update(deltaTime) {
        if (deltaTime > 0.033) deltaTime = 0.033;
        
        // Recoil
        this.recoilAmount *= Math.pow(this.RECOIL_RECOVERY_RATE, deltaTime * 60);
        if (Math.abs(this.recoilAmount) < 0.001) this.recoilAmount = 0;
        
        // Góc nhìn
        const { yaw, pitch: pitchInput } = this.input.getRotation();
        let pitchFinal = pitchInput + this.recoilAmount;
        pitchFinal = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, pitchFinal));
        this.playerGroup.rotation.y = yaw;
        this.camera.rotation.x = pitchFinal;
        
        // Hướng di chuyển ngang
        const forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        const right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
        
        let move = new THREE.Vector3(0, 0, 0);
        if (this.input.isKeyPressed('KeyW')) move.z -= 1;
        if (this.input.isKeyPressed('KeyS')) move.z += 1;
        if (this.input.isKeyPressed('KeyA')) move.x -= 1;
        if (this.input.isKeyPressed('KeyD')) move.x += 1;
        if (move.length() > 0) move.normalize();
        
        // Tính hướng di chuyển mong muốn
        let desiredDirection = new THREE.Vector3(0, 0, 0);
        desiredDirection.addScaledVector(forward, move.z * -1);
        desiredDirection.addScaledVector(right, move.x);
        
        // Điều chỉnh tốc độ theo trạng thái ngắm
        let currentMaxSpeed = this.isAiming ? this.aimSpeed : this.normalSpeed;
        desiredDirection.multiplyScalar(currentMaxSpeed);
        
        const isMoving = (move.length() > 0);
        const accel = isMoving ? this.ACCELERATION : this.DECELERATION;
        let velChange = desiredDirection.clone().sub(this.currentVelocity);
        if (velChange.length() > 0) {
            velChange.multiplyScalar(Math.min(1.0, accel * deltaTime / velChange.length()));
            this.currentVelocity.add(velChange);
        }
        let deltaPos = this.currentVelocity.clone().multiplyScalar(deltaTime);
        let newPos = this.playerGroup.position.clone().add(deltaPos);
        
        // Độ cao mặt đất
        const groundHeight = this.terrainGen.getHeight(newPos.x, newPos.z) + 1.2;
        const currentGround = this.terrainGen.getHeight(this.playerGroup.position.x, this.playerGroup.position.z) + 1.2;
        const epsilon = 0.1;
        this.isGrounded = (Math.abs(this.playerGroup.position.y - currentGround) < epsilon);
        
        // Nhảy
        if (this.input.isKeyPressed('Space') && this.isGrounded) {
            this.velocityY = this.JUMP_POWER;
            this.isGrounded = false;
        }
        
        // Cập nhật vận tốc dọc
        if (!this.isGrounded) {
            this.velocityY -= this.GRAVITY * deltaTime;
            newPos.y = this.playerGroup.position.y + this.velocityY * deltaTime;
            if (newPos.y <= groundHeight) {
                newPos.y = groundHeight;
                this.velocityY = 0;
                this.isGrounded = true;
            }
        } else {
            newPos.y = groundHeight;
            this.velocityY = 0;
        }
        
        this.playerGroup.position.copy(newPos);
        
        // Headbob
        if (this.isGrounded && isMoving && (Math.abs(this.currentVelocity.x) > 0.5 || Math.abs(this.currentVelocity.z) > 0.5)) {
            this.headBobTimer += deltaTime * this.HEAD_BOB_SPEED;
            const bobY = Math.sin(this.headBobTimer) * this.HEAD_BOB_AMOUNT;
            this.camera.position.y = this.originalCameraY + bobY;
        } else {
            this.headBobTimer = 0;
            this.camera.position.y += (this.originalCameraY - this.camera.position.y) * 0.2;
        }
        
        // Lean
        let targetLean = -move.x * 0.06;
        targetLean = Math.max(-this.LEAN_MAX, Math.min(this.LEAN_MAX, targetLean));
        this.leanAngle += (targetLean - this.leanAngle) * Math.min(1.0, this.LEAN_SPEED * deltaTime);
        this.camera.rotation.z = this.leanAngle;
        
        // FOV theo ADS
        const targetFov = this.isAiming ? this.aimFov : this.normalFov;
        if (this.camera.fov !== targetFov) {
            this.camera.fov = targetFov;
            this.camera.updateProjectionMatrix();
        }
    }
    
    addRecoil(amount) {
        let finalAmount = amount;
        if (this.isAiming) finalAmount *= this.aimRecoilFactor;
        this.recoilAmount += finalAmount;
        if (this.recoilAmount > 0.35) this.recoilAmount = 0.35;
    }
    
    getPosition() {
        return this.playerGroup.position;
    }
    
    switchWeapon(weaponType) {
        if (weaponType === 'pistol') {
            this.pistolMesh.visible = true;
            this.rifleMesh.visible = false;
            this.currentGunMesh = this.pistolMesh;
        } else if (weaponType === 'rifle') {
            this.pistolMesh.visible = false;
            this.rifleMesh.visible = true;
            this.currentGunMesh = this.rifleMesh;
        }
        // Reset trạng thái ngắm khi chuyển súng
        this.setAiming(false);
    }
    
    setAiming(aiming) {
        console.log('PlayerController.setAiming called with:', aiming);
        this.isAiming = aiming;
        const targetFov = this.isAiming ? this.aimFov : this.normalFov;
        console.log('Setting FOV to:', targetFov);
        this.camera.fov = targetFov;
        this.camera.updateProjectionMatrix();

        // Điều chỉnh vị trí súng
        if (this.currentGunMesh === this.pistolMesh) {
            if (aiming) {
                this.pistolMesh.position.set(0.0, -0.1, -0.2);
            } else {
                this.pistolMesh.position.set(0.2, -0.2, -0.4);
            }
        } else if (this.currentGunMesh === this.rifleMesh) {
            if (aiming) {
                this.rifleMesh.position.set(0.05, -0.1, -0.3);
            } else {
                this.rifleMesh.position.set(0.25, -0.2, -0.6);
            }
        }
        console.log('Gun position after ADS:', this.currentGunMesh.position);
    }
}