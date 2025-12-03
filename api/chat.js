import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Настройки Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Настройки Yandex Cloud
const YANDEX_API_KEY = process.env.YANDEX_API_KEY;
const FOLDER_ID = process.env.YANDEX_FOLDER_ID;

// --- ФУНКЦИИ-ПОМОЩНИКИ ---

// 1. Получение вектора вопроса
async function getQueryEmbedding(text) {
  const response = await axios.post('https://llm.api.cloud.yandex.net/foundationModels/v1/textEmbedding', {
    modelUri: `emb://${FOLDER_ID}/text-search-query/latest`,
    text: text
  }, {
    headers: { 'Authorization': `Api-Key ${YANDEX_API_KEY}` }
  });
  return response.data.embedding;
}

// 2. Генерация ответа
async function generateYandexResponse(messages, context) {
  const url = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';
  
  const systemText = `Ты — умный и вежливый ассистент сервиса фулфилмента и упаковки.
Твоя задача — отвечать на вопросы клиентов максимально точно.
Используй ДЛЯ ОТВЕТА ТОЛЬКО информацию из блока "КОНТЕКСТ ЗНАНИЙ" ниже.
Не придумывай цены и правила, которых нет в контексте.
Если информации нет в контексте, скажи: "К сожалению, в моей базе нет точной информации по этому вопросу. Пожалуйста, свяжитесь с менеджером."

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
    headers: { 'Authorization': `Api-Key ${YANDEX_API_KEY}` }
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

    if (!message) return res.status(400).json({ error: "Empty message" });

    // А. Вектор
    const embedding = await getQueryEmbedding(message);

    // Б. Поиск в Supabase
    const { data: documents, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.25,
      match_count: 5
    });

    if (error) throw error;

    const contextText = documents?.map(doc => doc.content).join('\n\n---\n\n') || "";

    // В. Ответ YandexGPT
    const reply = await generateYandexResponse(
      [...(history || []), { role: 'user', text: message }], 
      contextText
    );

    return res.status(200).json({ text: reply });

  } catch (error) {
    console.error("API Error:", error.response?.data || error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}