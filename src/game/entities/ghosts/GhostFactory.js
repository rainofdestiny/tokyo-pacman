import { TILE_SIZE, COLS, ROWS, WALL, GHOST_SPAWN_ORDER, GHOST_COLORS } from '../../../config/constants';
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

export const spawnNextGhost = (state) => {
    if (!state.ghostSpawnIndex) {
        state.ghostSpawnIndex = 0;
    }

    const typeToSpawn = GHOST_SPAWN_ORDER[state.ghostSpawnIndex % GHOST_SPAWN_ORDER.length];
    state.ghostSpawnIndex++;

    const GhostClass = GHOST_CLASSES[typeToSpawn];
    const color = GHOST_COLORS[typeToSpawn];

    const emptySpots = [];
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (state.grid[y][x] === WALL) continue;

            const isOccupied = state.ghosts.some(g =>
                Math.floor(g.x / TILE_SIZE) === x && Math.floor(g.y / TILE_SIZE) === y
            );
            if (isOccupied) continue;

            emptySpots.push({ x, y });
        }
    }

    const p = state.player;
    const validSpots = emptySpots.filter(spot => {
        const dist = Math.hypot(spot.x - p.x / TILE_SIZE, spot.y - p.y / TILE_SIZE);
        return dist > 10;
    });

    const candidates = validSpots.length > 0 ? validSpots : emptySpots;

    if (candidates.length === 0) return;

    const spawnPoint = candidates[Math.floor(Math.random() * candidates.length)];

    const x = spawnPoint.x * TILE_SIZE + TILE_SIZE / 2;
    const y = spawnPoint.y * TILE_SIZE + TILE_SIZE / 2;

    const ghost = new GhostClass(x, y, color);

    const initialDir = getVectorDirection(state.grid, ghost, p.x, p.y, false);
    ghost.dirX = initialDir.x;
    ghost.dirY = initialDir.y;

    state.ghosts.push(ghost);
};
