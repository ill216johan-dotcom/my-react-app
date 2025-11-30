import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import HelpCenter from './components/HelpCenter';
import FboCalculator from './components/FboCalculator';
import OzonCalculator from './components/OzonCalculator';        // <--- НОВОЕ
import PackagingCalculator from './components/PackagingCalculator'; // <--- НОВОЕ
import AdminPanel from './components/AdminPanel';
import rawData from './data/knowledgeBase.json';

function App() {
  const transformData = (incoming) => {
    if (!incoming) return { categories: [] };
    let rawArticles = [];
    if (Array.isArray(incoming)) rawArticles = incoming;
    else if (incoming.categories && Array.isArray(incoming.categories)) rawArticles = incoming.categories;
    else return { categories: [] };

    const groups = {};
    rawArticles.forEach((item, index) => {
        const catName = item.category || "Общие вопросы";
        if (!groups[catName]) {
            groups[catName] = { id: `cat-${catName}`, title: catName, articles: [] };
        }
        groups[catName].articles.push({
            id: item.id || `art-${index}`,
            title: item.title || 'Без заголовка',
            content: item.content || '',
            url: item.url || ''
        });
    });
    return { categories: Object.values(groups) };
  };

  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('siteData');
    if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return transformData(rawData);
  });

  const handleDataUpdate = (newData) => {
    setData(newData);
    localStorage.setItem('siteData', JSON.stringify(newData));
  };

  const hardReset = () => {
      if(confirm("Сбросить кэш и перезагрузить структуру из файла?")) {
          localStorage.removeItem('siteData');
          window.location.reload();
      }
  };

  return (
    <Router>
      <div className="relative">
          <Routes>
            <Route path="/" element={<HelpCenter data={data} />} />
            <Route path="/calculator" element={<FboCalculator />} />
            <Route path="/ozon-calculator" element={<OzonCalculator />} />           {/* <--- НОВОЕ */}
            <Route path="/packaging-calculator" element={<PackagingCalculator />} /> {/* <--- НОВОЕ */}
            <Route path="/admin" element={<AdminPanel data={data} onSave={handleDataUpdate} />} />
          </Routes>
          
          <button onClick={hardReset} className="fixed bottom-2 left-2 text-[10px] text-slate-400 hover:text-red-600 font-bold z-50 bg-white/80 px-2 py-1 rounded shadow border">
            ↻ ОБНОВИТЬ СТРУКТУРУ
          </button>
      </div>
    </Router>
  );
}

export default App;