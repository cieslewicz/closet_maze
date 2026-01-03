import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { InputManager } from './InputManager'
import { Maze } from '../entities/Maze'
import { Player } from '../entities/Player'
import { Closet } from '../entities/Closet'
import { Enemy } from '../entities/Enemy'
import { UIManager } from './UIManager'

export class Game {
    private canvas: HTMLCanvasElement
    private renderer: THREE.WebGLRenderer
    private scene: THREE.Scene
    private camera: THREE.PerspectiveCamera
    private controls: OrbitControls
    private inputManager: InputManager
    private uiManager: UIManager

    // Time management
    private clock: THREE.Clock
    private isRunning: boolean = false
    private isPaused: boolean = false

    // Entities
    private player!: Player
    private maze!: Maze
    private closets: Closet[] = []
    private enemies: Enemy[] = []
    private isHidden: boolean = false

    constructor() {
        this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement
        if (!this.canvas) {
            this.canvas = document.createElement('canvas')
            this.canvas.id = 'game-canvas'
            document.body.appendChild(this.canvas)
        }

        this.uiManager = new UIManager()

        // Bind UI Events
        this.uiManager.onStart = () => this.start()
        this.uiManager.onRestart = () => this.restart()
        this.uiManager.onResume = () => this.resume()

        // Global Key handler for Help
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'h') {
                this.toggleHelp()
            }
        })

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        })
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

        // Scene setup
        this.scene = new THREE.Scene()
        this.scene.background = new THREE.Color('#111') // Darker background

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        )
        this.camera.position.set(0, 10, 10)

        // Controls setup
        this.controls = new OrbitControls(this.camera, this.renderer.domElement)
        this.controls.listenToKeyEvents(window)
        this.controls.enableDamping = true
        this.controls.enablePan = false // Keep player centered
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1 // Don't go below ground
        this.controls.minDistance = 3
        this.controls.maxDistance = 20
        this.controls.update() // Initial update

        // Basic Lighting
        this.initLights()

        // Initialize Entities
        this.initLevel()

        this.inputManager = new InputManager({ useArrowKeys: false })
        this.clock = new THREE.Clock()

        // Resize handler
        window.addEventListener('resize', this.onWindowResize.bind(this))
    }

    private initLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
        this.scene.add(ambientLight)

        const dirLight = new THREE.DirectionalLight(0xffffff, 1)
        dirLight.position.set(10, 20, 10)
        this.scene.add(dirLight)
    }

    private initLevel() {
        this.scene.clear()
        this.initLights()

        // Maze Setup
        this.maze = new Maze(20, 20)
        this.scene.add(this.maze.getGroup())

        this.closets = []
        this.enemies = []

        // Closets & Enemies
        const emptySpots = this.maze.getEmptySpots()

        // Spawn 5 random closets with orientation
        for (let i = 0; i < 5 && i < emptySpots.length; i++) {
            const idx = Math.floor(Math.random() * emptySpots.length)
            const spot = emptySpots.splice(idx, 1)[0]

            const dirs = [
                { angle: 0, dx: 0, dz: 1 },    // Front (+Z)
                { angle: Math.PI / 2, dx: 1, dz: 0 }, // Right (+X)
                { angle: Math.PI, dx: 0, dz: -1 }, // Back (-Z)
                { angle: -Math.PI / 2, dx: -1, dz: 0 } // Left (-X)
            ]

            // Shuffle directions
            dirs.sort(() => Math.random() - 0.5)

            let rotation = 0

            for (const d of dirs) {
                // Check if the spot in front of this direction is open
                // Probe position: spot.x + d.dx, spot.z + d.dz
                const probeBox = new THREE.Box3(
                    new THREE.Vector3(spot.x + d.dx - 0.1, 0, spot.z + d.dz - 0.1),
                    new THREE.Vector3(spot.x + d.dx + 0.1, 1, spot.z + d.dz + 0.1)
                )
                if (!this.maze.checkCollision(probeBox)) {
                    rotation = d.angle
                    break
                }
            }

            const closet = new Closet(spot.x, spot.z, rotation)
            this.closets.push(closet)
            this.scene.add(closet.getMesh())
        }

        // Spawn 2 Enemies
        for (let i = 0; i < 2 && i < emptySpots.length; i++) {
            const idx = Math.floor(Math.random() * emptySpots.length)
            const spot = emptySpots.splice(idx, 1)[0]
            const enemy = new Enemy(spot.x, spot.z)
            this.enemies.push(enemy)
            this.scene.add(enemy.getMesh())
        }

        // Floor
        const floorGeo = new THREE.PlaneGeometry(30, 30)
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x444444 })
        const floor = new THREE.Mesh(floorGeo, floorMat)
        floor.rotation.x = -Math.PI / 2
        floor.position.y = 0
        this.scene.add(floor)

        // Player
        this.player = new Player()
        this.scene.add(this.player.getMesh())
    }

    public start() {
        if (this.isRunning) return
        this.isRunning = true
        this.isPaused = false
        this.clock.start()
        this.loop()
    }

    public restart() {
        this.initLevel()
        this.clock.stop()
        this.clock.start()
        this.isRunning = true
        this.isPaused = false
        this.loop()
    }

    public stop() {
        this.isRunning = false
    }

    public toggleHelp() {
        if (!this.isRunning && !this.isPaused) return

        if (this.isPaused) {
            this.resume()
        } else {
            this.pause()
        }
    }

    public pause() {
        this.isPaused = true
        this.isRunning = false
        this.clock.stop()
        this.uiManager.showScreen('help')
    }

    public resume() {
        this.isPaused = false
        this.isRunning = true
        this.clock.start()
        this.uiManager.showScreen('hud')
        this.loop()
    }

    private loop() {
        if (!this.isRunning) return
        requestAnimationFrame(this.loop.bind(this))

        const dt = this.clock.getDelta()
        this.update(dt)
        this.render()
    }

    private update(dt: number) {
        // 1. Calculate desired movement (Camera Relative)
        const axis = this.inputManager.getAxis() // x: -1/1 (Left/Right), y: -1/1 (Down/Up)

        // Get Camera Forward and Right vectors projected on XZ plane
        const forward = new THREE.Vector3()
        this.camera.getWorldDirection(forward)
        forward.y = 0
        forward.normalize()

        const right = new THREE.Vector3()
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

        // Combine inputs:
        // Input Up (y=1) -> Move Forward
        // Input Right (x=1) -> Move Right
        const moveDir = new THREE.Vector3()
        moveDir.addScaledVector(forward, axis.y) // Up/Down
        moveDir.addScaledVector(right, axis.x)   // Left/Right

        if (moveDir.lengthSq() > 1) moveDir.normalize() // Prevent fast diagonal

        const moveDelta = this.player.update(dt, moveDir)

        // Helper for collision checking against maze OR closets
        const checkAnyCollision = (box: THREE.Box3) => {
            if (this.maze.checkCollision(box)) return true
            for (const closet of this.closets) {
                if (closet.checkWallCollision(box)) return true
            }
            return false
        }

        // 2. Try moving along X
        if (moveDelta.x !== 0) {
            this.player.getMesh().position.x += moveDelta.x
            if (checkAnyCollision(this.player.getBoundingBox())) {
                this.player.getMesh().position.x -= moveDelta.x
            }
        }

        // 3. Try moving along Z
        if (moveDelta.z !== 0) {
            this.player.getMesh().position.z += moveDelta.z
            if (checkAnyCollision(this.player.getBoundingBox())) {
                this.player.getMesh().position.z -= moveDelta.z
            }
        }

        // Check Hiding
        this.isHidden = false
        for (const closet of this.closets) {
            if (closet.checkEntry(this.player.getMesh())) {
                this.isHidden = true
                break
            }
        }

        // Tint Player
        const playerGroup = this.player.getMesh()
        playerGroup.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                const mat = child.material as THREE.MeshStandardMaterial
                if (this.isHidden) {
                    mat.emissive.setHex(0x0000ff)
                    mat.emissiveIntensity = 0.5
                } else {
                    mat.emissive.setHex(0x000000)
                    mat.emissiveIntensity = 0
                }
            }
        })

        // Update Enemies
        let isChased = false
        for (const enemy of this.enemies) {
            enemy.update(dt, this.player.getPosition(), this.isHidden, this.maze)

            const dist = enemy.getMesh().position.distanceTo(this.player.getPosition())
            if (dist < 5 && !this.isHidden) isChased = true

            // Game Over Check
            if (dist < 0.75 && !this.isHidden) {
                console.log("GAME OVER")
                this.stop()
                this.uiManager.showScreen('game-over')
                return
            }
        }

        // Check Win
        if (this.maze.checkWin(this.player.getPosition())) {
            console.log("YOU WIN!")
            this.stop()
            this.uiManager.showScreen('win')
            return
        }

        this.uiManager.updateStatus(this.isHidden, isChased)

        // Camera Follow & Controls Logic
        const playerPos = this.player.getPosition()
        this.controls.target.copy(playerPos)

        // Manual Camera Rotation via Keys (OrbitControls keys are for panning, so we do this manually)
        const ROTATE_SPEED = 2.0 * dt
        let rotateH = 0
        let rotateV = 0

        if (this.inputManager.isKeyPressed('ArrowLeft')) rotateH -= ROTATE_SPEED
        if (this.inputManager.isKeyPressed('ArrowRight')) rotateH += ROTATE_SPEED
        if (this.inputManager.isKeyPressed('ArrowUp')) rotateV -= ROTATE_SPEED
        if (this.inputManager.isKeyPressed('ArrowDown')) rotateV += ROTATE_SPEED

        if (rotateH !== 0 || rotateV !== 0) {
            const offset = new THREE.Vector3().copy(this.camera.position).sub(this.controls.target)
            const spherical = new THREE.Spherical().setFromVector3(offset)

            spherical.theta += rotateH
            spherical.phi += rotateV

            // Clamp vertical rotation (phi) to avoid going below ground or flipping
            spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, spherical.phi))
            spherical.makeSafe()

            offset.setFromSpherical(spherical)
            this.camera.position.copy(this.controls.target).add(offset)
            this.camera.lookAt(this.controls.target)
        }

        // Manual Zoom (Z/X or +/-)
        const ZOOM_SPEED = 10.0 * dt
        let zoomDelta = 0

        if (this.inputManager.isKeyPressed('KeyZ') || this.inputManager.isKeyPressed('Equal') || this.inputManager.isKeyPressed('NumpadAdd')) {
            zoomDelta -= ZOOM_SPEED
        }
        if (this.inputManager.isKeyPressed('KeyX') || this.inputManager.isKeyPressed('Minus') || this.inputManager.isKeyPressed('NumpadSubtract')) {
            zoomDelta += ZOOM_SPEED
        }

        if (zoomDelta !== 0) {
            const offset = new THREE.Vector3().copy(this.camera.position).sub(this.controls.target)
            const spherical = new THREE.Spherical().setFromVector3(offset)

            spherical.radius += zoomDelta
            // Clamp radius
            spherical.radius = Math.max(this.controls.minDistance, Math.min(this.controls.maxDistance, spherical.radius))
            spherical.makeSafe()

            offset.setFromSpherical(spherical)
            this.camera.position.copy(this.controls.target).add(offset)
        }

        this.controls.update()
    }

    private render() {
        this.renderer.render(this.scene, this.camera)
    }

    private onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight
        this.camera.updateProjectionMatrix()
        this.renderer.setSize(window.innerWidth, window.innerHeight)
    }
}
