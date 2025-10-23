// src/App.js

import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import About from './pages/About';
import Calendar from './pages/Calendar';
import MainScreen from './pages/MainScreen';
import MyEvaluation from './pages/MyEvaluation';
import Review from './pages/Review';
import Comments from './pages/Comments';
import './App.css';

// ★ サーバーのURLを定数として定義
const API_URL = 'http://localhost:3000';

function App() {
  const [currentPage, setCurrentPage] = useState('about');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // ★ サーバーの接続状態を管理するためのstateを追加
  const [serverStatus, setServerStatus] = useState('connecting'); // 'connecting', 'online', 'offline'

  // MainScreenの項目をApp.jsで管理
  const [mainScreenState, setMainScreenState] = useState({
    selectedDate: '',
    selectedTime: '',
    selectedMeal: ''
  });

  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  // ★ サーバーの生存確認を行う処理を追加 ★
  // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★
  useEffect(() => {
    // 生存確認を行う関数
    const checkServerHealth = () => {
      fetch(`${API_URL}/health`)
        .then(response => {
          // サーバーからの応答があれば 'online' に設定
          if (response.ok) {
            setServerStatus('online');
          } else {
            setServerStatus('offline');
          }
        })
        .catch(() => {
          // fetch自体が失敗した場合 (サーバーがダウンしているなど) は 'offline' に設定
          setServerStatus('offline');
        });
    };

    // 最初に一度、すぐに確認
    checkServerHealth();

    // その後、5秒ごとに定期的に確認
    const intervalId = setInterval(checkServerHealth, 5000);

    // コンポーネントがアンマウントされるときに、定期実行をクリーンアップ
    return () => clearInterval(intervalId);
  }, []); // []が空なので、このuseEffectは最初のマウント時に1回だけ実行される


  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const renderPage = () => {
    // ★ サーバーがオフラインの場合は、どのページでもエラーメッセージを表示
    if (serverStatus === 'offline') {
      return (
        <div>
          <h1 style={{ color: 'red' }}>サーバーに接続できません</h1>
          <p>バックエンドサーバーが起動しているか確認してください。</p>
        </div>
      );
    }

    switch (currentPage) {
      case 'about':
        return <About />;
      case 'calendar':
        return <Calendar />;
      case 'main':
        return (
          <MainScreen
            mainScreenState={mainScreenState}
            setMainScreenState={setMainScreenState}
            setCurrentPage={setCurrentPage}
          />
        );
      case 'myEvaluation':
        return <MyEvaluation setCurrentPage={setCurrentPage} />;
      case 'review':
        return <Review setCurrentPage={setCurrentPage} />;
      case 'comments':
        return <Comments />;
      default:
        return <About />;
    }
  };

  // ★ 接続状態を示すためのバナーのスタイル
  const statusBannerStyle = {
    padding: '10px',
    textAlign: 'center',
    fontWeight: 'bold',
    color: 'white',
    position: 'fixed',
    width: '100%',
    top: 0,
    left: 0,
    zIndex: 1000,
  };


  return (
    // 🔴 修正点1: app-containerに状態クラスを追加（メインコンテンツの調整用）
    <div className={`app-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {/* ★ 接続状態に応じてバナーを表示 */}
      {serverStatus === 'offline' && (
        <div style={{ ...statusBannerStyle, backgroundColor: '#e74c3c' /* 赤 */ }}>
          サーバー接続が切断されました
        </div>
      )}
      {serverStatus === 'connecting' && (
        <div style={{ ...statusBannerStyle, backgroundColor: '#f39c12' /* オレンジ */ }}>
          サーバーに接続中...
        </div>
      )}

      {/* 🔴 修正点2: isSidebarOpenの条件分岐を外し、Sidebarを常にレンダリングする 🔴 */}
      <Sidebar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        toggleSidebar={toggleSidebar}
        // 🔴 必須: isOpen propをSidebarに渡し、CSSアニメーションを制御させる 🔴
        isOpen={isSidebarOpen}
      />

      {/* 🔴 修正点3: 閉じた状態のハンバーガーメニューは、サイドバーが閉じてるときだけ表示 */}
      {/* (サイドバーを開くためのボタン) */}
      {!isSidebarOpen && (
        <button onClick={toggleSidebar} className="hamburger-menu-closed">
          <span></span>
          <span></span>
          <span></span>
        </button>
      )}

      <div className="main-content" style={{ paddingTop: serverStatus !== 'online' ? '50px' : '0' }}>
        {renderPage()}
      </div>
    </div>
  );
}

export default App;