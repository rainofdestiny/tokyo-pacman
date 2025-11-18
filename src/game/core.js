import {
    TILE_SIZE, PACMAN_SPEED, WALL, DOT, EMPTY,
    GHOST_BASE_SPEED, GHOST_SURGE_SPEED,
    DASH_COOLDOWN, EMP_COOLDOWN, EMP_DURATION, EMP_RADIUS,
    COLS, ROWS
} from './constants';

// -- HELPER: Проверка стен --
const isWall = (grid, col, row) => {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return true;
    return grid[row] && grid[row][col] === WALL;
};

// -- HELPER: Найти ближайшую безопасную клетку (для Dash) --
const findNearestSafeSpot = (grid, targetX, targetY) => {
    let col = Math.floor(targetX / TILE_SIZE);
    let row = Math.floor(targetY / TILE_SIZE);

    // Границы
    col = Math.max(1, Math.min(col, COLS - 2));
    row = Math.max(1, Math.min(row, ROWS - 2));

    if (!isWall(grid, col, row)) {
        return { x: col * TILE_SIZE + TILE_SIZE / 2, y: row * TILE_SIZE + TILE_SIZE / 2 };
    }

    // Поиск по спирали, если попали в стену
    const maxRadius = 3;
    for (let r = 1; r <= maxRadius; r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                const checkCol = col + dx;
                const checkRow = row + dy;
                if (!isWall(grid, checkCol, checkRow)) {
                    return { x: checkCol * TILE_SIZE + TILE_SIZE / 2, y: checkRow * TILE_SIZE + TILE_SIZE / 2 };
                }
            }
        }
    }
    return null;
};

// -- BFS Pathfinding (Для умного призрака) --
const getNextStepBFS = (grid, startX, startY, targetX, targetY) => {
    const startCol = Math.floor(startX / TILE_SIZE);
    const startRow = Math.floor(startY / TILE_SIZE);
    const targetCol = Math.floor(targetX / TILE_SIZE);
    const targetRow = Math.floor(targetY / TILE_SIZE);
    if (startCol === targetCol && startRow === targetRow) return null;

    const queue = [{ c: startCol, r: startRow, firstMove: null }];
    const visited = new Set();
    visited.add(`${startCol},${startRow}`);
    const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];

    while (queue.length > 0) {
        const { c, r, firstMove } = queue.shift();
        if (c === targetCol && r === targetRow) return firstMove;
        if (queue.length > 150) break; // Ограничение глубины

        for (let d of dirs) {
            const nc = c + d.x;
            const nr = r + d.y;
            const key = `${nc},${nr}`;
            if (!isWall(grid, nc, nr) && !visited.has(key)) {
                visited.add(key);
                queue.push({ c: nc, r: nr, firstMove: firstMove || d });
            }
        }
    }
    return null;
};

// -- DASH --
export const performDash = (state) => {
    const p = state.player;
    const dist = TILE_SIZE * 5;

    let dx = p.dirX; let dy = p.dirY;
    if (dx === 0 && dy === 0) {
        if (Math.abs(Math.cos(p.rotation)) > 0.5) dx = Math.sign(Math.cos(p.rotation));
        else dy = Math.sign(Math.sin(p.rotation));
    }

    let landX = p.x + dx * dist;
    let landY = p.y + dy * dist;

    const safeSpot = findNearestSafeSpot(state.grid, landX, landY);

    if (safeSpot) {
        // Частицы следа
        const steps = 10;
        for (let i = 0; i <= steps; i++) {
            state.particles.push({
                x: p.x + (safeSpot.x - p.x) * (i / steps),
                y: p.y + (safeSpot.y - p.y) * (i / steps),
                vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, life: 20, color: '#00ffff'
            });
        }
        p.x = safeSpot.x;
        p.y = safeSpot.y;
        p.dashTimer = DASH_COOLDOWN;
    }
};

// -- EMP --
export const performEMP = (state) => {
    const p = state.player;

    // Волна
    state.particles.push({
        type: 'shockwave', x: p.x, y: p.y, life: 60, color: '#00ff00'
    });

    // Стан
    state.ghosts.forEach(g => {
        const dist = Math.hypot(g.x - p.x, g.y - p.y);
        if (dist <= EMP_RADIUS) {
            g.stunTimer = EMP_DURATION;
            for (let i = 0; i < 5; i++) {
                state.particles.push({
                    x: g.x, y: g.y,
                    vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
                    life: 40, color: '#fff'
                });
            }
        }
    });

    p.empTimer = EMP_COOLDOWN;
};

// -- PLAYER UPDATE --
const updatePlayer = (state) => {
    const p = state.player;
    const centerX = (Math.floor(p.x / TILE_SIZE) * TILE_SIZE) + TILE_SIZE / 2;
    const centerY = (Math.floor(p.y / TILE_SIZE) * TILE_SIZE) + TILE_SIZE / 2;
    const distToCenter = Math.hypot(p.x - centerX, p.y - centerY);

    // Поворот (с допуском)
    if (p.nextDirX !== 0 || p.nextDirY !== 0) {
        if (distToCenter <= PACMAN_SPEED + 2) {
            let col = Math.floor(p.x / TILE_SIZE) + p.nextDirX;
            let row = Math.floor(p.y / TILE_SIZE) + p.nextDirY;
            if (!isWall(state.grid, col, row)) {
                p.x = centerX; p.y = centerY;
                p.dirX = p.nextDirX; p.dirY = p.nextDirY;
                p.nextDirX = 0; p.nextDirY = 0;

                if (p.dirX === 1) p.rotation = 0;
                if (p.dirX === -1) p.rotation = Math.PI;
                if (p.dirY === 1) p.rotation = Math.PI / 2;
                if (p.dirY === -1) p.rotation = -Math.PI / 2;
            }
        }
    }

    let nextX = p.x + p.dirX * PACMAN_SPEED;
    let nextY = p.y + p.dirY * PACMAN_SPEED;
    let col = Math.floor((nextX + p.dirX * (TILE_SIZE / 2)) / TILE_SIZE);
    let row = Math.floor((nextY + p.dirY * (TILE_SIZE / 2)) / TILE_SIZE);

    if (!isWall(state.grid, col, row)) {
        p.x = nextX; p.y = nextY;
    } else {
        // Прилипание к центру при остановке
        if (Math.hypot(p.x - centerX, p.y - centerY) < PACMAN_SPEED) {
            p.x = centerX; p.y = centerY;
        }
    }
};

