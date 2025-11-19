import { Ghost } from '../Ghost';
import { getNextStepAStar } from '../../../utils/physics';

export class Hunter extends Ghost {
    constructor(x, y, color) {
        super(x, y, 'HUNTER', color);
    }

    updateMemory(state, timeScale) {
        // Hunter always knows where the player is
        const p = state.player;
        this.lastSeenPlayerX = p.x;
        this.lastSeenPlayerY = p.y;
        this.playerMemoryTimer = 180; // Always max memory
        this.isChasing = true;
        this.wanderTimer += timeScale;
    }

    getChaseStep(state, targetX, targetY) {
        // Hunter uses A* for optimal pathfinding since he always knows player location
        return getNextStepAStar(state.grid, this.x, this.y, targetX, targetY);
    }
}
