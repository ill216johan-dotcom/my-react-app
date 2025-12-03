# 🔐 Environment Variables Setup

## For Local Development (.env file)

Create a `.env` file in the project root with:

```env
# Client-side (exposed to browser via Vite)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here

# Server-side (Node.js only)
YANDEX_API_KEY=your-yandex-api-key-here
YANDEX_FOLDER_ID=your-yandex-folder-id-here
```

## For Vercel Production Deployment

Add these in Vercel Dashboard → Project Settings → Environment Variables:

### Required Variables:
1. **SUPABASE_URL** = `https://your-project-id.supabase.co` (without VITE_ prefix!)
2. **SUPABASE_ANON_KEY** = `your-anon-key` (without VITE_ prefix!)
3. **YANDEX_API_KEY** = `your-yandex-api-key`
4. **YANDEX_FOLDER_ID** = `your-folder-id`

### Important Notes:
- ⚠️ **Vercel serverless functions** use variables **WITHOUT** the `VITE_` prefix
- ⚠️ Client-side code uses `VITE_` prefixed variables (injected at build time)
- ✅ The `api/chat.js` function is already configured for Vercel
- ✅ The `server/server.js` is for local development only

## Architecture

```
Development:
  ├── Client (Vite) → reads VITE_* from .env
  └── server/server.js → reads VITE_* and YANDEX_* from .env

Production (Vercel):
  ├── Client (Built) → uses VITE_* from build time
  └── api/chat.js → reads SUPABASE_*, YANDEX_* from Vercel env vars
```