// -- GHOST UPDATE --
const updateGhosts = (state, setGameOver) => {
    const p = state.player;

    state.ghosts.forEach((g, index) => {
        // STUN CHECK
        if (g.stunTimer > 0) {
            g.stunTimer--;
            return;
        }

        const gcX = (Math.floor(g.x / TILE_SIZE) * TILE_SIZE) + TILE_SIZE / 2;
        const gcY = (Math.floor(g.y / TILE_SIZE) * TILE_SIZE) + TILE_SIZE / 2;
        const gDist = Math.hypot(g.x - gcX, g.y - gcY);

        let currentSpeed = GHOST_BASE_SPEED;
        const isSurge = state.frame % 300 > 250; // Периодическое ускорение
        if (isSurge) currentSpeed = GHOST_SURGE_SPEED;
        if (g.type === 'SPEEDSTER') currentSpeed *= 1.5;

        // GLITCH ABILITY
        if (g.type === 'GLITCH') {
            g.abilityTimer--;
            if (g.abilityTimer <= 0) {
                for (let i = 0; i < 10; i++) {
                    const rx = Math.floor(Math.random() * COLS);
                    const ry = Math.floor(Math.random() * ROWS);
                    if (!isWall(state.grid, rx, ry)) {
                        state.particles.push({ type: 'glitch', x: 0, y: 0, life: 5 });
                        g.x = rx * TILE_SIZE + TILE_SIZE / 2;
                        g.y = ry * TILE_SIZE + TILE_SIZE / 2;
                        g.abilityTimer = 600;
                        break;
                    }
                }
            }
        }

        // AI Logic (на перекрестках)
        if (gDist <= currentSpeed) {
            let bestDir = null;
            let tx = p.x; let ty = p.y;

            if (p.invisActive > 0) {
                tx = (Math.random() * COLS) * TILE_SIZE;
                ty = (Math.random() * ROWS) * TILE_SIZE;
            } else {
                if (g.type === 'AMBUSHER') {
                    tx = p.x + p.dirX * 4 * TILE_SIZE;
                    ty = p.y + p.dirY * 4 * TILE_SIZE;
                }
            }

            // Только трекер использует тяжелый BFS
            if (g.type === 'TRACKER' && p.invisActive <= 0) {
                const move = getNextStepBFS(state.grid, g.x, g.y, tx, ty);
                if (move) bestDir = move;
            }

            if (!bestDir) {
                const possible = [];
                const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];

                dirs.forEach(d => {
                    // Не разворачиваться, если не тупик
                    if (d.x === -g.dirX && d.y === -g.dirY && (g.dirX !== 0 || g.dirY !== 0)) return;
                    const nx = Math.floor(g.x / TILE_SIZE) + d.x;
                    const ny = Math.floor(g.y / TILE_SIZE) + d.y;
                    if (!isWall(state.grid, nx, ny)) possible.push(d);
                });

                if (possible.length === 0) possible.push({ x: -g.dirX, y: -g.dirY });

                let minD = Infinity;
                possible.forEach(d => {
                    const cx = gcX + d.x * TILE_SIZE;
                    const cy = gcY + d.y * TILE_SIZE;
                    const dst = (cx - tx) ** 2 + (cy - ty) ** 2;
                    if (dst < minD) { minD = dst; bestDir = d; }
                });
            }

            if (bestDir && (bestDir.x !== g.dirX || bestDir.y !== g.dirY)) {
                g.x = gcX; g.y = gcY;
                g.dirX = bestDir.x; g.dirY = bestDir.y;
            }
        }

        g.x += g.dirX * currentSpeed;
        g.y += g.dirY * currentSpeed;

        // Проверка столкновения
        if (Math.hypot(g.x - p.x, g.y - p.y) < TILE_SIZE * 0.7 && p.invisActive <= 0) {
            setGameOver(true);
        }
    });
};

// -- MAIN LOOP FUNCTION --
export const updateGame = (state, setScore, handleGameOver, isGameOver) => {
    state.frame++;

    // Частицы обновляются ВСЕГДА (для взрывов)
    state.particles = state.particles.filter(pt => pt.life > 0);
    state.particles.forEach(pt => { pt.x += pt.vx || 0; pt.y += pt.vy || 0; pt.life--; });

    // Если игра окончена - стоп логика
    if (isGameOver) return;

    updatePlayer(state);

    // Еда
    let gx = Math.floor(state.player.x / TILE_SIZE);
    let gy = Math.floor(state.player.y / TILE_SIZE);
    if (state.grid[gy] && state.grid[gy][gx] === DOT) {
        state.grid[gy][gx] = EMPTY;
        state.score += 10;
        setScore(state.score);
    }

    // Таймеры
    if (state.player.dashTimer > 0) state.player.dashTimer--;
    if (state.player.invisTimer > 0) state.player.invisTimer--;
    if (state.player.invisActive > 0) state.player.invisActive--;
    if (state.player.empTimer > 0) state.player.empTimer--;

    updateGhosts(state, handleGameOver);
};
