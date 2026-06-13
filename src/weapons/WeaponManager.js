import { PISTOL, RIFLE } from './WeaponData.js';

export class WeaponManager {
    constructor(playerController, ammoHudElement) {
        this.playerController = playerController;
        this.ammoHud = ammoHudElement;
        
        // Map tên súng -> đối tượng Weapon
        this.weapons = {
            pistol: PISTOL,
            rifle: RIFLE
        };
        
        // Inventory: tối đa 2 súng (chứa tên: 'pistol', 'rifle')
        this.inventory = [];
        this.currentWeaponIndex = 0;
        
        // Trạng thái hiện tại (theo súng đang cầm)
        this.currentAmmo = 0;      // đạn trong ổ đạn
        this.isReloading = false;
        this.reloadTimer = 0;
        this.lastShotTime = 0;
        
        // Bắt đầu với súng lục
        this.addWeapon('pistol');
    }
    
    // Thêm súng vào inventory
    addWeapon(weaponName) {
        if (this.inventory.includes(weaponName)) return;
        
        if (this.inventory.length >= 2) {
            // Đã có 2 súng, thay thế súng đang cầm
            this.inventory[this.currentWeaponIndex] = weaponName;
            this.switchToWeapon(this.currentWeaponIndex);
        } else {
            this.inventory.push(weaponName);
            if (this.inventory.length === 1) {
                // Nếu là súng đầu tiên, set currentAmmo và chuyển sang
                const weapon = this.weapons[weaponName];
                this.currentAmmo = weapon.magazineSize;
                this.switchToWeapon(0);
            }
        }
    }
    
    // Chuyển súng
    switchToWeapon(index) {
        if (index < 0 || index >= this.inventory.length) return;
        
        this.currentWeaponIndex = index;
        const weaponName = this.inventory[this.currentWeaponIndex];
        const weapon = this.weapons[weaponName];
        
        // QUAN TRỌNG: Cập nhật currentAmmo bằng magazineSize
        this.currentAmmo = weapon.magazineSize;
        
        // Cập nhật model 3D
        this.playerController.switchWeapon(weaponName);
        
        // Cập nhật UI (hiển thị đạn)
        this.updateAmmoDisplay(this.currentAmmo, weapon.reserveAmmo);
    }
    
    // Cộng đạn dự trữ (khi nhặt từ enemy)
    addReserveAmmo(amount) {
        if (this.inventory.length === 0) return;
        const weaponName = this.inventory[this.currentWeaponIndex];
        const weapon = this.weapons[weaponName];
        if (weapon) {
            weapon.reserveAmmo += amount;
            this.updateAmmoDisplay(this.currentAmmo, weapon.reserveAmmo);
        }
    }
    
    // Bắn trả về { damage, weaponName } hoặc null nếu không bắn được
    shoot() {
        if (this.isReloading) return null;
        
        const now = performance.now() / 1000;
        const weaponName = this.inventory[this.currentWeaponIndex];
        if (!weaponName) return null;
        
        const weapon = this.weapons[weaponName];
        
        if (now - this.lastShotTime < weapon.fireRate) return null;
        if (this.currentAmmo <= 0) return null;
        
        this.currentAmmo--;
        this.lastShotTime = now;
        
        this.updateAmmoDisplay(this.currentAmmo, weapon.reserveAmmo);
        
        return { 
            damage: weapon.damage, 
            weaponName: weaponName,
            recoil: weapon.recoil 
        };
    }
    
    // Reload
    startReload() {
        if (this.isReloading) return;
        const weaponName = this.inventory[this.currentWeaponIndex];
        if (!weaponName) return;
        const weapon = this.weapons[weaponName];
        
        if (this.currentAmmo === weapon.magazineSize) return;
        if (weapon.reserveAmmo <= 0) return;
        
        this.isReloading = true;
        this.reloadTimer = weapon.reloadTime;
        this.updateAmmoDisplay(this.currentAmmo, weapon.reserveAmmo);
    }
    
    update(deltaTime) {
        if (this.isReloading) {
            this.reloadTimer -= deltaTime;
            if (this.reloadTimer <= 0) {
                this.finishReload();
            }
        }
    }
    
    finishReload() {
        const weaponName = this.inventory[this.currentWeaponIndex];
        if (!weaponName) return;
        const weapon = this.weapons[weaponName];
        
        const needed = weapon.magazineSize - this.currentAmmo;
        const take = Math.min(needed, weapon.reserveAmmo);
        this.currentAmmo += take;
        weapon.reserveAmmo -= take;
        
        this.isReloading = false;
        this.updateAmmoDisplay(this.currentAmmo, weapon.reserveAmmo);
    }
    
    updateAmmoDisplay(current, reserve) {
        if (!this.ammoHud) return;
        if (this.inventory.length === 0) {
            this.ammoHud.textContent = 'No weapon';
            return;
        }
        
        const weaponName = this.inventory[this.currentWeaponIndex];
        let displayName = 'Unknown';
        if (weaponName === 'pistol') displayName = 'Pistol';
        else if (weaponName === 'rifle') displayName = 'Rifle';
        
        if (this.isReloading) {
            this.ammoHud.textContent = `${displayName} | Reloading...`;
        } else {
            this.ammoHud.textContent = `${displayName} | ${current}/${reserve}`;
        }
    }
    
    getCurrentWeapon() {
        if (this.inventory.length === 0) return null;
        const weaponName = this.inventory[this.currentWeaponIndex];
        return weaponName ? this.weapons[weaponName] : null;
    }
}