import { Weapon } from './Weapon.js';

export const PISTOL = new Weapon({
    name: 'Pistol',
    damage: 25,
    fireRate: 0.35,
    magazineSize: 12,
    reserveAmmo: 48,
    reloadTime: 1.2,
    color: 0xffaa44,
    recoil: 0.045
});

export const RIFLE = new Weapon({
    name: 'Rifle',
    damage: 40,
    fireRate: 0.2,
    magazineSize: 30,
    reserveAmmo: 90,
    reloadTime: 2.0,
    color: 0x44aaff,
    recoil: 0.07
});