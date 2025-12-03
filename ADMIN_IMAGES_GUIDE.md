# Admin Images Manager - Setup & Usage Guide

## Overview

The Admin Images Manager is a new interface that allows administrators to add descriptive captions to images found in the knowledgebase. These descriptions help the AI chat understand and reference visual content more effectively.

---

## Setup Instructions

### 1. Database Setup

First, you need to create the `image_captions` table in your Supabase database.

**Steps:**
1. Open your Supabase project dashboard
2. Navigate to the **SQL Editor**
3. Run the migration script located at: `image_captions_migration.sql`
4. Verify the table was created successfully

The table structure:
```sql
CREATE TABLE image_captions (
  id UUID PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### 2. Admin Access

Only users with the `admin` role can access this page. Make sure your user profile in the `profiles` table has:
```sql
role = 'admin'
```

---

## How to Use

### Accessing the Admin Images Page

1. Log in with an admin account
2. Navigate to the header menu
3. Click on **"🖼️ Изображения"** (Images)
4. You'll be redirected to `/admin/images`

### Managing Image Descriptions

The page displays all images found in your `knowledgebase.json` file.

**For each image:**
1. **View the thumbnail** - See a preview of the image
2. **Check the URL** - The full image URL is displayed below the thumbnail
3. **Add/Edit description** - Enter a descriptive caption in the textarea
   - Example: "Screenshot of the FBO tariff table showing pricing tiers for different weight categories"
4. **Save** - Click the "Save" button to store the description in Supabase

**Button States:**
- **Blue "Save" button** - Description has been modified and needs to be saved
- **Green "Saved" button** - Description is up-to-date in the database
- **Gray "Saving..." button** - Currently saving to database

### Best Practices for Descriptions

Write clear, descriptive captions that help the AI understand:
- **What the image shows** (e.g., "Table", "Screenshot", "Diagram")
- **The content/purpose** (e.g., "pricing tiers", "workflow steps")
- **Key details** (e.g., "showing weight categories from 0-50kg")

**Good Examples:**
- ✅ "Screenshot of the FBO tariff table showing pricing tiers for different weight categories"
- ✅ "Diagram illustrating the order fulfillment workflow from warehouse to customer"
- ✅ "Photo of proper packaging materials including bubble wrap and cardboard boxes"

**Bad Examples:**
- ❌ "Image" (too vague)
- ❌ "Screenshot" (not descriptive enough)
- ❌ "Table with numbers" (lacks context)

---

## Features

### Automatic Image Detection
The system automatically scans your `knowledgebase.json` and extracts:
- HTML `<img>` tags: `<img src="...">`
- Markdown images: `![alt](url)`

### Statistics Dashboard
At the top of the page, you'll see:
- **Total Images Found** - All images detected in the knowledgebase
- **Descriptions Added** - Images that have saved descriptions
- **Remaining** - Images still needing descriptions

### Real-time Saving
- Each image can be saved independently
- Changes are immediately stored in Supabase
- Toast notifications confirm successful saves

### Error Handling
- Failed image loads show a placeholder
- Network errors display error messages
- Empty descriptions cannot be saved

---

## Technical Details

### File Structure
```
src/
├── pages/
│   └── AdminImages.jsx          # Main admin images component
├── components/
│   └── CalculatorLayout.jsx     # Updated with new nav link
└── App.jsx                      # Updated with new route

image_captions_migration.sql     # Database migration script
```

### API Integration

The page uses Supabase for:
1. **Authentication** - Checking admin role
2. **Data Storage** - Saving/loading image captions

**Key Operations:**
```javascript
// Fetch existing captions
const { data } = await supabase
  .from('image_captions')
  .select('url, description');

// Save/update caption (upsert)
await supabase
  .from('image_captions')
  .upsert({ url, description });
```

### Security

Row Level Security (RLS) policies ensure:
- ✅ Anyone can **read** image captions (for AI chat)
- ✅ Only **admins** can insert/update/delete captions
- ✅ Non-admin users are redirected to `/auth`

---

## Troubleshooting

### "No Images Found"
**Cause:** No images detected in `knowledgebase.json`
**Solution:** 
- Check that your knowledgebase content includes `<img>` tags or markdown images
- Verify the file is accessible at `/knowledgebase.json`

### "Failed to load image"
**Cause:** Image URL is broken or inaccessible
**Solution:**
- Verify the image URL is correct
- Check that the image server is accessible
- You can still add descriptions to images that fail to load

### Cannot Access Page
**Cause:** User is not logged in or doesn't have admin role
**Solution:**
- Log in with an admin account
- Check your `profiles` table: `role = 'admin'`

### Save Button Disabled
**Cause:** No changes made to description
**Solution:**
- Modify the description text
- The button will become active when changes are detected

---

## Future Enhancements

Potential improvements for future versions:
- Bulk edit mode for multiple images
- Image categorization/tagging
- AI-suggested descriptions
- Image upload functionality
- Description templates
- Search/filter images by URL or description

---

## Support

If you encounter any issues:
1. Check the browser console for error messages
2. Verify database migration was successful
3. Confirm admin role is properly set
4. Check Supabase connection settings

For technical support, contact your development team with:
- Error messages from console
- Screenshot of the issue
- Steps to reproduce the problem

