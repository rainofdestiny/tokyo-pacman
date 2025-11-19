import {
    TILE_SIZE,
    GHOST_BASE_SPEED, GHOST_SURGE_SPEED,
    GHOST_VISION_RANGE, GHOST_MEMORY_DURATION, GHOST_WANDER_CHANGE_DIR
} from '../../../config/constants';
import { snap, isWall, isAtCenter, getNextStepAStar, getVectorDirection } from '../../utils/physics';
import { canSeePlayer, getWanderDirection } from './utils';

export class Ghost {
    constructor(x, y, type, color) {
        this.id = Math.random();
        this.type = type;
        this.color = color;
        this.x = x;
        this.y = y;
        this.dirX = 0;
        this.dirY = 0;
        this.stunTimer = 0;
        this.abilityTimer = 0;

        this.lastSeenPlayerX = null;
        this.lastSeenPlayerY = null;
        this.playerMemoryTimer = 0;
        this.wanderTimer = 0;
        this.pathOffset = Math.random() * 100;

        this.isChasing = false;

        this.cachedPath = null;
        this.pathTarget = null;
        this.pathRecalcTimer = 0;
        this.visionCheckTimer = 0;
    }

    update(state, timeScale, handleGameOver) {
        // 1. Timers
        if (this.stunTimer > 0) {
            this.stunTimer -= timeScale;
            if (this.stunTimer < 0) this.stunTimer = 0;
            return; // Stunned
        }

        this.handleAbilityTimer(state, timeScale);

        // Tunneling
        const mapWidth = state.grid[0].length * TILE_SIZE;
        if (this.x < -10) this.x = mapWidth + 10;
        else if (this.x > mapWidth + 10) this.x = -10;

        // 2. Speed
        const speed = this.calculateSpeed(state);
        const moveStep = speed * timeScale;
        const maxMoveStep = TILE_SIZE * 0.5;
        const clampedMoveStep = Math.min(moveStep, maxMoveStep);

        // 3. Movement & Decision
        const centerTolerance = Math.min(clampedMoveStep + 1, TILE_SIZE * 0.3);
        const wasAtCenter = isAtCenter(this.x, this.y, centerTolerance);

        // Memory & Vision
        this.updateMemory(state, timeScale);

        if (wasAtCenter || (this.dirX === 0 && this.dirY === 0) || this.shouldCheckDirection()) {
            if (isAtCenter(this.x, this.y, 0.5)) {
                this.x = snap(this.x);
                this.y = snap(this.y);
            }
            this.decideDirection(state);
        }

        // 4. Apply Movement
        this.move(state, clampedMoveStep, wasAtCenter);

        // 5. Collision
        this.checkPlayerCollision(state, handleGameOver);
    }

    handleAbilityTimer(state, timeScale) {
        if (this.abilityTimer > 0) {
            this.abilityTimer -= timeScale;
            if (this.abilityTimer < 0) this.abilityTimer = 0;
        }
    }

    shouldCheckDirection() {
        return false;
    }

    getMemoryState() {
        const timer = this.playerMemoryTimer;
        if (timer > 120) return 'SEEING'; // 0-60 frames since lost sight
        if (timer > 60) return 'RECENT'; // 60-120 frames
        if (timer > 0) return 'FADING'; // 120-180 frames
        return 'LOST'; // 180+ frames
    }

    calculateSpeed(state) {
        const memoryState = this.getMemoryState();

        // Base speed modulation based on memory
        let speedMultiplier = 1.0;
        if (memoryState === 'FADING') {
            speedMultiplier = 0.7;
        } else if (memoryState === 'LOST') {
            speedMultiplier = 0.5;
        }

        const surgeCycle = 7200;
        const surgeStart = 6900;
        const isSurge = (state.frame % surgeCycle) > surgeStart;
        const baseSpeed = isSurge ? GHOST_SURGE_SPEED : GHOST_BASE_SPEED;

        return baseSpeed * speedMultiplier;
    }

    updateMemory(state, timeScale) {
        const p = state.player;

        // Instantly forget player if they become invisible
        if (p.invisActive) {
            this.playerMemoryTimer = 0;
            this.lastSeenPlayerX = null;
            this.lastSeenPlayerY = null;
            this.isChasing = false;
            this.wanderTimer += timeScale;
            return;
        }

        if (this.playerMemoryTimer > 0) {
            this.playerMemoryTimer -= timeScale;
            if (this.playerMemoryTimer < 0) this.playerMemoryTimer = 0;
        }
        this.wanderTimer += timeScale;

        this.visionCheckTimer++;
        const VISION_CHECK_INTERVAL = 3;

        if (this.visionCheckTimer >= VISION_CHECK_INTERVAL) {
            this.visionCheckTimer = 0;

            const dist = Math.hypot(this.x - p.x, this.y - p.y);

            if (dist > GHOST_VISION_RANGE * TILE_SIZE) {
                this.isChasing = this.playerMemoryTimer > 0;
                return;
            }

            const visible = canSeePlayer(state.grid, this.x, this.y, p.x, p.y, GHOST_VISION_RANGE);

            if (visible) {
                this.lastSeenPlayerX = p.x;
                this.lastSeenPlayerY = p.y;
                this.playerMemoryTimer = GHOST_MEMORY_DURATION;
            }
        }

        this.isChasing = this.playerMemoryTimer > 0;
    }

