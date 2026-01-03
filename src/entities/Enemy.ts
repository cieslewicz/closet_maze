import * as THREE from 'three'
import { Maze } from './Maze'

enum EnemyState {
    WANDER,
    CHASE,
    SEARCH // Looking around after losing player?
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

    public getMesh() {
        return this.mesh
    }

    public update(dt: number, playerPos: THREE.Vector3, isPlayerHidden: boolean, maze: Maze) {
        // 1. Animation (Float)
        this.floatOffset += dt * 3
        this.body.position.y = 0.2 + Math.sin(this.floatOffset) * 0.1

        // 2. Logic
        const dist = this.mesh.position.distanceTo(playerPos)
        let canSee = false

        if (!isPlayerHidden && dist < this.viewDistance) {
            canSee = true
        }

        if (canSee) {
            this.state = EnemyState.CHASE
            // Simple Chase: Move towards player
            this.direction.subVectors(playerPos, this.mesh.position).normalize()

            // Face Player
            this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z)
        } else {
            this.state = EnemyState.WANDER
            if (this.state === EnemyState.WANDER) {
                this.wanderTimer -= dt
                if (this.wanderTimer <= 0) {
                    // Pick random direction
                    const angle = Math.random() * Math.PI * 2
                    this.direction.set(Math.cos(angle), 0, Math.sin(angle))
                    this.wanderTimer = 2 + Math.random() * 2

                    // Face direction
                    const targetLook = this.mesh.position.clone().add(this.direction)
                    this.mesh.lookAt(targetLook.x, this.mesh.position.y, targetLook.z)
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
        if (maze.checkCollision(new THREE.Box3().setFromObject(this.body))) { // Collide body only
            this.mesh.position.x = oldPos.x
        }

        // Move Z
        this.mesh.position.z += velocity.z
        this.mesh.updateMatrixWorld()
        if (maze.checkCollision(new THREE.Box3().setFromObject(this.body))) {
            this.mesh.position.z = oldPos.z
        }
    }
}
