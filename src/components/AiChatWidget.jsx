import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const AiChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Привет! Я ИИ-помощник. Я изучил всю базу знаний и готов ответить на вопросы. Спрашивайте!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Dynamic API URL based on environment
  const API_URL = import.meta.env.PROD
    ? '/api/chat'                       // Production (Vercel Serverless)
    : 'http://localhost:3001/api/chat'; // Development (Local Node Server)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    const currentInput = input;
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: currentInput,
          history: messages.map(m => ({ role: m.role, text: m.content }))
        })
      });

      const data = await response.json();
      
      // Handle server errors (400, 500, etc.)
      if (!response.ok) {
        throw new Error(data.error || `Ошибка сервера: ${response.status}`);
      }
      
      if (data.text) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.text }]);
      } else {
         throw new Error('Пустой ответ от сервера');
      }

    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `❌ **Ошибка**: ${error.message}\n\nУбедитесь, что сервер запущен: \`node server/server.js\`` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {isOpen && (
        <div className="mb-4 w-[350px] h-[500px] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-neutral-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-2">
                <Bot size={20} />
                <span className="font-bold">AI Помощник</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded transition">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-black/20">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-500 text-white' : 'bg-emerald-500 text-white'}`}>
                    {msg.role === 'user' ? <User size={16}/> : <Bot size={16}/>}
                </div>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-sm'
                }`}>
                    <ReactMarkdown 
                        components={{
                            ul: ({node, ...props}) => <ul className="list-disc pl-4 my-1" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal pl-4 my-1" {...props} />,
                            a: ({node, ...props}) => <a className="text-blue-300 hover:underline" target="_blank" {...props} />
                        }}
                    >
                        {msg.content}
                    </ReactMarkdown>
                </div>
              </div>
            ))}
            {isLoading && (
               <div className="flex gap-3">
                   <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0"><Bot size={16}/></div>
                   <div className="bg-white dark:bg-neutral-800 p-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-200 dark:border-neutral-700">
                       <Loader2 className="animate-spin text-slate-400" size={18} />
                   </div>
               </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-3 bg-white dark:bg-neutral-900 border-t border-slate-100 dark:border-neutral-800">
            <div className="flex gap-2">
                <input 
                    className="flex-1 bg-slate-100 dark:bg-neutral-800 border-0 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
                    placeholder="Задайте вопрос..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                />
                <button onClick={handleSend} disabled={isLoading || !input.trim()} className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">
                    <Send size={18} />
                </button>
            </div>
          </div>
        </div>
      )}
      <button onClick={() => setIsOpen(!isOpen)} className={`p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${isOpen ? 'bg-slate-200 text-slate-600 rotate-90' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
        {isOpen ? <X size={24}/> : <MessageCircle size={24}/>}
      </button>
    </div>
  );
};

export default AiChatWidget;