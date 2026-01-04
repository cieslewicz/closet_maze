export type GameScreen = 'menu' | 'hud' | 'game-over' | 'win' | 'help'

export class UIManager {
    private screens: { [key: string]: HTMLElement } = {}

    // Callbacks
    public onStart?: () => void
    public onRestart?: () => void
    public onResume?: () => void

    constructor() {
        this.screens = {
            'menu': document.getElementById('main-menu')!,
            'hud': document.getElementById('hud')!,
            'game-over': document.getElementById('game-over')!,
            'win': document.getElementById('win-screen')!,
            'help': document.getElementById('help-screen')!
        }

        this.bindEvents()
        this.showScreen('menu')
    }

    private bindEvents() {
        document.getElementById('btn-start')?.addEventListener('click', () => {
            this.onStart?.()
            this.showScreen('hud')
        })

        document.getElementById('btn-retry')?.addEventListener('click', () => {
            this.onRestart?.()
            this.showScreen('hud')
        })

        document.getElementById('btn-play-again')?.addEventListener('click', () => {
            this.onRestart?.()
            this.showScreen('hud')
        })

        document.getElementById('btn-help-resume')?.addEventListener('click', () => {
            this.onResume?.()
            this.showScreen('hud')
        })
    }

    public showScreen(screenName: GameScreen) {
        // Hide all
        Object.values(this.screens).forEach(el => el.classList.remove('active'))

        // Show target
        if (this.screens[screenName]) {
            this.screens[screenName].classList.add('active')

        }
    }

    public showMainMenu() {
        this.showScreen('menu')
    }

    public updateStatus(isHidden: boolean, isChase: boolean = false) {
        const indicator = document.getElementById('status-indicator')
        if (!indicator) return

        if (isHidden) {
            indicator.textContent = "Status: Hidden"
            indicator.style.color = "#00ff00"
        } else if (isChase) {
            indicator.textContent = "Status: RUN!"
            indicator.style.color = "#ff0000"
        } else {
            indicator.textContent = "Status: Safe"
            indicator.style.color = "#ffffff"
        }
    }
}
