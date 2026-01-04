# Architecture Documentation - Closet Maze

## Overview
Closet Maze is a 3D web-based game built with **Three.js** and **TypeScript**, bundled with **Vite**. The game features a procedural maze, a third-person player controller, enemy AI with a state machine, and interactive hiding mechanics.

## Directory Structure
*   `src/core`: Core engine components (Game loop, Input).
*   `src/entities`: Game objects (Player, Maze, Enemy, Closet).
*   `src/main.ts`: Entry point.

## Core Components

### Game Loop (`src/core/Game.ts`)
The `Game` class manages the Three.js scene, camera, renderer, and the main requestAnimationFrame loop.
*   **Initialization**: Sets up the scene, lights, spawns entities, and initializes subsystems (Audio, UI).
*   **Update Loop**: Calculates delta time, updates entity logic, checks collisions, and handles global game state (Win/Loss).
*   **Rendering**: Draws the scene using the WebGLRenderer.

### Input System (`src/core/InputManager.ts`)
Handles keyboard events and normalizes them into a 2D axis (x, y).
*   Supports WASD and Arrow Keys.
*   Manages "Pause" toggle via Escape key.

### Sound System (`src/core/SoundManager.ts`)
Procedural audio engine using the **Web Audio API**. Generates sounds on the fly without external assets.
*   **BGM**: Dynamic music switching between "Calm" (Major scale, slow) and "Chase" (Dissonant, fast) layers.
*   **SFX**: Synthesized effects for footsteps, closet interaction, win, and lose states.

### UI Manager (`src/core/UIManager.ts`)
Manages DOM-based overlay screens.
*   **Screens**: Main Menu, HUD, Pause Menu, Help Screen, Win/Lose Screens.
*   **HUD**: Updates visibility status ("Safe", "Hidden", "RUN!") and help hints.

## Game Entities

### Maze (`src/entities/Maze.ts`)
Procedurally generates a grid-based map.
*   **Data Structure**: 2D array where `1` is Wall, `0` is Path, `3` is Exit.
*   **Visuals**: Instantiates BoxGeometry meshes for walls and a Golden Door for the exit.
*   **Collision**: Provides `checkCollision(Box3, blockTypes)` method. Supports blocking specific tile types (e.g. Enemies blocked by Exits).

### Player (`src/entities/Player.ts`)
Represents the user's character.
*   **Control**: Velocity-based movement with simple physics (slide along walls).
*   **Camera**: OrbitControls integration for Third-Person view with Zoom (Scroll/Keys) and Rotate (Mouse/Arrows).

### Enemy (`src/entities/Enemy.ts`)
Implements a Finite State Machine (FSM) for AI behavior.
*   **States**:
    *   `WANDER`: Moves randomly or follows walls (`WanderStrategy`), avoiding 180-degree turns (`Memory`).
    *   `CHASE`: Moves directly towards the player if visible.
*   **Senses**:
    *   **Vision**: `checkVisibility()` uses a **Multi-Ray** cast (Center, Left, Right) to detect the player, preventing line-of-sight leaks through wall cracks.
    *   **Distance**: Configurable view distance (default 10).
*   **Visuals**: Pulses red when in `CHASE` state.

### Closet (`src/entities/Closet.ts`)
Static interactive objects.
*   Provides `getEntryZone()` to detect player entry.
*   If inside, `Game` marks player as `isHidden`. Enemies in `CHASE` will return to `WANDER`.

## Data Flow
1.  **Input**: User presses key -> `InputManager` updates axis.
2.  **Player Update**: `Game` calls `player.update()`.
3.  **Physics**: `Game` checks `maze.checkCollision()`. Collisions resolve via sliding/revert.
4.  **Interaction**: `Game` checks `player` vs `closet.getEntryZone()`. Sets `isHidden`.
5.  **AI**: `Game` updates `Enemy` with player pos.
    *   Enemy casts rays. If visible & close -> `CHASE`. Else `WANDER`.
    *   `Game` checks `anyChasing` flag.
6.  **Audio**: `Game` updates `SoundManager` to play "Chase" or "Calm" music based on aggregate enemy state.
7.  **Render**: Scene is drawn.
