import {
    TILE_SIZE, COLS, ROWS, WALL,
    PACMAN_SPEED,
    GHOST_BASE_SPEED, GHOST_SURGE_SPEED,
    GHOST_TYPES,
    GEMINI_SPLIT_DURATION, GEMINI_MERGED_DURATION,
    PHANTOM_PHASE_DURATION, PHANTOM_COOLDOWN,
    GHOST_VISION_RANGE, GHOST_MEMORY_DURATION, GHOST_WANDER_CHANGE_DIR
} from '../../config/constants';
import { snap, isWall, isAtCenter, getNextStepAStar } from '../utils/physics';

// Проверка видимости игрока призраком (line of sight)
const canSeePlayer = (grid, ghostX, ghostY, playerX, playerY, visionRange) => {
    const gCol = Math.floor(ghostX / TILE_SIZE);
    const gRow = Math.floor(ghostY / TILE_SIZE);
    const pCol = Math.floor(playerX / TILE_SIZE);
    const pRow = Math.floor(playerY / TILE_SIZE);

    // Проверяем дистанцию
    const distInTiles = Math.hypot(pCol - gCol, pRow - gRow);
    if (distInTiles > visionRange) return false;

    // Проверяем line of sight (упрощенная версия - проверяем ключевые точки)
    const steps = Math.ceil(distInTiles);
    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const checkCol = Math.floor(gCol + (pCol - gCol) * t);
        const checkRow = Math.floor(gRow + (pRow - gRow) * t);
        if (isWall(grid, checkCol, checkRow)) {
            return false; // Стена блокирует обзор
        }
    }

    return true; // Видит игрока!
};

// Функция для блуждания (случайное направление)
const getWanderDirection = (grid, g) => {
    const col = Math.floor(g.x / TILE_SIZE);
    const row = Math.floor(g.y / TILE_SIZE);
    const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];

    // Фильтруем валидные направления
    const validMoves = dirs.filter(d => {
        // Не разворачиваться на 180 градусов
        if (g.dirX !== 0 && d.x === -g.dirX && d.y === 0) return false;
        if (g.dirY !== 0 && d.y === -g.dirY && d.x === 0) return false;
        // Проверка стен
        if (isWall(grid, col + d.x, row + d.y)) return false;
        return true;
    });

    if (validMoves.length === 0) {
        // Тупик - разворачиваемся
        return { x: -g.dirX || 0, y: -g.dirY || 0 };
    }

    // Приоритет - продолжать в том же направлении
    const currentDir = validMoves.find(d => d.x === g.dirX && d.y === g.dirY);
    if (currentDir && Math.random() < 0.7) {
        return currentDir; // 70% шанс продолжить прямо
    }

    // Иначе выбираем случайное направление
    return validMoves[Math.floor(Math.random() * validMoves.length)];
};

// Вспомогательная функция для получения вектора направления игрока
const getPlayerDirectionVector = (player) => {
    if (player.dirX !== 0) return { x: Math.sign(player.dirX), y: 0 };
    if (player.dirY !== 0) return { x: 0, y: Math.sign(player.dirY) };
    return { x: 0, y: 0 };
};

