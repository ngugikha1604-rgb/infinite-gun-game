import { Enemy } from './Enemy.js';

export class FastEnemy extends Enemy {
    constructor(scene, position) {
        // (speed, maxHp, damage, color)
        super(scene, position, 3.8, 60, 15, 0x44aa44);
    }
}