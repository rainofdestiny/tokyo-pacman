import { TILE_SIZE, COLS, ROWS, WALL, GHOST_TYPES, GEMINI_SPLIT_DURATION, PHANTOM_COOLDOWN } from '../../../config/constants';
import { getVectorDirection } from '../../utils/physics';
import { Hunter } from './types/Hunter';
import { Speedster } from './types/Speedster';
import { Ambusher } from './types/Ambusher';
import { Glitch } from './types/Glitch';
import { Gemini } from './types/Gemini';
import { Phantom } from './types/Phantom';

const GHOST_CLASSES = {
    'HUNTER': Hunter,
    'SPEEDSTER': Speedster,
    'GHOST': Ambusher,
    'GLITCH': Glitch,
    'GEMINI': Gemini,
    'PHANTOM': Phantom
};

const GHOST_COLORS = {
    'HUNTER': '#ff007c',
    'SPEEDSTER': '#00ffff',
    'GHOST': '#ffffff',
    'GLITCH': '#ffaa00',
    'GEMINI': '#2123CF',
    'PHANTOM': '#8a2be2'
};

export const spawnRandomGhost = (state) => {
    const type = GHOST_TYPES[Math.floor(Math.random() * GHOST_TYPES.length)];
    const GhostClass = GHOST_CLASSES[type];
    const color = GHOST_COLORS[type];

    // Spawn away from player
    const emptySpots = [];
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            // Check if wall
            if (state.grid[y][x] === WALL) continue;

            // Check if occupied by another ghost
            const isOccupied = state.ghosts.some(g =>
                Math.floor(g.x / TILE_SIZE) === x && Math.floor(g.y / TILE_SIZE) === y
            );
            if (isOccupied) continue;

            emptySpots.push({ x, y });
        }
    }

    const p = state.player;
    // Filter spots that are at least 10 tiles away from player
    const validSpots = emptySpots.filter(spot => {
        const dist = Math.hypot(spot.x - p.x / TILE_SIZE, spot.y - p.y / TILE_SIZE);
        return dist > 10;
    });

    // If no valid spots far away, fallback to any empty spot
    const candidates = validSpots.length > 0 ? validSpots : emptySpots;

    if (candidates.length === 0) return; // Should not happen

    const spawnPoint = candidates[Math.floor(Math.random() * candidates.length)];

    const x = spawnPoint.x * TILE_SIZE + TILE_SIZE / 2;
    const y = spawnPoint.y * TILE_SIZE + TILE_SIZE / 2;

    const ghost = new GhostClass(x, y, color);

    // Initialize direction
    const initialDir = getVectorDirection(state.grid, ghost, p.x, p.y, false);
    ghost.dirX = initialDir.x;
    ghost.dirY = initialDir.y;

    state.ghosts.push(ghost);
};
