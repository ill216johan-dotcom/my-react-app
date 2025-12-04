import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Инициализация должна быть внутри обработчика, чтобы гарантировать чтение process.env
// Однако, для производительности, мы можем инициализировать клиента Supabase здесь,
// полагаясь на то, что Vercel предоставляет переменные.

export default async function handler(req, res) {
  
  // 1. Настройка CORS для работы в браузере
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { message, history } = req.body;

    // 2. Чтение КЛЮЧЕВЫХ переменных и быстрая проверка
    const YANDEX_API_KEY = process.env.YANDEX_API_KEY;
    const FOLDER_ID = process.env.YANDEX_FOLDER_ID;
    const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

    if (!YANDEX_API_KEY || !SUPABASE_URL) {
        // Если ключа нет, вернем JSON-ошибку, а не пустую строку, 
        // чтобы избежать 'Unexpected token A'
        console.error("❌ Vercel: Missing critical environment variables!");
        return res.status(500).json({ error: "Server configuration missing API keys. Check Vercel settings." });
    }

    // Инициализируем клиента Supabase (обязательно здесь)
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


    // --- 3. Векторизация (Embeddings) ---
    const embeddingResponse = await axios.post('https://llm.api.cloud.yandex.net/foundationModels/v1/textEmbedding', {
      modelUri: `emb://${FOLDER_ID}/text-search-query/latest`,
      text: message
    }, {
      headers: { 'Authorization': `Api-Key ${YANDEX_API_KEY}` }
    });
    const embedding = embeddingResponse.data.embedding;

    // --- 4. Поиск в Supabase (RAG) ---
    const { data: documents, error: dbError } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.2, // Снижен порог для более широкого поиска
      match_count: 10 // Увеличено количество для лучшего контекста
    });

    if (dbError) throw dbError;

    const contextText = documents?.map(doc => doc.content).join('\n\n---\n\n') || "";

    // --- ЛОГИРОВАНИЕ КОНТЕКСТА ДЛЯ ОТЛАДКИ RAG ---
    console.log("--- НАЙДЕННЫЙ КОНТЕКСТ ---");
    console.log(contextText);
    console.log("--------------------------");
    
    // ЛОГИРОВАНИЕ: Проверяем наличие описаний изображений в контексте
    const imageDescriptionsCount = (contextText.match(/> 💡 Описание изображения:/g) || []).length;
    const imageMarkdownCount = (contextText.match(/!\[.*?\]\(.*?\)/g) || []).length;
    console.log(`📊 Статистика контекста: ${imageMarkdownCount} изображений, ${imageDescriptionsCount} с описаниями`);
    
    // --- 5. Генерация ответа (YandexGPT) ---
    // (Используем ваш обновленный промпт)
    const systemText = `Ты — умный ассистент сервиса фулфилмента.
Твоя задача — отвечать на вопросы, используя ТОЛЬКО предоставленный "КОНТЕКСТ ЗНАНИЙ".

СТРОГИЕ ПРАВИЛА ПО КАРТИНКАМ (КРИТИЧНО ВАЖНО):
1. ЗАПРЕЩЕНО заменять изображения на эмодзи (🖼️, 📷, 🖼, 📸 и любые другие).
2. ЗАПРЕЩЕНО писать фразы вроде "я текстовый ИИ", "я не могу показать фото", "вот эмодзи картинки".
3. Если в "КОНТЕКСТЕ ЗНАНИЙ" встречается код картинки вида ![описание](ссылка) или <img src="ссылка"> — ТЫ ОБЯЗАН ВСТАВИТЬ ЕГО В ОТВЕТ БЕЗ ИЗМЕНЕНИЙ.
4. Ссылки на картинки должны оставаться оригинальными — НЕ изменяй их, НЕ заменяй на текст.
5. Если пользователь просит показать, куда нажать, или как выглядит документ — найди картинку в контексте и верни её в формате ![описание](ссылка).
6. Ты работаешь в веб-интерфейсе, который УМЕЕТ отображать Markdown-картинки. Просто вставь код картинки как есть.
7. Если пользователь спрашивает про схему проезда, карту, маршрут — ВНИМАТЕЛЬНО ищи в контексте изображения со схемами и ОБЯЗАТЕЛЬНО покажи их.

ИНСТРУКЦИЯ ПО ССЫЛКАМ:
1. Всегда форматируй ссылки как [Текст](адрес).
2. Используй ссылки из контекста смело.

КОНТЕКСТ ЗНАНИЙ:
${contextText}`;

    const yandexMessages = [
      { role: "system", text: systemText },
      ...history.map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        text: m.text
      })),
      { role: 'user', text: message }
    ];

    const completionResponse = await axios.post('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
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

    const reply = completionResponse.data.result.alternatives[0].message.text;

    return res.status(200).json({ text: reply });

  } catch (error) {
    console.error("API Crash in Vercel:", error.message, error.response?.data);
    // В случае ЛЮБОЙ ошибки - вернем понятную JSON-ошибку
    return res.status(500).json({ 
        error: "Server Error", 
        message: "Произошла внутренняя ошибка сервера. Проверьте логи Vercel." 
    });
  }
}