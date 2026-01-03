import * as THREE from 'three'


export class Player {
    private mesh: THREE.Group
    private speed: number = 3.5 // Slightly faster for fun
    private bobOffset: number = 0

    constructor(color: number = 0x00ff00) {
        this.mesh = new THREE.Group()

        // Create Avatar
        this.createAvatar(color)

        this.mesh.position.y = 0.5 // Half height
        this.mesh.castShadow = true
        this.mesh.receiveShadow = true
    }

    private createAvatar(color: number) {
        // 1. Body (Cylinder/Capsule-ish)
        const bodyGeo = new THREE.CylinderGeometry(0.2, 0.15, 0.6, 8)
        const bodyMat = new THREE.MeshStandardMaterial({ color: color })
        const body = new THREE.Mesh(bodyGeo, bodyMat)
        body.position.y = 0.3
        body.castShadow = true
        this.mesh.add(body)

        // 2. Head (Sphere)
        const headGeo = new THREE.SphereGeometry(0.22, 16, 16)
        const headMat = new THREE.MeshStandardMaterial({ color: 0xffccaa }) // Skin tone-ish
        const head = new THREE.Mesh(headGeo, headMat)
        head.position.y = 0.75
        head.castShadow = true
        this.mesh.add(head)

        // 3. Eyes (for personality & direction)
        const eyeGeo = new THREE.SphereGeometry(0.05, 8, 8)
        const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 })

        const leftEye = new THREE.Mesh(eyeGeo, eyeMat)
        leftEye.position.set(-0.08, 0.78, 0.18) // Front is +Z? Wait, lookAt logic usually implies -Z is forward in Three.js? 
        // In my game logic: dz = -axis.y. So "Up" key (Positive Y axis input) -> Negative Z movement.
        // So Forward is -Z.
        // Let's place eyes at -Z.
        leftEye.position.set(-0.08, 0.78, -0.18)

        const rightEye = new THREE.Mesh(eyeGeo, eyeMat)
        rightEye.position.set(0.08, 0.78, -0.18)

        this.mesh.add(leftEye)
        this.mesh.add(rightEye)

        // 4. Backpack (optional detail)
        const backpackGeo = new THREE.BoxGeometry(0.3, 0.4, 0.15)
        const backpackMat = new THREE.MeshStandardMaterial({ color: 0x444444 })
        const backpack = new THREE.Mesh(backpackGeo, backpackMat)
        backpack.position.set(0, 0.4, 0.15) // On back (+Z)
        backpack.castShadow = true
        this.mesh.add(backpack)
    }

    public update(dt: number, moveDir: THREE.Vector3): THREE.Vector3 {
        // moveDir is expected to be normalized direction of movement (or 0)

        const dx = moveDir.x * this.speed * dt
        const dz = moveDir.z * this.speed * dt

        // Rotate character to face movement direction
        if (moveDir.lengthSq() > 0.001) {

            // atan2(x, z): 
            // if moving -Z (forward): x=0, z=-1. atan2(0, -1) = PI.
            // if moving +X (right): x=1, z=0. atan2(1, 0) = PI/2.
            // Three.js rotation Y: 0 looks at +Z? 
            // Actually usually objects face +Z or -Z. 
            // My eyes are at -Z. So Forward is -Z. 
            // If I rotate 0, I face -Z? No, Three defaults depend.
            // If I apply rotation.y = 0, default ref frame.
            // If I move -Z, I want to face -Z.
            // Let's just use `lookAt` logic helper or manual.

            // Simpler: 
            // this.mesh.lookAt(this.mesh.position.x + dx, this.mesh.position.y, this.mesh.position.z + dz)
            // But lookAt is rigid. Smooth it? 
            this.mesh.rotation.y = Math.atan2(dx, dz) + Math.PI // +PI because my model faces -Z?

            // Bobbing animation
            this.bobOffset += dt * 15
            this.mesh.position.y = 0.5 + Math.sin(this.bobOffset) * 0.05
        } else {
            // Return to rest height
            this.mesh.position.y = THREE.MathUtils.lerp(this.mesh.position.y, 0.5, dt * 10)
            this.bobOffset = 0
        }

        return new THREE.Vector3(dx, 0, dz)
    }

    // Override type for external usage if needed, but getMesh returns Group now, which is Object3D
    public getMesh(): THREE.Group {
        return this.mesh
    }

    public getPosition(): THREE.Vector3 {
        return this.mesh.position
    }

    public setPosition(x: number, z: number) {
        this.mesh.position.x = x
        this.mesh.position.z = z
    }

    public getBoundingBox(): THREE.Box3 {
        // Precise bounding box for collision
        // The group might be slightly larger due to random parts, but for gameplay walls,
        // a fixed size box often feels better than a jittery one.
        // However, existing logic uses setFromObject.
        return new THREE.Box3().setFromObject(this.mesh)
    }
}
