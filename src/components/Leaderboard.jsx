import React, { useEffect, useState } from 'react';
// Правильный путь к firebase: выходим из components (..), заходим в services
import { db, auth, provider } from '../services/firebase';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, setDoc } from "firebase/firestore";
import { signInWithPopup } from "firebase/auth";

const Leaderboard = ({ currentScore, onRetry, showButton = true }) => {
    const [scores, setScores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    // 1. Авторизация
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((u) => {
            if (u) setUser({ ...u, githubName: u.reloadUserInfo?.screenName || u.displayName });
            else setUser(null);
        });
        return () => unsubscribe();
    }, []);

    // 2. Логика данных
    useEffect(() => {
        // Если юзера нет и это не оверлей (showButton=false), не грузим данные зря
        if (!user && !showButton) return;

        const handleData = async () => {
            // Сохранение (только если очки > 0 и есть юзер)
            // Мы убрали проверку showButton, чтобы сохраняло и из боковой панели при проигрыше
            if (currentScore > 0 && user) {
                try {
                    const ref = doc(db, "scores", user.uid);
                    const snap = await getDoc(ref);
                    // Если записи нет или новый рекорд выше
                    if (!snap.exists() || currentScore > snap.data().score) {
                        await setDoc(ref, { name: user.githubName, score: currentScore, date: new Date() });
                    }
                } catch (e) { console.error("Save error:", e); }
            }

            // Загрузка
            setLoading(true);
            try {
                const q = query(collection(db, "scores"), orderBy("score", "desc"), limit(100));
                const snapshot = await getDocs(q);
                setScores(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (e) { console.error("Load error:", e); }
            setLoading(false);
        };
        handleData();
    }, [user, currentScore]); // Убрали showButton из зависимостей, чтобы сохраняло всегда при изменении счета

    const handleLogin = async () => { try { await signInWithPopup(auth, provider); } catch (e) { console.error(e); } };
    const getRankColor = (i) => i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#555';

    // --- RENDER ---

    // 1. LOCKED (Оверлей, не залогинен)
    if (!user && showButton) {
        return (
            <div className="leaderboard-container">
                <h2 style={{ color: '#444', marginBottom: '20px' }}>LOCKED</h2>
                <div className="login-promo">
                    <p style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '15px' }}>AUTHENTICATE TO SAVE</p>
                    <button className="neon-btn github-btn" onClick={handleLogin}>LOGIN WITH GITHUB</button>
                </div>
                <button className="neon-btn retry" onClick={onRetry} style={{ marginTop: '40px' }}>Restart [R]</button>
            </div>
        );
    }

    // 2. SIDEBAR (Не залогинен, боковая панель)
    if (!user && !showButton) {
        return (
            <div className="leaderboard-container">
                <h2 style={{ color: '#00f3ff', marginBottom: '15px' }}>TOP PACMANS</h2>
                <div style={{ padding: '20px', color: '#777', fontSize: '0.8rem' }}>LOGIN TO VIEW</div>
                <button className="neon-btn github-btn" onClick={handleLogin} style={{ fontSize: '0.8rem', padding: '8px' }}>LOGIN</button>
            </div>
        )
    }

    // 3. TABLE
    return (
        <div className="leaderboard-container">
            <h2 style={{ color: '#00f3ff', textShadow: '0 0 10px #00f3ff', marginBottom: '15px' }}>
                TOP PACMANS
            </h2>

            <div className="scores-window">
                {loading && <div style={{ padding: '20px', color: '#888' }}>SYNCING...</div>}
                <div className="scores-list">
                    {scores.map((s, idx) => (
                        <div key={s.id} className="score-row">
                            <span className="rank" style={{ color: getRankColor(idx) }}>#{idx + 1}</span>
                            <span className="name" style={{ color: s.name === user?.githubName ? '#ffff00' : '#fff' }}>{s.name}</span>
                            <span className="score-val">{s.score}</span>
                        </div>
                    ))}
                </div>
            </div>

            {showButton && (
                <button className="neon-btn retry" onClick={onRetry}>
                    Restart [R]
                </button>
            )}
        </div>
    );
};

export default Leaderboard;
