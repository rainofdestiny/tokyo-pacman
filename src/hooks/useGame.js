import { useEffect, useRef, useState } from 'react';
import {
    TILE_SIZE, COLS, ROWS, INVIS_DURATION, INVIS_COOLDOWN,
    UNLOCK_SCORE_BLINK, UNLOCK_SCORE_INVIS, UNLOCK_SCORE_EMP,
    WALL
} from '../config/constants';
import { generateMaze, getSafeSpawns } from '../game/map/generator';
import { updateGame, TICK_RATE, TICK_DURATION } from '../game/gameLoop';
import { performBlink, performEMP } from '../game/entities/player';
import { spawnRandomGhost } from '../game/entities/ghosts';
import { drawGame } from '../game/renderer';

export const useGameLoop = (canvasRef) => {
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [gameStarted, setGameStarted] = useState(false);

    const [dashCD, setDashCD] = useState(0);
    const [invisCD, setInvisCD] = useState(0);
    const [empCD, setEmpCD] = useState(0);
    const [isInvis, setIsInvis] = useState(false);

    const isGameOverRef = useRef(false);
    const gameStartTimeRef = useRef(Date.now());

    const gameState = useRef({
        grid: [], frame: 0, score: 0, particles: [],
        player: { x: 0, y: 0, dirX: 0, dirY: 0, nextDirX: 0, nextDirY: 0, rotation: 0, empTimer: 0 },
        ghosts: [],
        ghostsSpawned: 0,
        levelCompleting: false
    });

    const getGameDuration = () => (Date.now() - gameStartTimeRef.current) / 1000;

    const initGame = () => {
        const grid = generateMaze();
        const { playerSpot } = getSafeSpawns(grid);

        const pX = playerSpot.x * TILE_SIZE + TILE_SIZE / 2;
        const pY = playerSpot.y * TILE_SIZE + TILE_SIZE / 2;

        gameState.current = {
            grid, frame: 0, score: 0, particles: [],
            player: {
                x: pX, y: pY, dirX: 0, dirY: 0, nextDirX: 0, nextDirY: 0,
                dashTimer: 0, invisTimer: 0, invisActive: 0, empTimer: 0, rotation: 0
            },
            ghosts: [],
            ghostsSpawned: 0,
            levelCompleting: false
        };

        // Спавн 3 случайных призраков со старта
        for (let i = 0; i < 3; i++) {
            spawnRandomGhost(gameState.current);
        }

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
                x: p.x,
                y: p.y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 60,
                color: '#ffff00'
            });
        }
    };

    // Основной игровой цикл с фиксированным тикрейтом
    useEffect(() => {
        if (!gameStarted) return;

        const ctx = canvasRef.current.getContext('2d');
        let animationId;
        let lastTime = performance.now();
        let accumulator = 0;

        const loop = (currentTime) => {
            // Вычисляем deltaTime в миллисекундах
            let deltaTime = currentTime - lastTime;
            lastTime = currentTime;

            // ФИКС БАГА: Ограничиваем deltaTime при переключении вкладок или lag spike
            // Максимум 5 кадров (при 60 FPS это ~83ms)
            const maxDeltaTime = TICK_DURATION * 5;
            if (deltaTime > maxDeltaTime) {
                deltaTime = maxDeltaTime;
            }

            // Добавляем deltaTime к аккумулятору
            accumulator += deltaTime;

            // Выполняем фиксированное количество тиков
            // Ограничиваем максимум 5 тиков за кадр, чтобы избежать "спирали смерти"
            let ticksThisFrame = 0;
            const maxTicksPerFrame = 5;

            while (accumulator >= TICK_DURATION && ticksThisFrame < maxTicksPerFrame) {
                // Обновляем игровую логику с фиксированным тикрейтом
                updateGame(gameState.current, setScore, handleGameOver, isGameOverRef.current);

                accumulator -= TICK_DURATION;
                ticksThisFrame++;
            }

            // Если аккумулятор всё ещё слишком большой (экстремальный случай),
            // сбрасываем остаток
            if (accumulator > maxDeltaTime) {
                accumulator = TICK_DURATION;
            }

            // Рендерим текущее состояние (независимо от тиков)
            drawGame(ctx, gameState.current);

            // Обновляем UI (не каждый кадр, а раз в несколько кадров для производительности)
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

    // Обработка клавиатуры
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'KeyR') {
                initGame();
                return;
            }

            if (gameOver) return;

            const s = gameState.current;
            const p = s.player;
            const curScore = s.score;

            let dx = 0;
            let dy = 0;

            // Дебаг: +1000 очков
            // if (e.code === 'KeyP') {
            //     s.score += 1000;
            //     setScore(s.score);
            //     return;
            // }

            // // Дебаг: удалить всех призраков
            // if (e.code === 'KeyO') {
            //     s.ghosts = [];
            //     // Эффект исчезновения
            //     for (let i = 0; i < 30; i++) {
            //         s.particles.push({
            //             x: Math.random() * COLS * TILE_SIZE,
            //             y: Math.random() * ROWS * TILE_SIZE,
            //             vx: (Math.random() - 0.5) * 8,
            //             vy: (Math.random() - 0.5) * 8,
            //             life: 40,
            //             color: '#ff0000'
            //         });
            //     }
            //     return;
            // }

            // Движение
            if (e.code === 'ArrowUp' || e.code === 'KeyW') {
                dy = -1;
            } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
                dy = 1;
            } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
                dx = -1;
            } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
                dx = 1;
            }
            // Способности
            else if (e.code === 'Space') {
                if (curScore >= UNLOCK_SCORE_BLINK && p.dashTimer === 0) {
                    performBlink(s);
                }
                return;
            } else if (e.code === 'KeyE') {
                if (curScore >= UNLOCK_SCORE_INVIS && p.invisTimer === 0) {
                    p.invisActive = INVIS_DURATION;
                    p.invisTimer = INVIS_COOLDOWN;
                    s.particles.push({
                        type: 'shockwave',
                        x: p.x,
                        y: p.y,
                        life: 40
                    });
                }
                return;
            } else if (e.code === 'KeyQ') {
                if (curScore >= UNLOCK_SCORE_EMP && p.empTimer === 0) {
                    performEMP(s);
                }
                return;
            } else {
                return;
            }

            e.preventDefault();

            // УЛУЧШЕНИЕ: Rotation меняется МГНОВЕННО при любом нажатии клавиши
            if (dx === 1) p.rotation = 0;
            if (dx === -1) p.rotation = Math.PI;
            if (dy === 1) p.rotation = Math.PI / 2;
            if (dy === -1) p.rotation = -Math.PI / 2;

            // Обработка мгновенного разворота на 180 градусов
            if (p.dirX !== 0 && dx === -p.dirX) {
                p.dirX = dx;
                p.dirY = 0;
                p.nextDirX = 0;
                p.nextDirY = 0;
            } else if (p.dirY !== 0 && dy === -p.dirY) {
                p.dirX = 0;
                p.dirY = dy;
                p.nextDirX = 0;
                p.nextDirY = 0;
            } else {
                // Проверяем, можно ли повернуть прямо сейчас
                const currentCol = Math.floor(p.x / TILE_SIZE);
                const currentRow = Math.floor(p.y / TILE_SIZE);
                const targetCol = currentCol + dx;
                const targetRow = currentRow + dy;

                // Проверяем, свободен ли путь в новом направлении
                const isWallCheck = (grid, col, row) => {
                    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
                    return grid[row] && grid[row][col] === WALL;
                };

                const canTurnNow = !isWallCheck(s.grid, targetCol, targetRow);

                if (canTurnNow && (dx !== 0 || dy !== 0)) {
                    // Мгновенный поворот, если путь свободен
                    p.dirX = dx;
                    p.dirY = dy;
                    p.nextDirX = 0;
                    p.nextDirY = 0;
                } else {
                    // Иначе ставим в очередь (rotation уже обновлен выше)
                    p.nextDirX = dx;
                    p.nextDirY = dy;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [gameOver, gameStarted]);

    return {
        score,
        gameOver,
        gameStarted,
        dashCD,
        invisCD,
        empCD,
        isInvis,
        initGame,
        getGameDuration
    };
};