// Функция выбора направления без A* (для "тупых" призраков или особых режимов)
const getVectorDirection = (grid, g, targetX, targetY, ignoreWalls = false) => {
    const col = Math.floor(g.x / TILE_SIZE);
    const row = Math.floor(g.y / TILE_SIZE);
    const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];

    // Фильтруем валидные направления
    const validMoves = dirs.filter(d => {
        // Не разворачиваться на 180 градусов моментально, если есть выбор
        if (g.dirX !== 0 || g.dirY !== 0) {
            if (d.x === -g.dirX && d.y === -g.dirY) return false;
        }
        // Проверка стен
        if (!ignoreWalls && isWall(grid, col + d.x, row + d.y)) return false;
        return true;
    });

    // Если тупик — разрешаем разворот
    if (validMoves.length === 0) {
        const back = { x: -g.dirX || 0, y: -g.dirY || 0 };
        if (ignoreWalls || !isWall(grid, col + back.x, row + back.y)) return back;
        // Если совсем тупик, пробуем хоть что-то
        for (const d of dirs) {
            if (ignoreWalls || !isWall(grid, col + d.x, row + d.y)) return d;
        }
        return { x: 0, y: 0 };
    }

    // Выбираем направление, которое минимально сокращает расстояние до цели
    validMoves.sort((a, b) => {
        const ax = (col + a.x) * TILE_SIZE + TILE_SIZE / 2;
        const ay = (row + a.y) * TILE_SIZE + TILE_SIZE / 2;
        const bx = (col + b.x) * TILE_SIZE + TILE_SIZE / 2;
        const by = (row + b.y) * TILE_SIZE + TILE_SIZE / 2;
        const distA = (ax - targetX) ** 2 + (ay - targetY) ** 2;
        const distB = (bx - targetX) ** 2 + (by - targetY) ** 2;
        return distA - distB;
    });

    return validMoves[0];
};

export const spawnRandomGhost = (state) => {
    const type = GHOST_TYPES[Math.floor(Math.random() * GHOST_TYPES.length)];
    const colors = {
        'HUNTER': '#ff007c',
        'SPEEDSTER': '#00ffff',
        'GHOST': '#ffffff',
        'GLITCH': '#ffaa00',
        'GEMINI': '#2123CF',
        'PHANTOM': '#8a2be2'
    };

    // Спавн подальше от игрока
    const emptySpots = [];
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (state.grid[y][x] !== WALL) emptySpots.push({ x, y });
        }
    }

    const p = state.player;
    emptySpots.sort((a, b) => {
        const distA = (a.x - p.x / TILE_SIZE) ** 2 + (a.y - p.y / TILE_SIZE) ** 2;
        const distB = (b.x - p.x / TILE_SIZE) ** 2 + (b.y - p.y / TILE_SIZE) ** 2;
        return distB - distA;
    });

    const count = Math.min(emptySpots.length, 8);
    const spawnPoint = emptySpots[Math.floor(Math.random() * count)];

    const x = spawnPoint.x * TILE_SIZE + TILE_SIZE / 2;
    const y = spawnPoint.y * TILE_SIZE + TILE_SIZE / 2;

    // Используем переданные константы (они в кадрах, будем конвертировать при update)
    let initialTimer = 0;
    if (type === 'GEMINI') initialTimer = GEMINI_SPLIT_DURATION;
    if (type === 'PHANTOM') initialTimer = PHANTOM_COOLDOWN;
    if (type === 'GLITCH') initialTimer = 180;

    // ВАЖНО: Инициализируем начальное направление, чтобы призрак сразу начал двигаться
    const initialDir = getVectorDirection(state.grid, { x, y, dirX: 0, dirY: 0 }, p.x, p.y, false);

    state.ghosts.push({
        id: Math.random(),
        type,
        color: colors[type],
        x, y,
        dirX: initialDir.x,
        dirY: initialDir.y,
        stunTimer: 0,
        abilityTimer: initialTimer,
        geminiState: 'MERGED',
        isPhasing: false,
        partnerId: null,
        pathOffset: Math.random() * 100,
        // Новые поля для AI
        lastSeenPlayerX: null,
        lastSeenPlayerY: null,
        playerMemoryTimer: 0,
        wanderTimer: 0
    });
};

/**
 * updateGhosts
 * @param {Object} state - стейт игры
 * @param {number} dt - Delta Time в секундах (например, 0.0166 для 60 FPS).
 * @param {Function} handleGameOver
 */
