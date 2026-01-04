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
// Mock AudioContext
const mockAudioContext = {
    createGain: () => ({ gain: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn(), connect: vi.fn() }, connect: vi.fn() }),
    createOscillator: () => ({ frequency: { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, start: vi.fn(), stop: vi.fn(), connect: vi.fn(), type: 'sine' }),
    currentTime: 0,
    resume: vi.fn().mockResolvedValue(undefined),
    destination: {}
}
    ; (window as any).AudioContext = vi.fn().mockImplementation(() => mockAudioContext)
    ; (window as any).webkitAudioContext = (window as any).AudioContext

const createMockElement = () => {
    const classList = new Set<string>()
    const style: any = { color: '' }
    const listeners: Record<string, Function[]> = {}

    return {
        // Properties
        style,
        classList: {
            add: vi.fn((c: string) => classList.add(c)),
            remove: vi.fn((c: string) => classList.delete(c)),
            contains: vi.fn((c: string) => classList.has(c)),
            _set: (c: Set<string>) => { classList.clear(); c.forEach(v => classList.add(v)) }
        },
        textContent: '',
        value: 'medium',
        width: 800,
        height: 600,

        // Methods
        getContext: vi.fn(),
        addEventListener: vi.fn((event: string, cb: Function) => {
            if (!listeners[event]) listeners[event] = []
            listeners[event].push(cb)
        }),
        click: vi.fn(() => {
            listeners['click']?.forEach(cb => cb())
        })
    }
}

describe('Game Integration', () => {
    let game: Game
    // Shared mock reference for assertions
    let sharedMockElement: any

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks()
        vi.stubGlobal('requestAnimationFrame', vi.fn()) // Stop loops

        sharedMockElement = createMockElement()
        vi.spyOn(document, 'getElementById').mockReturnValue(sharedMockElement)
        vi.spyOn(document, 'createElement').mockReturnValue(sharedMockElement)
        vi.spyOn(document, 'body', 'get').mockReturnValue({ appendChild: vi.fn() } as any)

        mockControlsInstance.enableDamping = false
        mockControlsInstance.enablePan = true

        // Setup minimal DOM for UI
        document.body.innerHTML = `
            <div id="mobile-warning">
                <h1>Desktop Only</h1>
                <p>This game unfortunately only works on desktop.</p>
            </div>
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

    it('should include mobile warning in index.html', () => {
        const fs = require('fs')
        const path = require('path')
        const html = fs.readFileSync(path.resolve(__dirname, '../../index.html'), 'utf-8')
        expect(html).toContain('<div id="mobile-warning">')
        expect(html).toContain('Desktop Only')
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

    it('should update controls target during game loop', async () => {
        game = new Game()
        const controls: any = (game as any).controls
        const mockUpdate = controls.update

        await (game as any).start()
        const dt = 0.016
            ; (game as any).player.getMesh().position.set(10, 0, 10)
            ; (game as any).update(dt)

        // Should copy player position to target
        expect(controls.target.x).not.toBe(0) // Should have moved from 0
        // Should call update
        // Count varies due to initLevel and loop calls. Just ensure it updates.
        expect(mockUpdate).toHaveBeenCalled()
        expect(mockUpdate.mock.calls.length).toBeGreaterThanOrEqual(2)
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
                positions.add(`${Math.round(c.mesh.position.x)},${Math.round(c.mesh.position.z)} `)
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
                const entryKey = `${entryX},${entryZ} `

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

    it('should pause and resume game', async () => {
        game = new Game()
            ; await (game as any).start()

        // Mock getElementById to return a mock element
        // We need style to avoid UIManager crash
        const mockMenu = {
            classList: { remove: vi.fn(), add: vi.fn(), contains: vi.fn() },
            style: { color: '' }
        }
        const docSpy = vi.spyOn(document, 'getElementById').mockReturnValue(mockMenu as any)

            // Pause
            ; (game as any).togglePause()
        expect((game as any).isPaused).toBe(true)
        expect((game as any).clock.running).toBe(false)
        expect(mockMenu.classList.add).toHaveBeenCalledWith('active')

            // Resume
            ; (game as any).togglePause()
        expect((game as any).isPaused).toBe(false)
        expect((game as any).clock.running).toBe(true)
        expect(mockMenu.classList.remove).toHaveBeenCalledWith('active')

        docSpy.mockRestore()
    })

    it('should quit to main menu', () => {
        game = new Game()
            ; (game as any).start()
            ; (game as any).togglePause() // Pause first

        const mockMenu = {
            classList: { remove: vi.fn(), add: vi.fn(), contains: vi.fn() },
            style: { color: '' }
        }
        const docSpy = vi.spyOn(document, 'getElementById').mockReturnValue(mockMenu as any)

        const uiSpy = vi.spyOn((game as any).uiManager, 'showMainMenu')
        const sceneSpy = vi.spyOn((game as any).scene, 'clear')

            ; (game as any).quitToMenu()

        expect((game as any).isRunning).toBe(false)
        expect((game as any).isPaused).toBe(false)
        expect(uiSpy).toHaveBeenCalled()
        expect(sceneSpy).toHaveBeenCalled()
        expect(mockMenu.classList.remove).toHaveBeenCalledWith('active')

        docSpy.mockRestore()
    })
    it('should switch BGM based on enemy state', async () => {
        game = new Game()

        // Mock init to resolve immediately? It uses SoundManager.init which calls ctx.resume.
        // We mocked AudioContext so it should be fine.
        await (game as any).start()

        // Mock SoundManager spy AFTER start to track calls in update only
        // OR mock it before and clear calls.
        const soundSpy = vi.spyOn((game as any).soundManager, 'startMusic')

        // Mock an enemy and valid Player
        // Game creates player in initLevel.

        const mockEnemy = {
            update: vi.fn(),
            getMesh: () => ({ position: new THREE.Vector3(10, 0, 10) }), // Far away
            isChasing: vi.fn().mockReturnValue(false)
        }
            ; (game as any).enemies = [mockEnemy]

        // 2. Chasing Update
        mockEnemy.isChasing.mockReturnValue(true)
            ; (game as any).update(0.1)
        expect(soundSpy).toHaveBeenCalledWith('chase')

        // 3. Calm Update
        mockEnemy.isChasing.mockReturnValue(false)
            ; (game as any).update(0.1)
        expect(soundSpy).toHaveBeenCalledWith('calm')
    })
    it('should reset camera position on restart', async () => {
        game = new Game()
        await (game as any).start()

        const camera = (game as any).camera
        const controls = (game as any).controls

        // 1. Move Camera away manually
        camera.position.set(100, 100, 100)
        controls.target.set(50, 0, 50)
        controls.update()

            // 2. Restart
            ; (game as any).restart()

        // 3. Verify Reset
        // Player should be at 0,0,0 (newly spawned)
        // Camera should be at 0, 7.5, 7.5
        expect(camera.position.x).toBe(0)
        expect(camera.position.y).toBe(8.0) // Player Y is 0.5 + 7.5 offset
        expect(camera.position.z).toBe(7.5)

        // Target should be 0,0,0
        expect(controls.target.x).toBe(0)
        expect(controls.target.y).toBe(0.5) // Player Y
        expect(controls.target.z).toBe(0)
    })
})
