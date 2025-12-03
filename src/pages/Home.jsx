import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import AiChatWidget from '../components/AiChatWidget';
import HelpCenter from '../components/HelpCenter';
import FboCalculator from '../components/FboCalculator';
import OzonCalculator from '../components/OzonCalculator';
import PackagingCalculator from '../components/PackagingCalculator';
import AdminPanel from '../components/AdminPanel';

function Home() {
  // Функция обработки данных (оставили как была)
  const transformData = (incoming) => {
    if (!incoming) return { categories: [] };
    let rawArticles = [];
    // Проверка: это массив или объект с категориями?
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

  // Состояние теперь может быть null, пока данные грузятся
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Используем useEffect для загрузки данных
  useEffect(() => {
    // 1. Сначала пробуем взять из LocalStorage (если ты там что-то менял)
    const saved = localStorage.getItem('siteData');
    if (saved) {
        try { 
            setData(JSON.parse(saved));
            setLoading(false);
            return; // Если нашли, выходим, файл качать не надо
        } catch (e) { console.error(e); }
    }

    // 2. Если в LocalStorage пусто, качаем файл из папки public
    // Обрати внимание: путь просто '/knowledgeBase.json'
    fetch('/knowledgebase.json')
        .then(response => {
            if (!response.ok) {
                throw new Error("Не удалось загрузить базу данных");
            }
            return response.json();
        })
        .then(json => {
            // Превращаем сырой JSON в структуру категорий
            const structuredData = transformData(json);
            setData(structuredData);
            setLoading(false);
        })
        .catch(error => {
            console.error("Ошибка при загрузке данных:", error);
            setLoading(false);
        });
  }, []); // Пустые скобки = выполнить 1 раз при старте

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

  // Показываем "Загрузка...", пока данные не пришли
  if (loading) {
      return <div className="p-10 text-center text-gray-500">Загрузка базы данных...</div>;
  }

  // Если данных нет и загрузка прошла (ошибка), чтобы сайт не упал
  if (!data) {
      return <div className="p-10 text-center text-red-500">Ошибка: Данные не найдены. Проверьте файл public/knowledgeBase.json</div>;
  }

  return (
    <div className="relative">
        <Routes>
          <Route path="/" element={<HelpCenter data={data} />} />
          <Route path="/calculator" element={<FboCalculator />} />
          <Route path="/ozon-calculator" element={<OzonCalculator />} />
          <Route path="/packaging-calculator" element={<PackagingCalculator />} />
          <Route path="/admin" element={<AdminPanel data={data} onSave={handleDataUpdate} />} />
        </Routes>
        
        <button onClick={hardReset} className="fixed bottom-2 left-2 text-[10px] text-slate-400 hover:text-red-600 font-bold z-50 bg-white/80 px-2 py-1 rounded shadow border">
          ↻ ОБНОВИТЬ СТРУКТУРУ
        </button>
        <AiChatWidget />
    </div>
  );
}

export default Home;

