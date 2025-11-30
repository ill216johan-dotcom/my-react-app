import React, { useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css'; // Стили для красоты редактора
import { Link } from 'react-router-dom';
import { Save, Trash2, ArrowLeft, Plus, FileText, AlertCircle } from 'lucide-react';

const AdminPanel = ({ data, onSave }) => {
  const [selectedArticleId, setSelectedArticleId] = useState(null);
  
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCatId, setEditCatId] = useState(data?.categories?.[0]?.id || 1);

  // Настройка кнопок редактора (Тулбар)
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }], // Заголовки
      ['bold', 'italic', 'underline', 'strike'], // Жирный, курсив...
      [{ 'list': 'ordered'}, { 'list': 'bullet' }], // Списки
      ['link', 'image'], // Ссылка и Картинка
      ['clean'] // Очистить формат
    ],
  };

  // --- ЗАЩИТА ---
  const categories = data?.categories || [];
  if (categories.length === 0) {
    return (
      <div className="min-h-screen bg-slate-100 p-8 flex items-center justify-center">
        <div className="bg-white p-6 rounded-xl shadow text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4"/>
          <h2 className="text-xl font-bold text-slate-800">Нет данных</h2>
          <Link to="/" className="text-indigo-600 font-bold hover:underline">На главную</Link>
        </div>
      </div>
    );
  }

  const handleSelectArticle = (article, catId) => {
    setSelectedArticleId(article.id);
    setEditTitle(article.title || '');
    setEditContent(article.content || ''); // Загружаем HTML статьи в редактор
    setEditCatId(catId);
  };

  const handleNewArticle = () => {
    setSelectedArticleId(null);
    setEditTitle('');
    setEditContent('');
  };

  const handleSave = () => {
    if (!editTitle || !editContent) return alert("Заполните заголовок и текст");

    const newCategories = categories.map(cat => {
        const currentArticles = cat.articles || [];
        // Создание
        if (!selectedArticleId && String(cat.id) === String(editCatId)) {
            return {
                ...cat,
                articles: [...currentArticles, { id: Date.now(), title: editTitle, content: editContent }]
            };
        }
        // Обновление
        const updatedArticles = currentArticles.map(art => {
            if (art.id === selectedArticleId) {
                return { ...art, title: editTitle, content: editContent };
            }
            return art;
        });
        return { ...cat, articles: updatedArticles };
    });

    onSave({ ...data, categories: newCategories });
    alert("Сохранено!");
    if (!selectedArticleId) handleNewArticle();
  };

  const handleDelete = () => {
    if (!selectedArticleId) return;
    if (!window.confirm("Удалить статью?")) return;
    const newCategories = categories.map(cat => ({
        ...cat,
        articles: (cat.articles || []).filter(a => a.id !== selectedArticleId)
    }));
    onSave({ ...data, categories: newCategories });
    handleNewArticle();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span className="bg-indigo-100 text-indigo-600 p-1 rounded">Admin</span> Панель
        </h1>
        <Link to="/" className="text-sm font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1"><ArrowLeft size={16}/> На сайт</Link>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <div className="w-80 bg-white border-r overflow-y-auto p-4 hidden md:block">
            <button onClick={handleNewArticle} className="w-full bg-indigo-600 text-white py-2 rounded mb-6 flex items-center justify-center gap-2 hover:bg-indigo-700 font-medium"><Plus size={18}/> Новая статья</button>
            <div className="space-y-6">
                {categories.map(cat => (
                    <div key={cat.id}>
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-2 tracking-wider">{cat.title}</h3>
                        <div className="space-y-1">
                            {(cat.articles || []).map(art => (
                                <div key={art.id} onClick={() => handleSelectArticle(art, cat.id)} className={`text-sm p-2 rounded cursor-pointer truncate flex items-center gap-2 ${selectedArticleId === art.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
                                    <FileText size={14}/> {art.title}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* EDITOR AREA */}
        <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-slate-700">{selectedArticleId ? 'Редактирование' : 'Новая статья'}</h2>
                    {selectedArticleId && <button onClick={handleDelete} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 size={20}/></button>}
                </div>
                <div className="space-y-4">
                    {!selectedArticleId && (
                        <div><label className="block text-sm font-bold text-slate-700 mb-1">Категория</label>
                             <select className="w-full border p-2 rounded bg-white" value={editCatId} onChange={e => setEditCatId(e.target.value)}>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                             </select>
                        </div>
                    )}
                    <input className="w-full text-2xl font-bold border-0 border-b border-slate-200 px-0 py-2 outline-none" placeholder="Заголовок..." value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                    
                    {/* ВОТ ОН - ВАШ НОВЫЙ РЕДАКТОР */}
                    <div className="h-[400px] mb-12">
                        <ReactQuill 
                            theme="snow"
                            value={editContent}
                            onChange={setEditContent}
                            modules={modules}
                            style={{ height: '350px' }}
                        />
                    </div>
                    
                    <div className="pt-4 border-t flex justify-end">
                        <button onClick={handleSave} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2"><Save size={18}/> Сохранить</button>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};
export default AdminPanel;