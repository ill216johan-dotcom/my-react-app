import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

dotenv.config();

// Настройки Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Настройки OpenRouter (через библиотеку OpenAI)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://openrouter.ai/api/v1", // Важно! Шлем запросы не в OpenAI, а в OpenRouter
});

// Твои статьи
const knowledgeBase = [
   {
    title: "Тарифы FBO Wildberries",
    content: "Стоимость приемки одной единицы товара на FBO Wildberries составляет 15 рублей. Хранение тарифицируется по объему: 0.1 рубль за литр в день. Упаковка в пакет зип-лок стоит 5 рублей."
  },
  {
    title: "Требования к упаковке Ozon",
    content: "Ozon требует наличия матовой этикетки размером 75x120мм. Штрихкод должен быть читаемым. Хрупкие товары должны быть упакованы в пупырчатую пленку (бабл-пленку) в два слоя."
  },
   // ... добавь остальные
];

async function fillDatabase() {
  console.log(`🚀 Начинаем загрузку через OpenRouter...`);

  for (const article of knowledgeBase) {
    try {
      console.log(`Обрабатываю: ${article.title}...`);

      // 1. Создаем эмбеддинг (вектор)
      // Используем модель 'text-embedding-3-small' (она доступна через OpenRouter)
      const response = await openai.embeddings.create({
        model: "text-embedding-3-small", 
        input: article.content,
      });

      const embedding = response.data[0].embedding;

      // 2. Загружаем в Supabase
      // ВАЖНО: Убедись, что таблица documents в Supabase создана с вектором vector(1536)
      // Если старая таблица была vector(768) - её надо пересоздать!
      const { error } = await supabase.from('documents').insert({
        content: article.content,
        metadata: { title: article.title },
        embedding: embedding
      });

      if (error) throw error;
      console.log(`✅ Загружено: ${article.title}`);

    } catch (error) {
      console.error(`❌ Ошибка с "${article.title}":`, error);
    }
  }
  console.log("🏁 Готово!");
}

fillDatabase();