import * as THREE from 'three'
import { Maze } from './Maze'

export enum EnemyState {
    WANDER,
    CHASE,
    SEARCH
}

export class Enemy {
    private mesh: THREE.Mesh
    private state: EnemyState = EnemyState.WANDER
    private speed: number = 3
    private direction: THREE.Vector3 = new THREE.Vector3(1, 0, 0)
    private changeDirTimer: number = 0

    // Chase params
    private viewDistance: number = 8


    constructor(x: number, z: number) {
        // Red Cone or Cylinder for enemy
        const geometry = new THREE.ConeGeometry(0.5, 1.5, 8)
        const material = new THREE.MeshStandardMaterial({ color: 0xff0000 })
        this.mesh = new THREE.Mesh(geometry, material)
        this.mesh.position.set(x, 0.75, z)
        this.mesh.castShadow = true
    }

    public getMesh() {
        return this.mesh
    }

    public update(dt: number, playerPos: THREE.Vector3, isPlayerHidden: boolean, maze: Maze) {
        // 1. Behavior Logic (State Machine Transition)
        const distToPlayer = this.mesh.position.distanceTo(playerPos)

        // Simple Raycast check could go here, for now using distance + hidden status
        const canSeePlayer = !isPlayerHidden && distToPlayer < this.viewDistance

        if (this.state === EnemyState.WANDER) {
            if (canSeePlayer) {
                this.state = EnemyState.CHASE
            }
        } else if (this.state === EnemyState.CHASE) {
            if (!canSeePlayer) {
                this.state = EnemyState.WANDER // Or SEARCH
                // Pick random dir when losing player
                this.direction.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize()
            }
        }

        // 2. Movement Logic
        if (this.state === EnemyState.WANDER) {
            this.changeDirTimer -= dt
            if (this.changeDirTimer <= 0) {
                this.direction.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize()
                this.changeDirTimer = 2 + Math.random() * 2 // 2-4 seconds
            }
        } else if (this.state === EnemyState.CHASE) {
            this.direction.subVectors(playerPos, this.mesh.position).normalize()
            this.direction.y = 0 // Keep on ground
        }

        // Apply visual rotation
        if (this.direction.lengthSq() > 0.01) {
            // LookAt logic needs target point
            const target = this.mesh.position.clone().add(this.direction)
            this.mesh.lookAt(target)
        }

        // Move
        const velocity = this.direction.clone().multiplyScalar(this.speed * dt)

        // X Collision check
        this.mesh.position.x += velocity.x
        if (maze.checkCollision(new THREE.Box3().setFromObject(this.mesh))) {
            this.mesh.position.x -= velocity.x
            // Bounce/Slide (pick new dir if wandering)
            if (this.state === EnemyState.WANDER) {
                this.direction.x *= -1 // Simple bounce
                this.changeDirTimer = 0.5 // Short timer to avoid getting stuck
            }
        }

        // Z Collision check
        this.mesh.position.z += velocity.z
        if (maze.checkCollision(new THREE.Box3().setFromObject(this.mesh))) {
            this.mesh.position.z -= velocity.z
            if (this.state === EnemyState.WANDER) {
                this.direction.z *= -1
                this.changeDirTimer = 0.5
            }
        }
    }
}
