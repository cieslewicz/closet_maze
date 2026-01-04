export class SoundManager {
    private ctx: AudioContext
    private gainNode: GainNode

    // Music Oscillators
    private musicOscs: OscillatorNode[] = []
    private musicGain: GainNode
    private currentBGM: 'calm' | 'chase' | 'none' = 'none'
    private nextNoteTime: number = 0
    private isPlayingMusic: boolean = false

    constructor() {
        // Initialize AudioContext on user interaction if possible, or lazy load
        const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext
        this.ctx = new AudioContext()
        this.gainNode = this.ctx.createGain()
        this.gainNode.gain.value = 0.3 // Global volume
        this.gainNode.connect(this.ctx.destination)

        this.musicGain = this.ctx.createGain()
        this.musicGain.gain.value = 0.4
        this.musicGain.connect(this.gainNode)
    }

    public async init() {
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume()
        }
    }

    // --- Music System (Simple Sequencer) ---

    public startMusic(type: 'calm' | 'chase') {
        if (this.currentBGM === type) return
        this.currentBGM = type

        if (!this.isPlayingMusic) {
            this.isPlayingMusic = true
            this.nextNoteTime = this.ctx.currentTime
            this.scheduleMusic()
        }
    }

    public stopMusic() {
        this.currentBGM = 'none'
        this.isPlayingMusic = false
        this.musicOscs.forEach(o => o.stop())
        this.musicOscs = []
    }

    private scheduleMusic() {
        if (!this.isPlayingMusic || this.currentBGM === 'none') return

        const secondsPerBeat = 60.0 / (this.currentBGM === 'chase' ? 140 : 60)
        const lookahead = 0.1 // seconds

        while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
            this.playNote(this.nextNoteTime)
            this.nextNoteTime += secondsPerBeat
        }

        requestAnimationFrame(() => this.scheduleMusic())
    }

    private playNote(time: number) {
        const osc = this.ctx.createOscillator()
        const env = this.ctx.createGain()

        osc.connect(env)
        env.connect(this.musicGain)

        // Random-ish melody generation
        let freq = 440
        if (this.currentBGM === 'calm') {
            // C Major ish (C, E, G, A)
            const scale = [261.63, 329.63, 392.00, 440.00, 523.25]
            freq = scale[Math.floor(Math.random() * scale.length)]
            osc.type = 'sine'
            env.gain.value = 0.1
        } else {
            // Dissonant / Minor (C, C#, D#, F#)
            const scale = [261.63, 277.18, 311.13, 369.99]
            freq = scale[Math.floor(Math.random() * scale.length)] * (Math.random() > 0.5 ? 2 : 1)
            osc.type = 'sawtooth'
            env.gain.value = 0.05
        }

        osc.frequency.value = freq

        // Envelope
        osc.start(time)
        env.gain.setValueAtTime(0, time)
        env.gain.linearRampToValueAtTime(env.gain.value, time + 0.05)
        env.gain.exponentialRampToValueAtTime(0.001, time + 0.3)
        osc.stop(time + 0.3)
    }

    // --- SFX ---

    public playSFX(type: 'closet_open' | 'closet_close' | 'win' | 'lose') {
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()
        osc.connect(gain)
        gain.connect(this.gainNode)

        const t = this.ctx.currentTime

        if (type === 'closet_open') {
            // White noise burst or slight slide
            osc.type = 'triangle'
            osc.frequency.setValueAtTime(200, t)
            osc.frequency.linearRampToValueAtTime(100, t + 0.2)
            gain.gain.setValueAtTime(0.2, t)
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
            osc.start(t)
            osc.stop(t + 0.2)
        }
        else if (type === 'closet_close') {
            // Thud
            osc.type = 'square'
            osc.frequency.setValueAtTime(100, t)
            osc.frequency.exponentialRampToValueAtTime(50, t + 0.1)
            gain.gain.setValueAtTime(0.2, t)
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1)
            osc.start(t)
            osc.stop(t + 0.1)
        }
        else if (type === 'win') {
            // Fanfare (Major Triad: C-E-G-C)
            this.playTone(523.25, t, 0.2, 'square')
            this.playTone(659.25, t + 0.2, 0.2, 'square')
            this.playTone(783.99, t + 0.4, 0.2, 'square')
            this.playTone(1046.50, t + 0.6, 0.8, 'square')
        }
        else if (type === 'lose') {
            // Sad slide
            osc.type = 'sawtooth'
            osc.frequency.setValueAtTime(300, t)
            osc.frequency.linearRampToValueAtTime(50, t + 1.5)
            gain.gain.setValueAtTime(0.2, t)
            gain.gain.linearRampToValueAtTime(0, t + 1.5)
            osc.start(t)
            osc.stop(t + 1.5)
        }
    }

    private playTone(freq: number, startTime: number, duration: number, type: OscillatorType = 'sine') {
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()
        osc.connect(gain)
        gain.connect(this.gainNode)

        osc.type = type
        osc.frequency.value = freq

        gain.gain.setValueAtTime(0.1, startTime)
        gain.gain.linearRampToValueAtTime(0, startTime + duration)

        osc.start(startTime)
        osc.stop(startTime + duration)
    }
}
