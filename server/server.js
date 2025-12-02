import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(cors());

// Путь к вашей базе знаний (обратите внимание на правильный путь к public)
const kbPath = path.join(__dirname, '../public/knowledgebase.json');

let searchableDocs = [];

// Функция очистки текста от HTML
function stripHtml(html) {
    if (!html) return "";
    return html.replace(/<[^>]*>?/gm, ' ');
}

// Загрузка базы при старте
function loadKnowledgeBase() {
    try {
        if (!fs.existsSync(kbPath)) {
            console.error('❌ ОШИБКА: Файл knowledgebase.json не найден в папке public!');
            return;
        }
        const data = fs.readFileSync(kbPath, 'utf8');
        const json = JSON.parse(data);

        searchableDocs = [];

        // Разбор структуры
        if (json.categories) {
            json.categories.forEach(cat => {
                searchableDocs.push({ title: cat.title, content: stripHtml(cat.content || "") });
                if (cat.articles) {
                    cat.articles.forEach(art => {
                        searchableDocs.push({ title: art.title, content: stripHtml(art.content || "") });
                    });
                }
            });
        }
        console.log(`✅ База загружена! Статей: ${searchableDocs.length}`);
    } catch (err) {
        console.error('❌ ОШИБКА чтения базы:', err);
    }
}

loadKnowledgeBase();

// Простой поиск по ключевым словам
function findRelevantContext(userQuery) {
    if (!userQuery) return "";
    const queryWords = userQuery.toLowerCase().split(' ').filter(w => w.length > 3);
    
    const scoredDocs = searchableDocs.map(doc => {
        let score = 0;
        const text = (doc.title + " " + doc.content).toLowerCase();
        queryWords.forEach(word => { if (text.includes(word)) score++; });
        return { ...doc, score };
    });

    const topDocs = scoredDocs.filter(d => d.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
    
    if (topDocs.length === 0) return "";
    return topDocs.map(d => `ТЕМА: ${d.title}\nИНФОРМАЦИЯ: ${d.content}`).join("\n\n---\n\n");
}

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  const lastUserMessage = messages[messages.length - 1].content;
  
  const relevantContext = findRelevantContext(lastUserMessage);
  console.log(`🔍 Вопрос: "${lastUserMessage.slice(0, 30)}..." | Найдено контекста: ${relevantContext ? 'Да' : 'Нет'}`);

  const systemPrompt = relevantContext 
      ? `Ты - ассистент поддержки. Отвечай ТОЛЬКО на основе текста ниже. Не придумывай. Если информации недостаточно, скажи об этом.\n\nИНФОРМАЦИЯ ИЗ БАЗЫ:\n${relevantContext}`
      : `Ты - ассистент поддержки. Пользователь задал вопрос, которого нет в базе знаний. Вежливо ответь, что информации пока нет, или ответь из общих знаний, если вопрос простой (например "Привет").`;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'google/gemini-flash-1.5',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ]
      },
      {
        headers: {
          // Вставьте сюда ваш ключ OpenRouter, если .env не работает
          'Authorization': `Bearer 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`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000', 
        }
      }
    );
    res.json(response.data.choices[0].message);
  } catch (error) {
    console.error('Ошибка API:', error.response?.data || error.message);
    res.status(500).json({ error: 'Ошибка сервера AI' });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log('Сервер запущен на порту ' + PORT));