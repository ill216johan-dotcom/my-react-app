import fs from 'fs';
import TurndownService from 'turndown';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Загружаем .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const INPUT_FILE = 'knowledgebase.json';
const OUTPUT_FILE = 'knowledge/full_dump.txt';

// Домен, который мы будем "обрезать" для универсальности
// (замените на реальный домен вашей базы знаний, если он другой)
const PRODUCTION_DOMAIN = 'https://ff-platform.ru'; 

// Проверяем переменные окружения
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
// Пробуем сначала service_role ключ (для обхода RLS), потом anon ключ
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const KEY_TYPE = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON';

console.log("🔍 Проверка подключения к Supabase...");
console.log(`   URL: ${SUPABASE_URL ? SUPABASE_URL.substring(0, 30) + '...' : '❌ НЕ НАЙДЕН'}`);
console.log(`   KEY: ${SUPABASE_KEY ? SUPABASE_KEY.substring(0, 20) + '...' : '❌ НЕ НАЙДЕН'} (тип: ${KEY_TYPE})`);

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ ОШИБКА: Не найдены переменные окружения!");
  console.error("   Нужно: VITE_SUPABASE_URL");
  console.error("   И один из: SUPABASE_SERVICE_ROLE_KEY (предпочтительно) или VITE_SUPABASE_ANON_KEY");
  console.error("   Проверьте файл .env в корне проекта.");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("\n💡 СОВЕТ: Для обхода RLS используйте SUPABASE_SERVICE_ROLE_KEY");
    console.error("   Найти его можно в Supabase Dashboard -> Settings -> API -> service_role key");
  }
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Нормализует URL для сравнения: убирает домен, приводит к единому формату
function normalizeUrl(url) {
  if (!url) return '';
  
  // Убираем протокол и домен (если есть)
  url = url.replace(/^https?:\/\/[^\/]+/, '');
  
  // Убираем начальный слеш, если его нет, добавляем
  if (!url.startsWith('/')) {
    url = '/' + url;
  }
  
  // Убираем двойные слеши
  url = url.replace(/\/+/g, '/');
  
  return url;
}

// Получаем описания картинок из базы
// Создаем Map для быстрого поиска по полному URL и по имени файла
async function getCaptionsMap() {
  console.log("📡 Запрос к таблице image_captions...");
  console.log(`   Используется URL: ${SUPABASE_URL}`);
  console.log(`   Используется ключ: ${SUPABASE_KEY ? SUPABASE_KEY.substring(0, 20) + '...' : 'НЕ НАЙДЕН'} (тип: ${KEY_TYPE})`);
  
  // Пробуем разные варианты запроса для диагностики
  let { data, error, count } = await supabase
    .from('image_captions')
    .select('*', { count: 'exact' });
  
  console.log(`   Результат запроса: data=${data ? data.length : 'null'}, error=${error ? 'есть' : 'нет'}, count=${count}`);
  
  if (error) {
    console.error('❌ Ошибка загрузки описаний из Supabase:');
    console.error('   Код:', error.code);
    console.error('   Сообщение:', error.message);
    console.error('   Детали:', error.details);
    console.error('   Подсказка:', error.hint);
    
    // Пробуем более простой запрос для диагностики
    console.log('\n🔍 Пробую альтернативный запрос (только url и description)...');
    const { data: simpleData, error: simpleError } = await supabase
      .from('image_captions')
      .select('url, description')
      .limit(5);
    
    if (simpleError) {
      console.error('   Альтернативный запрос тоже не работает:', simpleError.message);
    } else {
      console.log(`   Альтернативный запрос вернул: ${simpleData ? simpleData.length : 0} записей`);
      if (simpleData && simpleData.length > 0) {
        console.log('   Пример данных:', JSON.stringify(simpleData[0], null, 2));
        // Используем данные из альтернативного запроса
        data = simpleData;
        error = null;
      }
    }
    
    if (error) {
      return { byUrl: {}, byFilename: {}, byNormalized: {} };
    }
  }
  
  if (!data) {
    console.warn('⚠️  Данные не получены (data = null или undefined)');
    console.warn('   Возможная причина: RLS (Row Level Security) блокирует доступ');
    console.warn('   Решение: проверьте политики RLS в Supabase или используйте service_role ключ');
    return { byUrl: {}, byFilename: {}, byNormalized: {} };
  }
  
  console.log(`📥 Получено записей из базы: ${data.length}`);
  
  const byUrl = {};           // Оригинальный URL из базы
  const byFilename = {};       // Только имя файла
  const byNormalized = {};      // Нормализованный URL (без домена, с начальным слешем)
  let processedCount = 0;
  
  data.forEach((item, index) => {
    if (item.url && item.description) {
      const originalUrl = item.url;
      const normalizedUrl = normalizeUrl(originalUrl);
      const filename = originalUrl.split('/').pop();
      
      // Сохраняем по оригинальному URL
      byUrl[originalUrl] = item.description;
      
      // Сохраняем по нормализованному URL
      byNormalized[normalizedUrl] = item.description;
      
      // Также сохраняем по имени файла для универсальности
      if (filename) {
        byFilename[filename] = item.description;
      }
      
      processedCount++;
    } else {
      console.warn(`⚠️  Запись #${index + 1} пропущена: отсутствует url или description`);
    }
  });
  
  console.log(`✅ Обработано записей: ${processedCount}`);
  if (processedCount > 0) {
    const examples = Object.keys(byUrl).slice(0, 3);
    console.log(`   Примеры URL из базы: ${examples.join(', ')}`);
    console.log(`   Примеры нормализованных: ${examples.map(normalizeUrl).join(', ')}`);
  }
  
  return { byUrl, byFilename, byNormalized };
}

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

