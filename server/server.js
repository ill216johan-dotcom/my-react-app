import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Читаем переменные из .env
dotenv.config({ path: './.env' });

const app = express();

// Разрешаем запросы с фронтенда и чтение JSON
app.use(cors());
app.use(express.json());

// --- НАСТРОЙКИ ---

// Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Yandex Cloud
const YANDEX_API_KEY = process.env.YANDEX_API_KEY;
const FOLDER_ID = process.env.YANDEX_FOLDER_ID;

// Проверка наличия ключей при старте
if (!YANDEX_API_KEY || !FOLDER_ID) {
  console.error("❌ ОШИБКА: Не найдены ключи Yandex Cloud в .env файле!");
  process.exit(1);
}

// --- ФУНКЦИИ ---

// 1. Получение вектора вопроса (Yandex Embeddings)
async function getQueryEmbedding(text) {
  try {
    const response = await axios.post('https://llm.api.cloud.yandex.net/foundationModels/v1/textEmbedding', {
      modelUri: `emb://${FOLDER_ID}/text-search-query/latest`, // Модель специально для ЗАПРОСОВ
      text: text
    }, {
      headers: { 'Authorization': `Api-Key ${YANDEX_API_KEY}` }
    });
    return response.data.embedding;
  } catch (e) {
    console.error("❌ Ошибка векторизации Yandex:", e.response?.data || e.message);
    throw e;
  }
}

// 2. Генерация ответа (YandexGPT Lite)
async function generateYandexResponse(messages, context) {
  const url = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';
  
  // Системная инструкция для ИИ
  const systemText = `Ты — умный и вежливый ассистент сервиса фулфилмента и упаковки.
Твоя задача — отвечать на вопросы клиентов максимально точно.
Используй ДЛЯ ОТВЕТА ТОЛЬКО информацию из блока "КОНТЕКСТ ЗНАНИЙ" ниже.
Не придумывай цены и правила, которых нет в контексте.
Если информации нет в контексте, скажи: "К сожалению, в моей базе нет точной информации по этому вопросу. Пожалуйста, свяжитесь с менеджером."

КОНТЕКСТ ЗНАНИЙ:
${context}`;

  // Формируем историю диалога для Яндекса
  const yandexMessages = [
    { role: "system", text: systemText },
    ...messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      text: m.text
    }))
  ];

  try {
    const response = await axios.post(url, {
      modelUri: `gpt://${FOLDER_ID}/yandexgpt-lite/latest`, // Используем Lite версию (быстрая и дешевая)
      completionOptions: {
        stream: false,
        temperature: 0.3, // Низкая температура = меньше фантазий, больше фактов
        maxTokens: "2000"
      },
      messages: yandexMessages
    }, {
      headers: { 'Authorization': `Api-Key ${YANDEX_API_KEY}` }
    });

    return response.data.result.alternatives[0].message.text;
  } catch (e) {
    console.error("❌ Ошибка генерации YandexGPT:", e.response?.data || e.message);
    throw e;
  }
}

// --- API РОУТ ---

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    
    // Логируем входящий вопрос
    console.log("\n------------------------------------------------");
    console.log("📥 Вопрос от клиента:", message);

    if (!message) return res.status(400).json({ error: "Empty message" });

    // ШАГ А: Превращаем вопрос в вектор
    const embedding = await getQueryEmbedding(message);

    // ШАГ Б: Ищем похожие статьи в Supabase
    // match_threshold: 0.25 (достаточно низкий, чтобы найти даже косвенные совпадения)
    // match_count: 5 (берем 5 самых похожих кусков)
    const { data: documents, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.25, 
      match_count: 5
    });

    if (error) {
      console.error("❌ Ошибка Supabase:", error);
      return res.status(500).json({ error: "Ошибка поиска в базе знаний" });
    }

    // ЛОГИРОВАНИЕ (РЕНТГЕН): Смотрим, что именно нашлось
    if (documents && documents.length > 0) {
        console.log(`✅ Найдено фрагментов: ${documents.length}`);
        documents.forEach((doc, i) => {
            // Выводим заголовок статьи или первые 50 символов
            const title = doc.metadata?.title || doc.metadata?.snippet || doc.content.substring(0, 50);
            console.log(`   ${i+1}. [Сходство: ${(doc.similarity * 100).toFixed(1)}%] ${title}`);
        });
    } else {
        console.log("⚠️ ВНИМАНИЕ: База знаний не вернула подходящих статей (порог 0.25).");
        console.log("ИИ будет отвечать, что не знает ответа.");
    }

    // Собираем текст контекста
    const contextText = documents?.map(doc => doc.content).join('\n\n---\n\n') || "";

    // ШАГ В: Отправляем всё в YandexGPT
    const reply = await generateYandexResponse(
      [...(history || []), { role: 'user', text: message }], 
      contextText
    );

    console.log("🤖 Ответ отправлен клиенту.");
    res.json({ text: reply });

  } catch (error) {
    console.error("🔥 КРИТИЧЕСКАЯ ОШИБКА:", error.message);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log(`🚀 Сервер запущен на порту ${PORT}`));