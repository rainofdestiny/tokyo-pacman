import { Ghost } from '../Ghost';
import { PACMAN_SPEED, GHOST_SURGE_SPEED, GHOST_BASE_SPEED, TILE_SIZE, SPEEDSTER_CLOSE_DISTANCE, SPEEDSTER_MEDIUM_DISTANCE, SPEEDSTER_SLOW_MULTIPLIER } from '../../../../config/constants';
import { getNextStepAStar } from '../../../utils/physics';

export class Speedster extends Ghost {
    constructor(x, y, color) {
        super(x, y, 'SPEEDSTER', color);
        this.burstTimer = 0;
        this.isBursting = false;
    }

    update(state, timeScale, handleGameOver) {
        super.update(state, timeScale, handleGameOver);

        // Exploration bursts every 8-10 seconds
        this.burstTimer += timeScale;
        const burstInterval = 480 + Math.random() * 120; // 8-10 seconds

        if (this.burstTimer >= burstInterval && !this.isChasing) {
            this.isBursting = true;
            this.burstTimer = 0;
        }

        if (this.isBursting) {
            if (this.burstTimer >= 120) { // 2 seconds burst
                this.isBursting = false;
                this.burstTimer = 0;
            }
        }

        // Add trail effect if moving fast
        const speed = this.calculateSpeed(state);
        if (speed >= GHOST_SURGE_SPEED && (this.dirX !== 0 || this.dirY !== 0)) {
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
        const memoryState = this.getMemoryState();

        // Exploration burst
        if (this.isBursting) {
            return GHOST_SURGE_SPEED;
        }

        // Chase behavior with memory modulation
        if (this.isChasing) {
            if (memoryState === 'SEEING') {
                if (distToPlayerTiles < SPEEDSTER_CLOSE_DISTANCE) {
                    return PACMAN_SPEED;
                } else if (distToPlayerTiles < SPEEDSTER_MEDIUM_DISTANCE) {
                    return GHOST_SURGE_SPEED;
                }
            } else if (memoryState === 'RECENT') {
                return GHOST_BASE_SPEED;
            } else if (memoryState === 'FADING') {
                return GHOST_BASE_SPEED * 0.8;
            }
        }

        return GHOST_BASE_SPEED * SPEEDSTER_SLOW_MULTIPLIER;
    }

    getChaseStep(state, targetX, targetY) {
        return getNextStepAStar(state.grid, this.x, this.y, targetX, targetY);
    }
}
