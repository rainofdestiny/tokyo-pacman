import { TILE_SIZE, COLS, ROWS, WALL, DOT, TEMP_WALL } from '../config/constants';

export const drawGame = (ctx, state) => {
    const width = COLS * TILE_SIZE;
    const height = ROWS * TILE_SIZE;

    ctx.fillStyle = '#0b0b14'; ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= width; x += TILE_SIZE) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
    for (let y = 0; y <= height; y += TILE_SIZE) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
    ctx.stroke();

    const frame = state.frame;
    const wallPulse = Math.sin(frame * 0.05) * 0.2 + 0.8;

    state.grid.forEach((row, y) => {
        row.forEach((tile, x) => {
            const px = x * TILE_SIZE; const py = y * TILE_SIZE;
            if (tile === WALL) {
                ctx.fillStyle = '#2a2a50'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                ctx.fillStyle = '#4a4a80'; ctx.fillRect(px, py, TILE_SIZE, 4);
                ctx.strokeStyle = `rgba(93, 93, 255, ${wallPulse})`; ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
                // } else if (tile === TEMP_WALL) {
                //     ctx.fillStyle = 'rgba(255, 50, 50, 0.4)'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                //     ctx.strokeStyle = '#ff0000'; ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
            } else if (tile === DOT) {
                ctx.beginPath(); ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 3, 0, Math.PI * 2);
                ctx.fillStyle = '#6a3a6a'; ctx.fill();
            }
        });
        state.ghosts.forEach(g => {
            // ...
            if (g.type === 'PHANTOM' && g.isPhasing) {
                ctx.globalAlpha = 0.5; // Призрак!
            } else {
                ctx.globalAlpha = 1.0;
            }
            // ... отрисовка призрака ...
            ctx.globalAlpha = 1.0; // Сброс
        });
    });

    const p = state.player;
    state.ghosts.forEach(g => {
        const isStunned = g.stunTimer > 0;
        const isChasing = g.type === 'HUNTER' || (g.playerMemoryTimer && g.playerMemoryTimer > 0);

        // Цвет зависит от состояния: оглушен -> серый, блуждает -> затемненный, преследует -> яркий
        let color = g.color;
        if (isStunned) {
            color = '#555';
        } else if (!isChasing) {
            // Блуждающий призрак - затемненный цвет
            ctx.globalAlpha = 0.6;
        }

        const shake = isStunned ? (Math.random() - 0.5) * 4 : 0;
        const floatY = Math.sin(frame * 0.1 + (g.color ? g.color.length : 0)) * 2;
        const x = g.x + shake; const y = g.y + shake + (isStunned ? 0 : floatY); const r = TILE_SIZE * 0.4;

        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(x, y - 2, r, Math.PI, 0); ctx.lineTo(x + r, y + r); ctx.lineTo(x - r, y + r); ctx.fill();

        // Индикатор состояния - маленький кружок над призраком
        if (!isStunned && isChasing) {
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(x, y - r - 4, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        if (isStunned) {
            ctx.beginPath(); ctx.moveTo(x - 7, y - 6); ctx.lineTo(x - 3, y - 2); ctx.moveTo(x - 3, y - 6); ctx.lineTo(x - 7, y - 2);
            ctx.moveTo(x + 3, y - 6); ctx.lineTo(x + 7, y - 2); ctx.moveTo(x + 7, y - 6); ctx.lineTo(x + 3, y - 2); ctx.stroke();
        } else {
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 5, y - 4, 4, 0, Math.PI * 2); ctx.arc(x + 5, y - 4, 4, 0, Math.PI * 2); ctx.fill();

            // Глаза смотрят на игрока только если преследуют
            let ang;
            if (isChasing) {
                const dx = p.x - g.x; const dy = p.y - g.y;
                ang = Math.atan2(dy, dx);
            } else {
                // При блуждании глаза смотрят по направлению движения
                ang = Math.atan2(g.dirY, g.dirX);
            }

            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(x - 5 + Math.cos(ang) * 2, y - 4 + Math.sin(ang) * 2, 2, 0, Math.PI * 2); ctx.arc(x + 5 + Math.cos(ang) * 2, y - 4 + Math.sin(ang) * 2, 2, 0, Math.PI * 2); ctx.fill();
        }

        ctx.globalAlpha = 1.0; // Сброс прозрачности
    });

    if (p.invisActive > 0) ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#ffff00'; ctx.shadowBlur = 15; ctx.shadowColor = '#ffff00';
    ctx.beginPath();
    const mouth = (Math.sin(state.frame * 0.3) + 1) * 0.2;
    ctx.arc(p.x, p.y, TILE_SIZE * 0.4, p.rotation + mouth, p.rotation + (Math.PI * 2 - mouth));
    ctx.lineTo(p.x, p.y); ctx.fill(); ctx.shadowBlur = 0; ctx.globalAlpha = 1.0;

    state.particles.forEach(pt => {
        if (pt.type === 'shockwave') {
            ctx.strokeStyle = pt.color || '#fff'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(pt.x, pt.y, (60 - pt.life) * 4, 0, Math.PI * 2); ctx.stroke();
        } else {
            ctx.fillStyle = pt.color; ctx.fillRect(pt.x, pt.y, 3, 3);
        }
    });
};
