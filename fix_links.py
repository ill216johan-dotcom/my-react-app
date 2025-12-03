import json
import re
import os

# --- НАСТРОЙКИ ПУТЕЙ ---
# Так как скрипт лежит в корне, а файл в public
INPUT_FILE = 'public/knowledgebase.json' 
OUTPUT_FILE = 'public/knowledgebase.json' # Перезапишем тот же файл (сделайте копию на всякий случай!)

# Проверка наличия файла
if not os.path.exists(INPUT_FILE):
    print(f"❌ Файл {INPUT_FILE} не найден! Запустите скрипт из корня проекта.")
    exit()

print(f">>> Читаю базу из {INPUT_FILE}...")
with open(INPUT_FILE, 'r', encoding='utf-8') as f:
    data = json.load(f)

# 1. Создаем карту ссылок: "Старый URL" -> "ID статьи"
# Мы будем чистить URL от слэшей в конце, чтобы поиск был точнее
url_map = {}

# Вспомогательная функция для обхода любой структуры (массив или объект)
def collect_urls(node):
    if isinstance(node, dict):
        if 'url' in node and 'id' in node:
            clean_url = node['url'].strip().rstrip('/')
            url_map[clean_url] = node['id']
        
        # Идем глубже
        for key, value in node.items():
            collect_urls(value)
    elif isinstance(node, list):
        for item in node:
            collect_urls(item)

collect_urls(data)

print(f">>> Найдено {len(url_map)} статей с URL для перелинковки.")

# 2. Функция замены ссылки в тексте
def replace_link_match(match):
    original_href = match.group(1) # То, что внутри href="..."
    clean_search = original_href.strip().rstrip('/')
    
    # Если ссылка ведет на наш старый сайт и мы знаем ID этой статьи
    if clean_search in url_map:
        target_id = url_map[clean_search]
        # Заменяем на спец. формат #internal-ID
        return f'href="#internal-{target_id}" data-internal="true"'
    
    return match.group(0) # Если не нашли, оставляем как было

# 3. Проходим по всем статьям и меняем контент
stats = {'fixed': 0}

def process_content(node):
    if isinstance(node, dict):
        # Если нашли контент с HTML
        if 'content' in node and isinstance(node['content'], str):
            content = node['content']
            # Ищем ссылки <a href="...">
            new_content, count = re.subn(r'href=["\']([^"\']+)["\']', replace_link_match, content)
            if count > 0:
                node['content'] = new_content
                stats['fixed'] += count
        
        for key, value in node.items():
            process_content(value)
    elif isinstance(node, list):
        for item in node:
            process_content(item)

process_content(data)

print(f">>> Исправлено ссылок: {stats['fixed']}")

# 4. Сохраняем обратно
print(">>> Сохраняю файл...")
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))

print(">>> Готово! Ссылки заменены на внутренние ID.")