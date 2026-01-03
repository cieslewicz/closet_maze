import * as THREE from 'three'

export class Maze {
    private width: number
    private height: number
    private map: number[][]
    private group: THREE.Group
    private walls: THREE.Mesh[] = []

    // 1 = Wall, 0 = Path, 2 = Start, 3 = Exit
    constructor(width: number, height: number) {
        this.width = width
        this.height = height
        this.map = []
        this.group = new THREE.Group()
        this.generateSimpleMap()
        this.createMeshes()
    }

    private generateSimpleMap() {
        // Simple test map: border walls + some random blocks
        for (let z = 0; z < this.height; z++) {
            const row: number[] = []
            for (let x = 0; x < this.width; x++) {
                if (x === 0 || x === this.width - 1 || z === 0 || z === this.height - 1) {
                    row.push(1) // Border Wall
                } else {
                    // Random inner walls
                    row.push(Math.random() < 0.2 ? 1 : 0)
                }
            }
            this.map.push(row)
        }

        // Clear start area (center-ish)
        const centerX = Math.floor(this.width / 2)
        const centerZ = Math.floor(this.height / 2)
        this.map[centerZ][centerX] = 0
        this.map[centerZ][centerX + 1] = 0
        this.map[centerZ + 1][centerX] = 0
        this.map[centerZ + 1][centerX + 1] = 0

        // Set Exit (3) at top left
        this.map[1][1] = 3
    }

    private createMeshes() {
        const wallGeo = new THREE.BoxGeometry(1, 2, 1) // 2 units high
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x8888ff })

        for (let z = 0; z < this.height; z++) {
            for (let x = 0; x < this.width; x++) {
                if (this.map[z][x] === 1) {
                    const wall = new THREE.Mesh(wallGeo, wallMat)
                    wall.position.set(x - this.width / 2, 1, z - this.height / 2)
                    wall.castShadow = true
                    wall.receiveShadow = true
                    wall.updateMatrixWorld()
                    this.walls.push(wall)
                    this.group.add(wall)
                } else if (this.map[z][x] === 3) {
                    const exitGeo = new THREE.BoxGeometry(1, 0.1, 1)
                    const exitMat = new THREE.MeshStandardMaterial({ color: 0xffd700 }) // Gold
                    const exit = new THREE.Mesh(exitGeo, exitMat)
                    exit.position.set(x - this.width / 2, 0.05, z - this.height / 2)
                    this.group.add(exit)
                }
            }
        }
    }

    public checkCollision(playerBox: THREE.Box3): boolean {
        // Grid based collision (Better performance)
        const pMin = playerBox.min
        const pMax = playerBox.max

        // Transform player coords to grid coords (Offset by width/2, height/2)
        // Coords are centered at 0,0, but map is 0..width, 0..height
        // wall at x,z in map corresponds to world x - w/2, z - h/2
        // so world x -> map x = x + w/2

        // Check 4 corners
        const corners = [
            new THREE.Vector3(pMin.x, 0, pMin.z),
            new THREE.Vector3(pMax.x, 0, pMax.z),
            new THREE.Vector3(pMin.x, 0, pMax.z),
            new THREE.Vector3(pMax.x, 0, pMin.z)
        ]

        for (const p of corners) {
            const gx = Math.round(p.x + this.width / 2)
            const gz = Math.round(p.z + this.height / 2)

            if (gx >= 0 && gx < this.width && gz >= 0 && gz < this.height) {
                if (this.map[gz][gx] === 1) return true
            }
        }

        return false
    }

    public checkWin(playerPos: THREE.Vector3): boolean {
        const gx = Math.round(playerPos.x + this.width / 2)
        const gz = Math.round(playerPos.z + this.height / 2)
        if (gx >= 0 && gx < this.width && gz >= 0 && gz < this.height) {
            return this.map[gz][gx] === 3
        }
        return false
    }

    public getGroup() {
        return this.group
    }

    public getWalls() {
        return this.walls
    }

    public getEmptySpots(): { x: number, z: number }[] {
        const spots: { x: number, z: number }[] = []
        for (let z = 1; z < this.height - 1; z++) {
            for (let x = 1; x < this.width - 1; x++) {
                if (this.map[z][x] === 0) {
                    // Return world coordinates
                    spots.push({
                        x: x - this.width / 2,
                        z: z - this.height / 2
                    })
                }
            }
        }
        return spots
    }
}
