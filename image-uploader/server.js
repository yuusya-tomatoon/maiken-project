// 1. 必要なモジュールを読み込む
const express = require("express");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const crypto = require("crypto");
const fs = require("fs");
const admin = require("firebase-admin");
const cron = require("node-cron");

// 2. Firebase Admin SDKの初期化
// 注意: serviceAccountKey.jsonファイルがserver.jsと同じ階層にあることを確認してください
let serviceAccount;
let db; // dbをグローバルスコープで宣言
try {
    serviceAccount = require("./serviceAccountKey.json");
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore(); // 初期化成功時にdbを代入
} catch (e) {
    console.error("Firebase Admin SDKの初期化に失敗しました。serviceAccountKey.jsonファイルが存在し、内容が正しいか確認してください。");
    console.error(e); // エラー詳細を出力
    process.exit(1); // ★ 初期化失敗時はサーバーを起動せずに終了
}


// 3. Expressアプリの初期化
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

// ★ ファイルタイプの検証を追加
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('許可されていないファイルタイプです。 (jpeg, png, gif, webpのみ)'), false);
  }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// --- 4. APIエンドポイントの定義 ---

/**
 * サーバーの生存確認 (ヘルスチェック) を行うAPI
 */
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});


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
 * ★ 修正: userId も受け取り、保存するように変更
 */
app.post("/reviews", async (req, res) => {
    try {
        // ★ Review.jsから送信されるデータ { comment: string, userId: string }
        const { comment, userId } = req.body; // ★ userId を追加

        if (!comment || !userId) { // ★ userId のチェックを追加
            return res.status(400).send({ message: "コメント(comment)とuserIdが不足しています。" });
        }

        const docRef = await db.collection("reviews").add({
            comment,
            userId: userId, // ★ userId を保存
            likeCount: 0,   // ★ いいね機能のため初期値を追加
            likedBy: [],    // ★ いいね機能のため初期値を追加
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(201).send({ message: "レビューを登録しました。", reviewId: docRef.id });
    } catch (error) {
        console.error("Review POST Error:", error);
        res.status(500).send({ message: "レビューの登録中にエラーが発生しました。" });
    }
});

/**
 * ★ 新規追加: レビューにいいねを追加/削除するAPI
 * (Comments.js のいいねボタンから呼び出されます)
 */
app.post("/reviews/:reviewId/like", async (req, res) => {
    const { reviewId } = req.params;
    const { userId } = req.body; // ★ 本来は認証ミドルウェア(req.user.uid)から取得

    if (!userId) {
        return res.status(400).send({ message: "ユーザーIDが必要です。" });
    }

    // ★ いいね対象のコレクションを "reviews" に変更
    const reviewRef = db.collection("reviews").doc(reviewId);

    try {
        await db.runTransaction(async (transaction) => {
            const reviewDoc = await transaction.get(reviewRef);
            if (!reviewDoc.exists) {
                throw "レビューが見つかりません。";
            }

            const data = reviewDoc.data();
            const likedBy = data.likedBy || [];

            if (likedBy.includes(userId)) {
                // いいね済みなら削除
                transaction.update(reviewRef, {
                    likedBy: admin.firestore.FieldValue.arrayRemove(userId),
                    likeCount: admin.firestore.FieldValue.increment(-1)
                });
            } else {
                // 未いいねなら追加
                transaction.update(reviewRef, {
                    likedBy: admin.firestore.FieldValue.arrayUnion(userId),
                    likeCount: admin.firestore.FieldValue.increment(1)
                });
            }
        });

        res.status(200).send({ message: "レビューのいいねを更新しました。" });
    } catch (error) {
        console.error("Review Like Error:", error);
        res.status(500).send({ message: "レビューのいいね処理中にエラーが発生しました。" });
    }
});


/**
 * 新しい自己評価を登録するAPI (新規追加)
 * ★ 修正: userId と mealId も受け取る
 */
app.post("/evaluations", async (req, res) => {
    try {
        // ★ MyEvaluation.jsから送信されるデータ { foodAmounts: object, userId: string, mealId: string }
        const { foodAmounts, userId, mealId } = req.body; // ★ userId, mealId を追加

        if (!foodAmounts || Object.keys(foodAmounts).length === 0 || !userId || !mealId) {
            return res.status(400).send({ message: "必須項目が不足しています。(foodAmounts, userId, mealId)" });
        }

        const docRef = await db.collection("evaluations").add({
            foodAmounts,
            userId: userId,   // ★ 誰の評価か
            mealId: mealId,   // ★ どの献立か
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(201).send({ message: "自己評価を登録しました。", evaluationId: docRef.id });
    } catch (error) {
        console.error("Evaluation POST Error:", error);
        res.status(500).send({ message: "自己評価の登録中にエラーが発生しました。" });
    }
});


// --- 既存のAPIエンドポイント ---

/**
 * 新しい献立を登録するAPI
 * ★ 修正: Multerのエラーハンドリングを追加
 */
app.post("/meals", (req, res, next) => {
    // upload.single のエラーをキャッチ
    upload.single("image")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // Multer由来のエラー (例: ファイルサイズ超過など)
            return res.status(400).send({ message: "ファイルアップロードエラー: " + err.message });
        } else if (err) {
            // fileFilter で拒否された場合のエラー
            return res.status(400).send({ message: err.message });
        }
        
        // ファイルがない場合のエラー
        if (!req.file) {
            return res.status(400).send({ message: "画像ファイルが選択されていません。" });
        }
        next(); // エラーがなければ次のミドルウェア (async (req, res) => ...) へ
    });
}, async (req, res) => {
    // if (!req.file) ... は上で処理済み
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
S   }
});

