import React, { useState, useEffect } from 'react';
import './Comments.css'; // 以前のCSSを流用（必要に応じて調整してください）
// ★ Firebaseモジュールをインポート
// ★ 修正: getApp, getApps を追加 (重複初期化エラー 'app/duplicate-app' 回避のため)
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// ★ 削除: ハードコードされたAPI_URLは削除
// const API_URL = 'https://jt1tbf88-3000.asse.devtunnels.ms/'; 

// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
// ★ 修正: Review.js の設定を反映
// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
const firebaseConfig = {
  apiKey: "AIzaSyChc6zo5ZH5QbGAdj9526jEeakvxaYg8js",
  authDomain: "maiken-2025.firebaseapp.com",
  projectId: "maiken-2025",
  storageBucket: "maiken-2025.firebasestorage.app",
  messagingSenderId: "106897039274",
  appId: "1:106897039274:web:812bd77ce5f3518bc255d3",
  measurementId: "G-58V56R0HSW"
};

// ★ 修正: Firebaseアプリを初期化 (重複エラー 'app/duplicate-app' を回避)
// 既に[DEFAULT]アプリが初期化されていなければ初期化し、されていれば既存のものを取得する
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);


// ★ 修正: propsで apiUrl を受け取る
function Comments({ apiUrl }) { 
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ★ 認証用のState
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ★ 認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false); // 認証状態が確定
    });
    return () => unsubscribe();
  }, []);

  // コンポーネントが最初に表示されたときにレビューを取得する
  useEffect(() => {
    const fetchReviews = async () => {
      // ★ apiUrl が渡されるまで待機 (念のため)
      if (!apiUrl) {
        setLoading(false); // apiUrlがなければローディングを終了
        setError("API URLが設定されていません。");
        return;
      }
      setLoading(true); // apiUrlがあればローディング開始
      setError(null);

      try {
        // server.jsの /reviews エンドポイントを呼び出す
        // ★ 修正: propsの apiUrl を使用
        const response = await fetch(`${apiUrl}/reviews`); 
        if (!response.ok) {
          throw new Error('レビューの取得に失敗しました。');
        }
        const data = await response.json();
        setReviews(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [apiUrl]); // ★ apiUrl が変更された場合も再取得

  const formatTimestamp = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return '';
    return new Date(timestamp.seconds * 1000).toLocaleString('ja-JP');
  };

  // ★ いいねボタンがクリックされたときの処理 (修正)
  const handleLikeClick = async (reviewId) => {
    // ★ apiUrl がなければ何もしない
    if (!apiUrl) return;

    // ★ ログインチェック
    if (!currentUser) {
      alert("いいねをするにはログインが必要です。");
      return;
    }
    setError(null); // エラーをリセット

    try {
      // ★ IDトークンを取得
      const idToken = await currentUser.getIdToken();

      // ★ サーバーに新しいAPIエンドポイントを呼び出す
      // ★ 修正: propsの apiUrl を使用
      const response = await fetch(`${apiUrl}/reviews/${reviewId}/like`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // ★ 認証ヘッダーを追加
          'Authorization': `Bearer ${idToken}`
        },
        // ★ body: JSON.stringify({ userId: ... }) は削除 (サーバーがトークンから判断するため)
      });

      // ★ 修正: エラーハンドリングを堅牢化
      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        } else {
          const errorText = await response.text();
          console.error("Server returned non-JSON error:", errorText);
          throw new Error(`サーバーが予期しない応答を返しました (Status: ${response.status})`);
        }
      }

      // サーバーの更新が成功したら、フロントエンドの状態も即時更新
      setReviews(reviews.map(review => {
        if (review.id === reviewId) {
          const likedBy = review.likedBy || [];
          // ★ currentUserId を currentUser.uid に変更
          const isLiked = likedBy.includes(currentUser.uid);
          const likeCount = review.likeCount || 0;

          return {
            ...review,
            likedBy: isLiked
              ? likedBy.filter(id => id !== currentUser.uid)
              : [...likedBy, currentUser.uid],
            likeCount: isLiked ? likeCount - 1 : likeCount + 1,
          };
        }
        return review;
      }));

    } catch (err) {
      console.error(err.message);
      setError(err.message); // UIにエラーを表示
    }
  };

  // ★ 認証読み込み中 + データ読み込み中
  if (loading || authLoading) return <div>読み込み中...</div>;

  return (
    <div className="comments-container">
      <h2 className="page-title">レビュー一覧</h2>
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>エラー: {error}</div>}
      <div className="comment-list">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <div key={review.id} className="comment-item">
              <div className="comment-avatar" title={review.userId || '不明なユーザー'}></div>
              <div className="comment-content">
                <div className="comment-header">
                  <span className="comment-user">
                    {review.userId || '(匿名レビュー)'}
                  </span>
                  <span className="comment-timestamp">{formatTimestamp(review.createdAt)}</span>
                </div>
                <p className="comment-text">{review.comment}</p>
                
                <div className="comment-footer">
                  <button
                    // ★ currentUserId を currentUser?.uid に変更 (未ログイン時も考慮)
                      className={`like-button ${review.likedBy?.includes(currentUser?.uid) ? 'liked' : ''}`}
                    onClick={() => handleLikeClick(review.id)}
                    title="いいね"
                    // ★ 未ログイン時はボタンを非活性化
                    disabled={!currentUser} 
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-1.113 2.175-.246 5.259 2.028 7.288l4.287 4.287a.5.5 0 0 0 .708 0l4.287-4.287c2.274-2.03 3.14-5.113 2.028-7.288-1.113-2.175-4.2-2.772-5.883-1.043L8 2.748zM8 15C-7.333 4.868 3.279-2.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-2.042 23.333 4.867 8 15z"/>
                    </svg>
                  </button>
                  <span className="like-count">{review.likeCount || 0}</span>
                </div>

              </div>
            </div>
          ))
        ) : (
          // ★ ローディング中でない場合のみ表示
          !loading && <p>まだレビューはありません。</p>
        )}
      </div>
    </div>
  );
}

export default Comments;
