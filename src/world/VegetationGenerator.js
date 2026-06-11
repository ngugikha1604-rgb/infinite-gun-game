import * as THREE from 'three';

// Shade màu cỏ để có variation tự nhiên
const GRASS_COLORS = [
    0x5a9e30,   // xanh cỏ đậm
    0x6aab3a,   // xanh cỏ bình thường
    0x7bc045,   // xanh cỏ sáng/tươi
];

// Shade màu đá
const STONE_COLORS = [
    0x7a7268,   // đá xám ấm
    0x8a8278,   // đá xám nhạt
    0x686058,   // đá nâu xám
];

export class VegetationGenerator {
    constructor(scene, terrainGen) {
        this.scene      = scene;
        this.terrainGen = terrainGen;

        // Một geometry dùng chung nhưng nhiều material màu khác nhau
        this.grassGeometry = new THREE.ConeGeometry(0.13, 0.4, 5);
        this.grassMaterials = GRASS_COLORS.map(c =>
            new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, metalness: 0.0 })
        );

        this.stoneGeometry = new THREE.DodecahedronGeometry(0.13);
        this.stoneMaterials = STONE_COLORS.map(c =>
            new THREE.MeshStandardMaterial({ color: c, roughness: 0.90, metalness: 0.05 })
        );

        this.numGrass  = 90;
        this.numStones = 22;
    }

    generateChunkVegetation(chunkX, chunkZ) {
        const group     = new THREE.Group();
        const chunkSize = this.terrainGen.chunkSize;
        const blockSize = this.terrainGen.blockSize;
        const startX    = chunkX * chunkSize * blockSize;
        const startZ    = chunkZ * chunkSize * blockSize;
        const matrix    = new THREE.Matrix4();

        // --- Cỏ: 3 màu, mỗi màu dùng InstancedMesh riêng ---
        const grassPerColor = Math.ceil(this.numGrass / GRASS_COLORS.length);
        for (let ci = 0; ci < GRASS_COLORS.length; ci++) {
            const instances = new THREE.InstancedMesh(this.grassGeometry, this.grassMaterials[ci], grassPerColor);
            let count = 0;

            for (let i = 0; i < grassPerColor; i++) {
                const localX = (Math.random() - 0.5) * chunkSize * blockSize;
                const localZ = (Math.random() - 0.5) * chunkSize * blockSize;
                const wx = startX + localX;
                const wz = startZ + localZ;
                const groundY = this.terrainGen.getHeight(wx, wz) + 1.2;

                // Chỉ đặt cỏ ở vùng địa hình thấp-vừa (không trên đỉnh đá)
                if (groundY > 0.5 && groundY < 1.75) {
                    const scale = 0.65 + Math.random() * 0.70;
                    matrix.compose(
                        new THREE.Vector3(wx, groundY + 0.04, wz),
                        new THREE.Quaternion().setFromEuler(
                            new THREE.Euler(0, Math.random() * Math.PI * 2, 0)
                        ),
                        new THREE.Vector3(scale, scale * (0.9 + Math.random() * 0.4), scale)
                    );
                    instances.setMatrixAt(count++, matrix);
                }
            }

            instances.count = count;
            instances.instanceMatrix.needsUpdate = true;
            instances.castShadow  = true;
            instances.receiveShadow = true;
            group.add(instances);
        }

        // --- Đá: 3 màu, InstancedMesh ---
        const stonesPerColor = Math.ceil(this.numStones / STONE_COLORS.length);
        for (let ci = 0; ci < STONE_COLORS.length; ci++) {
            const instances = new THREE.InstancedMesh(this.stoneGeometry, this.stoneMaterials[ci], stonesPerColor);
            let count = 0;

            for (let i = 0; i < stonesPerColor; i++) {
                const localX = (Math.random() - 0.5) * chunkSize * blockSize;
                const localZ = (Math.random() - 0.5) * chunkSize * blockSize;
                const wx = startX + localX;
                const wz = startZ + localZ;
                const groundY = this.terrainGen.getHeight(wx, wz) + 1.2;

                if (groundY > 0.4 && groundY < 2.3) {
                    // Đá xuất hiện nhiều hơn ở vùng cao và dốc (không filter quá chặt)
                    const scaleXZ = 0.5 + Math.random() * 0.8;
                    const scaleY  = 0.4 + Math.random() * 0.7;
                    matrix.compose(
                        new THREE.Vector3(wx, groundY - 0.04, wz),
                        new THREE.Quaternion().setFromEuler(
                            new THREE.Euler(
                                Math.random() * 0.3,
                                Math.random() * Math.PI * 2,
                                Math.random() * 0.3
                            )
                        ),
                        new THREE.Vector3(scaleXZ, scaleY, scaleXZ)
                    );
                    instances.setMatrixAt(count++, matrix);
                }
            }

            instances.count = count;
            instances.instanceMatrix.needsUpdate = true;
            instances.castShadow  = true;
            instances.receiveShadow = true;
            group.add(instances);
        }

        return group;
    }
}