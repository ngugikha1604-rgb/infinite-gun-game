// src/shop/UpgradeManager.js
export class UpgradeManager {
    constructor() {
        // Giá trị nâng cấp (số lần đã mua)
        this.magazineBonus = 0;   // mỗi cấp +5 viên, tối đa 5 cấp (+25)
        this.reserveBonus = 0;    // mỗi cấp +30 viên, tối đa 5 cấp (+150)
        this.damageBonus = 0;     // mỗi cấp +0.5 sát thương, tối đa 5 cấp (+2.5)
        this.speedBonus = 0;      // mỗi cấp +0.3 tốc độ, tối đa 5 cấp (+1.5)
        
        // Giá cho mỗi cấp (tăng dần)
        this.prices = {
            magazine: [100, 140, 180, 220, 260],
            reserve: [70, 100, 130, 160, 190],
            damage: [150, 200, 260, 330, 400],
            speed: [100, 150, 200, 250, 300]
        };
    }
    
    // Lấy số lần đã nâng cấp
    getLevel(type) {
        switch(type) {
            case 'magazine': return this.magazineBonus / 5;
            case 'reserve': return this.reserveBonus / 30;
            case 'damage': return this.damageBonus / 0.5;
            case 'speed': return this.speedBonus / 0.3;
            default: return 0;
        }
    }
    
    // Lấy giá cho lần nâng cấp tiếp theo
    getNextPrice(type) {
        const level = this.getLevel(type);
        const arr = this.prices[type];
        if (level >= arr.length) return null;
        return arr[level];
    }
    
    // Thực hiện nâng cấp (trả về true nếu thành công)
    upgrade(type, currentCoin, setCoinCallback) {
        const price = this.getNextPrice(type);
        if (price === null || currentCoin < price) return false;
        
        switch(type) {
            case 'magazine': this.magazineBonus += 5; break;
            case 'reserve': this.reserveBonus += 30; break;
            case 'damage': this.damageBonus += 0.5; break;
            case 'speed': this.speedBonus += 0.3; break;
        }
        setCoinCallback(currentCoin - price);
        return true;
    }
    
    // Áp dụng các bonus vào game objects
    applyToGame(playerController, weaponManager) {
        // Tốc độ di chuyển
        if (playerController) {
            playerController.normalSpeed = 5.0 + this.speedBonus;
            playerController.aimSpeed = playerController.normalSpeed * 0.65;
        }
        
        // Cập nhật súng: ổ đạn, đạn dự trữ, sát thương
        if (weaponManager) {
            for (let key in weaponManager.weapons) {
                const w = weaponManager.weapons[key];
                // Lấy giá trị gốc (nếu chưa có thì dùng giá trị hiện tại)
                if (w.baseMagazineSize === undefined) {
                    w.baseMagazineSize = w.magazineSize;
                    w.baseReserveAmmo = w.reserveAmmo;
                    w.baseDamage = w.damage;
                }
                w.magazineSize = w.baseMagazineSize + this.magazineBonus;
                w.reserveAmmo = w.baseReserveAmmo + this.reserveBonus;
                w.damage = w.baseDamage + this.damageBonus;
            }
            // Nếu đang cầm súng, cập nhật currentAmmo và UI
            const currentWeapon = weaponManager.getCurrentWeapon();
            if (currentWeapon) {
                weaponManager.currentAmmo = currentWeapon.magazineSize;
                weaponManager.updateAmmoDisplay(weaponManager.currentAmmo, currentWeapon.reserveAmmo);
            }
        }
    }
}