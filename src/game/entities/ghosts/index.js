import { spawnRandomGhost } from './GhostFactory';

export { spawnRandomGhost };

export const updateGhosts = (state, dt, handleGameOver) => {
    // Normalize time: constants are for 60 FPS
    // timeScale = 1.0 means "1 tick at 60 FPS"
    let timeScale = (dt || (1 / 60)) * 60;

    // Cap timeScale to avoid huge jumps
    timeScale = Math.min(timeScale, 2.0);

    for (let i = state.ghosts.length - 1; i >= 0; i--) {
        const ghost = state.ghosts[i];
        if (ghost && typeof ghost.update === 'function') {
            ghost.update(state, timeScale, handleGameOver);
        } else {
            // Fallback or error handling if ghost is not a class instance
            // This might happen if state was preserved during hot reload
            console.warn('Ghost is not an instance with update method:', ghost);
        }
    }
};
