// 1. 必要なモジュールを読み込む (No changes)
const express = require("express");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const admin = require("firebase-admin");
const cron = require("node-cron");

// 2. Firebase Admin SDKの初期化 (No changes)
// 注意: serviceAccountKey.jsonファイルがserver.jsと同じ階層にあることを確認してください
let serviceAccount;
try {
    serviceAccount = require("./serviceAccountKey.json");
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (e) {
    console.error("Firebase Admin SDKの初期化に失敗しました。serviceAccountKey.jsonファイルが存在し、内容が正しいか確認してください。");
    // process.exit(1); // 本番環境ではエラーで終了させる
}
const db = admin.firestore();


// 3. Expressアプリの初期化 (No changes)
const app = express();
const port = 3000;
app.use(cors());
app.use(express.json());

const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
app.use("/uploads", express.static(path.join(__dirname, uploadDir)));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir + "/"),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const randomName = crypto.randomBytes(16).toString("hex");
        cb(null, randomName + ext);
    },
});
const upload = multer({ storage: storage });

// --- 4. APIエンドポイントの定義 ---

// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
// ★ 新しく追加・改良したAPIエンドポイント ★
// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

/**
 * すべての献立データを取得するAPI (カレンダー表示用)
 */
app.get("/meals", async (req, res) => {
    try {
        const mealsSnapshot = await db.collection("meals").orderBy("createdAt", "desc").get();
        const meals = mealsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(meals);
    } catch (error) {
        console.error("Meals GET Error:", error);
        res.status(500).send({ message: "献立データの取得中にエラーが発生しました。" });
    }
});

/**
 * 特定の献立データを取得するAPI (献立詳細表示用)
 */
app.get("/meals/:mealId", async (req, res) => {
    try {
        const { mealId } = req.params;
        const mealRef = db.collection("meals").doc(mealId);
        const doc = await mealRef.get();
        if (!doc.exists) {
            return res.status(404).send({ message: "献立が見つかりません。" });
        }
        res.status(200).json({ id: doc.id, ...doc.data() });
    } catch (error) {
        console.error("Meal GET Error:", error);
        res.status(500).send({ message: "献立データの取得中にエラーが発生しました。" });
    }
});


/**
 * 特定献立のコメント一覧を取得するAPI (コメント表示用)
 */
app.get("/meals/:mealId/comments", async (req, res) => {
    try {
        const { mealId } = req.params;
        const commentsSnapshot = await db.collection("meals").doc(mealId).collection("comments").orderBy("createdAt", "desc").get();
        const comments = commentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(comments);
    } catch (error) {
        console.error("Comments GET Error:", error);
        res.status(500).send({ message: "コメントデータの取得中にエラーが発生しました。" });
    }
});


/**
 * すべてのレビュー(評価)データを取得するAPI (評価一覧表示用)
 */
app.get("/reviews", async (req, res) => {
    try {
        // reviewsコレクションから全ドキュメントを取得
        const reviewsSnapshot = await db.collection("reviews").orderBy("createdAt", "desc").get();
        const reviews = reviewsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.status(200).json(reviews);
    } catch (error) {
        console.error("Reviews GET Error:", error);
        res.status(500).send({ message: "レビューデータの取得中にエラーが発生しました。" });
    }
});


/**
 * 新しいレビューを登録するAPI
 * Review.jsページからのデータを受け取る
 */
app.post("/reviews", async (req, res) => {
    try {
        const { mealType, date, foods, rating, reviewText } = req.body;

        if (!mealType || !date || !foods || rating === undefined) {
             return res.status(400).send({ message: "必須項目が不足しています。" });
        }

        const docRef = await db.collection("reviews").add({
            mealType,
            date,
            foods,
            rating,
            reviewText,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(201).send({ message: "レビューを登録しました。", reviewId: docRef.id });
    } catch (error) {
        console.error("Review POST Error:", error);
        res.status(500).send({ message: "レビューの登録中にエラーが発生しました。" });
    }
});


// --- 既存のAPIエンドポイント ---

/**
 * 新しい献立を登録するAPI (変更なし)
 */
app.post("/meals", upload.single("image"), async (req, res) => {
    if (!req.file) {
        return res.status(400).send({ message: "画像ファイルが選択されていません。" });
    }
    const mealData = JSON.parse(req.body.mealData);
    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    try {
        const docRef = await db.collection("meals").add({
            ...mealData,
            imageUrl: imageUrl,
            likeCount: 0,
            likedBy: [],
            isArchived: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(201).send({ message: "献立を登録しました。", mealId: docRef.id });
    } catch (error) {
        console.error("Firestore Error:", error);
        res.status(500).send({ message: "データベースへの保存中にエラーが発生しました。" });
    }
});

/**
 * いいねを追加/削除するAPI (変更なし)
 */
app.post("/meals/:mealId/like", async (req, res) => {
    const { mealId } = req.params;
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).send({ message: "ユーザーIDが必要です。" });
    }

    const mealRef = db.collection("meals").doc(mealId);
    try {
        await db.runTransaction(async (transaction) => {
            const mealDoc = await transaction.get(mealRef);
            if (!mealDoc.exists) {
                throw "献立が見つかりません。";
            }
            const likedBy = mealDoc.data().likedBy || [];
            if (likedBy.includes(userId)) {
                transaction.update(mealRef, {
                    likeCount: admin.firestore.FieldValue.increment(-1),
                    likedBy: admin.firestore.FieldValue.arrayRemove(userId)
                });
            } else {
                transaction.update(mealRef, {
                    likeCount: admin.firestore.FieldValue.increment(1),
                    likedBy: admin.firestore.FieldValue.arrayUnion(userId)
                });
            }
        });
        res.status(200).send({ message: "いいねを更新しました。" });
    } catch (error) {
        console.error("Like Error:", error);
        res.status(500).send({ message: "いいね処理中にエラーが発生しました。" });
    }
});

/**
 * コメントを投稿するAPI (変更なし)
 */
app.post("/meals/:mealId/comments", async (req, res) => {
    const { mealId } = req.params;
    const { userId, text } = req.body;
    if (!userId || !text) {
        return res.status(400).send({ message: "ユーザーIDとコメント本文が必要です。" });
    }

    const commentRef = db.collection("meals").doc(mealId).collection("comments");
    try {
        await commentRef.add({
            userId: userId,
            text: text,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(201).send({ message: "コメントを投稿しました。" });
    } catch (error) {
        console.error("Comment Error:", error);
        res.status(500).send({ message: "コメント投稿中にエラーが発生しました。" });
    }
});


// --- 5. 定期的なアーカイブ処理 --- (変更なし)
cron.schedule('0 3 * * *', async () => {
    console.log('アーカイブ処理を開始します...');
    const archivePeriodDays = 30;
    const now = new Date();
    const archiveDate = new Date(now.setDate(now.getDate() - archivePeriodDays));

    const mealsToArchive = db.collection('meals')
        .where('isArchived', '==', false)
        .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(archiveDate));

    try {
        const snapshot = await mealsToArchive.get();
        if (snapshot.empty) {
            console.log('アーカイブ対象の献立はありませんでした。');
            return;
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            batch.update(doc.ref, { isArchived: true });
        });
        await batch.commit();
        console.log(`${snapshot.size}件の献立をアーカイブしました。`);
    } catch (error) {
        console.error('アーカイブ処理中にエラーが発生しました:', error);
    }
}, {
    timezone: "Asia/Tokyo"
});


// 6. サーバーを起動 (変更なし)
app.listen(port, () => {
    console.log(`サーバーがポート${port}で起動しました。 http://localhost:${port}`);
});