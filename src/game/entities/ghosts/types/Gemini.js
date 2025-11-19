import { Ghost } from '../Ghost';
import { GEMINI_SPLIT_DURATION, GEMINI_MERGED_DURATION, GEMINI_MERGE_DISTANCE, TILE_SIZE } from '../../../../config/constants';
import { getNextStepAStar, isWall } from '../../../utils/physics';
import { canSeePlayer } from '../utils';

export class Gemini extends Ghost {
    constructor(x, y, color) {
        super(x, y, 'GEMINI', color);
        this.state = 'MERGED';
        this.stateTimer = 0; // Ready to split immediately
        this.clone = null;
        this.isClone = false;
        this.originalGemini = null;

        // Shared memory between twins
        this.sharedMemory = {
            playerX: null,
            playerY: null,
            memoryTimer: 0,
            lastSeenBy: null
        };
    }

    updateMemory(state, timeScale) {
        const p = state.player;
        const dist = Math.hypot(this.x - p.x, this.y - p.y);

        // Get shared memory reference
        const memory = this.isClone ? this.originalGemini.sharedMemory : this.sharedMemory;

        // Update shared memory timer
        if (memory.memoryTimer > 0) {
            memory.memoryTimer -= timeScale;
            if (memory.memoryTimer < 0) memory.memoryTimer = 0;
        }

        this.wanderTimer += timeScale;

        // Check if this Gemini can see the player
        if (dist <= 10 * TILE_SIZE && !p.invisActive) {
            const visible = canSeePlayer(state.grid, this.x, this.y, p.x, p.y, 10);

            if (visible) {
                // Update shared memory
                memory.playerX = p.x;
                memory.playerY = p.y;
                memory.memoryTimer = 180;
                memory.lastSeenBy = this.isClone ? 'clone' : 'original';

                // Update own tracking
                this.lastSeenPlayerX = p.x;
                this.lastSeenPlayerY = p.y;
                this.playerMemoryTimer = 180;
                this.isChasing = true;
                return;
            }
        }

        // Use shared memory if available
        if (memory.memoryTimer > 0) {
            this.lastSeenPlayerX = memory.playerX;
            this.lastSeenPlayerY = memory.playerY;
            this.playerMemoryTimer = memory.memoryTimer;
            this.isChasing = true;
        } else {
            // Both lost the player - prepare to merge
            this.isChasing = false;
            this.playerMemoryTimer = 0;
        }
    }

    handleAbilityTimer(state, timeScale) {
        if (this.stateTimer > 0) {
            this.stateTimer -= timeScale;
            if (this.stateTimer < 0) this.stateTimer = 0;
        }

        if (this.state === 'MERGED') {
            // Check if should split when seeing player
            if (this.stateTimer <= 0 && this.isChasing && this.playerMemoryTimer > 120) {
                this.split(state);
            }
        } else if (this.state === 'SPLIT') {
            // Check if should merge
            const shouldMerge = this.stateTimer <= 0 || !this.isChasing;

            if (shouldMerge && this.clone) {
                const distToClone = Math.hypot(this.x - this.clone.x, this.y - this.clone.y) / TILE_SIZE;

                if (distToClone <= GEMINI_MERGE_DISTANCE) {
                    this.merge(state);
                }
            }
        }
    }

    split(state) {
        this.state = 'SPLIT';
        this.stateTimer = GEMINI_SPLIT_DURATION;

        // Find a position offset from current position
        const offsets = [
            { dx: 1, dy: 0 },
            { dx: -1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: 0, dy: -1 },
            { dx: 1, dy: 1 },
            { dx: -1, dy: -1 },
            { dx: 1, dy: -1 },
            { dx: -1, dy: 1 }
        ];

        let cloneX = this.x;
        let cloneY = this.y;

        for (let offset of offsets) {
            const testX = Math.floor((this.x + offset.dx * TILE_SIZE) / TILE_SIZE);
            const testY = Math.floor((this.y + offset.dy * TILE_SIZE) / TILE_SIZE);

            if (!isWall(state.grid, testX, testY)) {
                cloneX = testX * TILE_SIZE + TILE_SIZE / 2;
                cloneY = testY * TILE_SIZE + TILE_SIZE / 2;
                break;
            }
        }

        // Create clone
        this.clone = new Gemini(cloneX, cloneY, this.color);
        this.clone.isClone = true;
        this.clone.originalGemini = this;
        this.clone.state = 'SPLIT';
        this.clone.stateTimer = GEMINI_SPLIT_DURATION;
        this.clone.dirX = -this.dirX;
        this.clone.dirY = -this.dirY;

        state.ghosts.push(this.clone);

        // Particle effects
        state.particles.push({
            type: 'shockwave',
            x: this.x,
            y: this.y,
            life: 30,
            color: this.color
        });
    }

    merge(state) {
        this.state = 'MERGED';
        this.stateTimer = GEMINI_MERGED_DURATION;

        if (this.clone) {
            const cloneIndex = state.ghosts.indexOf(this.clone);
            if (cloneIndex !== -1) {
                state.ghosts.splice(cloneIndex, 1);
            }
            this.clone = null;
        }

        // Reset shared memory
        this.sharedMemory = {
            playerX: null,
            playerY: null,
            memoryTimer: 0,
            lastSeenBy: null
        };

        state.particles.push({
            type: 'shockwave',
            x: this.x,
            y: this.y,
            life: 30,
            color: this.color
        });
    }

    getChaseStep(state, targetX, targetY) {
        if (this.state === 'SPLIT' && !this.isChasing) {
            // Move toward twin to merge
            const target = this.isClone ? this.originalGemini : this.clone;
            if (target) {
                return getNextStepAStar(state.grid, this.x, this.y, target.x, target.y);
            }
        }

        if (this.isChasing && this.state === 'SPLIT') {
            // Strategic positioning: attack from different angles
            const p = state.player;

            if (this.isClone) {
                // Clone tries to flank from the side
                const angle = Math.atan2(p.y - this.y, p.x - this.x);
                const flankAngle = angle + Math.PI / 2; // 90 degrees offset
                const flankX = p.x + Math.cos(flankAngle) * 3 * TILE_SIZE;
                const flankY = p.y + Math.sin(flankAngle) * 3 * TILE_SIZE;

                return getNextStepAStar(state.grid, this.x, this.y, flankX, flankY);
            } else {
                // Original goes direct
                return getNextStepAStar(state.grid, this.x, this.y, targetX, targetY);
            }
        }

        return getNextStepAStar(state.grid, this.x, this.y, targetX, targetY);
    }

    update(state, timeScale, handleGameOver) {
        // Don't update clones that have been removed
        if (this.isClone && !this.originalGemini) {
            return;
        }

        super.update(state, timeScale, handleGameOver);
    }
}
