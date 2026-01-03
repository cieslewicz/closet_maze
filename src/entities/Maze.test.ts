import { describe, it, expect } from 'vitest'
import { Maze } from './Maze'
import * as THREE from 'three'

describe('Maze', () => {
    const maze = new Maze(10, 10) // 10x10 maze

    it('should detect collision at border', () => {
        // Maze is centered. Width 10. 
        // Local coords: -5 to 5.
        // Wall is at border (e.g. x = -5)

        const playerBox = new THREE.Box3(
            new THREE.Vector3(-4.9, 0, 0),
            new THREE.Vector3(-4.6, 1, 1)
        )

        // Note: Maze generation is random inner walls, but borders are fixed.
        // x=0 index is border. World pos: 0 - 5 = -5.
        // So at x=-5 there is a wall.

        expect(maze.checkCollision(playerBox)).toBe(true)
    })

    it('should NOT detect collision in empty center', () => {
        // Center is explicitly cleared in Maze constructor
        // Center of 10x10 is (0,0) world space roughly.

        const playerBox = new THREE.Box3(
            new THREE.Vector3(-0.1, 0, -0.1),
            new THREE.Vector3(0.1, 1, 0.1)
        )

        expect(maze.checkCollision(playerBox)).toBe(false)
    })
})
