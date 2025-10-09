import React, { useState, useEffect } from 'react';
import './Comments.css'; // スタイルを適用するためにCSSファイルをインポート

// バックエンドサーバーのURL
const API_URL = 'http://localhost:3000';

function Comments() {
  // 注意：これはデモ用の固定IDです。
  // 実際のアプリでは、どの献立のコメントか動的に指定する必要があります。
  // 例：カレンダーページから渡されたIDを使用する
  const mealId = 'your-actual-meal-id'; // Firestoreに存在する実際の献立IDに置き換えてください

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // コンポーネントが最初に表示されたときにコメントを取得する
  useEffect(() => {
    const fetchComments = async () => {
      // サーバーから特定の献立IDのコメントを取得
      try {
        const response = await fetch(`${API_URL}/meals/${mealId}/comments`);
        if (!response.ok) {
          throw new Error('コメントの取得に失敗しました。サーバーが起動しているか確認してください。');
        }
        const data = await response.json();
        setComments(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchComments();
  }, [mealId]); // mealIdが変更されたら再取得する
  
  // Firestoreのタイムスタンプを日本の日付時刻形式に変換する関数
  const formatTimestamp = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return '';
    return new Date(timestamp.seconds * 1000).toLocaleString('ja-JP');
  };

  // データの読み込み中やエラー発生時の表示
  if (loading) return <div>コメントを読み込み中...</div>;
  if (error) return <div style={{ color: 'red' }}>エラー: {error}</div>;

  return (
    <div className="comments-container">
      <h2 className="page-title">コメント</h2>

      {/* コメントタイムライン */}
      <div className="comment-list">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="comment-item">
              <div className="comment-avatar" title={comment.userId}></div>
              <div className="comment-content">
                <div className="comment-header">
                  <span className="comment-user">{comment.userId}</span>
                  <span className="comment-timestamp">{formatTimestamp(comment.createdAt)}</span>
                </div>
                <p className="comment-text">{comment.text}</p>
              </div>
            </div>
          ))
        ) : (
          <p>この献立にはまだコメントはありません。</p>
        )}
      </div>
    </div>
  );
}

export default Comments;
