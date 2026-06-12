import { Enemy } from './Enemy.js';
import * as THREE from 'three';

export class TankEnemy extends Enemy {
    constructor(scene, position) {
        // Tốc độ chậm (1.2), máu nhiều (5 HP), màu xám thép (0x777777)
        super(scene, position, 1.2, 5, 0x777777);
        // Có thể tăng kích thước
        this.mesh.scale.set(1.2, 1.2, 1.2);
    }
}