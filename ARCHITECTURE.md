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
*   **Initialization**: Sets up the scene, lights, and spawns entities.
*   **Update Loop**: Calculates delta time, updates entity logic, checks collisions, and handles global game state (Win/Loss).
*   **Rendering**: Draws the scene using the WebGLRenderer.

### Input System (`src/core/InputManager.ts`)
Handles keyboard events and normalizes them into a 2D axis (x, y).
*   Supports WASD and Arrow Keys.
*   Designed to be extensible for Touch/Virtual Joysticks.

## Game Entities

### Maze (`src/entities/Maze.ts`)
Procedurally generates a grid-based map.
*   **Data Structure**: 2D array where `1` is Wall, `0` is Path, `3` is Exit.
*   **Visuals**: Instantiates BoxGeometry meshes for walls.
*   **Collision**: Provides `checkCollision(Box3)` method using grid-based lookup for O(1) collision detection (vs raycasting against all meshes).

### Player (`src/entities/Player.ts`)
Represents the user's character.
*   Handles velocity calculation based on Input.
*   Bounds are exposed via `getBoundingBox()` for the Game class to check against the Maze and Closets.

### Enemy (`src/entities/Enemy.ts`)
Implements a Finite State Machine (FSM) for AI behavior.
*   **States**:
    *   `WANDER`: Moves randomly, changing direction periodically.
    *   `CHASE`: Moves directly towards the player if visible.
*   **Sensors**: Detects player within a radius (`viewDistance`) depending on if the player is `isHidden`.

### Closet (`src/entities/Closet.ts`)
Static interactive objects.
*   Provides `checkEntry(Box3)` to determine if the player is "hiding".
*   If hidden, the Enemy AI ignores the player (returns to WANDER).

## Data Flow
1.  **Input**: User presses key -> `InputManager` updates axis.
2.  **Player Update**: `Game` calls `player.update()`, gets desired movement.
3.  **Physics**: `Game` checks `maze.checkCollision()`. If collision, movement is reverted.
4.  **Interaction**: `Game` checks `closet.intersects(player)`. Sets `isHidden` flag.
5.  **AI**: `Game` updates `Enemy` with player pos and `isHidden`. Enemy adjusts state.
6.  **Render**: Scene is drawn.
