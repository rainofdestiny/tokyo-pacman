export const TILE_SIZE = 32;
export const COLS = 21;
export const ROWS = 17;

export const PACMAN_SPEED = 2.5;

export const BLINK_COOLDOWN = 5 * 60;
export const INVIS_COOLDOWN = 13 * 60;
export const EMP_COOLDOWN = 9 * 60;

export const UNLOCK_SCORE_BLINK = 0;
export const UNLOCK_SCORE_INVIS = 0;
export const UNLOCK_SCORE_EMP = 0;

export const BLINK_DISTANCE = 5;
export const INVIS_DURATION = 3 * 60;
export const EMP_RADIUS = 5;
export const EMP_DURATION = 2 * 60;
export const EMP_STUN_DURATION = 3 * 60;

// ============================================
// GHOST CONFIGURATION
// ============================================

// Ghost spawn order (change order here to modify spawn sequence)
export const GHOST_SPAWN_ORDER = ['GHOST', 'GLITCH', 'PHANTOM', 'SPEEDSTER', 'HUNTER', 'GEMINI'];

// Ghost colors
export const GHOST_COLORS = {
    'HUNTER': '#ff007c',
    'SPEEDSTER': '#00ffff',
    'GHOST': '#ffffff',
    'GLITCH': '#ffaa00',
    'GEMINI': '#2123CF',
    'PHANTOM': '#8a2be2'
};

// Ghost AI parameters
export const GHOST_VISION_RANGE = 10;
export const GHOST_MEMORY_DURATION = 180;
export const GHOST_BASE_SPEED = 2.5;
export const GHOST_SURGE_SPEED = 5;
export const GHOST_WANDER_CHANGE_DIR = 3 * 60;

// Gemini-specific parameters
export const GEMINI_SPLIT_DURATION = 10 * 60;
export const GEMINI_MERGED_DURATION = 30 * 60;
export const GEMINI_MERGE_DISTANCE = 3;
export const GEMINI_CLONE_OFFSET = 1;

// Phantom-specific parameters
export const PHANTOM_PHASE_DURATION = 3 * 60;
export const PHANTOM_COOLDOWN = 5 * 60;

// Glitch-specific parameters
export const GLITCH_TELEPORT_COOLDOWN = 5 * 60;
export const GLITCH_TELEPORT_RANGE = 8;

// Speedster-specific parameters
export const SPEEDSTER_CLOSE_DISTANCE = 3;
export const SPEEDSTER_MEDIUM_DISTANCE = 10;
export const SPEEDSTER_SLOW_MULTIPLIER = 0.75;

// Ambusher-specific parameters
export const AMBUSHER_PREDICT_DISTANCE = 4;

export const SPAWN_GHOST_SCORE_STEP = 35;

export const EMPTY = 0;
export const WALL = 1;
export const DOT = 2;

export const GHOST_TYPES = [
    'HUNTER', 'SPEEDSTER', 'GHOST', 'GLITCH', 'GEMINI', 'PHANTOM'
];
