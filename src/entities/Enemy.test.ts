import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Enemy } from './Enemy'
import { Maze } from './Maze'
import * as THREE from 'three'

describe('Enemy', () => {
    let enemy: Enemy
    let maze: Maze

    beforeEach(() => {
        enemy = new Enemy(0, 0)
        // Mock Maze or use real one (Real one is fast enough usually)
        maze = new Maze(10, 10)
        maze.checkCollision = () => false // Mock collision to always be false 
    })

    // Helper to mock closets (empty for most tests)
    const mockClosets: any[] = []

    it('should initialize', () => {
        expect(enemy).toBeDefined()
        expect(enemy.getMesh().position.x).toBe(0)
    })

    it('should chase player when close and visible', () => {
        // Mock Player Pos close by
        const playerPos = new THREE.Vector3(2, 0, 0)
        const dt = 1.0

        // Save initial pos
        const initialX = enemy.getMesh().position.x

        // Update
        // Update
        enemy.update(dt, playerPos, false, maze, mockClosets)

        // Should have moved towards player (positive x)
        expect(enemy.getMesh().position.x).toBeGreaterThan(initialX)
    })

    it('should NOT chase player when hidden', () => {
        // Player is close but hidden
        const playerPos = new THREE.Vector3(2, 0, 0)
        const dt = 1.0

        enemy.update(dt, playerPos, true, maze, mockClosets)
        // Should NOT be chasing (internal state check would be better, but we don't expose it public fully)
        // But we can check if it moved significantly towards player?
        // Or check if state changed?
        expect((enemy as any).isChasing()).toBe(false)
    })

    it('should respect view distance', () => {
        const dt = 0.1
        // 1. Far away (11 units > 10)
        enemy.update(dt, new THREE.Vector3(11, 0, 0), false, maze, mockClosets)
        expect((enemy as any).isChasing()).toBe(false)

        // 2. Clear prev state
        // 3. Within range (9 units < 10)
        enemy.update(dt, new THREE.Vector3(9, 0, 0), false, maze, mockClosets)
        expect((enemy as any).isChasing()).toBe(true)
    })

    it('should immediately pick new valid direction on collision', () => {
        // 1. Initial Update to set up wander timer and direction
        enemy.update(0.1, new THREE.Vector3(100, 0, 100), true, maze, mockClosets)

        const initialDir = (enemy as any).direction.clone()

            // Force Random strategy to prevent WallFollow from just picking 'Forward' and keeping same direction
            ; (enemy as any).strategy = 0 // WanderStrategy.RANDOM

        // 2. Mock Collision behavior
        // logic: checkCollision returns true first (hit wall), then true (probe 1), then false (probe 2)
        let callCount = 0
        maze.checkCollision = () => {
            callCount++
            if (callCount <= 2) return true // Hit wall + 1st probe
            return false // 2nd probe open
        }

        // 3. Update again (should hit wall)
        enemy.update(0.1, new THREE.Vector3(100, 0, 100), true, maze, mockClosets)

        // 4. Verify results
        // Should have called checkCollision multiple times
        expect(callCount).toBeGreaterThan(1)

        // Direction should calculate new direction
        const newDir = (enemy as any).direction
        expect(newDir.equals(initialDir)).toBe(false)

        // Timer should serve new duration
        expect((enemy as any).wanderTimer).toBeGreaterThan(1.0)
    })

    it('should avoid 180 degree turns (memory)', () => {
        // Mock checkCollision to always return false (open space)
        maze.checkCollision = () => false

        // Set initial direction
        const initialDir = new THREE.Vector3(1, 0, 0)
            ; (enemy as any).direction.copy(initialDir)
            ; (enemy as any).previousDirection.copy(initialDir) // Pretend we just moved this way

            // Force random strategy
            ; (enemy as any).strategy = 0 // WanderStrategy.RANDOM
            ; (enemy as any).strategyTimer = 10

            // Force new direction pick
            ; (enemy as any).pickNewDirection(maze, mockClosets)

        const newDir = (enemy as any).direction

        // Check dot product. Should not be close to -1
        const dot = newDir.dot(initialDir)
        expect(dot).toBeGreaterThan(-0.9) // Not a direct U-turn
    })

    it('should try wall follow strategy', () => {
        // Force Wall Follow Strategy
        ; (enemy as any).strategy = 1 // WanderStrategy.WALL_FOLLOW
            ; (enemy as any).strategyTimer = 10

        // Set direction North (0,0,-1)
        const north = new THREE.Vector3(0, 0, -1)
            ; (enemy as any).direction.copy(north)

        // Mock collision: 
        // Right (East) is blocked
        // Front (North) is blocked
        maze.checkCollision = () => {
            // We return false to simulate open space
            return false
        }

        // We verify behavior by result direction


        // Actually, let's just inspect state change
        // If we are open on all sides, Wall follow should pick Right (preference) or Front
        // Right of North is East (1,0,0)

        maze.checkCollision = () => false // Open everywhere

            ; (enemy as any).pickNewDirection(maze, mockClosets)

        const newDir = (enemy as any).direction
        // Should have turned Right (East) because it's open and first choice in our logic
        expect(newDir.x).toBeCloseTo(1)
        expect(newDir.z).toBeCloseTo(0)
    })

    it('should avoid closets', () => {
        // Mock a closet collision
        const mockCloset = {
            getBoundingBox: () => ({
                intersectsBox: () => true // Always collides
            })
        }
        const closets = [mockCloset] as any[]

            // Setup Enemy moving East
            ; (enemy as any).direction.set(1, 0, 0)

        // Mock probe logic to fail first then succeed
        // (Similar to wall collision logic, but trigger via closet)

        // For simplicity, just verify that checkDirection returns false (collision)
        const isSafe = (enemy as any).checkDirection(maze, closets, new THREE.Vector3(1, 0, 0))
        expect(isSafe).toBe(false)

        // And safe when no closets
        const isSafeEmpty = (enemy as any).checkDirection(maze, [], new THREE.Vector3(1, 0, 0))
        expect(isSafeEmpty).toBe(true)
    })

    it('should detect thin obstacles via multi-stage probe', () => {
        // Mock collision that only returns true at distance 0.6 (middle of probe)
        // checkDirection probes at 0.33, 0.66, 1.0.
        // Let's say obstacle is at 0.6.
        // Single probe at 1.0 would miss it (assuming point check or small box).
        // But our box check is continuous along path? No, discrete steps.

        const closets: any[] = []

        let checkedDistances: number[] = []

        // Spy on checkAnyCollision to see what boxes are checked
        // We can't easy spy private method.
        // Instead, we mock maze.checkCollision and infer position from the box passed.

        maze.checkCollision = (box: THREE.Box3) => {
            const center = new THREE.Vector3()
            box.getCenter(center)
            // Enemy starts at 0,0. Moving East (1,0,0).
            // Probes should be at x = 0.33, 0.66, 1.0
            checkedDistances.push(center.x)
            return false
        }

            ; (enemy as any).checkDirection(maze, closets, new THREE.Vector3(1, 0, 0))

        // Verify we probed multiple times
        expect(checkedDistances.length).toBeGreaterThanOrEqual(3)
        expect(checkedDistances[0]).toBeCloseTo(0.33, 1)
        expect(checkedDistances[checkedDistances.length - 1]).toBeCloseTo(1.0, 1)
    })

    it('should avoid jitter in corners (blocked front and side)', () => {
        // Setup: Enemy in corner.
        // Front (North 0,0,-1) is blocked.
        // Left (West -1,0,0) is blocked.
        // Should pick Right (East) or Back (South).

        const closets: any[] = []

        // Mock collision
        maze.checkCollision = (box: THREE.Box3) => {
            const center = new THREE.Vector3()
            box.getCenter(center)

            // Block North (z < 0)
            if (center.z < -0.1) return true
            // Block West (x < -0.1)
            if (center.x < -0.1) return true

            return false
        }

        // Mock Math.random to ensure we pick a valid direction (e.g., 0.1 which is approx East)
        // We need to return:
        // 1. < 0.7 for strategy (Random)
        // 2. A value that produces an East angle. cos(2PI*x). x=0 -> East.
        // so mockVal = 0.

        const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0)

            // Force pick
            ; (enemy as any).pickNewDirection(maze, closets)

        randomSpy.mockRestore()

        const dir = (enemy as any).direction

        // Should NOT be North or West
        expect(dir.z).toBeGreaterThanOrEqual(-0.1) // Not North
        expect(dir.x).toBeGreaterThanOrEqual(-0.1) // Not West
    })

    it('should NOT chase player if line of sight is blocked by wall', () => {
        // Place enemy at 0,0
        // Place player at 0,2 (distance 2, within viewDistance)
        // Place wall at 0,1

        // Mock maze checkCollision
        // 1. Enemy checks collision for movement -> False
        // 2. Enemy checks LOS -> True (it hits wall)

        // We need to spy on maze.checkCollision to return true for the wall check
        // The wall check sends a box. The enemy sends body box for movement (large) and LOS probe (small 0.1)

        const collisionSpy = vi.spyOn(maze, 'checkCollision').mockImplementation((box: THREE.Box3, _blockTypes?: number[]) => {
            const center = new THREE.Vector3()
            box.getCenter(center)

            // If checking near (0, 1) - approximate wall location
            if (center.z > 0.4 && center.z < 1.6) {
                // It's the wall!
                return true
            }
            return false
        })

        const playerPos = new THREE.Vector3(0, 0, 2)
        // Enemy at 0,0,1 (from constructor offset? No, mesh y is 1)
        // Enemy constructed at 0,0. Mesh at 0,1,0.
        // Player at 0,0,2.

        // Update
        enemy.update(0.1, playerPos, false, maze, [])

        // Should NOT be chasing
        // Access private state if possible or check if direction changed to face player (0,0,1)
        // If wandering, direction matches wander logic (initially 1,0,0)
        // If chasing, direction matches 0,0,1

        // Check internal state via cast
        const state = (enemy as any).state
        expect(state).toBe(0) // WANDER (0) vs CHASE (1)

        collisionSpy.mockRestore()
    })

    it('should chase player if line of sight is clear', () => {
        // Clear LOS
        const playerPos = new THREE.Vector3(0, 0, 2)

        // Mock collision false always
        vi.spyOn(maze, 'checkCollision').mockReturnValue(false)

        enemy.update(0.1, playerPos, false, maze, [])

        const state = (enemy as any).state
        expect(state).toBe(1) // CHASE
    })
    it('should avoid the exit (type 3)', () => {
        const closets: any[] = []
        // Mock collision that blocks type 3
        // We can inspect the 2nd arg 'blockTypes' passed to checkCollision
        let checkedTypes: number[] = []

        maze.checkCollision = (_box: THREE.Box3, blockTypes?: number[]) => {
            if (blockTypes) checkedTypes = blockTypes
            return false
        }

            ; (enemy as any).checkDirection(maze, closets, new THREE.Vector3(1, 0, 0))

        // Check that we requested to block [1, 3]
        expect(checkedTypes).toContain(1)
        expect(checkedTypes).toContain(3)
    })
})
