export const TILE_SIZE = 32;
export const COLS = 21;
export const ROWS = 17;

export const PACMAN_SPEED = 2.5;
export const GHOST_BASE_SPEED = 2.5;
export const GHOST_SURGE_SPEED = 5;

export const BLINK_COOLDOWN = 5 * 60;
export const INVIS_COOLDOWN = 20 * 60;
export const INVIS_DURATION = 5 * 60;
export const EMP_COOLDOWN = 10 * 60;
export const EMP_DURATION = 3 * 60;
export const EMP_RADIUS = 7 * TILE_SIZE;

export const GEMINI_SPLIT_DURATION = 30 * 60;
export const GEMINI_MERGED_DURATION = 30 * 60;

export const PHANTOM_PHASE_DURATION = 5 * 60;
export const PHANTOM_COOLDOWN = 15 * 60;

export const UNLOCK_SCORE_BLINK = 10;
export const UNLOCK_SCORE_EMP = 25;
export const UNLOCK_SCORE_INVIS = 50;

export const SPAWN_GHOST_SCORE_STEP = 50;

export const EMPTY = 0;
export const WALL = 1;
export const DOT = 2;

export const GHOST_TYPES = [
    'HUNTER', 'SPEEDSTER', 'GHOST', 'GLITCH', 'GEMINI', 'PHANTOM'
];

export const GHOST_VISION_RANGE = 8; // Дальность зрения в клетках
export const GHOST_MEMORY_DURATION = 3 * 60; // Как долго помнят позицию игрока (3 сек)
export const GHOST_WANDER_CHANGE_DIR = 3 * 60; // Частота смены направления при блуждании (2 сек)
