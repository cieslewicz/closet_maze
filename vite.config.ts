/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
    base: './', // Important for relative paths in GitHub Pages
    test: {
        environment: 'jsdom',
        globals: true
    }
})
