import * as THREE from 'three'
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
    private inputManager: InputManager
    private uiManager: UIManager

    // Time management
    private clock: THREE.Clock
    private isRunning: boolean = false

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
        this.camera.lookAt(0, 0, 0)

        // Basic Lighting
        this.initLights()

        // Initialize Entities
        this.initLevel()

        this.inputManager = new InputManager()
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
        // Clear existing children except lights? 
        // Simplest: clear all, re-add lights.
        this.scene.clear()
        this.initLights()

        // Maze Setup
        this.maze = new Maze(20, 20)
        this.scene.add(this.maze.getGroup())

        this.closets = []
        this.enemies = []

        // Closets & Enemies
        const emptySpots = this.maze.getEmptySpots()

        // Spawn 5 random closets
        for (let i = 0; i < 5 && i < emptySpots.length; i++) {
            const idx = Math.floor(Math.random() * emptySpots.length)
            const spot = emptySpots.splice(idx, 1)[0]
            const closet = new Closet(spot.x, spot.z)
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
        this.clock.start()
        this.loop()
    }

    public restart() {
        this.initLevel()
        this.clock.stop()
        this.clock.start()
        this.isRunning = true
        this.loop()
    }

    public stop() {
        this.isRunning = false
    }

    private loop() {
        if (!this.isRunning) return
        requestAnimationFrame(this.loop.bind(this))

        const dt = this.clock.getDelta()
        this.update(dt)
        this.render()
    }

    private update(dt: number) {
        // 1. Calculate desired movement
        const moveDelta = this.player.update(dt, this.inputManager)

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

        // 3. Try moving along Z (separately for sliding against walls)
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
        const playerMat = this.player.getMesh().material as THREE.MeshStandardMaterial
        if (this.isHidden) {
            playerMat.color.setHex(0x0000ff)
        } else {
            playerMat.color.setHex(0x00ff00)
        }

        // Update Enemies
        let isChased = false
        for (const enemy of this.enemies) {
            enemy.update(dt, this.player.getPosition(), this.isHidden, this.maze)

            // Check if chasing for UI (Assuming state is private, using distance heuristic or future state exposure)
            const dist = enemy.getMesh().position.distanceTo(this.player.getPosition())
            if (dist < 5 && !this.isHidden) isChased = true // Simple heuristic

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

        // Camera Follow
        const playerPos = this.player.getPosition()
        this.camera.position.x = playerPos.x
        this.camera.position.z = playerPos.z + 10
        this.camera.position.y = 10
        this.camera.lookAt(playerPos)
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
