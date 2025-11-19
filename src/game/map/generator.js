import { ROWS, COLS, WALL, DOT, EMPTY } from '../../config/constants';

export const generateMaze = () => {
    let grid = Array(ROWS).fill().map(() => Array(COLS).fill(WALL));
    const dirs = [{ x: 0, y: -2 }, { x: 0, y: 2 }, { x: -2, y: 0 }, { x: 2, y: 0 }];

    const carve = (cx, cy) => {
        grid[cy][cx] = DOT;
        const shuffled = dirs.sort(() => Math.random() - 0.5);
        for (let d of shuffled) {
            const nx = cx + d.x; const ny = cy + d.y;
            if (nx > 0 && nx < COLS - 1 && ny > 0 && ny < ROWS - 1 && grid[ny][nx] === WALL) {
                grid[cy + d.y / 2][cx + d.x / 2] = DOT;
                carve(nx, ny);
            }
        }
    };
    carve(1, 1);

    const centerY = Math.floor(ROWS / 2);
    for (let x = 0; x < COLS; x++) grid[centerY][x] = DOT;
    grid[centerY][0] = EMPTY; grid[centerY][COLS - 1] = EMPTY;

    for (let y = 2; y < ROWS - 2; y++) {
        for (let x = 2; x < COLS - 2; x++) {
            if (grid[y][x] === WALL && Math.random() < 0.1) grid[y][x] = DOT;
        }
    }

    for (let x = 0; x < COLS; x++) {
        if (x === 0 || x === COLS - 1) {
            for (let y = 0; y < ROWS; y++) if (y !== centerY) grid[y][x] = WALL;
        } else {
            grid[0][x] = WALL; grid[ROWS - 1][x] = WALL;
        }
    }
    return grid;
};

export const getSafeSpawns = (grid) => {
    const emptySpots = [];
    const centerY = Math.floor(ROWS / 2);
    for (let y = 1; y < ROWS - 1; y++) {
        if (y === centerY) continue;
        for (let x = 1; x < COLS - 1; x++) {
            if (grid[y][x] === DOT) emptySpots.push({ x, y });
        }
    }

    if (emptySpots.length === 0) return { playerSpot: { x: 1, y: 1 } };

    const pIdx = Math.floor(Math.random() * emptySpots.length);
    const playerSpot = emptySpots[pIdx];
    return { playerSpot };
};
