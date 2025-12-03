import fs from 'fs';
import TurndownService from 'turndown';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Загружаем .env для доступа к Supabase
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const INPUT_FILE = 'knowledgebase.json';
const OUTPUT_FILE = 'knowledge/full_dump.txt';
const BASE_URL = 'https://my-react-app-2mj3.vercel.app/';

// Подключаем Supabase
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

// Получаем словарь описаний: { "url": "description" }
async function getCaptionsMap() {
  const { data, error } = await supabase.from('image_captions').select('*');
  if (error || !data) return {};
  
  const map = {};
  data.forEach(item => {
    // Нормализуем URL (иногда бывают отличия в http/https или слешах)
    map[item.url] = item.description;
  });
  return map;
}

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

// Правило для якорей
turndownService.addRule('fixAnchors', {
  filter: ['a'],
  replacement: function (content, node) {
    let href = node.getAttribute('href');
    if (!href) return content;
    if (href.startsWith('#')) href = `${BASE_URL}${href}`;
    if (href.startsWith('/')) href = `https://my-react-app-2mj3.vercel.app${href}`;
    return `[${content}](${href})`;
  }
});

async function convert() {
  console.log("⏳ Скачиваю описания картинок из базы...");
  const captionsMap = await getCaptionsMap();
  console.log(`✅ Найдено ${Object.keys(captionsMap).length} описаний.`);

  // Правило для картинок (динамическое)
  turndownService.addRule('imagesWithCaptions', {
    filter: 'img',
    replacement: function (content, node) {
      const src = node.getAttribute('src');
      if (!src) return '';
      
      // Ищем ваше описание в базе, иначе берем alt, иначе "Изображение"
      let alt = captionsMap[src] || node.getAttribute('alt') || 'Изображение';
      
      // Лайфхак: Добавляем ключевое слово, чтобы ИИ обратил внимание
      alt = `ФОТО: ${alt}`; 

      return `\n![${alt}](${src})\n`;
    }
  });

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Файл ${INPUT_FILE} не найден!`);
    return;
  }

  const rawData = fs.readFileSync(INPUT_FILE, 'utf-8');
  let data = JSON.parse(rawData);
  
  let items = [];
  if (data.categories && Array.isArray(data.categories)) items = data.categories;
  else if (Array.isArray(data)) items = data;
  else items = [data];

  console.log(`Конвертирую ${items.length} статей...`);

  let fullText = "";

  items.forEach(item => {
    const title = item.title || "Без темы";
    const rawContent = item.content || "";
    let cleanContent = turndownService.turndown(rawContent);
    cleanContent = cleanContent.replace(/\n\n+/g, '\n\n');
    if (!cleanContent) return;

    fullText += `ТЕМА: ${title}\n`;
    fullText += `СОДЕРЖАНИЕ:\n${cleanContent}\n`;
    fullText += `--------------------------------------------------\n\n`;
  });

  if (!fs.existsSync('knowledge')) fs.mkdirSync('knowledge');
  fs.writeFileSync(OUTPUT_FILE, fullText);
  console.log(`🏁 Готово! Файл ${OUTPUT_FILE} создан с вашими описаниями.`);
}

convert();