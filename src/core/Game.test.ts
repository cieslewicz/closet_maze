import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Game } from './Game'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as THREE from 'three'

// Mock WebGLRenderer to avoid JSDOM errors
vi.mock('three', async () => {
    const actual = await vi.importActual('three') as any
    return {
        ...actual,
        WebGLRenderer: vi.fn().mockImplementation(() => ({
            setSize: vi.fn(),
            setPixelRatio: vi.fn(),
            render: vi.fn(),
            domElement: document.createElement('canvas')
        }))
    }
})

// Mock OrbitControls
const mockUpdate = vi.fn()
const mockControlsInstance = {
    update: mockUpdate,
    target: new THREE.Vector3(),
    enableDamping: false,
    enablePan: true, // Default to true to verify change to false
    maxPolarAngle: 0,
    minDistance: 0,
    maxDistance: 0,
    listenToKeyEvents: vi.fn()
}

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
    OrbitControls: vi.fn().mockImplementation(() => mockControlsInstance)
}))

// Mock DOM
// JSDOM is enabled by Vitest, so we can use document APIs.
describe('Game Integration', () => {
    let game: Game

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks()
        mockControlsInstance.enableDamping = false
        mockControlsInstance.enablePan = true

        // Setup minimal DOM for UI
        document.body.innerHTML = `
            <div id="ui-layer">
                <div id="main-menu">
                    <button id="btn-start">Play</button>
                </div>
                <div id="hud">
                    <div id="status-indicator"></div>
                </div>
                <div id="help-screen">
                    <button id="btn-resume">Resume</button>
                </div>
                <div id="game-over"><button id="btn-retry">Retry</button></div>
                <div id="win-screen"><button id="btn-play-again">Again</button></div>
            </div>
            <!-- Canvas will be appended by Game -->
        `
    })

    afterEach(() => {
        document.body.innerHTML = ''
    })

    it('should initialize and bind UI events', () => {
        game = new Game()
        // Check canvas created
        expect(document.getElementById('game-canvas')).toBeDefined()

        // Initial screen should be menu (active class)
        const menu = document.getElementById('main-menu')
        expect(menu?.classList.contains('active')).toBe(true)
    })

    it('should start game when Play button is clicked', () => {
        game = new Game()
        // Spy on start
        const startSpy = vi.spyOn(game, 'start')

        const btn = document.getElementById('btn-start') as HTMLButtonElement
        btn.click()

        expect(startSpy).toHaveBeenCalled()

        // HUD should handle active
        const hud = document.getElementById('hud')
        expect(hud?.classList.contains('active')).toBe(true)
    })

    it('should configure OrbitControls correctly', () => {
        game = new Game()
        expect(OrbitControls).toHaveBeenCalled()
        expect(mockControlsInstance.enableDamping).toBe(true)
        expect(mockControlsInstance.enablePan).toBe(false)
        expect(mockUpdate).toHaveBeenCalled() // Initial update
    })

    it('should update controls target during game loop', () => {
        game = new Game()

        // Access private update method via cast
        const dt = 0.016
            ; (game as any).player.getMesh().position.set(10, 0, 10)
            ; (game as any).update(dt)

        // Should copy player position to target
        const controls = (game as any).controls
        expect(controls.target.x).not.toBe(0) // Should have moved from 0
        // Should call update
        expect(mockUpdate).toHaveBeenCalledTimes(2) // 1 in constructor, 1 in loop
    })

    it('should rotate camera when arrow keys are pressed', () => {
        game = new Game()
        const camera = (game as any).camera
        const initialX = camera.position.x

        // Simulate Arrow Right
        const eventLeft = new KeyboardEvent('keydown', { code: 'ArrowLeft' })
        window.dispatchEvent(eventLeft)

        // Run update
        const dt = 0.1
            ; (game as any).update(dt)

        // Should have moved
        expect(camera.position.x).not.toBe(initialX)
    })

    it('should zoom camera when Z/X keys are pressed', () => {
        game = new Game()
        const camera = (game as any).camera
        const initialZ = camera.position.z
        // Initial pos (0, 10, 10). Distance ~14.14

        // Simulate KeyZ (Zoom In / Decrease Radius)
        const eventZoomIn = new KeyboardEvent('keydown', { code: 'KeyZ' })
        window.dispatchEvent(eventZoomIn)

        const dt = 0.1
            ; (game as any).update(dt)

        // New z should be less than initial z (closer to target 0,0,0)
        // New z should be less than initial z (closer to target 0,0,0)
        expect(camera.position.z).toBeLessThan(initialZ)
    })

    it('should place closets validly (no doorway-to-doorway)', () => {
        // Run multiple times to catch random placement issues
        for (let i = 0; i < 5; i++) {
            game = new Game()
            const closets: any[] = (game as any).closets

            // Collect entries
            // Type definition for entry: string key "x,z"
            const entries = new Set<string>()
            const positions = new Set<string>()

            for (const c of closets) {
                positions.add(`${Math.round(c.mesh.position.x)},${Math.round(c.mesh.position.z)}`)
            }

            for (const c of closets) {
                const pos = c.mesh.position
                const rot = c.mesh.rotation.y

                // Calc direction from rotation
                const dir = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot)
                // Round dir details
                dir.x = Math.round(dir.x)
                dir.z = Math.round(dir.z)

                const entryX = Math.round(pos.x + dir.x)
                const entryZ = Math.round(pos.z + dir.z)
                const entryKey = `${entryX},${entryZ}`

                // Check 1: Entry should not be another closet's position (Blocking)
                expect(positions.has(entryKey)).toBe(false)

                // Check 2: Entry should not be another closet's entry (Doorway to Doorway)
                // Note: It's okay if two closets share an entry spot IF they are at 90 degrees?
                // Wait, if they share entry spot, they might block each other?
                // My logic in Game.ts prevents ANY shared entry zone.
                expect(entries.has(entryKey)).toBe(false)

                entries.add(entryKey)
            }
        }
    })

    it('should spawn correct number of enemies based on difficulty', () => {
        game = new Game()

        // Default (Medium) -> 4
        expect((game as any).enemies.length).toBe(4)

            // Easy -> 2
            ; (game as any).initLevel('easy')
        expect((game as any).enemies.length).toBe(2)

            // Hard -> 6
            ; (game as any).initLevel('hard')
        expect((game as any).enemies.length).toBe(6)
    })

    it('should spawn enemies far away from player (no spawn camping)', () => {
        // Run multiple times for randomness
        for (let i = 0; i < 5; i++) {
            game = new Game()
            const enemies: any[] = (game as any).enemies
            const playerStart = new THREE.Vector3(0, 0, 0)

            for (const enemy of enemies) {
                const dist = enemy.mesh.position.distanceTo(playerStart)
                // Should use minSpawnDist = 8.0, but let's give a tiny margin or assert > 7.9
                expect(dist).toBeGreaterThanOrEqual(8.0)
            }
        }
    })
})
