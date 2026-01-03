export class InputManager {
    public keys: { [key: string]: boolean } = {}
    public axis: { x: number; y: number } = { x: 0, y: 0 }

    constructor() {
        this.addListeners()
    }

    private addListeners() {
        window.addEventListener('keydown', (e) => this.onKeyDown(e))
        window.addEventListener('keyup', (e) => this.onKeyUp(e))
        // Touch listeners can be added later or mocked
    }

    public dispose() {
        window.removeEventListener('keydown', (e) => this.onKeyDown(e))
        window.removeEventListener('keyup', (e) => this.onKeyUp(e))
    }

    private onKeyDown(event: KeyboardEvent) {
        this.keys[event.code] = true
        this.updateAxis()
    }

    private onKeyUp(event: KeyboardEvent) {
        this.keys[event.code] = false
        this.updateAxis()
    }

    private updateAxis() {
        this.axis.x = 0
        this.axis.y = 0

        if (this.keys['KeyW'] || this.keys['ArrowUp']) this.axis.y = 1
        if (this.keys['KeyS'] || this.keys['ArrowDown']) this.axis.y = -1
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.axis.x = -1
        if (this.keys['KeyD'] || this.keys['ArrowRight']) this.axis.x = 1

        // Diagonal Normalization could be added here if needed, 
        // but usually handled by movement controller
    }

    public getAxis() {
        return { ...this.axis }
    }

    public isKeyPressed(code: string): boolean {
        return !!this.keys[code]
    }
}
