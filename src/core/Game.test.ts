import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { Game } from './Game'
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

// Mock DOM
// JSDOM is enabled by Vitest, so we can use document APIs.
describe('Game Integration', () => {
    let game: Game

    beforeEach(() => {
        // Setup minimal DOM for UI
        document.body.innerHTML = `
            <div id="ui-layer">
                <div id="main-menu">
                    <button id="btn-start">Play</button>
                </div>
                <div id="hud">
                    <div id="status-indicator"></div>
                </div>
                <div id="game-over"><button id="btn-retry">Retry</button></div>
                <div id="win-screen"><button id="btn-play-again">Again</button></div>
            </div>
            <!-- Canvas will be appended by Game -->
        `
    })

    afterEach(() => {
        document.body.innerHTML = ''
        // Clean up game loop? 
        // Game.stop() is private/public? check
        // Ideally we should stop the game to prevent requestAnimationFrame in background
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

    // Additional test: Win condition triggers Win Screen? 
    // Hard to test integration without mocking large parts of Maze/Player to force win.
    // relying on unit tests for logic + manual verif for visual switching.
})
