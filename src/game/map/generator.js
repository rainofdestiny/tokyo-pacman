import { ROWS, COLS, WALL, DOT, EMPTY } from '../../config/constants';

class UnionFind {
    constructor(size) {
        this.parent = Array(size).fill(0).map((_, i) => i);
        this.rank = Array(size).fill(0);
    }

    find(x) {
        if (this.parent[x] !== x) {
            this.parent[x] = this.find(this.parent[x]);
        }
        return this.parent[x];
    }

    union(x, y) {
        const rootX = this.find(x);
        const rootY = this.find(y);

        if (rootX === rootY) return false;

        if (this.rank[rootX] < this.rank[rootY]) {
            this.parent[rootX] = rootY;
        } else if (this.rank[rootX] > this.rank[rootY]) {
            this.parent[rootY] = rootX;
        } else {
            this.parent[rootY] = rootX;
            this.rank[rootX]++;
        }
        return true;
    }

    isConnected(x, y) {
        return this.find(x) === this.find(y);
    }
}

const DIRECTIONS = [
    { dx: 0, dy: -1, name: 'N' },
    { dx: 1, dy: 0, name: 'E' },
    { dx: 0, dy: 1, name: 'S' },
    { dx: -1, dy: 0, name: 'W' }
];

const MAX_STRAIGHT = 10;

const isValid = (grid, x, y) => {
    if (x <= 0 || x >= COLS - 1 || y <= 0 || y >= ROWS - 1) return false;
    if (grid[y][x] !== WALL) return false;

    let dotCount = 0;
    for (let dir of DIRECTIONS) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        if (nx >= 0 && nx < COLS && ny >= 0 && ny < ROWS && grid[ny][nx] === DOT) {
            dotCount++;
        }
    }

    return dotCount <= 1;
};

export const generateMaze = () => {
    let grid = Array(ROWS).fill().map(() => Array(COLS).fill(WALL));

    const cells = [];
    for (let y = 1; y < ROWS - 1; y += 2) {
        for (let x = 1; x < COLS - 1; x += 2) {
            grid[y][x] = DOT;
            cells.push({ x, y });
        }
    }

    const uf = new UnionFind(cells.length);
    const edges = [];

    for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];

        if (cell.y > 1) {
            const neighborIdx = cells.findIndex(c => c.x === cell.x && c.y === cell.y - 2);
            if (neighborIdx !== -1) {
                edges.push({ from: i, to: neighborIdx, wallX: cell.x, wallY: cell.y - 1 });
            }
        }

        if (cell.x > 1) {
            const neighborIdx = cells.findIndex(c => c.x === cell.x - 2 && c.y === cell.y);
            if (neighborIdx !== -1) {
                edges.push({ from: i, to: neighborIdx, wallX: cell.x - 1, wallY: cell.y });
            }
        }
    }

    for (let i = edges.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [edges[i], edges[j]] = [edges[j], edges[i]];
    }

    for (let edge of edges) {
        if (!uf.isConnected(edge.from, edge.to)) {
            uf.union(edge.from, edge.to);
            grid[edge.wallY][edge.wallX] = DOT;
        } else if (Math.random() < 0.15) {
            grid[edge.wallY][edge.wallX] = DOT;
        }
    }

    const centerY = Math.floor(ROWS / 2);
    const tunnelY = centerY % 2 === 0 ? centerY : centerY - 1;
    for (let x = 1; x < COLS - 1; x++) {
        grid[tunnelY][x] = DOT;
    }

    for (let x = 0; x < COLS; x++) {
        grid[0][x] = WALL;
        grid[ROWS - 1][x] = WALL;
    }
    for (let y = 0; y < ROWS; y++) {
        grid[y][0] = WALL;
        grid[y][COLS - 1] = WALL;
    }

    grid[tunnelY][0] = EMPTY;
    grid[tunnelY][COLS - 1] = EMPTY;

    return grid;
};

export const getSafeSpawns = (grid) => {
    const emptySpots = [];
    const centerY = Math.floor(ROWS / 2);

    for (let y = 1; y < ROWS - 1; y++) {
        if (Math.abs(y - centerY) < 2) continue;
        for (let x = 1; x < COLS - 1; x++) {
            if (grid[y][x] === DOT) {
                emptySpots.push({ x, y });
            }
        }
    }

    if (emptySpots.length === 0) return { playerSpot: { x: 1, y: 1 } };

    const pIdx = Math.floor(Math.random() * emptySpots.length);
    const playerSpot = emptySpots[pIdx];
    return { playerSpot };
};
