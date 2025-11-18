export const TILE_SIZE = 30;
export const COLS = 25;
export const ROWS = 19;

// --- БАЛАНС СКОРОСТИ ---
// Важно: Скорости должны делить 30 без остатка (1, 2, 3, 5, 6...)
export const PACMAN_SPEED = 2;
export const GHOST_BASE_SPEED = 1;
export const GHOST_SURGE_SPEED = 2;

// --- ТАЙМИНГИ (в кадрах, 60 кадров = 1 сек) ---
export const DASH_COOLDOWN = 180;    // 3 сек
export const INVIS_COOLDOWN = 600;   // 10 сек
export const INVIS_DURATION = 300;   // 5 сек
export const EMP_COOLDOWN = 900;     // 15 сек
export const EMP_DURATION = 240;     // 4 сек стана
export const EMP_RADIUS = 6 * TILE_SIZE;

// Типы тайлов
export const EMPTY = 0;
export const WALL = 1;
export const DOT = 2;
