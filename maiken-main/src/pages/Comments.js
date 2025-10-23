import React, { useState, useEffect } from 'react';
import './Comments.css'; // 以前のCSSを流用（必要に応じて調整してください）

// バックエンドサーバーのURL
const API_URL = 'http://localhost:3000';

// ★ 現在のユーザーID（デモ用）
// 本来はログイン状態などから動的に取得します。
const currentUserId = 'user_test_001';

function Comments() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // コンポーネントが最初に表示されたときにレビューを取得する
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        // server.jsの /reviews エンドポイントを呼び出す
        const response = await fetch(`${API_URL}/reviews`);
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
  }, []); // 依存配列は空。マウント時に1回だけ実行

  const formatTimestamp = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return '';
    return new Date(timestamp.seconds * 1000).toLocaleString('ja-JP');
  };

  // ★ いいねボタンがクリックされたときの処理 (新規追加)
  const handleLikeClick = async (reviewId) => {
    try {
      // ★ サーバーに新しいAPIエンドポイントを呼び出す
      const response = await fetch(`${API_URL}/reviews/${reviewId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });

      if (!response.ok) {
        throw new Error('いいねの更新に失敗しました。');
      }

      // サーバーの更新が成功したら、フロントエンドの状態も即時更新
      setReviews(reviews.map(review => {
        if (review.id === reviewId) {
          const likedBy = review.likedBy || [];
          const isLiked = likedBy.includes(currentUserId);
          const likeCount = review.likeCount || 0;

          return {
            ...review,
            likedBy: isLiked
              ? likedBy.filter(id => id !== currentUserId)
              : [...likedBy, currentUserId],
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


  if (loading) return <div>レビューを読み込み中...</div>;
  if (error) return <div style={{ color: 'red' }}>エラー: {error}</div>;

  return (
    <div className="comments-container">
      <h2 className="page-title">レビュー一覧</h2>
      {error && <div style={{ color: 'red', marginBottom: '10px' }}>エラー: {error}</div>}
      <div className="comment-list">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <div key={review.id} className="comment-item">
              {/* ★ ユーザーIDに応じてアバターのtitleを設定 */}
              <div className="comment-avatar" title={review.userId || '不明なユーザー'}></div>
              <div className="comment-content">
                <div className="comment-header">
                  <span className="comment-user">
                    {/* ★ review.userId を表示するように変更 */}
                    {review.userId || '(匿名レビュー)'}
                  </span>
                  <span className="comment-timestamp">{formatTimestamp(review.createdAt)}</span>
                </div>
                <p className="comment-text">{review.comment}</p>
                
                {/* ★ いいね機能のUIを追加 (新規追加) */}
                <div className="comment-footer">
                  <button
                    className={`like-button ${review.likedBy?.includes(currentUserId) ? 'liked' : ''}`}
                    onClick={() => handleLikeClick(review.id)}
                    title="いいね"
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
          <p>まだレビューはありません。</p>
        )}
      </div>
    </div>
  );
}

export default Comments;