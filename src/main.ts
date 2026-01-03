import './style.css'
import { Game } from './core/Game'

const app = document.querySelector<HTMLDivElement>('#app')!
app.style.display = 'none' // Hide default UI for now

const game = new Game()
game.start()

