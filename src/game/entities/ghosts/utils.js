import { TILE_SIZE } from '../../../config/constants';
import { isWall } from '../../utils/physics';

// Проверка видимости игрока призраком (line of sight)
// Проверка видимости игрока призраком (line of sight)
export const canSeePlayer = (grid, ghostX, ghostY, playerX, playerY, visionRange) => {
    const gCol = Math.floor(ghostX / TILE_SIZE);
    const gRow = Math.floor(ghostY / TILE_SIZE);
    const pCol = Math.floor(playerX / TILE_SIZE);
    const pRow = Math.floor(playerY / TILE_SIZE);

    // 1. Проверяем дистанцию
    const distInTiles = Math.hypot(pCol - gCol, pRow - gRow);
    if (distInTiles > visionRange) return false;

    // 2. Проверяем line of sight (Raycasting)
    // Используем алгоритм Брезенхема или просто шагаем по вектору с малым шагом
    const dx = pCol - gCol;
    const dy = pRow - gRow;
    const steps = Math.max(Math.abs(dx), Math.abs(dy)) * 2; // 2 проверки на тайл для точности

    for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const checkCol = Math.round(gCol + dx * t);
        const checkRow = Math.round(gRow + dy * t);

        if (isWall(grid, checkCol, checkRow)) {
            return false; // Стена блокирует обзор
        }
    }

    return true; // Видит игрока!
};

// Функция для блуждания (случайное направление)
export const getWanderDirection = (grid, g) => {
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
export const getPlayerDirectionVector = (player) => {
    if (player.dirX !== 0) return { x: Math.sign(player.dirX), y: 0 };
    if (player.dirY !== 0) return { x: 0, y: Math.sign(player.dirY) };
    return { x: 0, y: 0 };
};

