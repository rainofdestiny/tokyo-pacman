import { Ghost } from '../Ghost';

export class Hunter extends Ghost {
    constructor(x, y, color) {
        super(x, y, 'HUNTER', color);
    }

    updateMemory(state, timeScale) {
        // Hunter always knows where the player is
        const p = state.player;
        this.lastSeenPlayerX = p.x;
        this.lastSeenPlayerY = p.y;
        this.isChasing = true;
        this.wanderTimer += timeScale;
    }
}
