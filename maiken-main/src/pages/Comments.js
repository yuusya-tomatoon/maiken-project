import React, { useState, useEffect } from 'react';
import './Comments.css'; // 以前のCSSを流用（必要に応じて調整してください）

// バックエンドサーバーのURL
const API_URL = 'http://localhost:3000';

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

  if (loading) return <div>レビューを読み込み中...</div>;
  if (error) return <div style={{ color: 'red' }}>エラー: {error}</div>;

  return (
    <div className="comments-container">
      <h2 className="page-title">レビュー一覧</h2>
      <div className="comment-list">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <div key={review.id} className="comment-item">
              {/* ★ 現状では「誰が」投稿したか不明 */}
              <div className="comment-avatar" title="不明なユーザー"></div>
              <div className="comment-content">
                <div className="comment-header">
                  <span className="comment-user">
                    {/* ★ ユーザーIDが保存されていないため表示できない */}
                    (匿名レビュー)
                  </span>
                  <span className="comment-timestamp">{formatTimestamp(review.createdAt)}</span>
                </div>
                <p className="comment-text">{review.comment}</p>
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