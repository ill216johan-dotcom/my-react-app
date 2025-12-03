# Quick Start: Admin Images Manager

## 🚀 Setup (One-Time)

### Step 1: Run Database Migration
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `image_captions_migration.sql`
3. Click "Run"
4. Verify success message

### Step 2: Verify Admin Access
Ensure your user has admin role:
```sql
SELECT role FROM profiles WHERE id = 'your-user-id';
-- Should return: 'admin'
```

---

## 📝 Daily Usage

### Access the Page
1. Log in as admin
2. Click **"🖼️ Изображения"** in header
3. Or navigate to: `/admin/images`

### Add Descriptions
1. Find an image in the grid
2. Type description in textarea
3. Click **"Save"** button
4. Wait for "Saved successfully!" toast

### Good Description Format
```
[Type] of [Content] showing [Details]
```

**Examples:**
- "Screenshot of FBO tariff table showing pricing tiers"
- "Diagram of order fulfillment workflow"
- "Photo of packaging materials including bubble wrap"

---

## 📊 Dashboard Stats

| Metric | Meaning |
|--------|---------|
| **Total Images** | All images in knowledgebase |
| **Descriptions Added** | Images with saved captions |
| **Remaining** | Images still needing descriptions |

---

## 🎯 Priority Order

1. **High Priority:** Screenshots of tables, calculators, forms
2. **Medium Priority:** Diagrams, workflows, infographics
3. **Low Priority:** Decorative images, logos

---

## ⚠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| Can't access page | Verify admin role in database |
| No images shown | Check `knowledgebase.json` has images |
| Save button disabled | Make changes to description first |
| Image won't load | URL may be broken (still add description) |

---

## 💡 Tips

- ✅ Be specific and descriptive
- ✅ Include key details visible in image
- ✅ Use consistent format
- ✅ Save frequently
- ❌ Don't use vague terms like "image" or "picture"
- ❌ Don't leave descriptions empty

---

## 🔗 Related Files

- **User Guide:** `ADMIN_IMAGES_GUIDE.md`
- **Technical Docs:** `ADMIN_IMAGES_IMPLEMENTATION.md`
- **Migration Script:** `image_captions_migration.sql`

---

## 📞 Need Help?

1. Check `ADMIN_IMAGES_GUIDE.md` for detailed instructions
2. Look at browser console for error messages
3. Contact development team with screenshots

