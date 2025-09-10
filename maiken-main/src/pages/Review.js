import React, { useState, useEffect } from 'react';
import StarRating from '../components/StarRating';

const Review = ({ setCurrentPage }) => {
  const [reviewData, setReviewData] = useState({
    dishName: '',
    rating: 0,
    comment: ''
  });
  const [isReviewButtonEnabled, setIsReviewButtonEnabled] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const allFieldsFilled =
      reviewData.dishName.trim() !== '' &&
      reviewData.rating > 0 &&
      reviewData.comment.trim() !== '';
    setIsReviewButtonEnabled(allFieldsFilled);
  }, [reviewData]);

  const handleReviewChange = (field, value) => {
    setReviewData({ ...reviewData, [field]: value });
  };

  const handleReviewSubmit = () => {
    console.log('レビューデータ:', reviewData);
    setIsCompleted(true);
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
          <label>料理</label>
          <input type="text" value={reviewData.dishName} onChange={(e) => handleReviewChange('dishName', e.target.value)} />
        </div>
        <div className="review-item">
          <label>星 (5段階)</label>
          <StarRating rating={reviewData.rating} setRating={(value) => handleReviewChange('rating', value)} />
        </div>
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