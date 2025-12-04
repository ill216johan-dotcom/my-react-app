import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';

// Получаем __dirname для ES модулей
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Настройки
const FILE_PATH = path.join(__dirname, '../knowledge/full_dump.txt');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Ошибка: Не заданы SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY в .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function injectDescriptions() {
    console.log('🔄 Начинаем внедрение описаний...');

    // 1. Читаем файл
    if (!fs.existsSync(FILE_PATH)) {
        console.error(`❌ Файл не найден: ${FILE_PATH}`);
        return;
    }
    let content = fs.readFileSync(FILE_PATH, 'utf-8');
    console.log(`📄 Файл прочитан. Размер: ${content.length} символов.`);

    // 2. Скачиваем описания из Supabase
    const { data: captions, error } = await supabase
        .from('image_captions')
        .select('url, description');

    if (error) {
        console.error('❌ Ошибка Supabase:', error);
        return;
    }
    console.log(`📥 Получено описаний из базы: ${captions.length}`);

    // 3. Заменяем в тексте
    let matchCount = 0;

    // Создаем карту для быстрого поиска: filename -> description
    const captionMap = {};
    captions.forEach(item => {
        // Берем только имя файла, например "img_123.png", чтобы избежать проблем с путями /images/ vs full url
        const filename = item.url.split('/').pop();
        if (filename && item.description) {
            captionMap[filename] = item.description;
        }
    });

    // Регулярка ищет markdown картинки: ![alt](url)
    // Она захватывает: группа 1 (alt), группа 2 (url)
    const regex = /!\[(.*?)\]\((.*?)\)/g;

    const newContent = content.replace(regex, (match, altText, url) => {
        const filename = url.split('/').pop(); // Вытаскиваем имя файла из ссылки в тексте
        
        if (captionMap[filename]) {
            matchCount++;
            const description = captionMap[filename];
            // Возвращаем: Картинку + Блок цитаты с описанием
            return `![${altText} ${description}](${url})\n> 💡 Описание изображения: ${description}\n`;
        }
        return match; // Если описания нет, оставляем как было
    });

    // 4. Сохраняем обратно
    fs.writeFileSync(FILE_PATH, newContent, 'utf-8');
    
    console.log('-----------------------------------');
    console.log(`✅ Готово! Внедрено описаний: ${matchCount}`);
    console.log(`💾 Файл обновлен: ${FILE_PATH}`);
}

injectDescriptions();