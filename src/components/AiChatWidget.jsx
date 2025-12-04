import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// Компонент для отображения изображений в Markdown
const MarkdownImage = ({ src, alt, ...props }) => {
  const [hasError, setHasError] = useState(false);
  
  if (hasError) return null;
  
  return (
    <img
      src={src}
      alt={alt || 'Изображение'}
      className="max-w-full rounded-lg my-2 cursor-pointer hover:opacity-90 transition-opacity"
      style={{ display: hasError ? 'none' : 'block' }}
      onError={() => setHasError(true)}
      onClick={() => window.open(src, '_blank')}
      {...props}
    />
  );
};

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
    if (!input.trim() || isLoading) return;

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

  // Typing Indicator Component
  const TypingIndicator = () => (
    <div className="flex gap-3">
      <div className="flex gap-1 items-center bg-gray-100 dark:bg-neutral-800 px-4 py-3 rounded-2xl rounded-tl-sm">
        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  );

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {/* Chat Window */}
      {isOpen && (
        <div 
          className="mb-4 w-[380px] h-[550px] bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ease-out animate-in slide-in-from-bottom-5 fade-in"
          style={{ 
            animation: 'slideUp 0.3s ease-out',
          }}
        >
          {/* Header with Gradient */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-5 flex justify-between items-center text-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-base">AI Assistant</h3>
                <p className="text-xs text-indigo-100">Always here to help</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              className="hover:bg-white/20 p-1.5 rounded-lg transition-all duration-200 hover:scale-110"
              aria-label="Close chat"
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50 dark:bg-neutral-950">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : 'order-1'}`}>
                  {/* Timestamp */}
                  <div className={`text-xs text-gray-500 mb-1 px-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {msg.role === 'user' ? 'You' : 'AI'}
                  </div>
                  {/* Message Bubble */}
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-sm shadow-md' 
                      : 'bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-gray-200 rounded-tl-sm shadow-sm'
                  }`}>
                    <ReactMarkdown 
                      components={{
                        p: ({node, ...props}) => <p className="leading-relaxed" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-4 my-2 space-y-1" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-4 my-2 space-y-1" {...props} />,
                        code: ({node, inline, ...props}) => 
                          inline 
                            ? <code className="bg-black/10 px-1.5 py-0.5 rounded text-xs font-mono" {...props} />
                            : <code className="block bg-black/10 p-2 rounded my-2 text-xs font-mono overflow-x-auto" {...props} />,
                        a: ({node, ...props}) => 
                          <a 
                            className={msg.role === 'user' ? 'underline hover:text-indigo-200' : 'text-indigo-600 hover:text-indigo-700 underline'} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            {...props} 
                          />,
                        img: ({node, ...props}) => (
                          <MarkdownImage {...props} />
                        )
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {isLoading && <TypingIndicator />}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-800">
            <div className="relative flex items-center">
              <input 
                className="flex-1 bg-gray-100 dark:bg-neutral-800 border-0 rounded-full pl-5 pr-12 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white dark:focus:bg-neutral-700 outline-none transition-all duration-200 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Type your message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={isLoading}
              />
              <button 
                onClick={handleSend} 
                disabled={isLoading || !input.trim()} 
                className="absolute right-1.5 bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Launcher Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className={`group relative w-14 h-14 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${
          isOpen 
            ? 'bg-gray-200 dark:bg-neutral-700 text-gray-700 dark:text-gray-300' 
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
        style={{
          animation: isOpen ? '' : 'fadeIn 0.5s ease-out'
        }}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          <X size={24} className="m-auto transition-transform duration-300" />
        ) : (
          <Sparkles size={24} className="m-auto transition-transform duration-300 group-hover:rotate-12" />
        )}
        
        {/* Pulse animation ring when closed */}
        {!isOpen && (
          <span className="absolute inset-0 rounded-full bg-indigo-600 animate-ping opacity-20"></span>
        )}
      </button>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default AiChatWidget;