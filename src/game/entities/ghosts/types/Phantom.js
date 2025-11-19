import { Ghost } from '../Ghost';
import { PHANTOM_PHASE_DURATION, PHANTOM_COOLDOWN, GHOST_BASE_SPEED, TILE_SIZE, GHOST_VISION_RANGE } from '../../../../config/constants';
import { snap, isWall, getVectorDirection } from '../../../utils/physics';
import { canSeePlayer } from '../utils';

export class Phantom extends Ghost {
    constructor(x, y, color) {
        super(x, y, 'PHANTOM', color);
        this.isPhasing = false;
        this.abilityTimer = PHANTOM_COOLDOWN;
        this.scanTimer = 0;
    }

    handleAbilityTimer(state, timeScale) {
        if (this.abilityTimer > 0) {
            this.abilityTimer -= timeScale;
            if (this.abilityTimer < 0) this.abilityTimer = 0;
        }

        // Scanning mode: check for player through walls every 5 seconds
        this.scanTimer += timeScale;
        if (this.scanTimer >= 300 && !this.isPhasing && this.abilityTimer <= 0) {
            this.scanTimer = 0;
            const p = state.player;
            const distPixels = Math.hypot(this.x - p.x, this.y - p.y);
            const distTiles = distPixels / TILE_SIZE;

            // Check if player is within range
            if (distTiles <= GHOST_VISION_RANGE && !p.invisActive) {
                const directSight = canSeePlayer(state.grid, this.x, this.y, p.x, p.y, GHOST_VISION_RANGE);

                // If can't see directly but player is nearby, activate phase
                if (!directSight) {
                    this.isPhasing = true;
                    this.abilityTimer = PHANTOM_PHASE_DURATION;
                    this.lastSeenPlayerX = p.x;
                    this.lastSeenPlayerY = p.y;
                    this.playerMemoryTimer = 180;
                    this.isChasing = true;
                    state.particles.push({
                        type: 'shockwave',
                        x: this.x,
                        y: this.y,
                        life: 20,
                        color: '#8a2be2'
                    });
                }
            }
        }

        if (this.isPhasing) {
            if (this.abilityTimer <= 0) {
                const col = Math.floor(this.x / TILE_SIZE);
                const row = Math.floor(this.y / TILE_SIZE);
                if (!isWall(state.grid, col, row)) {
                    this.isPhasing = false;
                    this.abilityTimer = PHANTOM_COOLDOWN;
                    this.scanTimer = 0;
                    this.x = snap(this.x);
                    this.y = snap(this.y);
                } else {
                    this.abilityTimer = 5;
                }
            }

            // Exit phase early if memory fully fades
            const memoryState = this.getMemoryState();
            if (memoryState === 'LOST') {
                const col = Math.floor(this.x / TILE_SIZE);
                const row = Math.floor(this.y / TILE_SIZE);
                if (!isWall(state.grid, col, row)) {
                    this.isPhasing = false;
                    this.abilityTimer = PHANTOM_COOLDOWN;
                    this.scanTimer = 0;
                }
            }
        }
    }

    calculateSpeed(state) {
        if (this.isPhasing) {
            return GHOST_BASE_SPEED * 0.6;
        }
        return super.calculateSpeed(state);
    }

    decideDirection(state) {
        if (this.isPhasing) {
            // Continuously update direction toward target when phasing
            const p = state.player;
            const targetX = this.lastSeenPlayerX || p.x;
            const targetY = this.lastSeenPlayerY || p.y;

            const bestMove = getVectorDirection(state.grid, this, targetX, targetY, true);

            if (bestMove && (bestMove.x !== 0 || bestMove.y !== 0)) {
                this.dirX = bestMove.x;
                this.dirY = bestMove.y;
            }
        } else {
            super.decideDirection(state);
        }
    }

    update(state, timeScale, handleGameOver) {
        // Update direction every frame when phasing to move through walls smoothly
        if (this.isPhasing) {
            this.decideDirection(state);
        }
        super.update(state, timeScale, handleGameOver);
    }

    move(state, moveStep, wasAtCenter) {
        if (this.isPhasing) {
            // Move freely through walls when phasing
            this.x += this.dirX * moveStep;
            this.y += this.dirY * moveStep;
        } else {
            // Normal movement with wall collision
            super.move(state, moveStep, wasAtCenter);
        }
    }

    getChaseStep(state, targetX, targetY) {
        if (this.isPhasing) {
            return null;
        }
        return super.getChaseStep(state, targetX, targetY);
    }
}
