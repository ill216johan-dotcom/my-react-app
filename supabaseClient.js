import { createClient } from '@supabase/supabase-js'

// 1. Вставь Project URL (начинается на https://...)
const supabaseUrl = 'https://mtamqckydwnwgpzhevev.supabase.co'

// 2. Вставь anon / public key (длинный, начинается на eyJ...)
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10YW1xY2t5ZHdud2dwemhldmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTAxMjQsImV4cCI6MjA4MDE4NjEyNH0.Mo6xge0UzewVV3lmDx0B8F1X73j3tyQQwLYeY0mlM4U'

if (supabaseUrl === 'https://mtamqckydwnwgpzhevev.supabase.co') {
  console.error("⛔️ ТЫ ЗАБЫЛ ВСТАВИТЬ КЛЮЧИ В supabaseClient.js!");
}

export const supabase = createClient(supabaseUrl, supabaseKey)