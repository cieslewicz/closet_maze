import * as THREE from 'three'

export class Closet {
    private mesh: THREE.Group
    private bounds: THREE.Box3
    private wallMeshes: THREE.Mesh[] = []

    constructor(x: number, z: number) {
        this.mesh = new THREE.Group()
        this.mesh.position.set(x, 1, z)

        // Create a closet visual (Three walls)
        // The "Front" is +Z relative to the closet
        const material = new THREE.MeshStandardMaterial({ color: 0x8B4513 }) // Brown for wood
        const backGeo = new THREE.BoxGeometry(0.8, 2, 0.1)
        const sideGeo = new THREE.BoxGeometry(0.1, 2, 0.8)

        // Back Wall (at -Z)
        const back = new THREE.Mesh(backGeo, material)
        back.position.z = -0.35
        this.mesh.add(back)
        this.wallMeshes.push(back)

        // Left Wall (-X)
        const left = new THREE.Mesh(sideGeo, material)
        left.position.x = -0.35
        this.mesh.add(left)
        this.wallMeshes.push(left)

        // Right Wall (+X)
        const right = new THREE.Mesh(sideGeo, material)
        right.position.x = 0.35
        this.mesh.add(right)
        this.wallMeshes.push(right)

        // Add a "Doorway" frame or something visually indicating entrance
        const frameGeo = new THREE.BoxGeometry(0.8, 0.1, 0.1)
        const frame = new THREE.Mesh(frameGeo, material)
        frame.position.set(0, 0.95, 0.35) // Top of door
        this.mesh.add(frame)
        // We don't add frame to wallMeshes to allow walking under/through if tall enough,
        // although player head check isn't implemented. Frame Collision usually not needed for gameplay.

        this.bounds = new THREE.Box3().setFromObject(this.mesh)

        // Update matrices for correct world bbox later
        this.mesh.updateMatrixWorld(true)
    }

    public getMesh() {
        return this.mesh
    }

    public checkEntry(player: THREE.Mesh): boolean {
        const playerBox = new THREE.Box3().setFromObject(player)
        if (!this.bounds.intersectsBox(playerBox)) {
            return false
        }

        // Check strict entry: Player must be entering from the front (Local +Z)
        // Convert player position to local space of the closet
        const localPlayerPos = this.mesh.worldToLocal(player.position.clone())

        // Simplest logic for "Weird that you can enter from any direction":
        // Only return TRUE if the player is inside the "sweet spot"
        const isInsideX = Math.abs(localPlayerPos.x) < 0.3
        const isInsideZ = Math.abs(localPlayerPos.z) < 0.3

        return isInsideX && isInsideZ
    }

    public checkWallCollision(playerBox: THREE.Box3): boolean {
        // Check collision against strict wall meshes
        // We cannot just use this.bounds because that includes the "inside" volume.

        for (const wall of this.wallMeshes) {
            // Need world bbox of wall
            // Assumes updateMatrixWorld is handled by Game loop scene update
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
