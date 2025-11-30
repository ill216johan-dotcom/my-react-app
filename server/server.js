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

// Путь к файлу базы знаний
const kbPath = path.join(__dirname, '../public/knowledgebase.json');

let searchableDocs = [];

// --- 1. ФУНКЦИЯ ОЧИСТКИ ОТ HTML (чтобы убрать лишние теги) ---
function stripHtml(html) {
    if (!html) return "";
    return html.replace(/<[^>]*>?/gm, ' ');
}

// --- 2. ЗАГРУЗКА БАЗЫ ---
function loadKnowledgeBase() {
    try {
        if (!fs.existsSync(kbPath)) {
            console.error('❌ ОШИБКА: Файл knowledgebase.json не найден в папке public!');
            return;
        }
        const data = fs.readFileSync(kbPath, 'utf8');
        const json = JSON.parse(data);

        searchableDocs = [];

        // Разбираем структуру JSON
        if (json.categories) {
            json.categories.forEach(cat => {
                searchableDocs.push({
                    title: cat.title,
                    content: stripHtml(cat.content || "") 
                });
                if (cat.articles) {
                    cat.articles.forEach(art => {
                        searchableDocs.push({
                            title: art.title,
                            content: stripHtml(art.content || "")
                        });
                    });
                }
            });
        } else if (Array.isArray(json)) {
            searchableDocs = json.map(item => ({
                title: item.title || "Инфо",
                content: stripHtml(item.content || JSON.stringify(item))
            }));
        }

        console.log(`✅ База загружена! Документов: ${searchableDocs.length}`);
    } catch (err) {
        console.error('❌ ОШИБКА чтении базы:', err);
    }
}

loadKnowledgeBase();

// --- 3. ПОИСК ПО БАЗЕ ---
function findRelevantContext(userQuery) {
    if (!userQuery) return "";
    
    const queryWords = userQuery.toLowerCase().split(' ').filter(w => w.length > 3);
    
    const scoredDocs = searchableDocs.map(doc => {
        let score = 0;
        const text = (doc.title + " " + doc.content).toLowerCase();
        queryWords.forEach(word => {
            if (text.includes(word)) score++;
        });
        return { ...doc, score };
    });

    const topDocs = scoredDocs
        .filter(d => d.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3); // Берем топ-3 совпадения

    // Если совпадений нет, ничего не возвращаем, пусть ИИ скажет, что не знает
    if (topDocs.length === 0) return "";

    return topDocs.map(d => `ТЕМА: ${d.title}\nИНФОРМАЦИЯ: ${d.content}`).join("\n\n---\n\n");
}

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  const lastUserMessage = messages[messages.length - 1].content;
  
  // Ищем контекст
  const relevantContext = findRelevantContext(lastUserMessage);

  console.log(`🔍 Вопрос: "${lastUserMessage.slice(0, 30)}..."`);

  // Формируем инструкцию для ИИ
  let systemPrompt = "";
  
  if (relevantContext) {
      console.log("✅ Найдена информация в базе, отправляю ИИ.");
      systemPrompt = `
      Ты - ассистент поддержки. Отвечай ТОЛЬКО на основе текста ниже.
      Не придумывай. Если информации недостаточно, ответь: "В моих инструкциях нет точного ответа, обратитесь к менеджеру".
      
      ИНФОРМАЦИЯ ИЗ БАЗЫ:
      ${relevantContext}
      `;
  } else {
      console.log("⚠️ Информации в базе не найдено.");
      systemPrompt = `
      Ты - ассистент поддержки. Пользователь задал вопрос, которого нет в твоей базе знаний.
      Вежливо ответь: "К сожалению, я не нашел ответа в своих инструкциях. Пожалуйста, перефразируйте вопрос или свяжитесь с менеджером."
      `;
  }

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'google/gemini-flash-1.5', // Без приписки :free', // Бесплатная модель
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ]
      },
      {
        headers: {
          // --- ВНИМАНИЕ: Если .env не работает, вставь ключ ниже вместо process.env... ---
          'Authorization': `Bearer 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`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000', 
          'X-Title': 'FF Support',
        }
      }
    );

    const aiMessage = response.data.choices[0].message;
    res.json(aiMessage);

  } catch (error) {
    console.error('Ошибка API:', error.response?.data || error.message);
    res.status(500).json({ error: 'Ошибка сервера AI' });
  }
});

const PORT = process.env.PORT || 3001;
// Вот исправленная последняя строка:
app.listen(PORT, () => console.log('Сервер запущен на порту ' + PORT));