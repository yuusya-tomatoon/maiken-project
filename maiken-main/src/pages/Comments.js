import React, { useState, useEffect } from 'react';
import './Comments.css'; // スタイルを適用するためにCSSファイルをインポート

// バックエンドサーバーのURL
const API_URL = 'http://localhost:3000';

// ★ 現在のユーザーID（デモ用）
// 本来はログイン状態などから動的に取得します。
const currentUserId = 'user_test_001';

/**
 * ★ コメント投稿用のAPIを呼び出すヘルパー関数
 */
const postComment = async (mealId, userId, text) => {
  const response = await fetch(`${API_URL}/meals/${mealId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, text }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'コメントの投稿に失敗しました。');
  }
  return await response.json();
};


function Comments() {
  // 注意：これはデモ用の固定IDです。
  // 実際のアプリでは、どの献立のコメントか動的に指定する必要があります。
  const mealId = 'your-actual-meal-id'; // Firestoreに存在する実際の献立IDに置き換えてください

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ★ 新規コメント投稿用のState
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // 投稿中の二重送信防止

  /**
   * ★ コメントを取得する関数 (useEffectから分離)
   */
  const fetchComments = async () => {
    // 取得開始時にローディングをtrueにする（再取得時も同様）
    setLoading(true);
    setError(null); // 以前のエラーをクリア
    try {
      const response = await fetch(`${API_URL}/meals/${mealId}/comments`);
      if (!response.ok) {
        throw new Error('コメントの取得に失敗しました。');
      }
      const data = await response.json();
      setComments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // コンポーネントが最初に表示されたときにコメントを取得する
  useEffect(() => {
    fetchComments();
    // fetchComments関数自体は依存配列に含めず、mealIdのみに依存させます
    // (fetchCommentsをuseCallbackでラップする方法もあります)
  }, [mealId]);

  /**
   * ★ コメント投稿ボタンがクリックされたときの処理
   */
  const handleCommentSubmit = async (e) => {
    e.preventDefault(); // フォームのデフォルト送信を防ぐ
    if (newCommentText.trim() === '' || isSubmitting) {
      return; // 空のコメントや送信中は処理しない
    }

    setIsSubmitting(true);
    setError(null); // エラーをリセット

    try {
      // サーバーにコメントを投稿する (server.jsの /meals/:mealId/comments を呼び出す)
      await postComment(mealId, currentUserId, newCommentText);
      
      // 投稿が成功したらテキストエリアを空にする
      setNewCommentText('');
      
      // ★ 投稿成功後、コメントリストを再取得して画面を更新する
      await fetchComments(); 

    } catch (err) {
      console.error(err.message);
      setError('コメントの投稿に失敗しました。' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };


  // ★ いいねボタンがクリックされたときの処理
  const handleLikeClick = async (commentId) => {
    try {
      const response = await fetch(`${API_URL}/meals/${mealId}/comments/${commentId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      });

      if (!response.ok) {
        throw new Error('いいねの更新に失敗しました。');
      }

      // サーバーの更新が成功したら、フロントエンドの状態も即時更新してUIに反映させる
      setComments(comments.map(comment => {
        if (comment.id === commentId) {
          const likedBy = comment.likedBy || [];
          const isLiked = likedBy.includes(currentUserId);
          const likeCount = comment.likeCount || 0;

          // いいね状態をトグル（切り替え）し、いいね数を増減させる
          return {
            ...comment,
            likedBy: isLiked
              ? likedBy.filter(id => id !== currentUserId)
              : [...likedBy, currentUserId],
            likeCount: isLiked ? likeCount - 1 : likeCount + 1,
          };
        }
        return comment;
      }));

    } catch (err) {
      console.error(err.message);
      // エラーをstateにセットしてUIに表示する
      setError(err.message);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp || !timestamp.seconds) return '';
    return new Date(timestamp.seconds * 1000).toLocaleString('ja-JP');
  };

  // 最初の読み込み時
  if (loading && comments.length === 0) return <div>コメントを読み込み中...</div>;

  return (
    <div className="comments-container">
      <h2 className="page-title">コメント</h2>

      {/* ★ コメント投稿フォームを追加 */}
      <form onSubmit={handleCommentSubmit} className="comment-form">
        <textarea
          className="comment-textarea"
          value={newCommentText}
          onChange={(e) => setNewCommentText(e.target.value)}
          placeholder="コメントを入力..."
          rows="3"
          disabled={isSubmitting} // 送信中は非活性
        />
        <button 
          type="submit" 
          className="comment-submit-button" 
          disabled={newCommentText.trim() === '' || isSubmitting}
        >
          {isSubmitting ? '送信中...' : '投稿する'}
        </button>
      </form>
      
      {/* ★ エラー表示エリア (投稿エラーといいねエラーがここに表示されます) */}
      {error && <div className="comment-error-display" style={{ color: 'red' }}>エラー: {error}</div>}

      {/* ★ ローディング表示 (再取得時) */}
      {loading && <div className="comment-loading-display">コメントを更新中...</div>}


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
                {/* いいね機能のUI */}
                <div className="comment-footer">
                  <button
                    className={`like-button ${comment.likedBy?.includes(currentUserId) ? 'liked' : ''}`}
                    onClick={() => handleLikeClick(comment.id)}
                    title="いいね"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-1.113 2.175-.246 5.259 2.028 7.288l4.287 4.287a.5.5 0 0 0 .708 0l4.287-4.287c2.274-2.03 3.14-5.113 2.028-7.288-1.113-2.175-4.2-2.772-5.883-1.043L8 2.748zM8 15C-7.333 4.868 3.279-2.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-2.042 23.333 4.867 8 15z"/>
                    </svg>
                  </button>
                  <span className="like-count">{comment.likeCount || 0}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          // ローディング中でない場合のみ「コメントなし」を表示
          !loading && <p>この献立にはまだコメントはありません。</p>
        )}
      </div>
    </div>
  );
}

export default Comments;