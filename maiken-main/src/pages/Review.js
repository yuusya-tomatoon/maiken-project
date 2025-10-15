import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; // Firestore関連のimportを追加
import { db } from '../firebase'; // 作成したfirebase.jsからdbオブジェクトをimport

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
    // Firebaseにデータを保存する処理
    try {
      await addDoc(collection(db, 'reviews'), {
        ...reviewData,
        createdAt: serverTimestamp() // データが作成された日時を記録
      });
      console.log('レビューデータが正常に保存されました。');
      setIsCompleted(true);
    } catch (error) {
      console.error('データの保存中にエラーが発生しました:', error);
      // エラー処理
    }
  };

  if (isCompleted) {
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