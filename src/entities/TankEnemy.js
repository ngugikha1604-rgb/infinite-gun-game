import { Enemy } from './Enemy.js';

export class TankEnemy extends Enemy {
    constructor(scene, position) {
        // (speed, maxHp, damage, color)
        super(scene, position, 1.2, 150, 30, 0x777777);
        this.mesh.scale.set(1.2, 1.2, 1.2);
    }
}