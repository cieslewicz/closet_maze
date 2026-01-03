import * as THREE from 'three'
import { InputManager } from '../core/InputManager'

export class Player {
    private mesh: THREE.Mesh
    private speed: number = 5


    constructor() {
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5)
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 })
        this.mesh = new THREE.Mesh(geometry, material)
        this.mesh.position.y = 0.25
        this.mesh.castShadow = true
        this.mesh.receiveShadow = true
    }

    public getMesh() {
        return this.mesh
    }

    public update(dt: number, input: InputManager) {
        const axis = input.getAxis()
        // velocity calculation done by caller/physics engine usually 
        // but here we return desired delta for Game to check collision
        const dx = axis.x * this.speed * dt
        const dz = -axis.y * this.speed * dt
        return new THREE.Vector3(dx, 0, dz)
    }

    public setPosition(x: number, z: number) {
        this.mesh.position.x = x
        this.mesh.position.z = z
    }

    public getPosition() {
        return this.mesh.position.clone()
    }

    public getBoundingBox() {
        return new THREE.Box3().setFromObject(this.mesh)
    }
}
