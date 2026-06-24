import { Weapon } from './Weapon.js';

export const PISTOL = new Weapon({
    name: 'Pistol',
    damage: 100,
    fireRate: 0.01,
    magazineSize: 10000000000000000000000,
    reserveAmmo: 100000000000000000000,
    reloadTime: 0.1,
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
