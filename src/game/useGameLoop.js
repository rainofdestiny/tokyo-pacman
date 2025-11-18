import { useEffect, useRef, useState } from 'react';
import { TILE_SIZE, COLS, ROWS, INVIS_DURATION, INVIS_COOLDOWN } from './constants';
import { generateMaze, findFreeSpot } from './mapGenerator';
import { updateGame, performDash, performEMP } from './core';
import { drawGame } from './render';

export const useGameLoop = (canvasRef) => {
    // 1. ОБЪЯВЛЕНИЕ STATE (должно быть внутри функции)
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);

    // UI States
    const [dashCD, setDashCD] = useState(0);
    const [invisCD, setInvisCD] = useState(0);
    const [empCD, setEmpCD] = useState(0);
    const [isInvis, setIsInvis] = useState(false);

    const isGameOverRef = useRef(false);
    const gameStartTimeRef = useRef(Date.now());

    const gameState = useRef({
        grid: [], frame: 0, score: 0, particles: [],
        player: { x: 0, y: 0, dirX: 0, dirY: 0, nextDirX: 0, nextDirY: 0, rotation: 0, empTimer: 0 },
        ghosts: []
    });

    // 2. ФУНКЦИИ (тоже внутри)
    const getGameDuration = () => {
        return (Date.now() - gameStartTimeRef.current) / 1000;
    };

    const initGame = () => {
        const grid = generateMaze();
        const startPos = findFreeSpot(grid);

        const ghosts = [
            { type: 'TRACKER', color: '#ff0044', x: TILE_SIZE * 1.5, y: TILE_SIZE * 1.5, dirX: 0, dirY: 0, stunTimer: 0 },
            { type: 'SPEEDSTER', color: '#00ffff', x: (COLS - 2) * TILE_SIZE + TILE_SIZE / 2, y: TILE_SIZE * 1.5, dirX: 0, dirY: 0, stunTimer: 0 },
            { type: 'AMBUSHER', color: '#ff55ff', x: TILE_SIZE * 1.5, y: (ROWS - 2) * TILE_SIZE + TILE_SIZE / 2, dirX: 0, dirY: 0, stunTimer: 0 },
            { type: 'GLITCH', color: '#ffaa00', x: (COLS - 2) * TILE_SIZE + TILE_SIZE / 2, y: (ROWS - 2) * TILE_SIZE + TILE_SIZE / 2, dirX: 0, dirY: 0, abilityTimer: 300, stunTimer: 0 },
        ];

        gameState.current = {
            grid, frame: 0, score: 0, particles: [],
            player: {
                x: startPos.x * TILE_SIZE + TILE_SIZE / 2,
                y: startPos.y * TILE_SIZE + TILE_SIZE / 2,
                dirX: 0, dirY: 0, nextDirX: 0, nextDirY: 0,
                dashTimer: 0, invisTimer: 0, invisActive: 0, empTimer: 0,
                rotation: 0
            },
            ghosts
        };

        setScore(0);
        setGameOver(false);
        isGameOverRef.current = false;
        setGameStarted(true);
        gameStartTimeRef.current = Date.now();
    };

    const handleGameOver = () => {
        if (isGameOverRef.current) return;
        isGameOverRef.current = true;
        setGameOver(true);

        const p = gameState.current.player;
        for (let i = 0; i < 30; i++) {
            gameState.current.particles.push({
                x: p.x, y: p.y,
                vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10,
                life: 60, color: '#ffff00'
            });
        }
    };

    // 3. ЭФФЕКТЫ
    useEffect(() => {
        if (!gameStarted) return;
        const ctx = canvasRef.current.getContext('2d');
        let animationId;

        const loop = () => {
            updateGame(gameState.current, setScore, handleGameOver, isGameOverRef.current);
            drawGame(ctx, gameState.current);

            const p = gameState.current.player;
            if (!isGameOverRef.current && gameState.current.frame % 10 === 0) {
                setDashCD(p.dashTimer);
                setInvisCD(p.invisTimer);
                setEmpCD(p.empTimer);
                setIsInvis(p.invisActive > 0);
            }

            animationId = requestAnimationFrame(loop);
        };
        animationId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationId);
    }, [gameStarted]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'KeyR') {
                initGame();
                return;
            }

            if (gameOver) return;
            const s = gameState.current;
            const p = s.player;

            let dx = 0; let dy = 0;

            if (e.code === 'ArrowUp' || e.code === 'KeyW') dy = -1;
            else if (e.code === 'ArrowDown' || e.code === 'KeyS') dy = 1;
            else if (e.code === 'ArrowLeft' || e.code === 'KeyA') dx = -1;
            else if (e.code === 'ArrowRight' || e.code === 'KeyD') dx = 1;

            else if (e.code === 'Space') { if (p.dashTimer === 0) performDash(s); return; }
            else if (e.code === 'KeyE') {
                if (p.invisTimer === 0) {
                    p.invisActive = INVIS_DURATION; p.invisTimer = INVIS_COOLDOWN;
                    s.particles.push({ type: 'shockwave', x: p.x, y: p.y, life: 40 });
                }
                return;
            }
            else if (e.code === 'KeyQ') { if (p.empTimer === 0) performEMP(s); return; }
            else return;

            e.preventDefault();
            if (p.dirX !== 0 && dx === -p.dirX) { p.dirX = dx; p.dirY = 0; p.nextDirX = 0; p.nextDirY = 0; }
            else if (p.dirY !== 0 && dy === -p.dirY) { p.dirX = 0; p.dirY = dy; p.nextDirX = 0; p.nextDirY = 0; }
            else { p.nextDirX = dx; p.nextDirY = dy; }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameOver, gameStarted]);

    return { score, gameOver, gameStarted, dashCD, invisCD, empCD, isInvis, initGame, getGameDuration };
};
