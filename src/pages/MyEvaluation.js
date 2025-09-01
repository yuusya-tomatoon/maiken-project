import React, { useState, useEffect } from 'react';

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

  const handleEvaluationSubmit = () => {
    console.log('自分の評価データ:', foodAmounts);
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