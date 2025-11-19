import { Ghost } from '../Ghost';
import { getNextStepAStar } from '../../../utils/physics';

export class Ambusher extends Ghost {
    constructor(x, y, color) {
        super(x, y, 'GHOST', color);
    }

    getChaseStep(state, targetX, targetY) {
        // Simple direct chase - no prediction
        return getNextStepAStar(state.grid, this.x, this.y, targetX, targetY);
    }
}
