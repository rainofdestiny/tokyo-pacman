import { Ghost } from '../Ghost';
import { GEMINI_SPLIT_DURATION, GEMINI_MERGED_DURATION, TILE_SIZE } from '../../../../config/constants';
import { getNextStepAStar, getVectorDirection, isWall } from '../../../utils/physics';

export class Gemini extends Ghost {
    constructor(x, y, color) {
        super(x, y, 'GEMINI', color);
        this.geminiState = 'MERGED'; // 'MERGED' or 'SPLIT'
        this.abilityTimer = 180; // Start with 3s cooldown to prevent instant split
        this.partnerId = null;
        this.isClone = false;
    }

    updateMemory(state, timeScale) {
        // 1. Update timers
        this.wanderTimer += timeScale;

        // 2. Strict Vision Check (Override Ghost.js)
        const p = state.player;
        // Use canSeePlayer from utils (imported via Ghost.js or directly)
        // Since we can't easily import here without changing top, we assume super.updateMemory does the check
        // BUT super sets a timer. We want INSTANT loss.

        // Let's do our own check.
        // We need to import canSeePlayer or use the one from super if possible.
        // Ghost.js uses 'canSeePlayer' from './utils'.
        // We can't access it easily unless we import it.
        // Let's assume we can import it.
        // Wait, I can't add imports easily.
        // I will use super.updateMemory but then override the result.

        super.updateMemory(state, timeScale);

        // If timer is max (meaning we just saw them), keep it.
        // If timer is decaying (meaning we lost them), CLEAR IT IMMEDIATELY.
        // GHOST_MEMORY_DURATION is 180.
        // We use < 180 to ensure that if we didn't see them THIS FRAME (timer would be 180), we forget.
        if (this.playerMemoryTimer < 180) {
            // We lost sight (even for 1 frame)
            this.lastSeenPlayerX = null;
            this.lastSeenPlayerY = null;
            this.playerMemoryTimer = 0;
            this.isChasing = false;
        }

        // 3. Shared Vision (only if SPLIT)
        if (this.geminiState === 'SPLIT' && this.partnerId) {
            const partner = state.ghosts.find(pg => pg.id === this.partnerId);
            if (partner) {
                // If partner sees player (timer is max), I see player
                // Partner must see them RIGHT NOW (timer > 179)
                if (partner.playerMemoryTimer > 179) {
                    this.lastSeenPlayerX = partner.lastSeenPlayerX;
                    this.lastSeenPlayerY = partner.lastSeenPlayerY;
                    this.playerMemoryTimer = partner.playerMemoryTimer;
                    this.isChasing = true;
                }
                // If partner ALSO doesn't see (timer < 180), and I don't see
                // Then we both have null targets (handled by local check above)
            }
        }
    }

    handleAbilityTimer(state, timeScale) {
        // Only handles cooldown decrement
        if (this.abilityTimer > 0) {
            this.abilityTimer -= timeScale;
            if (this.abilityTimer < 0) this.abilityTimer = 0;
        }
    }

