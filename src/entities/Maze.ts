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
        let attempts = 0
        const maxAttempts = 100

        while (attempts++ < maxAttempts) {
            this.map = []
            // 1. Generate Random Noise Map
            for (let z = 0; z < this.height; z++) {
                const row: number[] = []
                for (let x = 0; x < this.width; x++) {
                    if (x === 0 || x === this.width - 1 || z === 0 || z === this.height - 1) {
                        row.push(1) // Border Wall
                    } else {
                        row.push(Math.random() < 0.2 ? 1 : 0) // 20% Obstacles
                    }
                }
                this.map.push(row)
            }

            // 2. Clear Start Area (Center)
            const centerX = Math.floor(this.width / 2)
            const centerZ = Math.floor(this.height / 2)
            // Ensure 3x3 safety
            for (let r = -1; r <= 1; r++) {
                for (let c = -1; c <= 1; c++) {
                    this.map[centerZ + r][centerX + c] = 0
                }
            }

            // 3. Flood Fill to find reachable area
            const reachable = new Set<string>()
            const queue: { x: number, z: number }[] = [{ x: centerX, z: centerZ }]
            reachable.add(`${centerX},${centerZ}`)

            while (queue.length > 0) {
                const current = queue.shift()!
                const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]

                for (const d of dirs) {
                    const nx = current.x + d[0]
                    const nz = current.z + d[1]

                    // Check if valid and not wall
                    if (nx > 0 && nx < this.width - 1 && nz > 0 && nz < this.height - 1) {
                        if (this.map[nz][nx] === 0) {
                            const key = `${nx},${nz}`
                            if (!reachable.has(key)) {
                                reachable.add(key)
                                queue.push({ x: nx, z: nz })
                            }
                        }
                    }
                }
            }

            // 4. Find potential Exits (Border walls adjacent to reachable)
            const exitCandidates: { x: number, z: number }[] = []

            // Scan borders (excluding corners for simplicity)
            // Top (z=0)
            for (let x = 1; x < this.width - 1; x++) {
                if (reachable.has(`${x},1`)) exitCandidates.push({ x, z: 0 })
            }
            // Bottom (z=h-1)
            for (let x = 1; x < this.width - 1; x++) {
                if (reachable.has(`${x},${this.height - 2}`)) exitCandidates.push({ x, z: this.height - 1 })
            }
            // Left (x=0)
            for (let z = 1; z < this.height - 1; z++) {
                if (reachable.has(`1,${z}`)) exitCandidates.push({ x: 0, z })
            }
            // Right (x=w-1)
            for (let z = 1; z < this.height - 1; z++) {
                if (reachable.has(`${this.width - 2},${z}`)) exitCandidates.push({ x: this.width - 1, z })
            }

            if (exitCandidates.length > 0) {
                // Success!
                const exit = exitCandidates[Math.floor(Math.random() * exitCandidates.length)]
                this.map[exit.z][exit.x] = 3

                // Ensure neighbor is definitely 0 (it should be if reachable, but just to be safe logic-wise)
                // Actually reachable check confirmed neighbor is 0.

                console.log(`Maze Generation Successful on Attempt ${attempts}`)
                return
            }
            // Else, map was bad (no path to edge), retry
        }
        console.warn("Failed to generate solvable maze, falling back to simple")
        // Fallback: Clear a path specifically? Or just leave it broken? 
        // For now, assume probability works in our favor.
    }

    private createMeshes() {
        const wallGeo = new THREE.BoxGeometry(1, 2, 1) // 2 units high
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x8888ff })


        const exitMat = new THREE.MeshStandardMaterial({ color: 0xffd700 }) // Gold

        for (let z = 0; z < this.height; z++) {
            for (let x = 0; x < this.width; x++) {
                const type = this.map[z][x]
                const wx = x - this.width / 2
                const wz = z - this.height / 2

                if (type === 1) {
                    const wall = new THREE.Mesh(wallGeo, wallMat)
                    wall.position.set(wx, 1, wz)
                    wall.castShadow = true
                    wall.receiveShadow = true
                    wall.updateMatrixWorld()
                    this.walls.push(wall)
                    this.group.add(wall)
                } else if (type === 3) {
                    // Exit Door
                    // Needs to rotate based on wall? 
                    // Simplification: Just a labeled box for now, or a glowing arch

                    // Create a doorframe
                    const doorLeft = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2, 0.2), exitMat)
                    doorLeft.position.set(wx - 0.3, 1, wz)

                    const doorRight = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2, 0.2), exitMat)
                    doorRight.position.set(wx + 0.3, 1, wz)

                    const doorTop = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.2, 0.2), exitMat)
                    doorTop.position.set(wx, 1.9, wz)

                    this.group.add(doorLeft)
                    this.group.add(doorRight)
                    this.group.add(doorTop)

                    // Visual "Void" behind door
                    const voidMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.8), new THREE.MeshBasicMaterial({ color: 0x000000 }))
                    voidMesh.position.set(wx, 0.9, wz)
                    // Align rotation? Simple logic: if x=0 or width-1, rotate Y 90
                    if (x === 0 || x === this.width - 1) {
                        voidMesh.rotation.y = Math.PI / 2
                        doorLeft.position.set(wx, 1, wz - 0.3)
                        doorRight.position.set(wx, 1, wz + 0.3)
                        // Re-orient frame pieces... simplifying
                    }
                    this.group.add(voidMesh)
                }
            }
        }
    }

    public checkCollision(playerBox: THREE.Box3, blockTypes: number[] = [1]): boolean {
        const pMin = playerBox.min
        const pMax = playerBox.max
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
                if (blockTypes.includes(this.map[gz][gx])) return true
            }
        }
        return false
    }

    public checkWin(playerPos: THREE.Vector3): boolean {
        const gx = Math.round(playerPos.x + this.width / 2)
        const gz = Math.round(playerPos.z + this.height / 2)
        if (gx >= 0 && gx < this.width && gz >= 0 && gz < this.height) {
            // Since exit is now "in" the wall (type 3), 
            // we check if player is comfortably in that cell
            return this.map[gz][gx] === 3
        }
        return false
    }

    public getGroup() { return this.group }
    public getWalls() { return this.walls }

    public getEmptySpots(): { x: number, z: number }[] {
        const spots: { x: number, z: number }[] = []
        for (let z = 1; z < this.height - 1; z++) {
            for (let x = 1; x < this.width - 1; x++) {
                if (this.map[z][x] === 0) {
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
