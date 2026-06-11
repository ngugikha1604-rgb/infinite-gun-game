export class WorldChunk {
    constructor(chunkX, chunkZ, terrainMesh, vegetationGroup) {
        this.chunkX = chunkX;
        this.chunkZ = chunkZ;
        this.terrainMesh = terrainMesh;
        this.vegetationGroup = vegetationGroup;
    }
    
    addToScene(scene) {
        scene.add(this.terrainMesh);
        if (this.vegetationGroup) scene.add(this.vegetationGroup);
    }
    
    removeFromScene(scene) {
        scene.remove(this.terrainMesh);
        if (this.vegetationGroup) scene.remove(this.vegetationGroup);
        this.terrainMesh.geometry.dispose();
        this.terrainMesh.material.dispose();
        if (this.vegetationGroup) {
            this.vegetationGroup.children.forEach(child => {
                if (child.isMesh) {
                    child.geometry.dispose();
                    child.material.dispose();
                }
            });
        }
    }
}