export const updateGhosts = (state, dt, handleGameOver) => {
    // Нормализация времени: все константы рассчитаны на 60 FPS.
    // timeScale = 1.0 означает "прошел 1 тик при 60 FPS".
    let timeScale = (dt || (1 / 60)) * 60;

    // ФИКС БАГА: Ограничиваем timeScale, чтобы избежать резких скачков скорости
    // при lag spike или переключении вкладок
    timeScale = Math.min(timeScale, 2.0); // Максимум в 2 раза быстрее нормы

    const p = state.player;
    const mapWidth = COLS * TILE_SIZE;

    for (let i = state.ghosts.length - 1; i >= 0; i--) {
        const g = state.ghosts[i];

        // --- 1. ОБРАБОТКА ТАЙМЕРОВ ---
        if (g.stunTimer > 0) {
            g.stunTimer -= timeScale;
            if (g.stunTimer < 0) g.stunTimer = 0;
            continue; // Оглушен
        }

        // Туннель (телепортация через границы карты)
        if (g.x < -10) g.x = mapWidth + 10;
        else if (g.x > mapWidth + 10) g.x = -10;

        // --- 2. РАСЧЕТ СКОРОСТИ ---
        let speed = GHOST_BASE_SPEED;
        const distToPlayerPixels = Math.hypot(g.x - p.x, g.y - p.y);
        const distToPlayerTiles = distToPlayerPixels / TILE_SIZE;

        // Логика скорости для разных типов
        if (g.type === 'SPEEDSTER') {
            if (distToPlayerTiles < 3) {
                speed = PACMAN_SPEED;
            } else if (distToPlayerTiles < 10) {
                speed = GHOST_SURGE_SPEED;
            } else {
                speed = GHOST_BASE_SPEED * 0.75;
            }
        } else if (g.type === 'PHANTOM' && g.isPhasing) {
            speed = GHOST_BASE_SPEED * 0.6;
        } else {
            // Обычные призраки + surge logic (ускорение на 5 сек каждые 120 сек)
            // Делаем surge более редким и менее длительным
            const surgeCycle = 7200; // 120 секунд при 60 FPS
            const surgeStart = 6900; // Последние 5 секунд цикла
            const isSurge = (state.frame % surgeCycle) > surgeStart;
            if (isSurge) speed = GHOST_SURGE_SPEED;
        }

        // Применяем timeScale к скорости движения
        const moveStep = speed * timeScale;

        // ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА: ограничиваем максимальный шаг движения
        const maxMoveStep = TILE_SIZE * 0.5; // Не более половины клетки за тик
        const clampedMoveStep = Math.min(moveStep, maxMoveStep);

        // --- 3. ЛОГИКА СПОСОБНОСТЕЙ ---

        // PHANTOM
        if (g.type === 'PHANTOM') {
            g.abilityTimer -= timeScale;
            if (g.abilityTimer < 0) g.abilityTimer = 0;

            if (g.isPhasing) {
                if (g.abilityTimer <= 0) {
                    const col = Math.floor(g.x / TILE_SIZE);
                    const row = Math.floor(g.y / TILE_SIZE);
                    if (!isWall(state.grid, col, row)) {
                        g.isPhasing = false;
                        g.abilityTimer = PHANTOM_COOLDOWN;
                        g.x = snap(g.x);
                        g.y = snap(g.y);
                    } else {
                        g.abilityTimer = 5;
                    }
                }
            } else {
                if (g.abilityTimer <= 0) {
                    g.isPhasing = true;
                    g.abilityTimer = PHANTOM_PHASE_DURATION;
                    state.particles.push({
                        type: 'shockwave',
                        x: g.x,
                        y: g.y,
                        life: 20,
                        color: '#8a2be2'
                    });
                }
            }
        }

        // GLITCH
        if (g.type === 'GLITCH') {
            g.abilityTimer -= timeScale;
            if (g.abilityTimer < 0) g.abilityTimer = 0;

            if (g.abilityTimer <= 0) {
                // Телепортация
                for (let k = 0; k < 10; k++) {
                    const rx = Math.floor(Math.random() * COLS);
                    const ry = Math.floor(Math.random() * ROWS);
                    const tx = rx * TILE_SIZE + TILE_SIZE / 2;
                    const ty = ry * TILE_SIZE + TILE_SIZE / 2;
                    const dist = Math.hypot(tx - p.x, ty - p.y) / TILE_SIZE;

                    if (!isWall(state.grid, rx, ry) && dist > 6) {
                        state.particles.push({ type: 'glitch', x: g.x, y: g.y, life: 10 });
                        g.x = tx;
                        g.y = ty;
                        state.particles.push({ type: 'glitch', x: g.x, y: g.y, life: 10 });
                        g.abilityTimer = 600 + Math.random() * 300;
                        // После телепорта нужно пересчитать направление
                        const newDir = getVectorDirection(state.grid, g, p.x, p.y, false);
                        g.dirX = newDir.x;
                        g.dirY = newDir.y;
                        break;
                    }
                }
            }
        }

        // GEMINI
        if (g.type === 'GEMINI') {
            g.abilityTimer -= timeScale;
            if (g.abilityTimer < 0) g.abilityTimer = 0;

            if (g.geminiState === 'MERGED') {
                if (g.abilityTimer <= 0) {
                    g.geminiState = 'SPLIT';
                    g.abilityTimer = GEMINI_SPLIT_DURATION;

                    // Создаем клона с начальным направлением
                    const cloneDir = getVectorDirection(state.grid, g, p.x, p.y, false);
                    const clone = {
                        ...g,
                        id: Math.random(),
                        geminiState: 'SPLIT',
                        abilityTimer: GEMINI_SPLIT_DURATION,
                        partnerId: g.id,
                        dirX: cloneDir.x,
                        dirY: cloneDir.y,
                        type: 'GEMINI',
                        isClone: true
                    };
                    g.partnerId = clone.id;
                    state.ghosts.push(clone);
                }
            } else if (g.geminiState === 'SPLIT') {
                if (g.abilityTimer <= 0) {
                    g.geminiState = 'MERGING';
                }
            } else if (g.geminiState === 'MERGING') {
                const partner = state.ghosts.find(pg => pg.id === g.partnerId);
                if (partner) {
                    if (Math.hypot(g.x - partner.x, g.y - partner.y) < TILE_SIZE) {
                        if (!g.isClone) {
                            g.geminiState = 'MERGED';
                            g.abilityTimer = GEMINI_MERGED_DURATION;
                            g.partnerId = null;
                        } else {
                            state.ghosts.splice(i, 1);
                            continue;
                        }
                    }
                } else {
                    g.geminiState = 'MERGED';
                    g.abilityTimer = GEMINI_MERGED_DURATION;
                }
            }
        }

        // --- 4. ДВИЖЕНИЕ И ПРИНЯТИЕ РЕШЕНИЙ ---

        // ФИКС БАГА: Используем фиксированный допуск вместо moveStep + 1
        // Это предотвращает хаотичное поведение при lag spike
        const centerTolerance = Math.min(clampedMoveStep + 1, TILE_SIZE * 0.3); // Максимум 30% клетки
        const wasAtCenter = isAtCenter(g.x, g.y, centerTolerance);

        // === НОВАЯ СИСТЕМА ВИДИМОСТИ И ПАМЯТИ ===

        // Обновляем таймер памяти
        if (g.playerMemoryTimer > 0) {
            g.playerMemoryTimer -= timeScale;
            if (g.playerMemoryTimer < 0) g.playerMemoryTimer = 0;
        }

        // Обновляем таймер блуждания
        g.wanderTimer += timeScale;

        // HUNTER всегда знает где игрок
        let playerVisible = false;
        let knowsWherePlayerIs = false;

        if (g.type === 'HUNTER') {
            // Hunter всегда знает точную позицию (как Blinky в оригинальном Pac-Man)
            knowsWherePlayerIs = true;
            playerVisible = true;
        } else {
            // Остальные используют систему видимости
            playerVisible = !p.invisActive && canSeePlayer(state.grid, g.x, g.y, p.x, p.y, GHOST_VISION_RANGE);

            // Если видит - обновляем последнюю известную позицию
            if (playerVisible) {
                g.lastSeenPlayerX = p.x;
                g.lastSeenPlayerY = p.y;
                g.playerMemoryTimer = GHOST_MEMORY_DURATION;
            }

            knowsWherePlayerIs = g.playerMemoryTimer > 0;
        }

        const isChasing = knowsWherePlayerIs;

        // Принимаем решение о направлении в центре клетки или если нет направления
        if (wasAtCenter || (g.dirX === 0 && g.dirY === 0) || (g.type === 'PHANTOM' && g.isPhasing)) {
            // Снэп только если мы ДЕЙСТВИТЕЛЬНО в центре (с малым допуском)
            // и собираемся менять направление
            const isReallyAtCenter = isAtCenter(g.x, g.y, 0.5);
            if (isReallyAtCenter) {
                g.x = snap(g.x);
                g.y = snap(g.y);
            }

            let targetX = p.x;
            let targetY = p.y;
            let useAStar = true;
            let ignoreWalls = false;
            let shouldWander = false;

            // Определяем стратегию поиска пути
            if (p.invisActive > 0 && g.type !== 'HUNTER') {
                // Игрок невидим (кроме Hunter): блуждаем
                shouldWander = true;
            } else if (!isChasing) {
                // Не знаем где игрок: блуждаем
                shouldWander = true;
            } else {
                // Знаем где игрок (видим или помним)
                if (g.type === 'HUNTER') {
                    // Hunter всегда знает точную позицию
                    targetX = p.x;
                    targetY = p.y;
                } else {
                    // Остальные используют последнюю известную позицию
                    targetX = g.lastSeenPlayerX || p.x;
                    targetY = g.lastSeenPlayerY || p.y;
                }

                switch (g.type) {
                    case 'HUNTER':
                        // Hunter всегда точно знает где игрок (как Blinky)
                        targetX = p.x;
                        targetY = p.y;
                        useAStar = true;
                        break;

                    case 'GHOST':
                        // Ambusher целится впереди последней известной позиции
                        if (playerVisible) {
                            const pDir = getPlayerDirectionVector(p);
                            targetX = p.x + pDir.x * 4 * TILE_SIZE;
                            targetY = p.y + pDir.y * 4 * TILE_SIZE;
                        }
                        useAStar = true;
                        break;

                    case 'SPEEDSTER':
                        // Speedster преследует напрямую
                        if (distToPlayerTiles > 10 && !playerVisible) {
                            // Если далеко и не видит - добавляем шум
                            targetX += Math.sin(state.frame * 0.01 + g.id) * TILE_SIZE * 2;
                        }
                        useAStar = true;
                        break;

                    case 'GEMINI':
                        if (g.geminiState === 'MERGING') {
                            const partner = state.ghosts.find(pg => pg.id === g.partnerId);
                            if (partner) {
                                targetX = partner.x;
                                targetY = partner.y;
                            }
                        } else if (g.geminiState === 'SPLIT') {
                            if (g.isClone) {
                                targetX = g.lastSeenPlayerX || p.x;
                                targetY = g.lastSeenPlayerY || p.y;
                            } else {
                                targetX = g.lastSeenPlayerX || p.x;
                                targetY = g.lastSeenPlayerY || p.y;
                            }
                        } else {
                            targetX = g.lastSeenPlayerX || p.x;
                            targetY = g.lastSeenPlayerY || p.y;
                        }
                        useAStar = true;
                        break;

                    case 'PHANTOM':
                        // PHANTOM может проходить сквозь стены только когда isPhasing
                        if (g.isPhasing) {
                            targetX = g.lastSeenPlayerX || p.x;
                            targetY = g.lastSeenPlayerY || p.y;
                            useAStar = false;
                            ignoreWalls = true;
                        } else {
                            targetX = g.lastSeenPlayerX || p.x;
                            targetY = g.lastSeenPlayerY || p.y;
                            useAStar = true;
                            ignoreWalls = false;
                        }
                        break;

                    case 'GLITCH':
                        // Glitch добавляет рандом к цели
                        targetX = (g.lastSeenPlayerX || p.x) + (Math.random() - 0.5) * 2 * TILE_SIZE;
                        targetY = (g.lastSeenPlayerY || p.y) + (Math.random() - 0.5) * 2 * TILE_SIZE;
                        useAStar = true;
                        break;

                    default:
                        targetX = g.lastSeenPlayerX || p.x;
                        targetY = g.lastSeenPlayerY || p.y;
                        useAStar = true;
                        break;
                }
            }

            // Расчет следующего шага
            let bestMove = null;

            if (shouldWander) {
                // Режим блуждания - меняем направление периодически
                if (g.wanderTimer >= GHOST_WANDER_CHANGE_DIR || (g.dirX === 0 && g.dirY === 0)) {
                    bestMove = getWanderDirection(state.grid, g);
                    g.wanderTimer = 0;
                } else {
                    // Продолжаем текущее направление, но проверяем стены
                    const col = Math.floor(g.x / TILE_SIZE);
                    const row = Math.floor(g.y / TILE_SIZE);
                    const nextCol = col + g.dirX;
                    const nextRow = row + g.dirY;

                    // Если впереди стена - выбираем новое направление
                    if (isWall(state.grid, nextCol, nextRow)) {
                        bestMove = getWanderDirection(state.grid, g);
                        g.wanderTimer = 0;
                    }
                    // Иначе продолжаем в текущем направлении (bestMove остается null)
                }
            } else {
                // Режим преследования
                if (useAStar && !ignoreWalls) {
                    bestMove = getNextStepAStar(state.grid, g.x, g.y, targetX, targetY);
                }

                if (!bestMove) {
                    bestMove = getVectorDirection(state.grid, g, targetX, targetY, ignoreWalls);
                }
            }

            if (bestMove && (bestMove.x !== 0 || bestMove.y !== 0)) {
                g.dirX = bestMove.x;
                g.dirY = bestMove.y;
            }
        }

        // --- 5. ПРИМЕНЕНИЕ ДВИЖЕНИЯ ---
        if (g.dirX !== 0 || g.dirY !== 0) {
            // Проверяем, может ли призрак двигаться в выбранном направлении
            const canIgnoreWalls = g.type === 'PHANTOM' && g.isPhasing;

            // Вычисляем следующую позицию
            const nextX = g.x + g.dirX * clampedMoveStep;
            const nextY = g.y + g.dirY * clampedMoveStep;

            // Проверяем коллизию со стенами (если не игнорируем стены)
            let canMove = true;
            if (!canIgnoreWalls) {
                const checkCol = Math.floor((nextX + g.dirX * (TILE_SIZE / 2)) / TILE_SIZE);
                const checkRow = Math.floor((nextY + g.dirY * (TILE_SIZE / 2)) / TILE_SIZE);
                canMove = !isWall(state.grid, checkCol, checkRow);
            }

            if (canMove) {
                // Используем ограниченный moveStep для предотвращения рывков
                g.x = nextX;
                g.y = nextY;

                // Коррекция осей (чтобы не смещались по перпендикуляру)
                // Делаем это только если не меняем направление активно
                if (g.dirX !== 0 && !wasAtCenter) g.y = snap(g.y);
                if (g.dirY !== 0 && !wasAtCenter) g.x = snap(g.x);
            } else {
                // Если нельзя двигаться - останавливаемся и снэпимся к центру
                g.x = snap(g.x);
                g.y = snap(g.y);
                // Сбрасываем направление, чтобы на следующем тике выбрать новое
                g.dirX = 0;
                g.dirY = 0;
            }
        }

        // --- 6. КОЛЛИЗИЯ С ИГРОКОМ ---
        if (Math.hypot(g.x - p.x, g.y - p.y) < TILE_SIZE * 0.6) {
            if (p.invisActive <= 0) {
                handleGameOver();
            }
        }
    }
};
