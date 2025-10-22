import React, { useState, useEffect } from 'react';
// import { collection, addDoc, serverTimestamp } from 'firebase/firestore'; // 削除
// import { db } from '../firebase'; // 削除

const MyEvaluation = ({ setCurrentPage }) => {
  const [foodAmounts, setFoodAmounts] = useState({
    '筑前煮': '',
    '温泉卵': '',
    '温野菜サラダ': '',
    '味噌汁': '',
    'ごはん(A定食)': ''
  });
  const [isEvaluationButtonEnabled, setIsEvaluationButtonEnabled] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const allFieldsFilled = Object.values(foodAmounts).every(amount => amount !== '' && amount !== null);
    setIsEvaluationButtonEnabled(allFieldsFilled);
  }, [foodAmounts]);

  const handleFoodAmountChange = (dish, value) => {
    const amount = Math.min(Math.max(0, value), 200);
    setFoodAmounts({ ...foodAmounts, [dish]: amount });
  };

  const handleEvaluationSubmit = async () => {
    // サーバーの /evaluations エンドポイントにデータを送信する処理に変更 (新規エンドポイント)
    try {
      const response = await fetch('http://localhost:3000/evaluations', { // サーバーURLに合わせて変更してください
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          foodAmounts: foodAmounts,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('自分の評価データが正常にサーバー経由で保存されました。');
      setIsCompleted(true);
    } catch (error) {
      console.error('データの保存中にエラーが発生しました:', error);
      alert('評価の登録に失敗しました。');
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
      <h2>自分の評価</h2>
      <p>料理をそれぞれ何割食べたのか</p>
      <table className="food-table">
        <thead>
          <tr>
            <th>料理</th>
            <th>どれくらい食べたか %</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(foodAmounts).map((dish) => (
            <tr key={dish}>
              <td>{dish}</td>
              <td>
                <input
                  type="number"
                  min="0"
                  max="200"
                  value={foodAmounts[dish]}
                  onChange={(e) => handleFoodAmountChange(dish, e.target.value)}
                />
                %
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="action-buttons">
        <button onClick={handleEvaluationSubmit} disabled={!isEvaluationButtonEnabled}>回答</button>
        <button onClick={() => setCurrentPage('main')}>キャンセル</button>
      </div>
    </div>
  );
};

export default MyEvaluation;