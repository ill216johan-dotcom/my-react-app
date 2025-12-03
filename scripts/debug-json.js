import fs from 'fs';

const FILE_NAME = 'knowledgebase.json';

try {
  if (!fs.existsSync(FILE_NAME)) {
    console.log(`❌ Файл ${FILE_NAME} не найден! Проверь название (все буквы маленькие?).`);
  } else {
    const raw = fs.readFileSync(FILE_NAME, 'utf-8');
    const data = JSON.parse(raw);

    console.log("------------------------------------------------");
    console.log("📊 АНАЛИЗ СТРУКТУРЫ JSON:");
    
    if (Array.isArray(data)) {
      console.log(`✅ Это массив. Количество записей: ${data.length}`);
      if (data.length > 0) {
        console.log("🔍 Пример первой записи (Ключи):");
        console.log(JSON.stringify(data[0], null, 2));
      }
    } else {
      console.log("⚠️ Это НЕ массив, а объект.");
      console.log("Ключи верхнего уровня:", Object.keys(data));
      
      // Попробуем найти массив внутри
      const arrayKey = Object.keys(data).find(key => Array.isArray(data[key]));
      if (arrayKey) {
        console.log(`💡 Нашел массив внутри ключа "${arrayKey}". Длина: ${data[arrayKey].length}`);
        console.log("🔍 Пример записи из этого массива:");
        console.log(JSON.stringify(data[arrayKey][0], null, 2));
      }
    }
    console.log("------------------------------------------------");
  }
} catch (e) {
  console.error("🔥 Ошибка чтения JSON:", e.message);
}