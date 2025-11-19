import React, { useRef, useState, useEffect } from 'react';
// Правильный путь к хуку
import { useGameLoop } from '../hooks/useGame';
// Правильный путь к конфигу
import {
    TILE_SIZE, COLS, ROWS,
    BLINK_COOLDOWN, EMP_COOLDOWN, INVIS_COOLDOWN,
    UNLOCK_SCORE_BLINK, UNLOCK_SCORE_INVIS, UNLOCK_SCORE_EMP
} from '../config/constants';
import Leaderboard from './Leaderboard';

const TokyoPacman = () => {
    const canvasRef = useRef(null);
    const [tileSize, setTileSize] = useState(TILE_SIZE);

    const calculateTileSize = () => {
        const marginVw = 5;
        const marginPx = (window.innerWidth * marginVw) / 100;
        const panelWidth = 280;
        const gap = 8;
        const skillsHeight = 50;
        const availableWidth = window.innerWidth - 2 * marginPx - 2 * panelWidth - gap;
        const availableHeight = window.innerHeight - skillsHeight;
        const tileW = Math.floor(availableWidth / COLS);
        const tileH = Math.floor(availableHeight / ROWS);
        setTileSize(Math.max(16, Math.min(tileW, tileH, 32)));
    };

    useEffect(() => {
        calculateTileSize();
        window.addEventListener('resize', calculateTileSize);
        return () => window.removeEventListener('resize', calculateTileSize);
    }, []);

    const { score, gameOver, gameStarted, dashCD, invisCD, empCD, isInvis, initGame, getGameDuration } = useGameLoop(canvasRef, tileSize);

    const getProgress = (current, max) => { if (current === 0) return 100; return ((max - current) / max) * 100; };
    const dashPct = getProgress(dashCD, BLINK_COOLDOWN);
    const empPct = getProgress(empCD, EMP_COOLDOWN);
    const ghostPct = getProgress(invisCD, INVIS_COOLDOWN);

    const canvasHeight = ROWS * tileSize;
    const skillsHeight = 50;
    const gap = 8;
    const borderOffset = 4;
    const totalPanelHeight = canvasHeight + skillsHeight + gap; // panels height = canvas + skills + gap

    const renderSkill = (keyCode, name, currentCD, maxCD, pct, unlockScore, isActive = false) => {
        const isLocked = score < unlockScore;
        if (isLocked) {
            return (
                <div className="skill-row locked">
                    <div className="skill-content">
                        <span className="key-badge locked-badge">LOCK</span>
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1' }}>
                            <span className="skill-label locked-text">{name}</span>
                            <span className="skill-unlock-hint">{unlockScore} PTS</span>
                        </div>
                    </div>
                </div>
            );
        }
        return (
            <div className={`skill-row ${currentCD === 0 ? 'ready' : 'cooldown'} ${isActive ? 'active' : ''}`}>
                <div className="skill-progress-bar" style={{ width: `${pct}%` }}></div>
                <div className="skill-content">
                    <span className="key-badge">{keyCode}</span>
                    <span className="skill-label">{isActive ? 'ACTIVE' : name}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="layout-wrapper">

            {/* ЛЕВАЯ ПАНЕЛЬ: ОЧКИ + ЛИДЕРБОРД */}
            <div className="panel left-panel" style={{ height: totalPanelHeight }}>
                <div className="panel-content">

                    <div className="stat-block" style={{ marginBottom: '20px' }}>
                        <div className="stat-label">SCORE</div>
                        <div className="stat-value">{score}</div>
                    </div>

                    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        {/*
                    Передаем счет для авто-сохранения при проигрыше.
                    Кнопки нет (showButton={false}).
                 */}
                        <Leaderboard
                            currentScore={gameOver ? score : 0}
                            onRetry={() => { }}
                            showButton={false}
                        />
                    </div>

                </div>
            </div>

            {/* ЦЕНТР: ИГРА + СКИЛЛЫ */}
            <div className="game-center" style={{ display: 'flex', flexDirection: 'column', gap: `${gap}px` }}>
                <div className="canvas-border">
                    <canvas ref={canvasRef} width={COLS * tileSize} height={ROWS * tileSize} />

                    {(!gameStarted || gameOver) && (
                        <div className="game-overlay">
                            <h1 className="glitch-text">TOKYO<br />PACMAN</h1>

                            {!gameStarted ? (
                                <div style={{ textAlign: 'center' }}>
                                    <button className="start-btn" onClick={initGame}>
                                        INITIATE MISSION
                                    </button>
                                </div>
                            ) : (
                                // ЭКРАН ПРОИГРЫША (ТОЛЬКО КНОПКА)
                                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <h3 className="game-over-text">MISSION FAILED</h3>
                                    <div className="final-score" style={{ marginBottom: '30px' }}>
                                        FINAL SCORE: <span style={{ color: '#fff' }}>{score}</span>
                                    </div>

                                    <button className="start-btn" onClick={initGame}>
                                        Restart [R]
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="skills-container" style={{ height: `${skillsHeight}px`, margin: 0 }}>
                    {renderSkill("SPACE", "BLINK", dashCD, BLINK_COOLDOWN, dashPct, UNLOCK_SCORE_BLINK)}
                    {renderSkill("Q", "EMP", empCD, EMP_COOLDOWN, empPct, UNLOCK_SCORE_EMP)}
                    {renderSkill("F", "GHOST", invisCD, INVIS_COOLDOWN, ghostPct, UNLOCK_SCORE_INVIS, isInvis)}
                </div>
            </div>

            {/* ПРАВАЯ ПАНЕЛЬ: ПРИЗРАКИ */}
            <div className="panel right-panel" style={{ height: totalPanelHeight }}>
                <div className="panel-content">
                    <div className="ghost-list">
                        <div className="ghost-item" style={{ borderColor: '#ffffff' }}>
                            <div className="ghost-head" style={{ background: '#ffffff' }}></div>
                            <div className="ghost-data">
                                <div className="ghost-name" style={{ color: '#ffffff' }}>GHOST</div>
                                <div className="ghost-desc">An ordinary ghost</div>
                            </div>
                        </div>
                        <div className="ghost-item" style={{ borderColor: '#ffaa00' }}>
                            <div className="ghost-head" style={{ background: '#ffaa00' }}></div>
                            <div className="ghost-data">
                                <div className="ghost-name" style={{ color: '#ffaa00' }}>GLITCH</div>
                                <div className="ghost-desc">Random teleports.</div>
                            </div>
                        </div>
                        <div className="ghost-item" style={{ borderColor: '#8a2be2' }}>
                            <div className="ghost-head" style={{ background: '#8a2be2' }}></div>
                            <div className="ghost-data">
                                <div className="ghost-name" style={{ color: '#8a2be2' }}>PHANTOM</div>
                                <div className="ghost-desc">Walks through walls.</div>
                            </div>
                        </div>
                        <div className="ghost-item" style={{ borderColor: '#00ffff' }}>
                            <div className="ghost-head" style={{ background: '#00ffff' }}></div>
                            <div className="ghost-data">
                                <div className="ghost-name" style={{ color: '#00ffff' }}>SPEEDSTER</div>
                                <div className="ghost-desc">Extreme velocity.</div>
                            </div>
                        </div>
                        <div className="ghost-item" style={{ borderColor: '#ff007c' }}>
                            <div className="ghost-head" style={{ background: '#ff007c' }}></div>
                            <div className="ghost-data">
                                <div className="ghost-name" style={{ color: '#ff007c' }}>HUNTER</div>
                                <div className="ghost-desc">Relentless pursuit.</div>
                            </div>
                        </div>
                        <div className="ghost-item" style={{ borderColor: '#2123CF' }}>
                            <div className="ghost-head" style={{ background: '#2123CF' }}></div>
                            <div className="ghost-data">
                                <div className="ghost-name" style={{ color: '#2123CF' }}>GEMINI</div>
                                <div className="ghost-desc">Splits & merges.</div>
                            </div>
                        </div>
                        {/* <div className="ghost-item" style={{ borderColor: '#5fdf89' }}>
                            <div className="ghost-head" style={{ background: '#5fdf89' }}></div>
                            <div className="ghost-data">
                                <div className="ghost-name" style={{ color: '#5fdf89' }}>TRIXTER [SOON]</div>
                                <div className="ghost-desc">Leaves mines.</div>
                            </div>
                        </div>
                        <div className="ghost-item" style={{ borderColor: '#E37209' }}>
                            <div className="ghost-head" style={{ background: '#E37209' }}></div>
                            <div className="ghost-data">
                                <div className="ghost-name" style={{ color: '#E37209' }}>ORACLE [SOON]</div>
                                <div className="ghost-desc">Predicts the position.</div>
                            </div>
                        </div> */}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default TokyoPacman;
