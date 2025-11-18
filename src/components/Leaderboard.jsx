import React, { useEffect, useState } from 'react';
import { db, auth, provider } from '../firebase';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { signInWithPopup } from "firebase/auth";

const Leaderboard = ({ currentScore, onRetry }) => {
    const [scores, setScores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState('idle');
    const [user, setUser] = useState(null);

    // 1. Auth
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((u) => {
            if (u) {
                const githubUsername = u.reloadUserInfo?.screenName || u.displayName;
                setUser({ ...u, githubName: githubUsername });
            } else {
                setUser(null);
            }
        });
        return () => unsubscribe();
    }, []);

    // 2. Auto-Save Logic
    useEffect(() => {
        const checkAndSaveScore = async () => {
            if (!user || saveStatus === 'saved' || saveStatus === 'new_record') return;

            setSaveStatus('saving');

            try {
                const userScoreRef = doc(db, "scores", user.uid);
                const userScoreSnap = await getDoc(userScoreRef);

                let shouldSave = false;

                if (userScoreSnap.exists()) {
                    const oldScore = userScoreSnap.data().score;
                    if (currentScore > oldScore) {
                        shouldSave = true;
                    } else {
                        setSaveStatus('saved');
                        return;
                    }
                } else {
                    shouldSave = true;
                }

                if (shouldSave) {
                    await setDoc(userScoreRef, {
                        name: user.githubName || "UNKNOWN PACMAN", // <-- ИЗМЕНЕНИЕ 1
                        score: currentScore,
                        date: new Date()
                    });
                    fetchLeaderboard();
                    setSaveStatus('new_record');
                }

            } catch (err) {
                console.error("Error saving:", err);
                setSaveStatus('error');
            }
        };

        if (user) {
            checkAndSaveScore();
        }
    }, [user, currentScore]);

    // 3. Fetch Leaderboard
    const fetchLeaderboard = async () => {
        try {
            const q = query(collection(db, "scores"), orderBy("score", "desc"), limit(100));
            const querySnapshot = await getDocs(q);
            const loadedScores = [];
            querySnapshot.forEach((doc) => {
                loadedScores.push({ id: doc.id, ...doc.data() });
            });
            setScores(loadedScores);
        } catch (error) {
            console.error("Error loading leaderboard:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const handleLogin = async () => {
        try {
            await signInWithPopup(auth, provider);
        } catch (err) {
            console.error("Login failed", err);
        }
    };

    const getRankColor = (idx) => {
        if (idx === 0) return '#ffd700';
        if (idx === 1) return '#c0c0c0';
        if (idx === 2) return '#cd7f32';
        return '#555';
    };

    return (
        <div className="leaderboard-container">
            {/* ИЗМЕНЕНИЕ 2: Заголовок */}
            <h2 style={{ color: '#00f3ff', textShadow: '0 0 10px #00f3ff', marginBottom: '15px' }}>TOP PACMANS</h2>

            <div className="scores-window">
                {loading && <div style={{ padding: '20px', color: '#888' }}>SYNCING DATA...</div>}

                <div className="scores-list">
                    {scores.map((s, idx) => (
                        <div key={s.id} className="score-row">
                            <span className="rank" style={{ color: getRankColor(idx) }}>
                                #{idx + 1}
                            </span>

                            <span className="name"
                                style={{
                                    color: user && s.name === user.githubName
                                        ? '#ffff00'
                                        : '#fff'
                                }}>
                                {s.name}
                            </span>

                            <span className="score-val">{s.score}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="action-area">
                {!user ? (
                    <div className="submit-section">
                        <button className="neon-btn github-btn" onClick={handleLogin}>
                            LOGIN TO SAVE RECORD
                        </button>
                    </div>
                ) : (
                    <div style={{ margin: '15px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                        {/* ИЗМЕНЕНИЕ 3: Лейбл игрока */}
                        <div className="user-badge">
                            PACMAN: <span style={{ color: '#ffff00' }}>{user.githubName}</span>
                        </div>

                        <div style={{ height: '20px' }}>
                            {saveStatus === 'saving' && <span style={{ color: '#00f3ff', fontSize: '0.8rem' }}>SAVING...</span>}
                            {saveStatus === 'saved' && <span style={{ color: '#888', fontSize: '0.8rem' }}>HIGH SCORE NOT BEATEN</span>}
                            {saveStatus === 'new_record' && <span style={{ color: '#00ff00', textShadow: '0 0 10px #00ff00', fontSize: '0.8rem' }}>★ NEW PERSONAL BEST! ★</span>}
                            {saveStatus === 'error' && <span style={{ color: 'red', fontSize: '0.8rem' }}>DATABASE ERROR</span>}
                        </div>
                    </div>
                )}

                <button className="neon-btn retry" onClick={onRetry}>
                    REBOOT SYSTEM (R)
                </button>
            </div>
        </div>
    );
};

export default Leaderboard;
