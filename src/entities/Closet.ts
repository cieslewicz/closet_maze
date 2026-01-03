import * as THREE from 'three'

export class Closet {
    private mesh: THREE.Group
    private bounds: THREE.Box3

    constructor(x: number, z: number) {
        this.mesh = new THREE.Group()
        this.mesh.position.set(x, 1, z)

        // Create a closet visual (Three walls)
        const material = new THREE.MeshStandardMaterial({ color: 0x8B4513 }) // Brown for wood
        const backGeo = new THREE.BoxGeometry(0.8, 2, 0.1)
        const sideGeo = new THREE.BoxGeometry(0.1, 2, 0.8)

        const back = new THREE.Mesh(backGeo, material)
        back.position.z = -0.35
        this.mesh.add(back)

        const left = new THREE.Mesh(sideGeo, material)
        left.position.x = -0.35
        this.mesh.add(left)

        const right = new THREE.Mesh(sideGeo, material)
        right.position.x = 0.35
        this.mesh.add(right)

        // Optional: Door mechanism later?

        this.bounds = new THREE.Box3().setFromObject(this.mesh)
    }

    public getMesh() {
        return this.mesh
    }

    public checkEntry(playerBox: THREE.Box3): boolean {
        // Simple intersection for now. 
        // In reality we might want "fully contained" or "center point inside"
        return this.bounds.intersectsBox(playerBox)
    }
}
