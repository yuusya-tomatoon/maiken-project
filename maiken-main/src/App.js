import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import About from './pages/About';
import Calendar from './pages/Calendar';
import MainScreen from './pages/MainScreen';
import MyEvaluation from './pages/MyEvaluation';
import Review from './pages/Review';
import Comments from './pages/Comments';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('about');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // MainScreenの項目をApp.jsで管理
  const [mainScreenState, setMainScreenState] = useState({
    selectedDate: '',
    selectedTime: '',
    selectedMeal: ''
  });

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const renderPage = () => {
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

  return (
    <div className="app-container">
      {isSidebarOpen ? (
        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          toggleSidebar={toggleSidebar}
        />
      ) : (
        <button onClick={toggleSidebar} className="hamburger-menu-closed">
          <span></span>
          <span></span>
          <span></span>
        </button>
      )}
      <div className="main-content">{renderPage()}</div>
    </div>
  );
}

export default App;