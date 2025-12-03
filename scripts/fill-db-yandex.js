import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const YANDEX_API_KEY = process.env.YANDEX_API_KEY;
const FOLDER_ID = process.env.YANDEX_FOLDER_ID;
const KNOWLEDGE_DIR = './knowledge';

async function getYandexEmbedding(text) {
  // Эмбеддинги для документов
  const response = await axios.post('https://llm.api.cloud.yandex.net/foundationModels/v1/textEmbedding', {
    modelUri: `emb://${FOLDER_ID}/text-search-doc/latest`,
    text: text
  }, {
    headers: { 'Authorization': `Api-Key ${YANDEX_API_KEY}` }
  });
  return response.data.embedding;
}

async function processFiles() {
  console.log(`🚀 Начинаем загрузку в Yandex Cloud (Folder: ${FOLDER_ID})...`);
  
  if (!fs.existsSync(KNOWLEDGE_DIR)) {
      console.log("❌ Нет папки knowledge! Создай её и положи туда .txt файлы.");
      return;
  }

  const files = fs.readdirSync(KNOWLEDGE_DIR).filter(file => file.endsWith('.txt'));

  for (const file of files) {
    const filePath = path.join(KNOWLEDGE_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const title = file.replace('.txt', '').replace(/_/g, ' ');

    try {
      console.log(`Обрабатываю: ${title}...`);
      const embedding = await getYandexEmbedding(content);

      const { error } = await supabase.from('documents').insert({
        content: content,
        metadata: { title: title, source: 'yandex' },
        embedding: embedding
      });

      if (error) throw error;
      console.log(`✅ Загружено: ${title}`);
    } catch (err) {
      console.error(`❌ Ошибка (${file}):`, err.response?.data || err.message);
    }
  }
  console.log("🏁 База знаний обновлена!");
}

processFiles();