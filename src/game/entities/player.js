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
        // Simple afterimage trail - player clones fading out
        for (let i = 0; i <= 8; i++) {
            const t = i / 8;
            state.particles.push({
                type: 'afterimage',
                x: p.x + (safeSpot.x - p.x) * t,
                y: p.y + (safeSpot.y - p.y) * t,
                life: 20 - i * 2,
                maxLife: 20,
                color: '#ffff00'
            });
        }

        p.x = safeSpot.x;
        p.y = safeSpot.y;
    }

    p.dashTimer = BLINK_COOLDOWN;
};

export const performEMP = (state) => {
    const p = state.player;

    // Multiple expanding rings for better effect
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            state.particles.push({
                type: 'shockwave',
                x: p.x,
                y: p.y,
                life: 50,
                color: '#00ffff',
                speed: 1 + i * 0.3
            });
        }, i * 100);
    }

    // Electric circle particles
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        state.particles.push({
            x: p.x,
            y: p.y,
            vx: Math.cos(angle) * 6,
            vy: Math.sin(angle) * 6,
            life: 30,
            color: '#00ffff'
        });
    }

    state.ghosts.forEach(g => {
        const dist = Math.hypot(g.x - p.x, g.y - p.y);
        if (dist <= EMP_RADIUS * TILE_SIZE) {
            g.stunTimer = EMP_STUN_DURATION;

            // Electric shock particles on hit ghost
            for (let i = 0; i < 12; i++) {
                const angle = (Math.PI * 2 * i) / 12;
                state.particles.push({
                    x: g.x,
                    y: g.y,
                    vx: Math.cos(angle) * 3,
                    vy: Math.sin(angle) * 3,
                    life: 25,
                    color: '#ffff00'
                });
            }
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
