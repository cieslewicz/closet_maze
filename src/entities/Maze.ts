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

        // Pick Random Exit
        // Strategy: Pick a spot on the perimeter (but not corner) where there is a wall, 
        // and turn it into an exit?
        // Or just pick a random open spot far away?
        // User said "Door to leave", implying passing through a wall

        // Let's put the exit on a random border wall
        const border = Math.floor(Math.random() * 4) // 0: Top, 1: Right, 2: Bottom, 3: Left
        let ex = 0, ez = 0

        switch (border) {
            case 0: // Top (z=0)
                ex = 1 + Math.floor(Math.random() * (this.width - 2))
                ez = 0
                break
            case 1: // Right (x=width-1)
                ex = this.width - 1
                ez = 1 + Math.floor(Math.random() * (this.height - 2))
                break
            case 2: // Bottom (z=height-1)
                ex = 1 + Math.floor(Math.random() * (this.width - 2))
                ez = this.height - 1
                break
            case 3: // Left (x=0)
                ex = 0
                ez = 1 + Math.floor(Math.random() * (this.height - 2))
                break
        }

        // Ensure the spot next to the exit inside the maze is clear so we can reach it
        this.map[ez][ex] = 3

        // Clear neighbor
        if (ez === 0) this.map[ez + 1][ex] = 0
        if (ez === this.height - 1) this.map[ez - 1][ex] = 0
        if (ex === 0) this.map[ez][ex + 1] = 0
        if (ex === this.width - 1) this.map[ez][ex - 1] = 0
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

    public checkCollision(playerBox: THREE.Box3): boolean {
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
                if (this.map[gz][gx] === 1) return true
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
