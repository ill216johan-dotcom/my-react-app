import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { fileURLToPath } from 'url';

// --- ХАРДКОД НАСТРОЕК (ЧТОБЫ НАВЕРНЯКА) ---

// 1. Вставь сюда данные Supabase (из файла .env)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

// 2. Данные Yandex (я их уже вставил из твоих сообщений)
const YANDEX_API_KEY = process.env.YANDEX_API_KEY;
const YANDEX_FOLDER_ID = process.env.YANDEX_FOLDER_ID;

const CHUNK_SIZE = 800;
const KNOWLEDGE_DIR = './knowledge';

// --- ПРОВЕРКА ---
if (SUPABASE_URL.includes('ВСТАВЬ')) {
    console.error("❌ ОШИБКА: Ты забыл вставить ключи Supabase в код скрипта (строки 10-11)!");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- ДАЛЬШЕ ВСЁ КАК ОБЫЧНО ---

// Получаем путь к скрипту
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function splitText(text, maxLength) {
  const chunks = [];
  let paragraphs = text.split(/\n\s*\n/);
  let currentChunk = "";

  for (let para of paragraphs) {
    para = para.trim();
    if (!para) continue;

    if (para.length > maxLength) {
        if (currentChunk) { chunks.push(currentChunk); currentChunk = ""; }
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

async function getYandexEmbedding(text) {
  // Искуственная задержка
  await new Promise(resolve => setTimeout(resolve, 200)); 
  
  try {
    const response = await axios.post('https://llm.api.cloud.yandex.net/foundationModels/v1/textEmbedding', {
        modelUri: `emb://${YANDEX_FOLDER_ID}/text-search-doc/latest`,
        text: text
    }, {
        headers: { 'Authorization': `Api-Key ${YANDEX_API_KEY}` },
        timeout: 20000 // 20 секунд таймаут
    });
    return response.data.embedding;
  } catch (e) {
    console.error("Ошибка API Яндекса:", e.response?.data || e.message);
    throw e;
  }
}

async function processFile() {
  const filePath = path.join('knowledge', 'full_dump.txt');
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Файл ${filePath} не найден!`);
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
      console.error(`❌ Ошибка на фрагменте #${i}:`, err.message);
    }
  }

  console.log("🏁 Вся база знаний успешно загружена!");
}

processFile();