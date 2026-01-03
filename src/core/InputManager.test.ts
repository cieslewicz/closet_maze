import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { InputManager } from './InputManager'

describe('InputManager', () => {
    let inputManager: InputManager

    beforeEach(() => {
        inputManager = new InputManager()
    })

    afterEach(() => {
        inputManager.dispose()
        vi.restoreAllMocks()
    })

    it('should initialize with zero axis', () => {
        const axis = inputManager.getAxis()
        expect(axis).toEqual({ x: 0, y: 0 })
    })

    it('should detect W key as Axis Y +1', () => {
        const event = new KeyboardEvent('keydown', { code: 'KeyW' })
        window.dispatchEvent(event)
        expect(inputManager.getAxis().y).toBe(1)
    })

    it('should detect A key as Axis X -1', () => {
        const event = new KeyboardEvent('keydown', { code: 'KeyA' })
        window.dispatchEvent(event)
        expect(inputManager.getAxis().x).toBe(-1)
    })

    it('should handle keyup', () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))
        expect(inputManager.getAxis().y).toBe(1)

        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }))
        expect(inputManager.getAxis().y).toBe(0)
    })
    it('should ignore Arrow keys when configured to do so', () => {
        const strictInputManager = new InputManager({ useArrowKeys: false })

        // Arrow Up should NOT trigger Y movement
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }))
        expect(strictInputManager.getAxis().y).toBe(0)

        // WASD should still work
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))
        expect(strictInputManager.getAxis().y).toBe(1)

        strictInputManager.dispose()
    })
})
