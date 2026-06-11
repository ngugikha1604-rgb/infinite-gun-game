import { createNoise2D } from 'simplex-noise';
import alea from 'alea';
import * as THREE from 'three';

// Nội suy tuyến tính
function lerp(a, b, t) { return a + (b - a) * t; }

// Smoothstep (mượt hơn lerp thông thường)
function smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}

// Nội suy màu RGB theo hệ số t
function lerpColor(c1, c2, t) {
    return [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)];
}

// Bảng màu theo độ cao (đã chuẩn hóa 0→1)
// Sẽ được map từ khoảng height [-0.8 .. 1.2] + offset 1.2 → [0.4 .. 2.4]
const COLOR_STOPS = [
    // [height_world, [r, g, b]]
    { h: 0.40, rgb: [0.22, 0.16, 0.10] },  // đất ướt/bùn (rất thấp)
    { h: 0.85, rgb: [0.28, 0.42, 0.18] },  // cỏ xanh đậm
    { h: 1.30, rgb: [0.38, 0.54, 0.22] },  // cỏ xanh tươi
    { h: 1.70, rgb: [0.50, 0.44, 0.30] },  // đất/cát
    { h: 2.00, rgb: [0.55, 0.52, 0.48] },  // đá xám nhạt
    { h: 2.40, rgb: [0.72, 0.70, 0.68] },  // đá vôi/tuyết xám
];

// Màu đá cho mặt dốc đứng
const ROCK_COLOR = [0.42, 0.38, 0.32];

// Lấy màu dựa trên độ cao (worldY) và hệ số dốc (slope 0→1)
function getTerrainColor(worldY, slope) {
    // Tìm màu theo độ cao
    let baseColor;
    if (worldY <= COLOR_STOPS[0].h) {
        baseColor = COLOR_STOPS[0].rgb;
    } else if (worldY >= COLOR_STOPS[COLOR_STOPS.length - 1].h) {
        baseColor = COLOR_STOPS[COLOR_STOPS.length - 1].rgb;
    } else {
        baseColor = COLOR_STOPS[0].rgb;
        for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
            const lo = COLOR_STOPS[i];
            const hi = COLOR_STOPS[i + 1];
            if (worldY >= lo.h && worldY < hi.h) {
                const t = smoothstep(lo.h, hi.h, worldY);
                baseColor = lerpColor(lo.rgb, hi.rgb, t);
                break;
            }
        }
    }

    // Blend với màu đá theo độ dốc (dốc > 0.45 bắt đầu lộ đá, > 0.7 = đá hoàn toàn)
    const rockBlend = smoothstep(0.40, 0.70, slope);
    return lerpColor(baseColor, ROCK_COLOR, rockBlend);
}

export class TerrainGenerator {
    constructor(seed = 'infinity') {
        const prng = alea(seed);
        this.noise2D = createNoise2D(prng);
        this.chunkSize = 24;
        this.blockSize = 0.5;
    }

    getHeight(x, z) {
        const f1 = 0.12;
        const f2 = f1 * 2.8;
        const f3 = f1 * 7.0;

        let y = this.noise2D(x * f1, z * f1) * 1.2;          // octave 1 – hình dạng lớn
        y   += this.noise2D(x * f2, z * f2) * 0.45;          // octave 2 – đồi nhỏ
        y   += this.noise2D(x * f3, z * f3) * 0.10;          // octave 3 – gồ ghề nhỏ

        return Math.max(-0.8, Math.min(1.2, y));
    }

    generateChunk(chunkX, chunkZ) {
        const vertices = [];
        const indices  = [];
        const colors   = [];

        const startX = chunkX * this.chunkSize * this.blockSize;
        const startZ = chunkZ * this.chunkSize * this.blockSize;
        const size   = this.chunkSize;
        const bs     = this.blockSize;

        // Build heightmap 2D để tính slope chính xác
        const hmap = [];
        for (let i = 0; i <= size; i++) {
            hmap.push([]);
            for (let j = 0; j <= size; j++) {
                hmap[i].push(this.getHeight(startX + i * bs, startZ + j * bs));
            }
        }

        for (let i = 0; i <= size; i++) {
            const x = startX + i * bs;
            for (let j = 0; j <= size; j++) {
                const z    = startZ + j * bs;
                const rawH = hmap[i][j];
                const worldY = rawH + 1.2;   // offset camera

                vertices.push(x, worldY, z);

                // Tính slope từ gradient neighbours (kẹp biên)
                const hi  = hmap[Math.min(i + 1, size)][j];
                const hii = hmap[Math.max(i - 1, 0)][j];
                const hj  = hmap[i][Math.min(j + 1, size)];
                const hjj = hmap[i][Math.max(j - 1, 0)];
                const dX  = (hi - hii) / (2 * bs);
                const dZ  = (hj - hjj) / (2 * bs);
                const slope = Math.min(1, Math.sqrt(dX * dX + dZ * dZ));

                const [r, g, b] = getTerrainColor(worldY, slope);
                colors.push(r, g, b);
            }
        }

        for (let i = 0; i < size; i++) {
            for (let j = 0; j < size; j++) {
                const a = i * (size + 1) + j;
                const b = (i + 1) * (size + 1) + j;
                const c = (i + 1) * (size + 1) + (j + 1);
                const d = i * (size + 1) + (j + 1);
                indices.push(a, c, b);
                indices.push(a, d, c);
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3));
        geometry.setAttribute('color',    new THREE.BufferAttribute(new Float32Array(colors),   3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.88,
            metalness: 0.0,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.receiveShadow = true;
        mesh.castShadow   = true;
        return mesh;
    }
}