export class Weapon {
    constructor(config) {
        this.name = config.name;
        this.damage = config.damage;
        this.fireRate = config.fireRate;      // seconds between shots
        this.magazineSize = config.magazineSize;
        this.reserveAmmo = config.reserveAmmo;
        this.reloadTime = config.reloadTime;
        this.color = config.color;             // for dropped item
        this.recoil = config.recoil;             // recoil intensity
    }
}