/**
 * 献立にいいねを追加/削除するAPI
 */
app.post("/meals/:mealId/like", async (req, res) => {
    const { mealId } = req.params;
    const { userId } = req.body; // ★ 本来は認証ミドルウェア(req.user.uid)から取得
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
 * 献立にコメントを投稿するAPI
 */
app.post("/meals/:mealId/comments", async (req, res) => {
    const { mealId } = req.params;
    const { userId, text } = req.body; // ★ 本来は認証ミドルウェア(req.user.uid)から取得
    if (!userId || !text) {
        return res.status(400).send({ message: "ユーザーIDとコメント本文が必要です。" });
    }

    const commentRef = db.collection("meals").doc(mealId).collection("comments");
    try {
        const docRef = await commentRef.add({
            userId: userId,
            text: text,
            likeCount: 0, // ★ いいね機能のため初期値を追加
            likedBy: [],  // ★ いいね機能のため初期値を追加
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(201).send({ message: "コメントを投稿しました。", commentId: docRef.id });
    } catch (error) {
        console.error("Comment Error:", error);
        res.status(500).send({ message: "コメント投稿中にエラーが発生しました。" });
    }
});

/**
 * 献立のコメントにいいねを追加/削除するAPI
 */
app.post("/meals/:mealId/comments/:commentId/like", async (req, res) => {
    const { mealId, commentId } = req.params;
    const { userId } = req.body; // ★ 本来は認証ミドルウェア(req.user.uid)から取得

    if (!userId) {
        return res.status(400).send({ message: "ユーザーIDが必要です。" });
    }

    const commentRef = db.collection("meals").doc(mealId).collection("comments").doc(commentId);

    try {
        await db.runTransaction(async (transaction) => {
            const commentDoc = await transaction.get(commentRef);
            if (!commentDoc.exists) {
                throw "コメントが見つかりません。";
            }

            const data = commentDoc.data();
            const likedBy = data.likedBy || [];

            if (likedBy.includes(userId)) {
                // いいね済みなら削除
                transaction.update(commentRef, {
                    likedBy: admin.firestore.FieldValue.arrayRemove(userId),
                    likeCount: admin.firestore.FieldValue.increment(-1)
                });
            } else {
                // 未いいねなら追加
                transaction.update(commentRef, {
                    likedBy: admin.firestore.FieldValue.arrayUnion(userId),
                    likeCount: admin.firestore.FieldValue.increment(1)
                });
            }
        });

        res.status(200).send({ message: "コメントのいいねを更新しました。" });
    } catch (error) {
        console.error("Comment Like Error:", error);
        res.status(500).send({ message: "コメントのいいね処理中にエラーが発生しました。" });
    }
});


// --- 5. 定期的なアーカイブ処理 ---
cron.schedule('0 3 * * *', async () => {
    console.log('アーカイブ処理を開始します...');
    const archivePeriodDays = 30; // 30日経過したものをアーカイブ
    const now = new Date();
    const archiveDate = new Date(now.setDate(now.getDate() - archivePeriodDays));
    const archiveTimestamp = admin.firestore.Timestamp.fromDate(archiveDate);

    const mealsToArchive = db.collection('meals')
        .where('isArchived', '==', false)
        .where('createdAt', '<=', archiveTimestamp);

    try {
        const snapshot = await mealsToArchive.get();
        if (snapshot.empty) {
            console.log('アーカイブ対象の献立はありませんでした。');
            return;
        }

        const batch = db.batch();
        snapshot.docs.forEach(doc => {
            console.log(`アーカイブ対象: ${doc.id}`);
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


// 6. サーバーを起動
app.listen(port, () => {
    console.log(`サーバーがポート${port}で起動しました。 http://localhost:${port}`);
});