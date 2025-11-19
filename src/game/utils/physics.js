import { TILE_SIZE, COLS, ROWS, WALL } from '../../config/constants';

export const snap = (val) => Math.floor(val / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;

// Обновили: добавили аргумент canGhost (проходить сквозь стены)
export const isWall = (grid, col, row, canPassWalls = false) => {
    if (col < 0 || col >= COLS) return false;
    if (row < 0 || row >= ROWS) return true;

    // Если существу разрешено проходить стены — стена не препятствие
    if (canPassWalls) return false;

    const cell = grid[row][col];
    return cell === WALL;
};

export const isAtCenter = (x, y, speed) => {
    const mid = TILE_SIZE / 2;
    const remX = Math.abs((x % TILE_SIZE) - mid);
    const remY = Math.abs((y % TILE_SIZE) - mid);
    return remX < speed && remY < speed;
};

export const findNearestSafeSpot = (grid, targetX, targetY) => {
    let col = Math.floor(targetX / TILE_SIZE);
    let row = Math.floor(targetY / TILE_SIZE);
    col = Math.max(0, Math.min(col, COLS - 1));
    row = Math.max(0, Math.min(row, ROWS - 1));

    if (!isWall(grid, col, row)) return { x: snap(targetX), y: snap(targetY) };

    const maxRadius = 4;
    for (let r = 1; r <= maxRadius; r++) {
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                const checkCol = col + dx;
                const checkRow = row + dy;
                if (checkCol >= 0 && checkCol < COLS && checkRow >= 0 && checkRow < ROWS) {
                    if (!isWall(grid, checkCol, checkRow)) {
                        return { x: checkCol * TILE_SIZE + TILE_SIZE / 2, y: checkRow * TILE_SIZE + TILE_SIZE / 2 };
                    }
                }
            }
        }
    }
    return null;
};

export const getNextStepAStar = (grid, startX, startY, targetX, targetY) => {
    const startCol = Math.floor(startX / TILE_SIZE);
    const startRow = Math.floor(startY / TILE_SIZE);
    const targetCol = Math.floor(targetX / TILE_SIZE);
    const targetRow = Math.floor(targetY / TILE_SIZE);

    if (startCol === targetCol && startRow === targetRow) return null;

    const maxDist = Math.abs(targetCol - startCol) + Math.abs(targetRow - startRow);
    if (maxDist > 20) return null;

    let openSet = [{ x: startCol, y: startRow, g: 0, h: 0, f: 0, firstMove: null }];
    let closedSet = new Set();
    const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
    let iterations = 0;
    const maxIterations = Math.min(400, maxDist * 20);

    while (openSet.length > 0) {
        iterations++;
        if (iterations > maxIterations) break;

        let currentIndex = 0;
        let currentF = openSet[0].f;
        for (let i = 1; i < openSet.length; i++) {
            if (openSet[i].f < currentF) {
                currentF = openSet[i].f;
                currentIndex = i;
            }
        }

        const current = openSet[currentIndex];
        openSet[currentIndex] = openSet[openSet.length - 1];
        openSet.pop();

        if (current.x === targetCol && current.y === targetRow) return current.firstMove;

        closedSet.add(`${current.x},${current.y}`);

        for (let d of dirs) {
            const nx = current.x + d.x;
            const ny = current.y + d.y;
            if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) continue;

            // A* всегда учитывает стены (даже для фантома мы используем A* только когда он материален)
            if (isWall(grid, nx, ny)) continue;

            if (closedSet.has(`${nx},${ny}`)) continue;

            const gScore = current.g + 1;
            const hScore = Math.abs(nx - targetCol) + Math.abs(ny - targetRow);
            const fScore = gScore + hScore;

            let found = false;
            for (let i = 0; i < openSet.length; i++) {
                if (openSet[i].x === nx && openSet[i].y === ny) {
                    if (openSet[i].g <= gScore) {
                        found = true;
                        break;
                    }
                    openSet[i] = { x: nx, y: ny, g: gScore, h: hScore, f: fScore, firstMove: current.firstMove || d };
                    found = true;
                    break;
                }
            }

            if (!found) {
                openSet.push({ x: nx, y: ny, g: gScore, h: hScore, f: fScore, firstMove: current.firstMove || d });
            }
        }
    }
    return null;
};

// Функция выбора направления без A* (для "тупых" призраков или особых режимов)
export const getVectorDirection = (grid, g, targetX, targetY, ignoreWalls = false) => {
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
