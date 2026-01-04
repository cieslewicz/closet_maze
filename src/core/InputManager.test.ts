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

    it('should detect ArrowUp key as Axis Y +1', () => {
        const event = new KeyboardEvent('keydown', { code: 'ArrowUp' })
        window.dispatchEvent(event)
        expect(inputManager.getAxis().y).toBe(1)
    })

    it('should detect ArrowLeft key as Axis X -1', () => {
        const event = new KeyboardEvent('keydown', { code: 'ArrowLeft' })
        window.dispatchEvent(event)
        expect(inputManager.getAxis().x).toBe(-1)
    })

    it('should handle keyup', () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp' }))
        expect(inputManager.getAxis().y).toBe(1)

        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp' }))
        expect(inputManager.getAxis().y).toBe(0)
    })

    it('should NOT use WASD for movement axis', () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))
        expect(inputManager.getAxis().y).toBe(0)
    })
})
