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

    let openSet = [{ x: startCol, y: startRow, g: 0, h: 0, f: 0, firstMove: null }];
    let closedSet = new Set();
    const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
    let iterations = 0;

    while (openSet.length > 0) {
        iterations++;
        if (iterations > 800) break;

        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift();

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

            const existing = openSet.find(n => n.x === nx && n.y === ny);
            if (existing && existing.g <= gScore) continue;

            openSet.push({ x: nx, y: ny, g: gScore, h: hScore, f: fScore, firstMove: current.firstMove || d });
        }
    }
    return null;
};
