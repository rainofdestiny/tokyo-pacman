import React, { useRef } from 'react';
import { useGameLoop } from '../game/useGameLoop';
import {
    TILE_SIZE, COLS, ROWS,
    DASH_COOLDOWN, EMP_COOLDOWN, INVIS_COOLDOWN
} from '../game/constants';
import Leaderboard from './Leaderboard';

const TokyoPacman = () => {
    const canvasRef = useRef(null);
    const { score, gameOver, gameStarted, dashCD, invisCD, empCD, isInvis, initGame, getGameDuration } = useGameLoop(canvasRef);

    const getProgress = (current, max) => {
        if (current === 0) return 100;
        return ((max - current) / max) * 100;
    };

    const dashPct = getProgress(dashCD, DASH_COOLDOWN);
    const empPct = getProgress(empCD, EMP_COOLDOWN);
    const ghostPct = getProgress(invisCD, INVIS_COOLDOWN);

    return (
        <div className="layout-wrapper">

            {/* ЛЕВАЯ ПАНЕЛЬ */}
            <div className="panel left-panel">
                <div className="panel-content">
                    <h2 className="panel-title">SYSTEM</h2>

                    <div className="stat-block">
                        <div className="stat-label">SCORE</div>
                        <div className="stat-value">{score}</div>
                    </div>

                    <div className="skills-container">
                        {/* ... (код скиллов без изменений) ... */}
                        <div className={`skill-row ${dashCD === 0 ? 'ready' : 'cooldown'}`}>
                            <div className="skill-progress-bar" style={{ width: `${dashPct}%` }}></div>
                            <div className="skill-content">
                                <span className="key-badge" style={{ minWidth: '60px' }}>SPACE</span>
                                <span className="skill-label">DASH</span>
                            </div>
                        </div>

                        <div className={`skill-row ${empCD === 0 ? 'ready' : 'cooldown'}`}>
                            <div className="skill-progress-bar" style={{ width: `${empPct}%` }}></div>
                            <div className="skill-content">
                                <span className="key-badge">Q</span>
                                <span className="skill-label">EMP BLAST</span>
                            </div>
                        </div>

                        <div className={`skill-row ${isInvis ? 'active' : (invisCD === 0 ? 'ready' : 'cooldown')}`}>
                            <div className="skill-progress-bar" style={{ width: isInvis ? '100%' : `${ghostPct}%` }}></div>
                            <div className="skill-content">
                                <span className="key-badge">E</span>
                                <span className="skill-label">{isInvis ? 'ACTIVE' : 'GHOST'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ЦЕНТР */}
            <div className="game-center">
                <div className="canvas-border">
                    <canvas ref={canvasRef} width={COLS * TILE_SIZE} height={ROWS * TILE_SIZE} />

                    {(!gameStarted || gameOver) && (
                        <div className="game-overlay">
                            <h1 className="glitch-text">TOKYO<br />PACMAN</h1>
                            {gameOver && <h3 className="game-over-text">MISSION FAILED</h3>}
                            {gameOver && <div className="final-score">SCORE: {score}</div>}

                            {!gameStarted ? (
                                <div style={{ textAlign: 'center' }}>
                                    <button className="start-btn" onClick={initGame}>
                                        INITIATE MISSION
                                    </button>
                                </div>
                            ) : (
                                <Leaderboard
                                    currentScore={score}
                                    gameDuration={getGameDuration()}
                                    onRetry={initGame}
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ПРАВАЯ ПАНЕЛЬ */}
            <div className="panel right-panel">
                <div className="panel-content">
                    {/* ИЗМЕНЕНИЕ 4: Заголовок */}
                    <h2 className="panel-title danger">GHOSTS</h2>

                    <div className="ghost-list">
                        <div className="ghost-item" style={{ borderColor: '#ff0044' }}>
                            <div className="ghost-head" style={{ background: '#ff0044' }}></div>
                            <div>
                                <div className="ghost-name" style={{ color: '#ff0044' }}>TRACKER</div>
                                <div className="ghost-desc">Smart AI. Finds path.</div>
                            </div>
                        </div>
                        <div className="ghost-item" style={{ borderColor: '#00ffff' }}>
                            <div className="ghost-head" style={{ background: '#00ffff' }}></div>
                            <div>
                                <div className="ghost-name" style={{ color: '#00ffff' }}>SPEEDSTER</div>
                                <div className="ghost-desc">Very fast movement.</div>
                            </div>
                        </div>
                        <div className="ghost-item" style={{ borderColor: '#ff55ff' }}>
                            <div className="ghost-head" style={{ background: '#ff55ff' }}></div>
                            <div>
                                <div className="ghost-name" style={{ color: '#ff55ff' }}>AMBUSHER</div>
                                <div className="ghost-desc">Intercepts your path.</div>
                            </div>
                        </div>
                        <div className="ghost-item" style={{ borderColor: '#ffaa00' }}>
                            <div className="ghost-head" style={{ background: '#ffaa00' }}></div>
                            <div>
                                <div className="ghost-name" style={{ color: '#ffaa00' }}>GLITCH</div>
                                <div className="ghost-desc">Teleports randomly.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
};

export default TokyoPacman;
