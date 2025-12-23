# Quick Start Guide

## Why is the page empty?

The page appears empty because the application requires valid Supabase credentials to function. Currently, your `.env` file contains placeholder values.

## Quick Fix Options

### Option 1: Set Up Supabase (Recommended - 5 minutes)

1. **Create a Supabase account**
   - Go to [supabase.com](https://supabase.com)
   - Sign up for a free account

2. **Create a new project**
   - Click "New Project"
   - Choose a name (e.g., "ziegler-cabin")
   - Set a database password
   - Select a region close to you
   - Wait for the project to be created (~2 minutes)

3. **Get your credentials**
   - Go to Project Settings → API
   - Copy the "Project URL" (looks like: `https://xxxxx.supabase.co`)
   - Copy the "anon public" key (long string starting with `eyJ...`)

4. **Update your .env file**
   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...your-actual-key
   ```

5. **Set up the database**
   - Run the migrations:
   ```bash
   # See SUPABASE_SETUP.md for detailed instructions
   ```

6. **Restart the dev server**
   - The page should now load with the login form!

### Option 2: Development Mode (Quick Test)

The app has been updated to run with placeholder credentials, but **authentication will not work**. You'll see:
- ✅ The page layout and logo
- ✅ The login/registration forms
- ❌ Actual login/registration (requires real Supabase)
- ⚠️  Console warnings about missing credentials

This is useful for:
- Testing the UI/UX
- Developing frontend components
- Running tests

## What You Should See

Once properly configured, you should see:
1. **Ziegler Cabin Logo** - A cursive "Z" with tree theme
2. **Login Form** - Email and password fields
3. **Registration Link** - Switch to registration (requires invitation)

## Troubleshooting

### Still seeing a blank page?
1. Check the browser console (F12) for errors
2. Make sure the dev server is running (`npm run dev`)
3. Try hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Console shows Supabase errors?
- This is expected with placeholder credentials
- The app will still render, but authentication won't work
- Set up real Supabase credentials to fix this

### Need help?
- See `SUPABASE_SETUP.md` for detailed setup instructions
- Check `README.md` for general project information

## Next Steps

1. ✅ Set up Supabase credentials (see Option 1 above)
2. ✅ Run database migrations (see `SUPABASE_SETUP.md`)
3. ✅ Create an admin user
4. ✅ Start using the app!

---

**Note**: The application is fully functional once Supabase is properly configured. The empty page issue is only due to missing credentials.
