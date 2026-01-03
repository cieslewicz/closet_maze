import * as THREE from 'three'

export class Closet {
    private mesh: THREE.Group
    private bounds: THREE.Box3
    private wallMeshes: THREE.Mesh[] = []

    constructor(x: number, z: number, rotation: number = 0) {
        this.mesh = new THREE.Group()
        this.mesh.position.set(x, 1, z)
        this.mesh.rotation.y = rotation

        // Create a closet visual (Three walls)
        // The "Front" is +Z relative to the closet
        const material = new THREE.MeshStandardMaterial({ color: 0x8B4513 }) // Brown for wood

        // Widen the closet to make entry easier (Prop 1.0 wide)
        const backGeo = new THREE.BoxGeometry(1.0, 2, 0.1)
        const sideGeo = new THREE.BoxGeometry(0.1, 2, 0.8)

        // Back Wall (at -Z)
        const back = new THREE.Mesh(backGeo, material)
        back.position.z = -0.35
        this.mesh.add(back)
        this.wallMeshes.push(back)

        // Left Wall (-X) moved out to -0.45 (Gap 0.9)
        const left = new THREE.Mesh(sideGeo, material)
        left.position.x = -0.45
        this.mesh.add(left)
        this.wallMeshes.push(left)

        // Right Wall (+X) moved out to 0.45
        const right = new THREE.Mesh(sideGeo, material)
        right.position.x = 0.45
        this.mesh.add(right)
        this.wallMeshes.push(right)

        // Top Frame (Visual Door Indicator)
        const frameGeo = new THREE.BoxGeometry(1.0, 0.1, 0.1)
        const frameMat = new THREE.MeshStandardMaterial({ color: 0xA0522D }) // Lighter
        const frame = new THREE.Mesh(frameGeo, frameMat)
        frame.position.set(0, 0.95, 0.35) // Top of door
        this.mesh.add(frame)

        // Floor Marker
        const matGeo = new THREE.PlaneGeometry(0.8, 0.2)
        const matMat = new THREE.MeshStandardMaterial({ color: 0x553311 })
        const floorMat = new THREE.Mesh(matGeo, matMat)
        floorMat.rotation.x = -Math.PI / 2
        floorMat.position.set(0, -0.99, 0.4) // Slightly in front
        this.mesh.add(floorMat)

        this.bounds = new THREE.Box3().setFromObject(this.mesh)

        // Update matrices for correct world bbox later
        this.mesh.updateMatrixWorld(true)
    }

    public getMesh() {
        return this.mesh
    }

    public checkEntry(player: THREE.Object3D): boolean {
        // Simple distance check from center (Local 0,0)
        const localPlayerPos = this.mesh.worldToLocal(player.position.clone())

        // Distance check from center of closet
        // If walls block other sides, being close to center means we are inside or at door.
        // Ignore Y difference
        const distSq = localPlayerPos.x * localPlayerPos.x + localPlayerPos.z * localPlayerPos.z

        // Threshold Radius 0.6 (sq = 0.36)
        // Must be in front of back wall (z > -0.3) to avoid triggering from behind
        return distSq < 0.36 && localPlayerPos.z > -0.3
    }

    public checkWallCollision(playerBox: THREE.Box3): boolean {
        // Check collision against strict wall meshes
        // We cannot just use this.bounds because that includes the "inside" volume.

        for (const wall of this.wallMeshes) {
            // Need world bbox of wall
            const wallBox = new THREE.Box3().setFromObject(wall)
            if (wallBox.intersectsBox(playerBox)) {
                return true
            }
        }
        return false
    }

    public getBoundingBox() {
        return this.bounds
    }
}
