import { Ghost } from '../Ghost';
import { COLS, ROWS, TILE_SIZE, GLITCH_TELEPORT_COOLDOWN, GLITCH_TELEPORT_RANGE } from '../../../../config/constants';
import { isWall, getVectorDirection, getNextStepAStar } from '../../../utils/physics';
import { getPlayerDirectionVector } from '../utils';

export class Glitch extends Ghost {
    constructor(x, y, color) {
        super(x, y, 'GLITCH', color);
        this.abilityTimer = GLITCH_TELEPORT_COOLDOWN;
    }

    handleAbilityTimer(state, timeScale) {
        if (this.abilityTimer > 0) {
            this.abilityTimer -= timeScale;
            if (this.abilityTimer < 0) this.abilityTimer = 0;
        }

        if (this.abilityTimer <= 0) {
            const p = state.player;

            // Strategic teleport: try to teleport ahead of player if chasing
            if (this.isChasing && this.playerMemoryTimer > 120) {
                const pDir = getPlayerDirectionVector(p);
                const targetX = Math.floor((p.x + pDir.x * GLITCH_TELEPORT_RANGE * TILE_SIZE) / TILE_SIZE);
                const targetY = Math.floor((p.y + pDir.y * GLITCH_TELEPORT_RANGE * TILE_SIZE) / TILE_SIZE);

                // Try target position and nearby alternatives
                const attempts = [
                    { x: targetX, y: targetY },
                    { x: targetX + 1, y: targetY },
                    { x: targetX - 1, y: targetY },
                    { x: targetX, y: targetY + 1 },
                    { x: targetX, y: targetY - 1 }
                ];

                for (let attempt of attempts) {
                    if (attempt.x > 0 && attempt.x < COLS - 1 && attempt.y > 0 && attempt.y < ROWS - 1) {
                        if (!isWall(state.grid, attempt.x, attempt.y)) {
                            const dist = Math.hypot(attempt.x - p.x / TILE_SIZE, attempt.y - p.y / TILE_SIZE);
                            if (dist > 2) {
                                state.particles.push({ type: 'glitch', x: this.x, y: this.y, life: 10 });
                                this.x = attempt.x * TILE_SIZE + TILE_SIZE / 2;
                                this.y = attempt.y * TILE_SIZE + TILE_SIZE / 2;
                                state.particles.push({ type: 'glitch', x: this.x, y: this.y, life: 10 });
                                this.abilityTimer = GLITCH_TELEPORT_COOLDOWN;

                                const newDir = getVectorDirection(state.grid, this, p.x, p.y, false);
                                this.dirX = newDir.x;
                                this.dirY = newDir.y;
                                return;
                            }
                        }
                    }
                }
            }

            // Fallback: random teleport when wandering
            if (!this.isChasing) {
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
                        this.abilityTimer = GLITCH_TELEPORT_COOLDOWN;

                        const newDir = getVectorDirection(state.grid, this, p.x, p.y, false);
                        this.dirX = newDir.x;
                        this.dirY = newDir.y;
                        break;
                    }
                }
            }
        }
    }

    getChaseStep(state, targetX, targetY) {
        return getNextStepAStar(state.grid, this.x, this.y, targetX, targetY);
    }
}
