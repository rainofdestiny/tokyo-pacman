import { Ghost } from '../Ghost';
import { TILE_SIZE } from '../../../../config/constants';
import { getNextStepAStar } from '../../../utils/physics';
import { getPlayerDirectionVector } from '../utils';

export class Ambusher extends Ghost {
    constructor(x, y, color) {
        super(x, y, 'GHOST', color); // 'GHOST' is the type key for Ambusher in original code
    }

    getChaseStep(state, targetX, targetY) {
        const p = state.player;

        // Ambusher aims ahead of the player
        // We only do this if we are chasing (which is checked in base class before calling this)
        // But we need to know if we actually SEE the player to predict movement?
        // Original code: if (playerVisible) { predict }
        // Base class sets isChasing if playerVisible OR memory > 0.
        // Let's use isChasing as a proxy or check visibility again if needed.
        // For simplicity, if we are chasing, we try to ambush.

        const pDir = getPlayerDirectionVector(p);
        const predictedX = p.x + pDir.x * 4 * TILE_SIZE;
        const predictedY = p.y + pDir.y * 4 * TILE_SIZE;

        return getNextStepAStar(state.grid, this.x, this.y, predictedX, predictedY);
    }
}
