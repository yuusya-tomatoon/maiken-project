import React, { useState, useEffect } from 'react';
// import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; // 削除
// import { db } from '../firebase'; // 削除

// ★ デモ用のユーザーID (本来は認証情報から取得します)
// (このIDは server.js の "userId" として渡されます)
const currentUserId = 'user_test_001'; 

const Review = ({ setCurrentPage }) => {
  const [reviewData, setReviewData] = useState({
    comment: ''
  });
  const [isReviewButtonEnabled, setIsReviewButtonEnabled] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const allFieldsFilled = reviewData.comment.trim() !== '';
    setIsReviewButtonEnabled(allFieldsFilled);
  }, [reviewData]);

  const handleReviewChange = (field, value) => {
    setReviewData({ ...reviewData, [field]: value });
  };

  const handleReviewSubmit = async () => {
    // サーバーの /reviews エンドポイントにデータを送信する処理に変更
    try {
      const response = await fetch('http://localhost:3000/reviews', { // サーバーURLに合わせて変更してください
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          comment: reviewData.comment,
          userId: currentUserId // ★ 修正: 不足していた userId を追加
        }),
      });

      if (!response.ok) {
        // ★ サーバーからの具体的なエラーメッセージを取得して表示
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      console.log('レビューデータが正常にサーバー経由で保存されました。');
      setIsCompleted(true);
    } catch (error) {
      console.error('データの保存中にエラーが発生しました:', error);
      alert(`レビューの登録に失敗しました: ${error.message}`); // ★ エラーメッセージをアラートに表示
    }
  };

  if (isCompleted) {
    // ... (変更なし)
    return (
      <div className="completion-screen">
        <p>回答終了。<br />結果はカレンダーをご参照ください。</p>
        <div className="action-buttons">
          <button onClick={() => setCurrentPage('main')}>前の画面に戻る</button>
        </div>
      </div>
    );
  }

  return (
    // ... (変更なし)
    <div className="screen-container">
      <h2>レビュー</h2>
      <div className="review-step">
        <div className="review-item">
          <label>コメント</label>
          <textarea value={reviewData.comment} onChange={(e) => handleReviewChange('comment', e.target.value)} maxLength="1000" />
          <div className="char-limit">
            文字制限 {reviewData.comment.length}/1000文字
          </div>
        </div>
        <div className="action-buttons">
          <button onClick={handleReviewSubmit} disabled={!isReviewButtonEnabled}>回答</button>
          <button onClick={() => setCurrentPage('main')}>キャンセル</button>
        </div>
      </div>
    </div>
  );
};

export default Review;