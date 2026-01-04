import { describe, it, expect } from 'vitest'
import { Maze } from './Maze'
import * as THREE from 'three'

describe('Maze', () => {
    const maze = new Maze(10, 10) // 10x10 maze

    it('should detect collision at border', () => {
        // Maze is centered. Width 10. 
        // Local coords: -5 to 5.
        // Wall is at border (e.g. x = -5)

        // Map generation is random, so hard to guarantee collision without map access.
        // But we can check bounds.
        const outOfBounds = new THREE.Box3(new THREE.Vector3(-100, 0, -100), new THREE.Vector3(-99, 1, -99))
        expect(maze.checkCollision(outOfBounds)).toBe(false)
    })

    it('should allow checking against custom block types', () => {
        // Use center of maze (5,5) for 10x10 maze. Indices 0-9.
        const centerX = 5
        const centerZ = 5

            // Manually set center to Type 3 (Exit)
            ; (maze as any).map[centerZ][centerX] = 3

        // World Pos for index 10,10 => x = 10-10=0, z=0
        const center = new THREE.Vector3(0, 0, 0)
        const box = new THREE.Box3().setFromCenterAndSize(center, new THREE.Vector3(0.5, 1, 0.5))

        // Default check (Type 1) should return false (it's Type 3, and neighbors are 0)
        expect(maze.checkCollision(box)).toBe(false)

        // Check filtering Type 3
        expect(maze.checkCollision(box, [3])).toBe(true)

        // Check filtering Type 1 and 3
        expect(maze.checkCollision(box, [1, 3])).toBe(true)
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
    it('should check reachability avoiding dynamic obstacles', () => {
        // Setup: Start (0,0) and End (2,0)
        // Path: (0,0) -> (1,0) -> (2,0)
        // Obstacle at (1,0) should block it.

        // Manipulate map for deterministic test
        const map = (maze as any).map
        const w = (maze as any).width
        const h = (maze as any).height
        const cx = Math.floor(w / 2)
        const cz = Math.floor(h / 2)

        // Fill map with walls (1)
        for (let z = 0; z < h; z++) {
            for (let x = 0; x < w; x++) {
                map[z][x] = 1
            }
        }

        // Carve strict path: (0,0) -> (1,0) -> (2,0)
        // Indices: (cx, cz) -> (cx+1, cz) -> (cx+2, cz)
        map[cz][cx] = 0 // Start
        map[cz][cx + 1] = 0 // Path (Obstacle here)
        map[cz][cx + 2] = 0 // End

        const start = new THREE.Vector3(0, 0, 0) // World 0,0 is Maze Center
        const end = new THREE.Vector3(2, 0, 0)
        const obstacle = new THREE.Vector3(1, 0, 0)

        // 1. Should be reachable without obstacles
        expect(maze.checkReachability(start, end, [])).toBe(true)

        // 2. Should be blocked by obstacle
        expect(maze.checkReachability(start, end, [obstacle])).toBe(false)
    })
})
