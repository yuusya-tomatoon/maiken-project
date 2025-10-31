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

// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
// ★ 修正: CORS設定を柔軟化（動的な devtunnels URL に対応）
// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
// 許可するオリジン（フロントエンドのURL）のリスト (固定のもの)
const allowedOrigins = [
  'http://localhost:3001', // Reactのローカル開発サーバー
  // 'https://jt1tbf88-3001.asse.devtunnels.ms' // 古いURL。動的にチェックするため削除
  // 将来、本番環境のURLもここに追加します
  // 例: 'https://your-app.netlify.app'
];

// 動的なVSCodeトンネルURLを許可するための正規表現
// https://[任意の文字列]-3001.asse.devtunnels.ms を許可します
const devTunnelsRegex = /^https:\/\/[a-zA-Z0-9]+-3001\.asse\.devtunnels\.ms$/;

app.use(cors({
  origin: function (origin, callback) {
    // 1. originが無いリクエスト（Postman, curlなど）も許可する (開発中は便利)
    if (!origin) return callback(null, true);
    
    // 2. 許可リストにあるかチェック
    if (allowedOrigins.includes(origin)) {
        return callback(null, true);
    }
    
    // 3. 動的な devtunnels URL にマッチするかチェック
    if (devTunnelsRegex.test(origin)) {
        return callback(null, true);
    }

    // 許可リストにないオリジンの場合はエラーを返す
    const msg = 'このオリジンからのCORSリクエストは許可されていません: ' + origin;
    return callback(new Error(msg), false);
  }
}));

app.use(express.json());

// ... (Multerのセットアップは変更なし)
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
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('許可されていないファイルタイプです。 (jpeg, png, gif, webpのみ)'), false);
  }
};
const upload = multer({ storage: storage, fileFilter: fileFilter });


// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
// ★ Firebase認証ミドルウェア
// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
// React側から送られてくる `Authorization: Bearer <ID_TOKEN>` ヘッダーを検証する
const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send({ message: '認証トークンが必要です。' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  try {
    // トークンを検証
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    // 検証済みのユーザー情報を req.user に格納
    req.user = decodedToken; // (decodedToken には uid, email などが含まれる)
    next(); // 次の処理（API本体）へ進む
  } catch (error) {
    console.error("IDトークンの検証に失敗しました:", error);
    res.status(403).send({ message: '認証に失敗しました。無効なトークンです。' });
  }
};


// --- 4. APIエンドポイントの定義 ---

// ... (GET系APIは変更なし)

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
 * ★ 修正: 認証ミドルウェア(authMiddleware)を追加
 */
app.post("/reviews", authMiddleware, async (req, res) => { // ★ 認証ミドルウェアを追加
    try {
        const { comment } = req.body; // ★ userId は削除
        const userId = req.user.uid; // ★ 認証済みユーザーのID (ミドルウェアから取得)

        if (!comment) { // ★ userId のチェックは不要 (ミドルウェアが保証)
            return res.status(400).send({ message: "コメント(comment)が不足しています。" });
        }

        const docRef = await db.collection("reviews").add({
            comment,
            userId: userId, // ★ 認証済みのIDを保存
            likeCount: 0,
            likedBy: [],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(201).send({ message: "レビューを登録しました。", reviewId: docRef.id });
    } catch (error) {
        console.error("Review POST Error:", error);
        res.status(500).send({ message: "レビューの登録中にエラーが発生しました。" });
    }
});

/**
 * レビューにいいねを追加/削除するAPI
 * ★ 修正: 認証ミドルウェア(authMiddleware)を追加
 */
app.post("/reviews/:reviewId/like", authMiddleware, async (req, res) => { // ★ 認証ミドルウェアを追加
    const { reviewId } = req.params;
    const userId = req.user.uid; // ★ 認証済みユーザーのID (ミドルウェアから取得)

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
 * 新しい自己評価を登録するAPI
 * ★ 修正: 認証ミドルウェア(authMiddleware)を追加
 */
app.post("/evaluations", authMiddleware, async (req, res) => { // ★ 認証ミドルウェアを追加
    try {
        const { foodAmounts, mealId } = req.body; // ★ mealId はフロント側で生成されることを想定
        const userId = req.user.uid; // ★ 認証済みユーザーのID (ミドルウェアから取得)

        if (!foodAmounts || Object.keys(foodAmounts).length === 0 || !mealId) {
            return res.status(400).send({ message: "必須項目が不足しています。(foodAmounts, mealId)" });
        }

        const docRef = await db.collection("evaluations").add({
            foodAmounts,
            userId: userId,   // ★ 認証済みのIDを保存
            mealId: mealId,   // ★ どの献立か
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        res.status(201).send({ message: "自己評価を登録しました。", evaluationId: docRef.id });
    } catch (error) {
        console.error("Evaluation POST Error:", error);
        res.status(500).send({ message: "自己評価の登録中にエラーが発生しました。" });
    }
});


// --- 献立関連 (認証必須) ---

/**
 * 新しい献立を登録するAPI
 * ★ 修正: 認証ミドルウェア(authMiddleware)をMulterハンドリングの前に追加
 */
app.post("/meals", authMiddleware, (req, res, next) => { // ★ 認証ミドルウェアを追加
    // upload.single のエラーをキャッチ
    upload.single("image")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).send({ message: "ファイルアップロードエラー: " + err.message });
        } else if (err) {
            return res.status(400).send({ message: err.message });
        }
        if (!req.file) {
            return res.status(400).send({ message: "画像ファイルが選択されていません。" });
        }
        next(); // 次の処理へ
    });
}, async (req, res) => {
    const mealData = JSON.parse(req.body.mealData);
    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    const userId = req.user.uid; // ★ 認証済みユーザーのID (ミドルウェアから取得)

    try {
        const docRef = await db.collection("meals").add({
            ...mealData,   // (クライアント側は mealData に userId を含めないこと)
            userId: userId,   // ★ 誰が登録した献立か
            imageUrl: imageUrl,
            likeCount: 0,
            likedBy: [],
            isArchived: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }); // ★ 閉じ括弧が抜けていたのを修正
        res.status(201).send({ message: "献立を登録しました。", mealId: docRef.id });
    } catch (error) {
        console.error("Firestore Error:", error);
        res.status(500).send({ message: "データベースへの保存中にエラーが発生しました。" });
    }
});

/**
 * 献立にいいねを追加/削除するAPI
 * ★ 修正: 認証ミドルウェア(authMiddleware)を追加
 */
app.post("/meals/:mealId/like", authMiddleware, async (req, res) => { // ★ 認証ミドルウェアを追加
    const { mealId } = req.params;
    const userId = req.user.uid; // ★ 認証済みユーザーのID (ミドルウェアから取得)

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
 * ★ 修正: 認証ミドルウェア(authMiddleware)を追加
 */
app.post("/meals/:mealId/comments", authMiddleware, async (req, res) => { // ★ 認証ミドルウェアを追加
    const { mealId } = req.params;
    const { text } = req.body; // ★ userId は削除
    const userId = req.user.uid; // ★ 認証済みユーザーのID (ミドルウェアから取得)

    if (!text) {
        return res.status(400).send({ message: "コメント本文が必要です。" });
    }

    const commentRef = db.collection("meals").doc(mealId).collection("comments");
    try {
        const docRef = await commentRef.add({
            userId: userId, // ★ 認証済みのIDを保存
            text: text,
            likeCount: 0,
            likedBy: [],
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }); // ★ 閉じ括弧が抜けていたのを修正
        res.status(201).send({ message: "コメントを投稿しました。", commentId: docRef.id });
    } catch (error) {
        console.error("Comment Error:", error);
        res.status(500).send({ message: "コメント投稿中にエラーが発生しました。" });
    }
});

/**
 * 献立のコメントにいいねを追加/削除するAPI
 * ★ 修正: 認証ミドルウェア(authMiddleware)を追加
 */
app.post("/meals/:mealId/comments/:commentId/like", authMiddleware, async (req, res) => { // ★ 認証ミドルウェアを追加
    const { mealId, commentId } = req.params;
    const userId = req.user.uid; // ★ 認証済みユーザーのID (ミドルウェアから取得)

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
// (変更なし)
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