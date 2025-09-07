import React from 'react';

const About = () => {
  return (
    <div>
      <h2>説明・使い方</h2>
      
      {/* MaikenIntro の内容を統合 */}
      <div>
        <h2>まいけんとは</h2>
        <ol>
          <li>舞鶴高専の鶴友寮の食堂専用アプリ</li>
          <li>自分の健康生活の評価</li>
          <li>料理への評価</li>
          <li>他の人からの料理への評価</li>
          <li>その日の献立の確認が出来ます。</li>
        </ol>
      </div>

      {/* MaikenUsage の内容を統合 */}
      <div>
        <h2>まいけんの使い方</h2>
        <ol>
          <li>左上のボタンからサイドバーを開き、対象の位置に移動。</li>
        </ol>
      </div>
    </div>
  );
};

export default About;
