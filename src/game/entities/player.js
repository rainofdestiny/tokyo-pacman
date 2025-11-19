import { TILE_SIZE, COLS, ROWS, PACMAN_SPEED, BLINK_COOLDOWN, EMP_COOLDOWN, EMP_DURATION, EMP_RADIUS, EMP_STUN_DURATION } from '../../config/constants';
import { snap, isWall, findNearestSafeSpot } from '../utils/physics';

export const performBlink = (state) => {
    const p = state.player;
    const dist = TILE_SIZE * 4;

    // Use gaze direction (rotation) for blink
    // This allows blinking in a direction different from current movement
    let dx = Math.round(Math.cos(p.rotation));
    let dy = Math.round(Math.sin(p.rotation));

    // Рассчитываем целевую точку
    let landX = p.x + dx * dist;
    let landY = p.y + dy * dist;

    // --- ЛОГИКА ТЕЛЕПОРТАЦИИ ЧЕРЕЗ КРАЙ (WRAPPING) ---
    const mapWidth = COLS * TILE_SIZE;
    const mapHeight = ROWS * TILE_SIZE;

    if (landX < 0) landX = mapWidth + landX;
    else if (landX > mapWidth) landX = landX - mapWidth;

    if (landY < 0) landY = mapHeight + landY;
    else if (landY > mapHeight) landY = landY - mapHeight;
    // -------------------------------------------------

    // Ищем безопасное место рядом с точкой приземления
    const safeSpot = findNearestSafeSpot(state.grid, landX, landY);

    if (safeSpot) {
        // Эффект частиц (след)
        for (let i = 0; i <= 10; i++) {
            state.particles.push({
                // Простая линейная интерполяция для красоты,
                // при телепорте через край будет линия через весь экран, это выглядит как варп
                x: p.x + (safeSpot.x - p.x) * (i / 10),
                y: p.y + (safeSpot.y - p.y) * (i / 10),
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                life: 15,
                color: '#00ffff'
            });
        }

        p.x = safeSpot.x;
        p.y = safeSpot.y;
        p.dashTimer = BLINK_COOLDOWN;
    }
};

export const performEMP = (state) => {
    const p = state.player;
    state.particles.push({ type: 'shockwave', x: p.x, y: p.y, life: 60, color: '#00ff00' });
    state.ghosts.forEach(g => {
        const dist = Math.hypot(g.x - p.x, g.y - p.y);
        if (dist <= EMP_RADIUS * TILE_SIZE) {
            g.stunTimer = EMP_STUN_DURATION;
            for (let i = 0; i < 5; i++) state.particles.push({ x: g.x, y: g.y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 40, color: '#fff' });
        }
    });
    p.empTimer = EMP_COOLDOWN;
};

export const updatePlayer = (state) => {
    const p = state.player;
    const mapWidth = COLS * TILE_SIZE;

    // Обычный телепорт (когда идешь пешком)
    if (p.x < 0) { p.x = mapWidth - TILE_SIZE / 2; return; }
    if (p.x > mapWidth) { p.x = TILE_SIZE / 2; return; }

    const centerTileX = snap(p.x);
    const centerTileY = snap(p.y);
    const distToCenter = Math.hypot(p.x - centerTileX, p.y - centerTileY);

    // УЛУЧШЕННАЯ ЛОГИКА: более отзывчивое управление
    if (p.nextDirX !== 0 || p.nextDirY !== 0) {
        // Увеличенный допуск для более быстрой реакции (было PACMAN_SPEED + 1.5)
        const turnTolerance = TILE_SIZE * 0.4; // ~40% клетки вместо жёстких 3.5 пикселей

        if (distToCenter <= turnTolerance) {
            let col = Math.floor(p.x / TILE_SIZE) + p.nextDirX;
            let row = Math.floor(p.y / TILE_SIZE) + p.nextDirY;
            if (!isWall(state.grid, col, row)) {
                // Мягкий снэп - не телепортируем в центр, а плавно корректируем
                p.x = centerTileX;
                p.y = centerTileY;
                p.dirX = p.nextDirX;
                p.dirY = p.nextDirY;
                p.nextDirX = 0;
                p.nextDirY = 0;
                // Rotation обновляется в useGame.js при нажатии клавиши
            }
        }
    }

    let nextX = p.x + p.dirX * PACMAN_SPEED;
    let nextY = p.y + p.dirY * PACMAN_SPEED;

    let col = Math.floor((nextX + p.dirX * (TILE_SIZE / 2)) / TILE_SIZE);
    let row = Math.floor((nextY + p.dirY * (TILE_SIZE / 2)) / TILE_SIZE);

    if (!isWall(state.grid, col, row)) {
        p.x = nextX;
        p.y = nextY;
        if (p.dirX !== 0) p.y = centerTileY;
        if (p.dirY !== 0) p.x = centerTileX;
    } else {
        p.x = centerTileX;
        p.y = centerTileY;
    }
};