    decideDirection(state) {
        // 0. Anti-Stuck Override (Inherited from Ghost)
        if (this.checkStuck(state, 1)) {
            if (this.dirX === 0 && this.dirY === 0) {
                // Import getWanderDirection if needed, or just use random valid dir
                // Since we can't easily import here without changing top of file, 
                // let's rely on the fact that checkStuck sets forceUnstuckTimer
                // and we can just pick a random direction here or let super handle it if we called super.
                // But we are overriding. Let's just pick a random valid neighbor.
                const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
                const validDirs = dirs.filter(d => !isWall(state.grid, Math.floor((this.x + d.x * TILE_SIZE) / TILE_SIZE), Math.floor((this.y + d.y * TILE_SIZE) / TILE_SIZE)));
                if (validDirs.length > 0) {
                    const move = validDirs[Math.floor(Math.random() * validDirs.length)];
                    this.dirX = move.x;
                    this.dirY = move.y;
                }
            }
            return;
        }

        const p = state.player;

        // --- STATE: MERGED ---
        if (this.geminiState === 'MERGED') {
            // Standard Ghost Behavior (Wander or Chase)
            super.decideDirection(state);

            // Check for Split Condition
            // 1. Can see player
            // 2. Cooldown ready
            if (this.isChasing && this.abilityTimer <= 0) {
                this.split(state);
            }
        }

        // --- STATE: SPLIT ---
        else if (this.geminiState === 'SPLIT') {
            let targetX = null;
            let targetY = null;

            // Case 1: Chase Player (if visible/remembered)
            if (this.isChasing) {
                targetX = this.lastSeenPlayerX;
                targetY = this.lastSeenPlayerY;
            }
            // Case 2: Merge (Chase Partner)
            else {
                const partner = state.ghosts.find(pg => pg.id === this.partnerId);
                if (partner) {
                    targetX = partner.x;
                    targetY = partner.y;

                    // Check for Merge Condition (Touch Partner)
                    const dist = Math.hypot(this.x - partner.x, this.y - partner.y);
                    if (dist < TILE_SIZE) {
                        this.merge(state, partner);
                        return; // Stop moving this frame after merge
                    }
                } else {
                    // Partner missing (error state), revert to MERGED
                    this.geminiState = 'MERGED';
                    this.partnerId = null;
                    super.decideDirection(state);
                    return;
                }
            }

            // Execute Move
            if (targetX !== null && targetY !== null) {
                const bestMove = this.getChaseStep(state, targetX, targetY);
                if (bestMove && (bestMove.x !== 0 || bestMove.y !== 0)) {
                    this.dirX = bestMove.x;
                    this.dirY = bestMove.y;
                }
            } else {
                // No target (shouldn't happen if partner exists), wander
                super.decideDirection(state);
            }
        }
    }

    split(state) {
        const p = state.player;

        // Find a valid neighbor tile for the clone
        // This prevents them from stacking perfectly and looking like one ghost
        const dirs = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
        let spawnX = this.x;
        let spawnY = this.y;

        for (let d of dirs) {
            const checkX = this.x + d.x * TILE_SIZE;
            const checkY = this.y + d.y * TILE_SIZE;
            const col = Math.floor(checkX / TILE_SIZE);
            const row = Math.floor(checkY / TILE_SIZE);

            if (!isWall(state.grid, col, row)) {
                spawnX = checkX;
                spawnY = checkY;
                break;
            }
        }

        // Create Clone at the found position
        const clone = new this.constructor(spawnX, spawnY, this.color);
        clone.id = Math.random();
        clone.geminiState = 'SPLIT';
        clone.partnerId = this.id;
        clone.isClone = true;
        clone.isChasing = true;
        clone.lastSeenPlayerX = this.lastSeenPlayerX;
        clone.lastSeenPlayerY = this.lastSeenPlayerY;
        clone.playerMemoryTimer = this.playerMemoryTimer;

        // Set Self to SPLIT
        this.geminiState = 'SPLIT';
        this.partnerId = clone.id;

        // Add Clone to Game
        state.ghosts.push(clone);
    }

    merge(state, partner) {
        if (this.isClone) {
            // I am the clone, I disappear
            const index = state.ghosts.indexOf(this);
            if (index > -1) state.ghosts.splice(index, 1);
        } else {
            // I am the original, I become MERGED
            this.geminiState = 'MERGED';
            this.partnerId = null;
            this.abilityTimer = 180; // 3 seconds cooldown after merge

            // Partner (clone) will remove itself when it runs its update and sees I am MERGED? 
            // Actually, better if the one detecting the merge handles both.
            // But since we don't know execution order, let's handle it safely.

            // If I am original, I remove the partner from the list
            const index = state.ghosts.indexOf(partner);
            if (index > -1) state.ghosts.splice(index, 1);
        }
    }

    getChaseStep(state, targetX, targetY) {
        // Pure pathfinding, no logic
        let bestMove = getNextStepAStar(state.grid, this.x, this.y, targetX, targetY);
        if (!bestMove) {
            bestMove = getVectorDirection(state.grid, this, targetX, targetY, false);
        }
        return bestMove;
    }
}
