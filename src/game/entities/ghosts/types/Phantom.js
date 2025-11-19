import { Ghost } from '../Ghost';
import { PHANTOM_PHASE_DURATION, PHANTOM_COOLDOWN, GHOST_BASE_SPEED, TILE_SIZE } from '../../../../config/constants';
import { snap, isWall, getVectorDirection } from '../../../utils/physics';

export class Phantom extends Ghost {
    constructor(x, y, color) {
        super(x, y, 'PHANTOM', color);
        this.isPhasing = false;
        this.abilityTimer = PHANTOM_COOLDOWN;
    }

    handleAbilityTimer(state, timeScale) {
        if (this.abilityTimer > 0) {
            this.abilityTimer -= timeScale;
            if (this.abilityTimer < 0) this.abilityTimer = 0;
        }

        if (this.isPhasing) {
            if (this.abilityTimer <= 0) {
                const col = Math.floor(this.x / TILE_SIZE);
                const row = Math.floor(this.y / TILE_SIZE);
                if (!isWall(state.grid, col, row)) {
                    this.isPhasing = false;
                    this.abilityTimer = PHANTOM_COOLDOWN;
                    this.x = snap(this.x);
                    this.y = snap(this.y);
                } else {
                    this.abilityTimer = 5; // Retry shortly if inside wall
                }
            }
        } else {
            if (this.abilityTimer <= 0) {
                this.isPhasing = true;
                this.abilityTimer = PHANTOM_PHASE_DURATION;
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

    calculateSpeed(state) {
        if (this.isPhasing) {
            return GHOST_BASE_SPEED * 0.6;
        }
        return super.calculateSpeed(state);
    }

    shouldCheckDirection() {
        return this.isPhasing;
    }

    getChaseStep(state, targetX, targetY) {
        if (this.isPhasing) {
            // Move directly towards target ignoring walls
            // We can't use A* here because A* respects walls.
            // We can use getVectorDirection with ignoreWalls=true
            // But getVectorDirection is imported in Ghost.js, not here.
            // We need to import it or use a method from base class?
            // Base class uses getVectorDirection as fallback.
            // Let's override decideDirection or just return null here to force fallback?
            // No, getChaseStep is expected to return a move.

            // Actually, let's import getVectorDirection here too.
            // But wait, getChaseStep is called by decideDirection.
            // If we return null, decideDirection falls back to getVectorDirection.
            // So we can just return null here if phasing?
            // Let's check Ghost.js:
            // bestMove = this.getChaseStep(...)
            // if (!bestMove) bestMove = getVectorDirection(...)

            // So if we return null, it will use getVectorDirection(..., ignoreWalls=false).
            // We need ignoreWalls=true.

            // We should probably import getVectorDirection here.
            return null;
        }
        return super.getChaseStep(state, targetX, targetY);
    }

    decideDirection(state) {
        if (this.isPhasing) {
            const p = state.player;
            const targetX = this.lastSeenPlayerX || p.x;
            const targetY = this.lastSeenPlayerY || p.y;

            const bestMove = getVectorDirection(state.grid, this, targetX, targetY, true); // ignoreWalls = true

            if (bestMove && (bestMove.x !== 0 || bestMove.y !== 0)) {
                this.dirX = bestMove.x;
                this.dirY = bestMove.y;
            }
        } else {
            super.decideDirection(state);
        }
    }
}
