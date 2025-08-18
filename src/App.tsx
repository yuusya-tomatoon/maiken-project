import './App.css';

function App() {
  // 各ボタンがクリックされたときの処理（今はコンソールにログを出すだけ）
  const handleShowMenu = () => {
    console.log('メニュー表示ボタンがクリックされました');
  };

  const handleReviewInput = () => {
    console.log('レビュー入力ボタンがクリックされました');
  };

  const handleViewReviews = () => {
    console.log('レビュー閲覧ボタンがクリックされました');
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>レビューアプリ ホーム画面</h1>
        
        {/* ボタンを3つ設置 */}
        <button onClick={handleShowMenu}>
          メニューを表示
        </button>
        
        <button onClick={handleReviewInput}>
          レビューを入力する
        </button>
        
        <button onClick={handleViewReviews}>
          みんなのレビューを見る
        </button>

      </header>
    </div>
  );
}

export default App;