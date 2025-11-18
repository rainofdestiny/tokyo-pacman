import { TILE_SIZE, COLS, ROWS, WALL, DOT } from './constants';

export const drawGame = (ctx, state) => {
    const width = COLS * TILE_SIZE;
    const height = ROWS * TILE_SIZE;

    // Фон
    ctx.fillStyle = '#0b0b14'; ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= width; x += TILE_SIZE) { ctx.moveTo(x, 0); ctx.lineTo(x, height); }
    for (let y = 0; y <= height; y += TILE_SIZE) { ctx.moveTo(0, y); ctx.lineTo(width, y); }
    ctx.stroke();

    const frame = state.frame;
    // Анимация только для стен
    const wallPulse = Math.sin(frame * 0.05) * 0.2 + 0.8;

    // Отрисовка карты
    state.grid.forEach((row, y) => {
        row.forEach((tile, x) => {
            const px = x * TILE_SIZE; const py = y * TILE_SIZE;
            if (tile === WALL) {
                ctx.fillStyle = '#2a2a50'; ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
                ctx.fillStyle = '#4a4a80'; ctx.fillRect(px, py, TILE_SIZE, 4);
                ctx.strokeStyle = `rgba(93, 93, 255, ${wallPulse})`;
                ctx.lineWidth = 1;
                ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
            } else if (tile === DOT) {
                ctx.beginPath();
                // ИЗМЕНЕНИЕ: Статичный размер (3) и тусклый цвет
                ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 3, 0, Math.PI * 2);
                ctx.fillStyle = '#6a3a6a'; // Темный, приглушенный фиолетовый
                ctx.fill();
            }
        });
    });

    // Призраки
    const p = state.player;
    state.ghosts.forEach(g => {
        const isStunned = g.stunTimer > 0;
        const color = isStunned ? '#555' : g.color;
        const shake = isStunned ? (Math.random() - 0.5) * 4 : 0;
        const floatY = Math.sin(frame * 0.1 + g.color.length) * 2;

        const x = g.x + shake;
        const y = g.y + shake + (isStunned ? 0 : floatY);
        const r = TILE_SIZE * 0.4;

        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(x, y - 2, r, Math.PI, 0);
        ctx.lineTo(x + r, y + r); ctx.lineTo(x - r, y + r); ctx.fill();

        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        if (isStunned) {
            ctx.beginPath();
            ctx.moveTo(x - 7, y - 6); ctx.lineTo(x - 3, y - 2); ctx.moveTo(x - 3, y - 6); ctx.lineTo(x - 7, y - 2);
            ctx.moveTo(x + 3, y - 6); ctx.lineTo(x + 7, y - 2); ctx.moveTo(x + 7, y - 6); ctx.lineTo(x + 3, y - 2);
            ctx.stroke();
        } else {
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 5, y - 4, 4, 0, Math.PI * 2); ctx.arc(x + 5, y - 4, 4, 0, Math.PI * 2); ctx.fill();
            const dx = p.x - g.x; const dy = p.y - g.y;
            const ang = Math.atan2(dy, dx);
            ctx.fillStyle = '#000'; ctx.beginPath();
            ctx.arc(x - 5 + Math.cos(ang) * 2, y - 4 + Math.sin(ang) * 2, 2, 0, Math.PI * 2);
            ctx.arc(x + 5 + Math.cos(ang) * 2, y - 4 + Math.sin(ang) * 2, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // Игрок
    if (p.invisActive > 0) ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#ffff00';
    ctx.shadowBlur = 15; ctx.shadowColor = '#ffff00';
    ctx.beginPath();
    const mouth = (Math.sin(state.frame * 0.3) + 1) * 0.2;
    ctx.arc(p.x, p.y, TILE_SIZE * 0.4, p.rotation + mouth, p.rotation + (Math.PI * 2 - mouth));
    ctx.lineTo(p.x, p.y);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;

    // Частицы
    state.particles.forEach(pt => {
        if (pt.type === 'shockwave') {
            ctx.strokeStyle = pt.color || '#fff';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(pt.x, pt.y, (60 - pt.life) * 4, 0, Math.PI * 2); ctx.stroke();
        } else {
            ctx.fillStyle = pt.color; ctx.fillRect(pt.x, pt.y, 3, 3);
        }
    });
};
