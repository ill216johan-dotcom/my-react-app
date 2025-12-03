import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

dotenv.config();

// Настройки
const CHUNK_SIZE = 800; // Размер кусочка текста (символов). 800 - оптимально для поиска.
const YANDEX_API_KEY = process.env.YANDEX_API_KEY;
const FOLDER_ID = process.env.YANDEX_FOLDER_ID;

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Функция нарезки текста (Chunking)
function splitText(text, maxLength) {
  const chunks = [];
  // 1. Сначала бьем по параграфам (двойной перенос строки)
  let paragraphs = text.split(/\n\s*\n/);
  
  let currentChunk = "";

  for (let para of paragraphs) {
    // Очищаем от лишних пробелов
    para = para.trim();
    if (!para) continue;

    // Если параграф гигантский (больше лимита), режем его грубо по предложениям
    if (para.length > maxLength) {
        // Если в буфере что-то было, сохраняем
        if (currentChunk) { chunks.push(currentChunk); currentChunk = ""; }
        
        // Режем гиганта
        const sentences = para.match(/[^.!?]+[.!?]+(\s|$)/g) || [para];
        let tempChunk = "";
        for (let sent of sentences) {
            if ((tempChunk.length + sent.length) > maxLength) {
                chunks.push(tempChunk);
                tempChunk = sent;
            } else {
                tempChunk += sent;
            }
        }
        if (tempChunk) chunks.push(tempChunk);
        continue;
    }

    // Обычная логика: собираем параграфы, пока влезает
    if ((currentChunk.length + para.length) < maxLength) {
      currentChunk += (currentChunk ? "\n\n" : "") + para;
    } else {
      chunks.push(currentChunk);
      currentChunk = para;
    }
  }
  
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

// Получение вектора от Яндекса
async function getYandexEmbedding(text) {
  // Искуственная задержка, чтобы Яндекс не забанил за спам запросами
  await new Promise(resolve => setTimeout(resolve, 200)); 
  
  try {
    const response = await axios.post('https://llm.api.cloud.yandex.net/foundationModels/v1/textEmbedding', {
        modelUri: `emb://${FOLDER_ID}/text-search-doc/latest`,
        text: text
    }, {
        headers: { 'Authorization': `Api-Key ${YANDEX_API_KEY}` }
    });
    return response.data.embedding;
  } catch (e) {
    console.error("Ошибка API Яндекса:", e.response?.data || e.message);
    throw e;
  }
}

async function processFile() {
  const filePath = './knowledge/full_dump.txt';
  
  if (!fs.existsSync(filePath)) {
    console.log("❌ Файл knowledge/full_dump.txt не найден! Создай его и положи туда весь текст.");
    return;
  }

  console.log("📖 Читаю большой файл...");
  const fullText = fs.readFileSync(filePath, 'utf-8');
  
  console.log("🔪 Нарезаю на кусочки...");
  const chunks = splitText(fullText, CHUNK_SIZE);
  console.log(`🧩 Получилось ${chunks.length} фрагментов. Начинаем загрузку...`);

  let i = 0;
  for (const chunk of chunks) {
    i++;
    // Делаем заголовок из первых слов фрагмента
    const shortTitle = chunk.substring(0, 40).replace(/\n/g, " ") + "...";
    
    try {
      const embedding = await getYandexEmbedding(chunk);

      const { error } = await supabase.from('documents').insert({
        content: chunk,
        metadata: { title: `Фрагмент #${i}`, snippet: shortTitle },
        embedding: embedding
      });

      if (error) throw error;
      console.log(`✅ [${i}/${chunks.length}] Загружено: ${shortTitle}`);
    } catch (err) {
      console.error(`❌ Ошибка на фрагменте #${i}`);
    }
  }

  console.log("🏁 Вся база знаний успешно загружена!");
}

processFile();