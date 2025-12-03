import fs from 'fs';
import TurndownService from 'turndown';

const INPUT_FILE = 'knowledgebase.json';
const OUTPUT_FILE = 'knowledge/full_dump.txt';

// ВАЖНО: Укажи здесь адрес, где лежит твоя база знаний на сайте
// Чтобы ссылка #art_123 превратилась в https://твой-сайт.ру/help#art_123
const BASE_URL = 'https://ff-platform.ru/help'; // <-- ПОМЕНЯЙ НА СВОЙ РЕАЛЬНЫЙ URL

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

// ПРАВИЛО ДЛЯ ССЫЛОК: Чиним якоря (#)
turndownService.addRule('fixAnchors', {
  filter: ['a'],
  replacement: function (content, node) {
    let href = node.getAttribute('href');
    if (!href) return content;

    // Если ссылка начинается с # (внутренняя), добавляем базу
    if (href.startsWith('#')) {
      href = `${BASE_URL}${href}`;
    }
    
    // Если ссылка относительная (/page), тоже чиним
    if (href.startsWith('/')) {
        href = `https://ff-platform.ru${href}`;
    }

    return `[${content}](${href})`;
  }
});

// ПРАВИЛО ДЛЯ КАРТИНОК: Добавляем описание, если его нет
turndownService.addRule('imagesWithAlt', {
  filter: 'img',
  replacement: function (content, node) {
    const alt = node.getAttribute('alt') || 'Иллюстрация к теме'; // Дефолтное описание
    const src = node.getAttribute('src');
    if (!src) return '';
    return `![${alt}](${src})`;
  }
});

function convert() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Файл ${INPUT_FILE} не найден!`);
    return;
  }

  const rawData = fs.readFileSync(INPUT_FILE, 'utf-8');
  let data;
  try {
    data = JSON.parse(rawData);
  } catch (e) {
    console.error("❌ Ошибка JSON:", e.message);
    return;
  }

  let items = [];
  if (data.categories && Array.isArray(data.categories)) items = data.categories;
  else if (Array.isArray(data)) items = data;
  else items = [data];

  console.log(`Найдено ${items.length} статей. Конвертирую с исправлением ссылок...`);

  let fullText = "";

  items.forEach(item => {
    const title = item.title || "Без темы";
    const rawContent = item.content || "";
    
    // Конвертируем HTML -> Markdown
    let cleanContent = turndownService.turndown(rawContent);
    
    // Убираем лишние пустые строки
    cleanContent = cleanContent.replace(/\n\n+/g, '\n\n');

    if (!cleanContent) return;

    fullText += `ТЕМА: ${title}\n`;
    fullText += `СОДЕРЖАНИЕ:\n${cleanContent}\n`;
    fullText += `--------------------------------------------------\n\n`;
  });

  if (!fs.existsSync('knowledge')) fs.mkdirSync('knowledge');
  fs.writeFileSync(OUTPUT_FILE, fullText);
  console.log(`✅ Готово! Ссылки исправлены, картинки сохранены.`);
}

convert();