import * as THREE from 'three'
import { InputManager } from './InputManager'
import { Maze } from '../entities/Maze'
import { Player } from '../entities/Player'

export class Game {
    private canvas: HTMLCanvasElement
    private renderer: THREE.WebGLRenderer
    private scene: THREE.Scene
    private camera: THREE.PerspectiveCamera
    private inputManager: InputManager

    // Time management
    private clock: THREE.Clock
    private isRunning: boolean = false

    // Entities
    private player: Player
    private maze: Maze

    constructor() {
        this.canvas = document.createElement('canvas')
        this.canvas.id = 'game-canvas'
        document.body.appendChild(this.canvas)

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        })
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

        // Scene setup
        this.scene = new THREE.Scene()
        this.scene.background = new THREE.Color('#333')

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
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
        this.scene.add(ambientLight)

        const dirLight = new THREE.DirectionalLight(0xffffff, 1)
        dirLight.position.set(10, 20, 10)
        this.scene.add(dirLight)

        // Maze Setup
        this.maze = new Maze(20, 20)
        this.scene.add(this.maze.getGroup())

        // Floor (Adjusted for Maze)
        const floorGeo = new THREE.PlaneGeometry(30, 30)
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x444444 })
        const floor = new THREE.Mesh(floorGeo, floorMat)
        floor.rotation.x = -Math.PI / 2
        floor.position.y = 0
        this.scene.add(floor)

        // Player (Center)
        this.player = new Player()
        this.scene.add(this.player.getMesh())

        this.inputManager = new InputManager()
        this.clock = new THREE.Clock()

        // Resize handler
        window.addEventListener('resize', this.onWindowResize.bind(this))
    }

    public start() {
        if (this.isRunning) return
        this.isRunning = true
        this.clock.start()
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
        // 1. Calculate desired movement
        const moveDelta = this.player.update(dt, this.inputManager)

        // 2. Try moving along X
        if (moveDelta.x !== 0) {
            this.player.getMesh().position.x += moveDelta.x
            if (this.maze.checkCollision(this.player.getBoundingBox())) {
                this.player.getMesh().position.x -= moveDelta.x // Revert
            }
        }

        // 3. Try moving along Z (separately for sliding against walls)
        if (moveDelta.z !== 0) {
            this.player.getMesh().position.z += moveDelta.z
            if (this.maze.checkCollision(this.player.getBoundingBox())) {
                this.player.getMesh().position.z -= moveDelta.z // Revert
            }
        }

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
