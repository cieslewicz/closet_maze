import { describe, it, expect, beforeEach } from 'vitest'
import { Closet } from './Closet'
import * as THREE from 'three'

describe('Closet', () => {
    let closet: Closet

    beforeEach(() => {
        closet = new Closet(0, 0)
    })

    it('should initialize', () => {
        expect(closet.getMesh()).toBeDefined()
    })

    it('should allow entry from front', () => {
        const player = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5))
        // Center of closet is 0,0. Front is +Z.
        // Place player slightly inside from front.
        player.position.set(0, 1, 0.1) // 0.1 is inside
        // Update matrix world for local check? 
        // Closet uses worldToLocal, so we need consistent matrices.
        closet.getMesh().updateMatrixWorld()
        player.updateMatrixWorld()

        expect(closet.checkEntry(player)).toBe(true)
    })

    it('should NOT allow entry from outside', () => {
        const player = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5))
        player.position.set(0, 1, 2) // Far away
        closet.getMesh().updateMatrixWorld()
        player.updateMatrixWorld()

        expect(closet.checkEntry(player)).toBe(false)
    })

    it('should detect wall collision', () => {

        // Back wall is at z=-0.35. Side is x=-0.35.
        // This box overlaps slightly? 
        // Let's test explicit intersection.

        // We need to ensure closet matrices are updated for wall collision checks
        closet.getMesh().updateMatrixWorld(true)

        // Since we are not running a full scene update, we might need to manually update children
        closet.getMesh().children.forEach(c => c.updateMatrixWorld())

        // Check collision at back wall (z = -0.35)
        const backWallBox = new THREE.Box3(
            new THREE.Vector3(-0.1, 0, -0.4),
            new THREE.Vector3(0.1, 1, -0.3)
        )

        expect(closet.checkWallCollision(backWallBox)).toBe(true)
    })
})
