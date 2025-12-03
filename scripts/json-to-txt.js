import fs from 'fs';

// НАСТРОЙКИ
const INPUT_FILE = 'knowledgebase.json';
const OUTPUT_FILE = 'knowledge/full_dump.txt';

// Функция для очистки HTML (удаляет теги <...>)
function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Удаляем стили
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Удаляем скрипты
    .replace(/<[^>]+>/g, ' ') // Заменяем любые теги на пробелы
    .replace(/\s\s+/g, ' ')   // Убираем двойные пробелы и переносы
    .trim();
}

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

  // 1. Достаем массив из ключа categories
  let items = [];
  if (data.categories && Array.isArray(data.categories)) {
    items = data.categories;
  } else if (Array.isArray(data)) {
    items = data;
  } else {
    console.error("❌ Не нашел массив записей (искал в корне и в 'categories').");
    return;
  }

  console.log(`Найдено ${items.length} статей. Очищаю от HTML и конвертирую...`);

  let fullText = "";

  items.forEach(item => {
    const category = item.category || "Общее";
    const title = item.title || "Без темы";
    const rawContent = item.content || "";
    
    // 2. Чистим текст
    const cleanContent = stripHtml(rawContent);

    if (!cleanContent) return;

    // 3. Формируем блок
    fullText += `РАЗДЕЛ: ${category}\n`;
    fullText += `ТЕМА: ${title}\n`;
    fullText += `${cleanContent}\n`;
    fullText += `--------------------------------------------------\n\n`;
  });

  // Создаем папку если нет
  if (!fs.existsSync('knowledge')) {
    fs.mkdirSync('knowledge');
  }

  fs.writeFileSync(OUTPUT_FILE, fullText);
  console.log(`✅ Готово! Текст сохранен в ${OUTPUT_FILE}`);
  console.log(`Совет: Открой этот файл и проверь глазами, что текст читаемый.`);
}

convert();