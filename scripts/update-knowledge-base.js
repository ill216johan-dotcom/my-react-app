#!/usr/bin/env node

/**
 * Скрипт для полного обновления базы знаний:
 * 1. Создает full_dump.txt с описаниями изображений (json-to-txt.js)
 * 2. Загружает дамп в базу данных (fill-db-smart.js)
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🚀 Начинаю полное обновление базы знаний...\n");

// Шаг 1: Создание full_dump.txt
console.log("=".repeat(60));
console.log("ШАГ 1: Создание full_dump.txt с описаниями изображений");
console.log("=".repeat(60));

const step1 = spawn('node', ['scripts/json-to-txt.js'], {
  cwd: path.resolve(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

step1.on('close', (code1) => {
  if (code1 !== 0) {
    console.error(`\n❌ Ошибка на шаге 1 (код выхода: ${code1})`);
    process.exit(code1);
  }

  console.log("\n" + "=".repeat(60));
  console.log("ШАГ 2: Загрузка дампа в базу данных");
  console.log("=".repeat(60));

  // Шаг 2: Загрузка в базу
  const step2 = spawn('node', ['scripts/fill-db-smart.js'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    shell: true
  });

  step2.on('close', (code2) => {
    if (code2 !== 0) {
      console.error(`\n❌ Ошибка на шаге 2 (код выхода: ${code2})`);
      process.exit(code2);
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ БАЗА ЗНАНИЙ УСПЕШНО ОБНОВЛЕНА!");
    console.log("=".repeat(60));
    console.log("Теперь чат будет использовать обновленные данные с описаниями изображений.");
  });
});