// ПРАВИЛО 1: Умные ссылки (для localhost и Vercel)
turndownService.addRule('fixLinks', {
  filter: ['a'],
  replacement: function (content, node) {
    let href = node.getAttribute('href');
    if (!href) return content;

    // Если ссылка ведет на наш продакшн сайт, делаем её относительной
    if (href.startsWith(PRODUCTION_DOMAIN)) {
      href = href.replace(PRODUCTION_DOMAIN, ''); 
    }
    // Если ссылка уже относительная или внешняя - оставляем как есть
    
    return `[${content}](${href})`;
  }
});

async function convert() {
  console.log("⏳ Загружаю описания картинок...");
  const captionsMap = await getCaptionsMap();
  const totalCaptions = Object.keys(captionsMap.byUrl).length;
  console.log(`✅ Загружено ${totalCaptions} описаний.`);

  // ПРАВИЛО 2: Картинки с вашими описаниями
  turndownService.addRule('imagesWithCaptions', {
    filter: 'img',
    replacement: function (content, node) {
      const src = node.getAttribute('src');
      if (!src) return '';
      
      // Нормализуем URL для поиска
      const normalizedSrc = normalizeUrl(src);
      const filename = src.split('/').pop();
      
      // Ищем описание в базе -> или берем alt -> или дефолт
      // Добавляем маркер "ФОТО:", чтобы ИИ точно понял
      let alt = captionsMap.byUrl[src] 
             || captionsMap.byNormalized[normalizedSrc]
             || captionsMap.byFilename[filename]
             || node.getAttribute('alt') 
             || 'Иллюстрация';
      return `\n![ФОТО: ${alt}](${src})\n`;
    }
  });

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Файл ${INPUT_FILE} не найден!`);
    return;
  }

  const rawData = fs.readFileSync(INPUT_FILE, 'utf-8');
  let data = JSON.parse(rawData);
  
  // Универсальный поиск массива статей
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
    cleanContent = cleanContent.replace(/\n\n+/g, '\n\n'); // Убираем лишние пробелы

    if (!cleanContent) return;

    // Обрабатываем Markdown-изображения: добавляем описания под картинками
    // Регулярка ищет: ![alt](url)
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    let imagesInArticle = 0;
    let descriptionsAdded = 0;
    
    cleanContent = cleanContent.replace(imageRegex, (match, altText, url) => {
      imagesInArticle++;
      
      // Пытаемся найти описание разными способами:
      // 1. По оригинальному URL
      // 2. По нормализованному URL (без домена)
      // 3. По имени файла
      const normalizedUrl = normalizeUrl(url);
      const filename = url.split('/').pop();
      
      const description = captionsMap.byUrl[url] 
                       || captionsMap.byNormalized[normalizedUrl]
                       || captionsMap.byFilename[filename];
      
      if (description) {
        descriptionsAdded++;
        // Добавляем описание под картинкой в виде цитаты
        return `${match}\n> 💡 Описание изображения: ${description}\n`;
      } else {
        // Логируем, если описание не найдено (только для первых нескольких)
        if (imagesInArticle <= 3) {
          console.log(`   ⚠️  Изображение без описания:`);
          console.log(`      Оригинальный URL: ${url}`);
          console.log(`      Нормализованный: ${normalizedUrl}`);
          console.log(`      Имя файла: ${filename}`);
        }
      }
      return match; // Если описания нет, оставляем как было
    });
    
    if (imagesInArticle > 0 && descriptionsAdded === 0) {
      console.log(`   ⚠️  В статье "${title}" найдено ${imagesInArticle} изображений, но описания не добавлены`);
    }

    fullText += `ТЕМА: ${title}\n`;
    fullText += `СОДЕРЖАНИЕ:\n${cleanContent}\n`;
    fullText += `--------------------------------------------------\n\n`;
  });

  if (!fs.existsSync('knowledge')) fs.mkdirSync('knowledge');
  fs.writeFileSync(OUTPUT_FILE, fullText);
  console.log(`🏁 Файл создан: ${OUTPUT_FILE}`);
  
  // Финальная статистика
  const totalImagesInDump = (fullText.match(/!\[.*?\]\(.*?\)/g) || []).length;
  const totalDescriptionsInDump = (fullText.match(/> 💡 Описание изображения:/g) || []).length;
  console.log("\n📊 ИТОГОВАЯ СТАТИСТИКА:");
  console.log(`   Всего изображений в дампе: ${totalImagesInDump}`);
  console.log(`   Изображений с описаниями: ${totalDescriptionsInDump}`);
  if (totalImagesInDump > 0 && totalDescriptionsInDump === 0) {
    console.log("\n⚠️  ВНИМАНИЕ: Описания не были добавлены!");
    console.log("   Возможные причины:");
    console.log("   1. URL изображений в JSON не совпадают с URL в таблице image_captions");
    console.log("   2. Таблица image_captions пуста или недоступна");
    console.log("   3. Проблемы с подключением к Supabase");
  }
  
  // Важное напоминание о следующем шаге
  if (totalDescriptionsInDump > 0 || totalImagesInDump > 0) {
    console.log("\n" + "=".repeat(60));
    console.log("⚠️  ВАЖНО: Следующий шаг!");
    console.log("=".repeat(60));
    console.log("📤 Теперь нужно загрузить обновленный full_dump.txt в базу данных.");
    console.log("   Запустите команду:");
    console.log("   node scripts/fill-db-smart.js");
    console.log("\n   Это загрузит дамп с описаниями в таблицу 'documents' в Supabase,");
    console.log("   чтобы чат мог использовать описания изображений в ответах.");
    console.log("=".repeat(60));
  }
}

convert();