    checkStuck(state, timeScale) {
        // Initialize stuck tracking if not present
        if (typeof this.stuckCheckTimer === 'undefined') {
            this.stuckCheckTimer = 0;
            this.lastStuckX = this.x;
            this.lastStuckY = this.y;
            this.forceUnstuckTimer = 0;
        }

        if (this.forceUnstuckTimer > 0) {
            this.forceUnstuckTimer -= timeScale;
            return true; // Currently forcing unstuck
        }

        this.stuckCheckTimer += timeScale;
        if (this.stuckCheckTimer > 60) { // Check every ~1 second
            const dist = Math.hypot(this.x - this.lastStuckX, this.y - this.lastStuckY);
            if (dist < TILE_SIZE * 0.5 && this.isChasing) {
                // Stuck detected! Force random move
                this.forceUnstuckTimer = 45; // Force random move for ~0.75s
                this.dirX = 0;
                this.dirY = 0; // Reset direction to force new decision
            }
            this.stuckCheckTimer = 0;
            this.lastStuckX = this.x;
            this.lastStuckY = this.y;
        }
        return false;
    }

    decideDirection(state) {
        // 0. Anti-Stuck Override
        if (this.checkStuck(state, 1)) { // Using 1 as timeScale approximation for logic check
            if (this.dirX === 0 && this.dirY === 0) {
                const move = getWanderDirection(state.grid, this);
                if (move) {
                    this.dirX = move.x;
                    this.dirY = move.y;
                }
            }
            return;
        }

        const p = state.player;
        let targetX = p.x;
        let targetY = p.y;
        let shouldWander = false;

        if (p.invisActive > 0) {
            shouldWander = true;
        } else if (!this.isChasing) {
            shouldWander = true;
        } else {
            targetX = this.lastSeenPlayerX || p.x;
            targetY = this.lastSeenPlayerY || p.y;
        }

        let bestMove = null;

        if (shouldWander) {
            if (this.wanderTimer >= GHOST_WANDER_CHANGE_DIR || (this.dirX === 0 && this.dirY === 0)) {
                bestMove = getWanderDirection(state.grid, this);
                this.wanderTimer = 0;
            } else {
                // Continue current direction but check for walls
                const col = Math.floor(this.x / TILE_SIZE);
                const row = Math.floor(this.y / TILE_SIZE);
                if (isWall(state.grid, col + this.dirX, row + this.dirY)) {
                    bestMove = getWanderDirection(state.grid, this);
                    this.wanderTimer = 0;
                }
            }
        } else {
            // Chase logic
            bestMove = this.getChaseStep(state, targetX, targetY);
        }

        if (bestMove && (bestMove.x !== 0 || bestMove.y !== 0)) {
            this.dirX = bestMove.x;
            this.dirY = bestMove.y;
        }
    }

    getChaseStep(state, targetX, targetY) {
        const RECALC_INTERVAL = 15;

        const targetMoved = !this.pathTarget ||
            Math.abs(this.pathTarget.x - targetX) > TILE_SIZE * 2 ||
            Math.abs(this.pathTarget.y - targetY) > TILE_SIZE * 2;

        if (!this.cachedPath || targetMoved || this.pathRecalcTimer <= 0) {
            this.cachedPath = getNextStepAStar(state.grid, this.x, this.y, targetX, targetY);
            this.pathTarget = { x: targetX, y: targetY };
            this.pathRecalcTimer = RECALC_INTERVAL;
        } else {
            this.pathRecalcTimer--;
        }

        let bestMove = this.cachedPath;
        if (!bestMove) {
            bestMove = getVectorDirection(state.grid, this, targetX, targetY, false);
        }
        return bestMove;
    }

    move(state, moveStep, wasAtCenter) {
        if (this.dirX !== 0 || this.dirY !== 0) {
            const nextX = this.x + this.dirX * moveStep;
            const nextY = this.y + this.dirY * moveStep;

            const checkCol = Math.floor((nextX + this.dirX * (TILE_SIZE / 2)) / TILE_SIZE);
            const checkRow = Math.floor((nextY + this.dirY * (TILE_SIZE / 2)) / TILE_SIZE);

            if (!isWall(state.grid, checkCol, checkRow)) {
                this.x = nextX;
                this.y = nextY;

                if (this.dirX !== 0 && !wasAtCenter) this.y = snap(this.y);
                if (this.dirY !== 0 && !wasAtCenter) this.x = snap(this.x);
            } else {
                this.x = snap(this.x);
                this.y = snap(this.y);
                this.dirX = 0;
                this.dirY = 0;
            }
        }
    }

    checkPlayerCollision(state, handleGameOver) {
        const p = state.player;
        if (Math.hypot(this.x - p.x, this.y - p.y) < TILE_SIZE * 0.6) {
            if (p.invisActive <= 0) {
                handleGameOver();
            }
        }
    }
}
