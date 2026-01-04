# Closet Maze

A suspenseful 3D web game where you must navigate a procedural maze, hide in closets to evade enemies, and find the Golden Door to escape. Built with **Three.js** and **TypeScript** using Google Antigravity and Gemini 3 Pro.

## How to Play

### Controls
- **Movement**: Arrow Keys
- **Camera Rotation**: WASD
- **Camera Zoom**: Z / X
- **Pause/Help**: ESC or H
- **Interact**: Walk into closets to hide

### Goal
*   Explore the maze to find the **Golden Door**.
*   Avoid the **Red Enemies**.
    *   If they see you, they will turn **Red** and chase you.
    *   Hide in a **Closet** to break their line of sight.
    *   If they catch you, it's Game Over.
*   The maze resets and gets harder (or stays same based on difficulty) when you win.

## Setup & Running Locally

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start Development Server**:
    ```bash
    npm run dev
    ```
    Open the URL shown in the terminal (usually `http://localhost:5173`).

3.  **Build for Production**:
    ```bash
    npm run build
    ```
    The output will be in the `dist/` folder.

4.  **Test**:
    ```bash
    npm test
    ```

## Features
*   **Procedural Maze Generation**: Every game is unique.
*   **Smart Enemy AI**:
    *   State machine (Wander/Chase).
    *   Multi-Ray vision system to prevent unfair detection through cracks.
    *   Advanced wandering strategies (Wall Follow, Memory).
*   **Dynamic Sound System**: Procedural audio engine using the Web Audio API (no external sound files).
*   **Responsive UI**: Main menu, pause screen, and difficulty selection.

## Architecture
See [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details.
