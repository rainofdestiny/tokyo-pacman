const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// Максимально возможные очки в секунду (примерно)
// Пакман ест точки (10 очков) + призраки.
// Допустим, нереально набрать больше 50 очков в секунду в среднем.
const MAX_POINTS_PER_SECOND = 10;

exports.submitScore = functions.https.onCall(async (data, context) => {
    const { name, score, duration } = data;

    // 1. Валидация типов данных
    if (!name || typeof name !== "string" || name.length > 3) {
        throw new functions.https.HttpsError("invalid-argument", "Invalid name");
    }
    if (!score || typeof score !== "number") {
        throw new functions.https.HttpsError("invalid-argument", "Invalid score");
    }
    if (!duration || typeof duration !== "number") {
        throw new functions.https.HttpsError("invalid-argument", "Invalid duration");
    }

    // 2. АНТИ-ЧИТ: Проверка скорости набора очков
    // Если игрок прислал 1000 очков, но играл 2 секунды — это чит.
    const calculatedPPS = score / duration;

    if (calculatedPPS > MAX_POINTS_PER_SECOND) {
        console.warn(`Cheater detected: ${name} tried ${score} in ${duration}s`);
        // Мы можем просто не сохранять, или выбросить ошибку
        throw new functions.https.HttpsError("permission-denied", "Nice try, hacker!");
    }

    // 3. Сохранение в базу (от имени админа)
    return admin.firestore().collection("scores").add({
        name: name.toUpperCase(),
        score: score,
        date: admin.firestore.FieldValue.serverTimestamp(),
    });
});
