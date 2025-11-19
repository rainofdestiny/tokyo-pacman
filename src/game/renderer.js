import { TILE_SIZE, COLS, ROWS, WALL, DOT, TEMP_WALL } from '../config/constants';

export const drawGame = (ctx, state) => {
    const width = COLS * TILE_SIZE;
    const height = ROWS * TILE_SIZE;
    const frame = state.frame;

    ctx.fillStyle = '#0b0b14';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= width; x += TILE_SIZE) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += TILE_SIZE) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
    }
    ctx.stroke();

    const wallPulse = Math.sin(frame * 0.05) * 0.2 + 0.8;

    ctx.fillStyle = '#2a2a50';
    state.grid.forEach((row, y) => {
        row.forEach((tile, x) => {
            if (tile === WALL) {
                const px = x * TILE_SIZE;
                const py = y * TILE_SIZE;
                ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
            }
        });
    });

    ctx.fillStyle = '#4a4a80';
    state.grid.forEach((row, y) => {
        row.forEach((tile, x) => {
            if (tile === WALL) {
                const px = x * TILE_SIZE;
                const py = y * TILE_SIZE;
                ctx.fillRect(px, py, TILE_SIZE, 4);
            }
        });
    });

    ctx.strokeStyle = `rgba(93, 93, 255, ${wallPulse})`;
    state.grid.forEach((row, y) => {
        row.forEach((tile, x) => {
            if (tile === WALL) {
                const px = x * TILE_SIZE;
                const py = y * TILE_SIZE;
                ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
            }
        });
    });

    ctx.fillStyle = '#6a3a6a';
    ctx.beginPath();
    state.grid.forEach((row, y) => {
        row.forEach((tile, x) => {
            if (tile === DOT) {
                const px = x * TILE_SIZE;
                const py = y * TILE_SIZE;
                ctx.moveTo(px + TILE_SIZE / 2 + 3, py + TILE_SIZE / 2);
                ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 3, 0, Math.PI * 2);
            }
        });
    });
    ctx.fill();

    const p = state.player;
    state.ghosts.forEach(g => {
        const isStunned = g.stunTimer > 0;
        const isChasing = !p.invisActive && (g.type === 'HUNTER' || (g.playerMemoryTimer && g.playerMemoryTimer > 0));

        let color = g.color;
        let alpha = 1.0;

        if (isStunned) {
            color = '#555';
        } else if (!isChasing) {
            alpha = 0.6;
        } else if (g.type !== 'HUNTER' && g.getMemoryState) {
            const memoryState = g.getMemoryState();
            if (memoryState === 'RECENT') {
                alpha = 0.9;
            } else if (memoryState === 'FADING') {
                alpha = 0.7;
            }
        }

        ctx.globalAlpha = alpha;

        const shake = isStunned ? (Math.random() - 0.5) * 4 : 0;
        const floatY = Math.sin(frame * 0.1 + (g.color ? g.color.length : 0)) * 2;
        const x = g.x + shake;
        const y = g.y + shake + (isStunned ? 0 : floatY);
        const r = TILE_SIZE * 0.4;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y - 2, r, Math.PI, 0);
        ctx.lineTo(x + r, y + r);
        ctx.lineTo(x - r, y + r);
        ctx.fill();

        if (!isStunned && isChasing) {
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(x, y - r - 4, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        if (isStunned) {
            ctx.beginPath();
            ctx.moveTo(x - 7, y - 6);
            ctx.lineTo(x - 3, y - 2);
            ctx.moveTo(x - 3, y - 6);
            ctx.lineTo(x - 7, y - 2);
            ctx.moveTo(x + 3, y - 6);
            ctx.lineTo(x + 7, y - 2);
            ctx.moveTo(x + 7, y - 6);
            ctx.lineTo(x + 3, y - 2);
            ctx.stroke();
        } else {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(x - 5, y - 4, 4, 0, Math.PI * 2);
            ctx.arc(x + 5, y - 4, 4, 0, Math.PI * 2);
            ctx.fill();

            let ang;
            if (isChasing) {
                const dx = p.x - g.x;
                const dy = p.y - g.y;
                ang = Math.atan2(dy, dx);
            } else {
                ang = Math.atan2(g.dirY, g.dirX);
            }

            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(x - 5 + Math.cos(ang) * 2, y - 4 + Math.sin(ang) * 2, 2, 0, Math.PI * 2);
            ctx.arc(x + 5 + Math.cos(ang) * 2, y - 4 + Math.sin(ang) * 2, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.globalAlpha = 1.0;
    });

    if (p.invisActive > 0) ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#ffff00';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ffff00';
    ctx.beginPath();
    const mouth = (Math.sin(state.frame * 0.3) + 1) * 0.2;
    ctx.arc(p.x, p.y, TILE_SIZE * 0.4, p.rotation + mouth, p.rotation + (Math.PI * 2 - mouth));
    ctx.lineTo(p.x, p.y);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;

    const particleCount = state.particles.length;
    for (let i = 0; i < particleCount; i++) {
        const pt = state.particles[i];
        if (pt.type === 'shockwave') {
            const speed = pt.speed || 1;
            const maxLife = pt.life > 50 ? 60 : 50;
            ctx.strokeStyle = pt.color || '#fff';
            ctx.lineWidth = 3;
            ctx.globalAlpha = pt.life / maxLife;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, (maxLife - pt.life) * 4 * speed, 0, Math.PI * 2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
        } else if (pt.type === 'afterimage') {
            ctx.save();
            ctx.globalAlpha = (pt.life / pt.maxLife) * 0.5;
            ctx.fillStyle = pt.color;
            const r = TILE_SIZE * 0.4;
            const x = pt.x;
            const y = pt.y;

            ctx.beginPath();
            ctx.arc(x, y - 2, r, Math.PI, 0);
            ctx.lineTo(x + r, y + r);
            ctx.lineTo(x - r, y + r);
            ctx.fill();
            ctx.restore();
        } else {
            ctx.fillStyle = pt.color;
            ctx.fillRect(pt.x, pt.y, 3, 3);
        }
    }
};
