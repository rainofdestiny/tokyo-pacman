import { TILE_SIZE, DOT, EMPTY, SPAWN_GHOST_SCORE_STEP } from '../config/constants';
import { updatePlayer } from './entities/player';
import { updateGhosts, spawnRandomGhost } from './entities/ghosts';

// Фиксированный тикрейт (60 тиков в секунду)
export const TICK_RATE = 60;
export const TICK_DURATION = 1000 / TICK_RATE; // ~16.67ms

// Проверяет, остались ли точки на карте
const countRemainingDots = (grid) => {
    let count = 0;
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x] === DOT) count++;
        }
    }
    return count;
};

// Регенерирует точки на карте
const regenerateDots = (state) => {
    for (let y = 0; y < state.grid.length; y++) {
        for (let x = 0; x < state.grid[y].length; x++) {
            // Ставим точку везде, где не стена
            if (state.grid[y][x] === EMPTY) {
                state.grid[y][x] = DOT;
            }
        }
    }

    // Эффект регенерации - волна частиц
    const centerX = (state.grid[0].length * TILE_SIZE) / 2;
    const centerY = (state.grid.length * TILE_SIZE) / 2;

    for (let i = 0; i < 50; i++) {
        const angle = (Math.PI * 2 * i) / 50;
        state.particles.push({
            x: centerX,
            y: centerY,
            vx: Math.cos(angle) * 8,
            vy: Math.sin(angle) * 8,
            life: 60,
            color: '#6a3a6a'
        });
    }

    // Большая волна для драматического эффекта
    state.particles.push({
        type: 'shockwave',
        x: centerX,
        y: centerY,
        life: 60,
        color: '#6a3a6a'
    });
};

export const updateGame = (state, setScore, handleGameOver, isGameOver) => {
    state.frame++;
    state.particles = state.particles.filter(pt => pt.life > 0);
    state.particles.forEach(pt => {
        pt.x += pt.vx || 0;
        pt.y += pt.vy || 0;
        pt.life--;
    });

    if (isGameOver) return;

    updatePlayer(state);

    let gx = Math.floor(state.player.x / TILE_SIZE);
    let gy = Math.floor(state.player.y / TILE_SIZE);
    if (state.grid[gy] && state.grid[gy][gx] === DOT) {
        state.grid[gy][gx] = EMPTY;
        state.score += 10;
        setScore(state.score);

        if (state.score > 0 && state.score % SPAWN_GHOST_SCORE_STEP === 0 && state.ghostsSpawned < state.score / SPAWN_GHOST_SCORE_STEP) {
            spawnRandomGhost(state);
            state.ghostsSpawned++;
        }
    }

    // Проверяем, не съели ли все точки (проверяем каждый кадр)
    const remainingDots = countRemainingDots(state.grid);
    if (remainingDots === 0 && !state.levelCompleting) {
        // Уровень пройден! Регенерируем точки
        state.levelCompleting = true;
        regenerateDots(state);

        // Бонус за прохождение уровня
        state.score += 500;
        setScore(state.score);

        // Сбрасываем флаг через небольшую задержку
        setTimeout(() => {
            if (state.levelCompleting) {
                state.levelCompleting = false;
            }
        }, 100);
    }

    if (state.player.dashTimer > 0) state.player.dashTimer--;
    if (state.player.invisTimer > 0) state.player.invisTimer--;
    if (state.player.invisActive > 0) state.player.invisActive--;
    if (state.player.empTimer > 0) state.player.empTimer--;

    // Передаем фиксированную дельту времени (1 тик = 1/60 секунды)
    updateGhosts(state, 1 / TICK_RATE, handleGameOver);
};
