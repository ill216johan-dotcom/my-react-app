# ✅ Production Deployment Checklist

## Pre-Deployment Verification

### 1. Code Quality & Security ✅
- [x] No hardcoded API keys or secrets in codebase
- [x] All sensitive data uses environment variables
- [x] No linter errors
- [x] All imports are correct
- [x] Unused files removed (duplicate supabaseClient.js)

### 2. Environment Variables ✅
- [x] Client-side variables use `VITE_` prefix
- [x] Server-side variables documented in ENV_SETUP.md
- [x] api/chat.js uses correct variable names (without VITE_)
- [x] server/server.js uses correct variable names (with VITE_)

### 3. Error Handling ✅
- [x] Comprehensive try-catch blocks in api/chat.js
- [x] Specific error messages for different failure types
- [x] Input validation (message length, type checking)
- [x] Graceful degradation on API failures

### 4. Performance Optimizations ✅
- [x] Timeout protection on all external API calls (15-30s)
- [x] Supabase client initialized once at module level
- [x] RAG parameters optimized (match_threshold: 0.25, match_count: 5)
- [x] YandexGPT temperature set to 0.3 (factual responses)

### 5. API Configuration ✅
- [x] CORS headers properly configured
- [x] API_URL logic in AiChatWidget.jsx correct:
  - Production: `/api/chat` (Vercel serverless)
  - Development: `http://localhost:3001/api/chat` (local server)

## Critical Fixes Applied

### 🔧 Fixed Issues:

1. **api/chat.js** - Environment Variables
   - ❌ Was: `process.env.VITE_SUPABASE_URL`
   - ✅ Now: `process.env.SUPABASE_URL`
   - **Impact**: Serverless function will now correctly read Vercel env vars

2. **scripts/fill-db-smart.js** - Undefined Variable
   - ❌ Was: `${FOLDER_ID}`
   - ✅ Now: `${YANDEX_FOLDER_ID}`
   - **Impact**: Database population script will no longer crash

3. **Error Handling** - Added comprehensive validation
   - Message length validation (max 2000 chars)
   - Type checking for message input
   - Specific error codes (400, 503, 500)
   - Timeout protection on all API calls

4. **Performance** - Added timeouts
   - Embedding API: 15 seconds
   - Generation API: 30 seconds
   - Database fill script: 20 seconds

## Vercel Deployment Steps

### 1. Set Environment Variables in Vercel Dashboard

Go to: Project Settings → Environment Variables

Add these **4 variables** (for Production, Preview, Development):

```
SUPABASE_URL = https://your-project-id.supabase.co
SUPABASE_ANON_KEY = your-anon-key-here
YANDEX_API_KEY = your-yandex-api-key
YANDEX_FOLDER_ID = your-folder-id
```

⚠️ **IMPORTANT**: Do NOT use `VITE_` prefix in Vercel dashboard!

### 2. Verify vercel.json Configuration

Your `vercel.json` should handle SPA routing:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 3. Deploy

```bash
git add .
git commit -m "Production optimizations and security fixes"
git push origin main
```

Vercel will automatically deploy.

### 4. Test Production API

After deployment, test the chat:
1. Open your Vercel URL
2. Click the AI chat widget
3. Send a test message
4. Verify response comes back

## Local Development Testing

Before pushing to production, test locally:

### 1. Start Local Server
```bash
node server/server.js
```

### 2. Start Vite Dev Server (in another terminal)
```bash
npm run dev
```

### 3. Test Chat Widget
- Open http://localhost:5173
- Test AI chat functionality
- Check browser console for errors

## Performance Benchmarks

Expected response times:
- Embedding generation: 1-3 seconds
- Supabase vector search: 0.5-1 second
- YandexGPT generation: 3-8 seconds
- **Total**: 5-12 seconds per query

## Monitoring & Debugging

### Production Logs (Vercel)
1. Go to Vercel Dashboard → Your Project → Functions
2. Click on `/api/chat`
3. View real-time logs

### Local Logs
Server logs include:
- 📥 Incoming questions
- ✅ Found fragments count
- 🔍 Similarity scores
- 🤖 Response status

## Security Notes

✅ **Safe for Git**:
- All API keys use environment variables
- No hardcoded secrets
- .env file is gitignored

✅ **API Security**:
- CORS properly configured
- Method validation (POST only)
- Input sanitization
- Rate limiting (handled by Vercel/Yandex)

## Post-Deployment Verification

After deployment, verify:
- [ ] Chat widget appears on site
- [ ] Messages send successfully
- [ ] AI responses are relevant (RAG working)
- [ ] No errors in Vercel function logs
- [ ] Response times are acceptable (<15s)

## Rollback Plan

If issues occur:
1. Check Vercel function logs
2. Verify environment variables are set
3. Revert to previous deployment in Vercel dashboard
4. Check Supabase database connection

## Support Contacts

- Yandex Cloud API Status: https://status.cloud.yandex.ru/
- Supabase Status: https://status.supabase.com/
- Vercel Status: https://www.vercel-status.com/

---

**Last Updated**: December 2025
**Status**: ✅ Ready for Production

