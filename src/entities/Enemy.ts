import * as THREE from 'three'
import { Maze } from './Maze'
import { Closet } from './Closet'

enum EnemyState {
    WANDER,
    CHASE,
    SEARCH
}

enum WanderStrategy {
    RANDOM,
    WALL_FOLLOW
}

export class Enemy {
    private mesh: THREE.Group
    private body: THREE.Mesh
    private eyes: THREE.Mesh[] = []
    private state: EnemyState = EnemyState.WANDER
    private speed: number = 2.0
    private direction: THREE.Vector3 = new THREE.Vector3(1, 0, 0)
    private wanderTimer: number = 0

    private viewDistance: number = 5 // Reduced for confined maze feel

    // AI Memory & Strategy
    private strategy: WanderStrategy = WanderStrategy.RANDOM
    private strategyTimer: number = 0
    private previousDirection: THREE.Vector3 = new THREE.Vector3()

    // Animation
    private floatOffset: number = 0

    constructor(x: number, z: number) {
        this.mesh = new THREE.Group()
        this.mesh.position.set(x, 1, z)

        // Ghost Body: Floating Cone/Cylinder
        const geo = new THREE.ConeGeometry(0.3, 1, 16)
        const mat = new THREE.MeshStandardMaterial({
            color: 0xaa0000,
            transparent: true,
            opacity: 0.9,
            roughness: 0.2
        })
        this.body = new THREE.Mesh(geo, mat)
        this.body.position.y = 0.2 // Float center
        this.body.rotation.x = Math.PI // Inverted cone? Or pointed up? 
        // Pointed Up is standard cone. Let's do inverted for "ghost tail"? 
        // Or just normal.
        this.mesh.add(this.body)

        // Glowing Eyes
        const eyeGeo = new THREE.SphereGeometry(0.08, 8, 8)
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 }) // Emissive look

        const leftEye = new THREE.Mesh(eyeGeo, eyeMat)
        leftEye.position.set(-0.12, 0.4, 0.15) // Front face (+Z for now)
        this.mesh.add(leftEye)
        this.eyes.push(leftEye)

        const rightEye = new THREE.Mesh(eyeGeo, eyeMat)
        rightEye.position.set(0.12, 0.4, 0.15)
        this.mesh.add(rightEye)
        this.eyes.push(rightEye)

        // Add Point Light for spooky glow
        const light = new THREE.PointLight(0xff0000, 1, 3)
        light.position.y = 0.5
        this.mesh.add(light)

        this.floatOffset = Math.random() * 100
    }

    private pickNewDirection(maze: Maze, closets: Closet[]) {
        // Strategy Switching
        if (this.strategyTimer <= 0) {
            // Switch bias: 70% Random, 30% Wall Follow
            this.strategy = Math.random() < 0.7 ? WanderStrategy.RANDOM : WanderStrategy.WALL_FOLLOW
            this.strategyTimer = 5 + Math.random() * 5
        }

        if (this.strategy === WanderStrategy.WALL_FOLLOW) {
            this.pickWallFollowDirection(maze, closets)
        } else {
            this.pickRandomSmartDirection(maze, closets)
        }
    }

    private pickWallFollowDirection(maze: Maze, closets: Closet[]) {
        // Simple Right-Hand Rule Approximation
        // 1. Try Right (Turn -90)
        // 2. Try Front (Forward)
        // 3. Try Left (Turn +90)
        // 4. Try Back (Turn 180) - Last resort

        const right = this.direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2)
        const front = this.direction.clone()
        const left = this.direction.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2)
        const back = this.direction.clone().negate()

        const candidates = [right, front, left, back]

        for (const dir of candidates) {
            if (this.checkDirection(maze, closets, dir)) {
                this.setDirection(dir)
                return
            }
        }
    }

    private pickRandomSmartDirection(maze: Maze, closets: Closet[]) {
        // Try up to 8 times to find a valid direction
        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2
            const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle))

            // Memory Check: Avoid ~180 degree turns (dot product < -0.5)
            // Unless we are stuck, retry
            if (this.previousDirection.lengthSq() > 0) {
                const dot = dir.dot(this.previousDirection)
                if (dot < -0.5 && i < 8) continue // Retry to avoid U-turn
            }

            if (this.checkDirection(maze, closets, dir)) {
                this.setDirection(dir)
                return
            }
        }

        // Fallback
        const angle = Math.random() * Math.PI * 2
        this.setDirection(new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)))
    }

    private checkDirection(maze: Maze, closets: Closet[], dir: THREE.Vector3): boolean {
        // Multi-stage probe to catch thin obstacles
        const maxDist = 1.0
        const steps = 3
        const stepSize = maxDist / steps

        for (let i = 1; i <= steps; i++) {
            const dist = i * stepSize
            const probePos = this.mesh.position.clone().add(dir.clone().multiplyScalar(dist))
            const probeBox = new THREE.Box3().setFromObject(this.body)
            const size = new THREE.Vector3()
            probeBox.getSize(size)
            probeBox.setFromCenterAndSize(probePos, size)

            if (this.checkAnyCollision(probeBox, maze, closets)) {
                return false // Blocked
            }
        }
        return true // Clear
    }

    private checkAnyCollision(box: THREE.Box3, maze: Maze, closets: Closet[]): boolean {
        if (maze.checkCollision(box)) return true
        for (const closet of closets) {
            // Use bounding box for simple obstruction
            if (closet.getBoundingBox().intersectsBox(box)) return true
        }
        return false
    }

    private setDirection(dir: THREE.Vector3) {
        this.previousDirection.copy(this.direction)
        this.direction.copy(dir)
        this.wanderTimer = 1.5 + Math.random() * 2 // Slightly shorter segments

        const targetLook = this.mesh.position.clone().add(this.direction)
        this.mesh.lookAt(targetLook.x, this.mesh.position.y, targetLook.z)
    }

    public getMesh() {
        return this.mesh
    }

    public update(dt: number, playerPos: THREE.Vector3, isPlayerHidden: boolean, maze: Maze, closets: Closet[]) {
        // 1. Animation (Float)
        this.floatOffset += dt * 3
        this.body.position.y = 0.2 + Math.sin(this.floatOffset) * 0.1

        // 2. Logic
        const dist = this.mesh.position.distanceTo(playerPos)
        let canSee = false

        // Check line of sight? (Optional improvement: raycast)
        // For now, distance based check
        if (!isPlayerHidden && dist < this.viewDistance) {
            canSee = true
        }

        if (canSee) {
            this.state = EnemyState.CHASE
            // Reset strategy timers on chase
            this.strategyTimer = 0

            // Simple Chase: Move towards player
            this.direction.subVectors(playerPos, this.mesh.position).normalize()

            // Face Player
            this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z)
        } else {
            this.state = EnemyState.WANDER
            if (this.state === EnemyState.WANDER) {
                this.wanderTimer -= dt
                this.strategyTimer -= dt
                if (this.wanderTimer <= 0) {
                    this.pickNewDirection(maze, closets)
                }
            }
        }

        // Move
        const velocity = this.direction.clone().multiplyScalar(this.speed * dt)

        // Collision Check (Simple sliding or revert)
        const oldPos = this.mesh.position.clone()

        // Move X
        this.mesh.position.x += velocity.x
        this.mesh.updateMatrixWorld()
        if (this.checkAnyCollision(new THREE.Box3().setFromObject(this.body), maze, closets)) { // Collide body only
            this.mesh.position.x = oldPos.x
            this.pickNewDirection(maze, closets) // Immediately pick new open direction
        }

        // Move Z
        this.mesh.position.z += velocity.z
        this.mesh.updateMatrixWorld()
        if (this.checkAnyCollision(new THREE.Box3().setFromObject(this.body), maze, closets)) {
            this.mesh.position.z = oldPos.z
            this.pickNewDirection(maze, closets) // Immediately pick new open direction
        }
    }
}
