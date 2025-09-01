import React from 'react';

const Sidebar = ({ currentPage, setCurrentPage, toggleSidebar }) => {
  const sidebarItems = [
    { id: 'about', label: '説明・使い方' },
    { id: 'calendar', label: 'カレンダー機能' },
    { id: 'main', label: '自分の評価+レビュー' },
    { id: 'comments', label: 'コメント閲覧機能' },
  ];

  return (
    <div className="sidebar-container">
      <button onClick={toggleSidebar} className="hamburger-menu">
        <span></span>
        <span></span>
        <span></span>
      </button>

      <div className="sidebar-title">まいけん</div>

      <ul className="sidebar-menu">
        {sidebarItems.map((item) => (
          <li
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={`sidebar-item ${currentPage === item.id ? 'selected' : ''}`}
          >
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;