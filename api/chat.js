import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Настройки (Vercel сам подтянет их из Environment Variables)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const YANDEX_API_KEY = process.env.YANDEX_API_KEY;
const FOLDER_ID = process.env.YANDEX_FOLDER_ID;

// --- 1. Векторизация (Embeddings) ---
async function getQueryEmbedding(text) {
  try {
    const response = await axios.post('https://llm.api.cloud.yandex.net/foundationModels/v1/textEmbedding', {
      modelUri: `emb://${FOLDER_ID}/text-search-query/latest`,
      text: text
    }, {
      headers: { 'Authorization': `Api-Key ${YANDEX_API_KEY}` }
    });
    return response.data.embedding;
  } catch (e) {
    console.error("Embedding Error:", e.response?.data || e.message);
    throw e;
  }
}

// --- 2. Генерация ответа (YandexGPT) ---
async function generateYandexResponse(messages, context) {
  const url = 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';
  
  // ВОТ ОН - ОБНОВЛЕННЫЙ ПРОМПТ ИЗ server.js
  const systemText = `Ты — умный ассистент сервиса фулфилмента.
Твоя задача — отвечать на вопросы, используя ТОЛЬКО предоставленный "КОНТЕКСТ ЗНАНИЙ".

ИНСТРУКЦИЯ ПО КАРТИНКАМ И ССЫЛКАМ:
1. Ты работаешь в веб-интерфейсе, который УМЕЕТ отображать Markdown.
2. Если в контексте есть ссылка — ОБЯЗАТЕЛЬНО включи её в ответ в формате [Текст ссылки](адрес).
3. Если в контексте есть картинка (код ![...](url)) — ОБЯЗАТЕЛЬНО вставь её в ответ.
4. ЗАПРЕЩЕНО писать "я текстовый ИИ". Просто молча вставь код картинки или ссылки.
5. Если спрашивают "где найти", "куда нажать" — давай прямые ссылки.

КОНТЕКСТ ЗНАНИЙ:
${context}`;

  const yandexMessages = [
    { role: "system", text: systemText },
    ...messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      text: m.text
    }))
  ];

  try {
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
  } catch (e) {
    console.error("YandexGPT Error:", e.response?.data || e.message);
    throw e;
  }
}

// --- 3. ГЛАВНАЯ ФУНКЦИЯ (HANDLER) ---
export default async function handler(req, res) {
  // Настройка CORS (чтобы сайт мог обращаться к функции)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { message, history } = req.body;

    if (!message) return res.status(400).json({ error: "Empty message" });

    // А. Вектор
    const embedding = await getQueryEmbedding(message);

    // Б. Поиск в Supabase (С порогом 0.25 и 5 фрагментами!)
    const { data: documents, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.25, 
      match_count: 5
    });

    if (error) throw error;

    const contextText = documents?.map(doc => doc.content).join('\n\n---\n\n') || "";

    // В. Ответ
    const reply = await generateYandexResponse(
      [...(history || []), { role: 'user', text: message }], 
      contextText
    );

    return res.status(200).json({ text: reply });

  } catch (error) {
    console.error("API Error:", error.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}