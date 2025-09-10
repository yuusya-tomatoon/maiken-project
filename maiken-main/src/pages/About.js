import React from 'react';

// MaikenIntro component
const MaikenIntro = () => {
  return (
    <div className="B_section">
      <h2 className="B_title">まいけんとは</h2>
      <ol className="B_ol">
        <li className="B_li">舞鶴高専の鶴友寮の食堂専用アプリ</li>
        <li className="B_li">自分の健康生活の評価</li>
        <li className="B_li">料理への評価</li>
        <li className="B_li">他の人からの料理への評価</li>
        <li className="B_li">その日の献立の確認が出来ます。</li>
      </ol>
    </div>
  );
};

// MaikenUsage component
const MaikenUsage = () => {
  return (
    <div className="A_section">
      <h2 className="A_title">まいけんの使い方</h2>
      <ol className="A_ol">
        <li className="A_li">左上のボタンからサイドバーを開き、対象の位置に移動。</li>
      </ol>
    </div>
  );
};

const About = () => {
  return (
    <div className="main-content">
      <h2 className="page-title">説明・使い方</h2>
      <MaikenIntro />
      <MaikenUsage />
    </div>
  );
};

export default About;
