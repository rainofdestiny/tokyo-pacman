import { Ghost } from '../Ghost';
import { PACMAN_SPEED, GHOST_SURGE_SPEED, GHOST_BASE_SPEED, TILE_SIZE } from '../../../../config/constants';
import { getNextStepAStar } from '../../../utils/physics';

export class Speedster extends Ghost {
    constructor(x, y, color) {
        super(x, y, 'SPEEDSTER', color);
    }

    update(state, timeScale, handleGameOver) {
        super.update(state, timeScale, handleGameOver);

        // Add trail effect if moving fast
        const speed = this.calculateSpeed(state);
        if (speed >= GHOST_SURGE_SPEED && (this.dirX !== 0 || this.dirY !== 0)) {
            // Spawn trail particles (Afterimages)
            // Spawn less frequently than particles to avoid clutter
            if (state.frame % 5 === 0) {
                state.particles.push({
                    type: 'afterimage',
                    x: this.x,
                    y: this.y,
                    life: 20,
                    maxLife: 20,
                    color: this.color
                });
            }
        }
    }

    calculateSpeed(state) {
        const p = state.player;
        const distToPlayerPixels = Math.hypot(this.x - p.x, this.y - p.y);
        const distToPlayerTiles = distToPlayerPixels / TILE_SIZE;

        if (distToPlayerTiles < 3) {
            return PACMAN_SPEED;
        } else if (distToPlayerTiles < 10) {
            return GHOST_SURGE_SPEED;
        } else {
            return GHOST_BASE_SPEED * 0.75;
        }
    }

    getChaseStep(state, targetX, targetY) {
        const p = state.player;
        const distToPlayerPixels = Math.hypot(this.x - p.x, this.y - p.y);
        const distToPlayerTiles = distToPlayerPixels / TILE_SIZE;

        // If far and not visible (though getChaseStep implies chasing, so we check visibility separately or just distance)
        // The original logic was: if (distToPlayerTiles > 10 && !playerVisible)
        // But here targetX/Y is already set.
        // Let's stick to the original logic: add noise if far away.

        let finalTargetX = targetX;

        // We need to know if player is visible to decide on noise, 
        // but base class updateMemory sets isChasing based on memory.
        // Let's re-check visibility or just use distance for simplicity as "noise when far"
        if (distToPlayerTiles > 10) {
            finalTargetX += Math.sin(state.frame * 0.01 + this.id) * TILE_SIZE * 2;
        }

        return getNextStepAStar(state.grid, this.x, this.y, finalTargetX, targetY);
    }
}
