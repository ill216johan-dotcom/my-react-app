import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Настройки Supabase
// ВАЖНО: В Vercel serverless используем обычные имена переменных (без VITE_)
// Инициализируем один раз на уровне модуля для переиспользования между вызовами
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Настройки Yandex Cloud
const YANDEX_API_KEY = process.env.YANDEX_API_KEY;
const FOLDER_ID = process.env.YANDEX_FOLDER_ID;

// Проверка наличия переменных окружения при первой инициализации
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error("❌ CRITICAL: Missing Supabase environment variables!");
}
if (!YANDEX_API_KEY || !FOLDER_ID) {
  console.error("❌ CRITICAL: Missing Yandex Cloud environment variables!");
}

// --- ФУНКЦИИ-ПОМОЩНИКИ ---

// 1. Получение вектора вопроса
async function getQueryEmbedding(text) {
  const response = await axios.post('https://llm.api.cloud.yandex.net/foundationModels/v1/textEmbedding', {
    modelUri: `emb://${FOLDER_ID}/text-search-query/latest`,
    text: text
  }, {
    headers: { 'Authorization': `Api-Key ${YANDEX_API_KEY}` },
    timeout: 15000 // 15 секунд таймаут
  });
  return response.data.embedding;
}

// 2. Генерация ответа
async function generateYandexResponse(messages, context) {
  const url = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';
  
  const systemText = `Ты — умный ассистент сервиса фулфилмента.
Твоя задача — отвечать на вопросы, используя ТОЛЬКО предоставленный "КОНТЕКСТ ЗНАНИЙ".

ИНСТРУКЦИЯ ПО КАРТИНКАМ (КРИТИЧНО ВАЖНО):
1. Ты работаешь в веб-интерфейсе, который УМЕЕТ отображать Markdown-картинки.
2. Если в "КОНТЕКСТЕ ЗНАНИЙ" встречается код картинки вида ![описание](ссылка) — ТЫ ОБЯЗАН ВСТАВИТЬ ЕГО В ОТВЕТ.
3. ЗАПРЕЩЕНО писать фразы вроде "я текстовый ИИ", "я не могу показать фото". Вместо этого просто молча вставь код картинки.
4. Если пользователь просит показать, куда нажать, или как выглядит документ — найди картинку в контексте и верни её.

ИНСТРУКЦИЯ ПО ССЫЛКАМ:
1. Всегда форматируй ссылки как [Текст](адрес).
2. Используй ссылки из контекста смело.

КОНТЕКСТ ЗНАНИЙ:
${context}`;

  const yandexMessages = [
    { role: "system", text: systemText },
    ...messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      text: m.text
    }))
  ];

  const response = await axios.post(url, {
    modelUri: `gpt://${FOLDER_ID}/yandexgpt-lite/latest`,
    completionOptions: {
      stream: false,
      temperature: 0.3,
      maxTokens: "2000"
    },
    messages: yandexMessages
  }, {
    headers: { 'Authorization': `Api-Key ${YANDEX_API_KEY}` },
    timeout: 30000 // 30 секунд таймаут для генерации
  });

  return response.data.result.alternatives[0].message.text;
}

// --- ГЛАВНАЯ ФУНКЦИЯ VERCEL (HANDLER) ---

export default async function handler(req, res) {
  // 1. Настройка CORS (чтобы сайт мог стучаться к функции)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Обработка предварительного запроса (OPTIONS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Разрешаем только POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { message, history } = req.body;

    // Валидация входных данных
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: "Invalid or empty message" });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: "Message too long (max 2000 characters)" });
    }

    // А. Получение вектора с таймаутом
    let embedding;
    try {
      embedding = await getQueryEmbedding(message);
    } catch (embedError) {
      console.error("Embedding error:", embedError.response?.data || embedError.message);
      return res.status(503).json({ error: "AI service temporarily unavailable" });
    }

    // Б. Поиск в Supabase
    const { data: documents, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.25,
      match_count: 5
    });

    if (error) {
      console.error("Supabase error:", error);
      return res.status(500).json({ error: "Database search failed" });
    }

    const contextText = documents?.map(doc => doc.content).join('\n\n---\n\n') || "";

    // В. Генерация ответа YandexGPT
    let reply;
    try {
      reply = await generateYandexResponse(
        [...(history || []), { role: 'user', text: message }], 
        contextText
      );
    } catch (gptError) {
      console.error("YandexGPT error:", gptError.response?.data || gptError.message);
      return res.status(503).json({ error: "AI generation service temporarily unavailable" });
    }

    return res.status(200).json({ text: reply });

  } catch (error) {
    console.error("Unexpected API Error:", error.response?.data || error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}