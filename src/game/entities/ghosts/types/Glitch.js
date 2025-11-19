import { Ghost } from '../Ghost';
import { COLS, ROWS, TILE_SIZE } from '../../../../config/constants';
import { isWall, getVectorDirection, getNextStepAStar } from '../../../utils/physics';

export class Glitch extends Ghost {
    constructor(x, y, color) {
        super(x, y, 'GLITCH', color);
        this.abilityTimer = 180; // Initial timer
    }

    handleAbilityTimer(state, timeScale) {
        if (this.abilityTimer > 0) {
            this.abilityTimer -= timeScale;
            if (this.abilityTimer < 0) this.abilityTimer = 0;
        }

        if (this.abilityTimer <= 0 && !this.isChasing) {
            const p = state.player;
            // Teleportation
            for (let k = 0; k < 10; k++) {
                const rx = Math.floor(Math.random() * COLS);
                const ry = Math.floor(Math.random() * ROWS);
                const tx = rx * TILE_SIZE + TILE_SIZE / 2;
                const ty = ry * TILE_SIZE + TILE_SIZE / 2;
                const dist = Math.hypot(tx - p.x, ty - p.y) / TILE_SIZE;

                if (!isWall(state.grid, rx, ry) && dist > 6) {
                    state.particles.push({ type: 'glitch', x: this.x, y: this.y, life: 10 });
                    this.x = tx;
                    this.y = ty;
                    state.particles.push({ type: 'glitch', x: this.x, y: this.y, life: 10 });
                    this.abilityTimer = 600 + Math.random() * 300;

                    // Recalculate direction after teleport
                    const newDir = getVectorDirection(state.grid, this, p.x, p.y, false);
                    this.dirX = newDir.x;
                    this.dirY = newDir.y;
                    break;
                }
            }
        }
    }

    getChaseStep(state, targetX, targetY) {
        // Glitch adds random jitter to target
        const jitterX = targetX + (Math.random() - 0.5) * 2 * TILE_SIZE;
        const jitterY = targetY + (Math.random() - 0.5) * 2 * TILE_SIZE;

        return getNextStepAStar(state.grid, this.x, this.y, jitterX, jitterY);
    }
}
