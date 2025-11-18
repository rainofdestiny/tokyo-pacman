import { ROWS, COLS, WALL, DOT, EMPTY } from './constants';

export const generateMaze = () => {
    // 1. Заливаем стенами
    let grid = Array(ROWS).fill().map(() => Array(COLS).fill(WALL));

    // 2. Recursive Backtracker
    const dirs = [{ x: 0, y: -2 }, { x: 0, y: 2 }, { x: -2, y: 0 }, { x: 2, y: 0 }];

    const carve = (cx, cy) => {
        grid[cy][cx] = DOT;
        const shuffled = dirs.sort(() => Math.random() - 0.5);
        for (let d of shuffled) {
            const nx = cx + d.x;
            const ny = cy + d.y;
            if (nx > 0 && nx < COLS - 1 && ny > 0 && ny < ROWS - 1 && grid[ny][nx] === WALL) {
                grid[cy + d.y / 2][cx + d.x / 2] = DOT;
                carve(nx, ny);
            }
        }
    };
    carve(1, 1);

    // 3. Создаем петли (удаляем 10% стен внутри) для вариативности
    for (let y = 1; y < ROWS - 1; y++) {
        for (let x = 1; x < COLS - 1; x++) {
            if (grid[y][x] === WALL && Math.random() < 0.1) grid[y][x] = DOT;
        }
    }

    // 4. Гарантируем внешние границы
    for (let x = 0; x < COLS; x++) { grid[0][x] = WALL; grid[ROWS - 1][x] = WALL; }
    for (let y = 0; y < ROWS; y++) { grid[y][0] = WALL; grid[y][COLS - 1] = WALL; }

    return grid;
};

export const findFreeSpot = (grid) => {
    while (true) {
        let x = Math.floor(Math.random() * (COLS - 2)) + 1;
        let y = Math.floor(Math.random() * (ROWS - 2)) + 1;
        if (grid[y][x] !== WALL) return { x, y };
    }
};
