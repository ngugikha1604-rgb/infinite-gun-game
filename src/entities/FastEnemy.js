import { Enemy } from './Enemy.js';
import * as THREE from 'three';

export class FastEnemy extends Enemy {
    constructor(scene, position) {
        // Tốc độ cao (3.8), máu ít (2 HP), màu xanh lá cây (0x44aa44)
        super(scene, position, 3.8, 2, 0x44aa44);
        // Thay đổi kích thước nhỉnh hơn một chút để phân biệt? (tuỳ)
        // this.mesh.scale.set(0.9, 0.9, 0.9);
        // Hoặc có thể thêm hiệu ứng riêng
    }
}