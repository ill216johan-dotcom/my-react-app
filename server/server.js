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
// Используем VITE_ префикс для совместимости с .env файлом (в dev режиме)
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
      headers: { 'Authorization': `Api-Key ${YANDEX_API_KEY}` },
      timeout: 15000 // 15 секунд таймаут
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
${context}`;

  // Формируем историю диалога для Яндекса
  const yandexMessages = [
    { role: "system", text: systemText },
    ...messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      text: m.text
    }))
  ];

  // --- ЛОГИРОВАНИЕ КОНТЕКСТА ДЛЯ ОТЛАДКИ RAG ---
  console.log("--- НАЙДЕННЫЙ КОНТЕКСТ ---");
  console.log(context);
  console.log("--------------------------");

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
      headers: { 'Authorization': `Api-Key ${YANDEX_API_KEY}` },
      timeout: 30000 // 30 секунд таймаут для генерации
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
    // match_threshold: 0.2 (низкий порог для более широкого поиска)
    // match_count: 10 (берем больше кусков для лучшего контекста)
    const { data: documents, error } = await supabase.rpc('match_documents', {
      query_embedding: embedding,
      match_threshold: 0.2, 
      match_count: 10
    });

    if (error) {
      console.error("❌ Ошибка Supabase:", error);
      return res.status(500).json({ error: "Ошибка поиска в базе знаний" });
    }

    // ЛОГИРОВАНИЕ (РЕНТГЕН): Смотрим, что именно нашлось
    if (documents && documents.length > 0) {
        console.log(`✅ Найдено фрагментов: ${documents.length}`);
        documents.forEach((doc, i) => {
            // Выводим заголовок статьи или первые 80 символов
            const title = doc.metadata?.title || doc.metadata?.snippet || doc.content.substring(0, 80);
            const similarity = (doc.similarity * 100).toFixed(1);
            // Проверяем наличие ключевых слов в контенте
            const hasImage = doc.content.includes('![') || doc.content.includes('<img');
            const hasScheme = doc.content.toLowerCase().includes('схема') || doc.content.toLowerCase().includes('проезд');
            const markers = [];
            if (hasImage) markers.push('🖼️');
            if (hasScheme) markers.push('🗺️');
            console.log(`   ${i+1}. [${similarity}%] ${markers.join(' ')} ${title}`);
        });
    } else {
        console.log("⚠️ ВНИМАНИЕ: База знаний не вернула подходящих статей (порог 0.2).");
        console.log("ИИ будет отвечать, что не знает ответа.");
    }

    // Собираем текст контекста
    const contextText = documents?.map(doc => doc.content).join('\n\n---\n\n') || "";

    // ЛОГИРОВАНИЕ: Проверяем наличие описаний изображений в контексте
    const imageDescriptionsCount = (contextText.match(/> 💡 Описание изображения:/g) || []).length;
    const imageMarkdownCount = (contextText.match(/!\[.*?\]\(.*?\)/g) || []).length;
    const hasScheme = contextText.toLowerCase().includes('схема') || contextText.toLowerCase().includes('проезд');
    console.log(`📊 Статистика контекста: ${imageMarkdownCount} изображений, ${imageDescriptionsCount} с описаниями`);
    if (hasScheme) {
      console.log(`🗺️  В контексте найдены упоминания схем/проезда`);
    }

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