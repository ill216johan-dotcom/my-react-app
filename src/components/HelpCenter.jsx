import React, { useState, useEffect, useMemo } from 'react';
import { Search, Menu, ChevronRight, ChevronDown, ThumbsUp, ThumbsDown, Calculator, Home, Folder, Sun, Moon, List, XCircle, Package, Box } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import CalculatorLayout from './CalculatorLayout.jsx';

// Вспомогательный компонент для подсветки текста
const HighlightText = React.memo(({ text = '', highlight = '' }) => {
    if (!highlight.trim()) return <span>{text}</span>;
    const safeHighlight = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${safeHighlight})`, 'gi');
    const parts = text.split(regex);
    return (
        <span>
            {parts.map((part, i) => 
                regex.test(part) ? (
                    <span key={i} className="bg-yellow-200 dark:bg-yellow-900/50 text-black dark:text-yellow-200 font-bold rounded-[2px] px-0.5">{part}</span>
                ) : <span key={i}>{part}</span>
            )}
        </span>
    );
});

const HelpCenter = ({ data }) => {
  const [inputValue, setInputValue] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState([]);
  
  const [toc, setToc] = useState([]); 
  const [processedContent, setProcessedContent] = useState(''); 
  const [showNoResultsToast, setShowNoResultsToast] = useState(false);
  
  const location = useLocation();
  const navigate = useNavigate();

  const [isDarkMode, setIsDarkMode] = useState(() => {
      const saved = localStorage.getItem('theme');
      return saved === 'dark'; 
  });

  const categories = useMemo(() => data?.categories || [], [data]);

  // --- СИНХРОНИЗАЦИЯ С URL ---
  useEffect(() => {
      // Убираем # и возможный префикс internal-, если вдруг пользователь зашел по прямой "грязной" ссылке
      const hash = location.hash.replace('#', '').replace('internal-', '');
      
      if (hash && categories.length > 0) {
          let found = null;
          let foundCatId = null;
          for (const cat of categories) {
              const art = (cat.articles || []).find(a => String(a.id) === hash);
              if (art) { found = art; foundCatId = cat.id; break; }
          }
          if (found) {
              setSelectedArticle(found);
              if (foundCatId) setExpandedCategories(prev => prev.includes(foundCatId) ? prev : [...prev, foundCatId]);
          }
      } else if (!hash && categories.length > 0 && !selectedArticle) {
          const firstCat = categories[0];
          if (firstCat.articles && firstCat.articles.length > 0) {
             openArticle(firstCat.articles[0], firstCat.id, false);
          }
      }
  }, [location.hash, categories]);

  const openArticle = (article, catId = null, pushHistory = true) => {
      setSelectedArticle(article);
      setMobileMenuOpen(false);
      window.scrollTo({top: 0, behavior: 'smooth'});
      if (catId) setExpandedCategories(prev => prev.includes(catId) ? prev : [...prev, catId]);
      if (article && article.id) {
          pushHistory ? navigate(`#${article.id}`) : navigate(`#${article.id}`, { replace: true });
      }
  };

  useEffect(() => {
      const timerId = setTimeout(() => setDebouncedTerm(inputValue), 300);
      return () => clearTimeout(timerId);
  }, [inputValue]);

  // Очистка HTML, генерация TOC и ИСПРАВЛЕНИЕ ССЫЛОК
  useEffect(() => {
    if (!selectedArticle) return;
    const parser = new DOMParser();
    const doc = parser.parseFromString(selectedArticle.content, 'text/html');
    const body = doc.body;

    // 1. Удаляем мусорные блоки навигации
    body.querySelectorAll('details').forEach(el => el.remove());
    body.querySelectorAll('div').forEach(div => {
        if ((div.textContent.toLowerCase().includes('на странице') || div.textContent.toLowerCase().includes('содержание')) && (div.querySelector('ul') || div.querySelector('ol'))) {
            div.remove();
        }
    });
    body.querySelectorAll('ul').forEach(ul => {
        const links = ul.querySelectorAll('a');
        if (links.length > 0) {
            let isAnchorList = true;
            links.forEach(link => {
                const href = link.getAttribute('href');
                if (!href || !href.startsWith('#')) isAnchorList = false;
            });
            if (isAnchorList) {
                ul.remove();
                const prev = ul.previousElementSibling;
                if (prev && (prev.tagName === 'H2' || prev.tagName === 'H3' || prev.tagName === 'P')) {
                    if (prev.textContent.toLowerCase().includes('содержание') || prev.textContent.toLowerCase().includes('на странице')) prev.remove();
                }
            }
        }
    });

    // 2. ИСПРАВЛЕНИЕ ССЫЛОК (НОВОЕ!)
    // Находим все ссылки, которые ведут на #internal-
    const internalLinks = body.querySelectorAll('a[href^="#internal-"]');
    internalLinks.forEach(link => {
        // Убираем target="_blank", чтобы они открывались в этом же окне
        link.removeAttribute('target');
        // Добавляем класс для стилизации (опционально)
        link.classList.add('internal-link');
    });
    
    // 3. Генерация оглавления
    const headers = body.querySelectorAll('h2, h3');
    const newToc = [];
    headers.forEach((header, index) => {
        const id = header.id || `section-${index}`;
        header.id = id;
        newToc.push({ id, text: header.textContent, level: header.tagName.toLowerCase() });
    });
    setToc(newToc);
    setProcessedContent(body.innerHTML);
  }, [selectedArticle]);

  const handleContentClick = (e) => {
    const link = e.target.closest('a');
    if (!link) return;
    
    // Получаем href из атрибута (он может быть как полным URL, так и относительным)
    const href = link.getAttribute('href');
    
    if (href && href.startsWith('#internal-')) {
      e.preventDefault(); // Останавливаем стандартный переход
      e.stopPropagation(); // Останавливаем всплытие
      
      const targetId = href.replace('#internal-', '');
      // Меняем URL (без перезагрузки) -> сработает useEffect выше
      navigate(`#${targetId}`);
    } 
    else if (href && !href.startsWith('#')) {
        if (link.target !== '_blank') { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
    }
  };

  // Helper function to calculate article relevance score
  const calculateScore = (article, query) => {
      let score = 0;
      const queryLower = query.toLowerCase().trim();
      const titleLower = (article.title || '').toLowerCase();
      const contentLower = (article.content || '').toLowerCase();
      
      // High Priority: Title matches = +100 points (ensures top placement)
      if (titleLower.includes(queryLower)) {
          score += 100;
      }
      
      // Medium Priority: Content matches = +10 points
      if (contentLower.includes(queryLower)) {
          score += 10;
      }
      
      return score;
  };

  const displayCategories = useMemo(() => {
      if (!debouncedTerm) return categories;
      const lowerTerm = debouncedTerm.toLowerCase().trim();
      let hasMatches = false;
      
      const mappedCats = categories.map(cat => {
          const safeArticles = cat.articles || [];
          
          // Calculate score for each article
          const articlesWithScores = safeArticles.map(art => ({
              ...art,
              score: calculateScore(art, lowerTerm)
          }));
          
          // Filter out articles with score 0 (no matches)
          const matchingArticles = articlesWithScores.filter(art => art.score > 0);
          
          // Sort by score descending (highest score first)
          matchingArticles.sort((a, b) => b.score - a.score);
          
          if (matchingArticles.length > 0) hasMatches = true;
          return { ...cat, articles: matchingArticles };
      }).filter(cat => cat.articles.length > 0);
      
      if (!hasMatches) return categories;
      return mappedCats;
  }, [categories, debouncedTerm]);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
        const hasRealMatches = categories.some(cat => (cat.articles || []).some(art => (art.title || '').toLowerCase().includes(inputValue.toLowerCase()) || (art.content || '').toLowerCase().includes(inputValue.toLowerCase())));
        if (!hasRealMatches && inputValue) {
            setShowNoResultsToast(true);
            setTimeout(() => setShowNoResultsToast(false), 3000);
        }
    }
  };

  const toggleCategory = (catId) => {
    setExpandedCategories(prev => prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]);
  };

  const scrollToSection = (id) => {
      const element = document.getElementById(id);
      if (element) window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' });
  };

  return (
    <CalculatorLayout title="">
      {showNoResultsToast && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-2 fade-in">
              <div className="bg-neutral-800 text-white px-4 py-2 rounded-lg shadow-xl flex items-center gap-2 border border-neutral-700">
                  <XCircle size={18} className="text-red-400"/>
                  <span>Ничего не найдено по запросу "{inputValue}"</span>
              </div>
          </div>
      )}

      {/* Mobile Sidebar Toggle Button */}
      <button 
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
        className="md:hidden fixed bottom-6 right-6 z-50 p-3 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 transition-colors"
        title="Открыть меню"
      >
        <Menu size={20}/>
      </button>

      {/* Main Content with Sidebar */}
      <div className="flex flex-1 -mx-6 lg:-mx-8">

        {/* SIDEBAR */}
        <aside className={`fixed inset-y-0 left-0 z-40 w-full md:w-80 md:static border-r transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} bg-[#F9FAFB] dark:bg-black border-slate-200 dark:border-white/10 pt-16 md:pt-0`}>
          {/* Mobile Overlay */}
          {mobileMenuOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-[-1] md:hidden" 
              onClick={() => setMobileMenuOpen(false)}
            />
          )}
          
          <div className="h-full overflow-y-auto custom-scrollbar flex flex-col">
            <div className="p-5 sticky top-0 z-10 bg-[#F9FAFB] dark:bg-black transition-colors duration-300">
              {/* Search Bar */}
              <div className="relative group">
                <Search className="absolute left-3 top-2.5 text-slate-400 dark:text-neutral-500 transition-colors group-focus-within:text-indigo-500" size={16} />
                <input 
                  type="text" 
                  placeholder="Поиск статей..." 
                  value={inputValue} 
                  onChange={(e) => setInputValue(e.target.value)} 
                  onKeyDown={handleSearchKeyDown} 
                  className="w-full rounded-lg pl-9 pr-3 py-2 text-sm transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-neutral-600" 
                />
              </div>
            </div>

            <div className="px-3 pb-3 flex-1 space-y-6">
              {/* Categories */}
              <div className="space-y-1">

                  {displayCategories.map(cat => {
                      const isSearchMode = debouncedTerm.length > 0;
                      const isOpen = expandedCategories.includes(cat.id) || isSearchMode;
                      const hasActiveArticle = cat.articles.some(a => a.id === selectedArticle?.id);
                      return (
                          <div key={cat.id} className="mb-1">
                              <button onClick={() => toggleCategory(cat.id)} className={`w-full flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-md transition-colors ${hasActiveArticle ? 'text-indigo-700 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20' : 'text-slate-500 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-900 hover:text-slate-800 dark:hover:text-neutral-200'}`}>
                                  <div className="flex items-center gap-2"><Folder size={16} className={hasActiveArticle ? 'fill-indigo-200 dark:fill-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-neutral-600'} /><span>{cat.title}</span></div>
                                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                              </button>
                              {isOpen && (
                                  <div className="mt-1 ml-2 pl-2 border-l border-slate-200 dark:border-neutral-800 space-y-0.5">
                                      {(cat.articles || []).map(art => {
                                          const isActive = selectedArticle?.id === art.id;
                                          return (
                                              <button key={art.id} onClick={() => openArticle(art, cat.id)} className={`w-full text-left px-3 py-1.5 text-[13px] rounded-md transition-all flex items-center gap-2 ${isActive ? 'bg-white dark:bg-neutral-800 text-indigo-600 dark:text-white font-medium shadow-sm border border-slate-100 dark:border-neutral-700' : 'text-slate-500 dark:text-neutral-500 hover:text-slate-900 dark:hover:text-neutral-300 hover:bg-slate-100/50 dark:hover:bg-neutral-900'}`}>
                                                  {isActive ? <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 flex-shrink-0"></span> : <span className="w-1.5 h-1.5 rounded-full bg-transparent flex-shrink-0"></span>}
                                                  <span className="truncate"><HighlightText text={art.title} highlight={debouncedTerm} /></span>
                                              </button>
                                          );
                                      })}
                                  </div>
                              )}
                          </div>
                      );
                  })}
              </div>
            </div>
          </div>
        </aside>

        {/* CONTENT */}
        <main className="flex-1 min-h-screen w-full transition-colors duration-300 bg-white dark:bg-[#0a0a0a]">
          <div className="max-w-[1200px] mx-auto flex items-start">
              <div className="flex-1 px-6 py-10 md:px-12 md:py-12 min-w-0"> 
                {selectedArticle ? (
                    <div className="animate-in fade-in duration-300">
                        <nav className="flex items-center gap-2 text-xs font-medium text-slate-400 dark:text-neutral-500 mb-8 uppercase tracking-wide">
                            <span>База знаний</span><ChevronRight size={12} />
                            {(() => {
                                const cat = categories.find(c => c.articles.some(a => a.id === selectedArticle.id));
                                return cat ? <span className="text-slate-600 dark:text-neutral-400">{cat.title}</span> : null;
                            })()}
                        </nav>
                        <h1 className="text-3xl md:text-4xl font-bold mb-8 leading-tight text-slate-900 dark:text-white">{selectedArticle.title}</h1>
                        <style>{`
                            .doc-content { font-size: 16px; line-height: 1.7; color: #334155; }
                            .dark .doc-content { color: #d4d4d4; }
                            .doc-content h1 { font-size: 2em; font-weight: 700; margin-top: 1.5em; margin-bottom: 0.5em; color: #1e293b; letter-spacing: -0.02em; }
                            .dark .doc-content h1 { color: #ffffff; }
                            .doc-content h2 { font-size: 1.5em; font-weight: 600; margin-top: 2em; margin-bottom: 0.75em; color: #1e293b; padding-bottom: 0.3em; border-bottom: 1px solid #e2e8f0; scroll-margin-top: 100px; }
                            .dark .doc-content h2 { color: #fafafa; border-bottom-color: #262626; }
                            .doc-content h3 { font-size: 1.25em; font-weight: 600; margin-top: 1.5em; margin-bottom: 0.5em; color: #475569; scroll-margin-top: 100px; }
                            .dark .doc-content h3 { color: #a3a3a3; }
                            .doc-content p { margin-bottom: 1.25em; }
                            .doc-content ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 1.25em; }
                            .doc-content ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 1.25em; }
                            .doc-content li { margin-bottom: 0.5em; padding-left: 0.2em; }
                            .doc-content a { color: #4f46e5; text-decoration: none; font-weight: 500; border-bottom: 1px solid transparent; transition: border-color 0.2s; }
                            .dark .doc-content a { color: #818cf8; }
                            .doc-content a:hover { border-bottom-color: currentColor; }
                            .doc-content blockquote { border-left: 3px solid #6366f1; background: #f8fafc; padding: 1em 1.5em; margin: 1.5em 0; border-radius: 0 8px 8px 0; font-style: italic; color: #475569; }
                            .dark .doc-content blockquote { background: #171717; color: #a3a3a3; border-left-color: #6366f1; }
                            .doc-content img { border-radius: 8px; border: 1px solid #e2e8f0; margin: 2em 0; max-width: 100%; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); }
                            .dark .doc-content img { border-color: #262626; opacity: 0.9; }
                            .doc-content code { background: #f1f5f9; padding: 0.2em 0.4em; rounded: 4px; font-size: 0.85em; color: #db2777; font-family: monospace; }
                            .dark .doc-content code { background: #262626; color: #f472b6; }
                            .doc-content pre { background: #1e293b; color: #f8fafc; padding: 1em; rounded: 8px; overflow-x: auto; margin: 1.5em 0; }
                            .dark .doc-content pre { background: #171717; border: 1px solid #262626; }
                        `}</style>
                        <div className="doc-content" dangerouslySetInnerHTML={{ __html: processedContent || selectedArticle.content }} onClick={handleContentClick} />
                        <div className="mt-20 pt-10 border-t border-slate-100 dark:border-neutral-800">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-slate-700 dark:text-neutral-400 text-sm">Было полезно?</h4>
                                <div className="flex gap-2">
                                    <button className="p-2 border rounded-lg transition border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800 hover:border-slate-300 dark:hover:border-neutral-600 text-slate-500 dark:text-neutral-500 hover:text-green-600"><ThumbsUp size={18}/></button>
                                    <button className="p-2 border rounded-lg transition border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800 hover:border-slate-300 dark:hover:border-neutral-600 text-slate-500 dark:text-neutral-500 hover:text-red-600"><ThumbsDown size={18}/></button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-[50vh] text-slate-400 dark:text-neutral-600"><div className="animate-pulse">Загрузка...</div></div>
                )}
            </div>
            <aside className="hidden xl:block w-64 shrink-0 sticky top-0 h-screen overflow-y-auto py-12 pr-6">
                {selectedArticle && toc.length > 0 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500 delay-100">
                        <h4 className="text-xs font-bold text-slate-400 dark:text-neutral-500 uppercase tracking-wider mb-4 flex items-center gap-2"><List size={14}/> На странице</h4>
                        <div className="space-y-1 border-l border-slate-200 dark:border-white/10">
                            {toc.map((item) => (
                                <button key={item.id} onClick={() => scrollToSection(item.id)} className={`block w-full text-left pl-4 py-1.5 text-sm transition-colors border-l-2 -ml-[2px] ${item.level === 'h3' ? 'pl-8 text-xs' : ''} text-slate-500 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-white hover:border-indigo-600 dark:hover:border-white border-transparent`}>{item.text}</button>
                            ))}
                        </div>
                    </div>
                )}
            </aside>
          </div>
        </main>
      </div>
    </CalculatorLayout>
  );
};

export default HelpCenter;