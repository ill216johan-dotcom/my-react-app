import { createClient } from '@supabase/supabase-js'

// Проверка: используем import.meta.env для Vite
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ОШИБКА: Нет ключей Supabase! Проверь .env файл.")
}

export const supabase = createClient(supabaseUrl, supabaseKey)