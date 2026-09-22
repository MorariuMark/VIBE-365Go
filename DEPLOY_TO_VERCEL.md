# How to Deploy VIBE 365 Online & Access From Your Phone

Your app is now connected to **Supabase** for database synchronization and photo storage. Follow these 3 easy steps to host it online for free on **Vercel** and install it on your phone:

---

### Step 1: Run the Database & Storage Setup in Supabase (1 Minute)

1. Open your Supabase project's SQL editor:  
   👉 **[Supabase SQL Editor](https://supabase.com/dashboard/project/vzdiltjsswuqrcvzyrfn/sql)**
2. Click **"New query"**.
3. Copy and paste the contents of `supabase_setup.sql` (from this project folder) into the query editor:
   - It creates the `vibe_app_state` table for database sync.
   - It creates the `photos` storage bucket with public access for photo uploads.
4. Click **"Run"** (or press `Ctrl+Enter`). You should see:
   `"VIBE 365 Cloud Setup Completed Successfully!"`.

---

### Step 2: Push your Changes to GitHub

Open a terminal in `D:\VIBE-365Go` and run:
```bash
git add .
git commit -m "Add Supabase cloud database sync, photo storage, and PWA mobile support"
git push origin master
```

---

### Step 3: Deploy to Vercel (100% Free)

1. Go to **[vercel.com](https://vercel.com)** and sign in with your GitHub account.
2. Click **"Add New..."** $\rightarrow$ **"Project"**.
3. Under *Import Git Repository*, find **`VIBE-365Go`** and click **"Import"**.
4. *(Optional but recommended)* Expand **Environment Variables** and add:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://vzdiltjsswuqrcvzyrfn.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_FSy0j6BAK4Im6QlOE-RwjQ_IVNLplpj`
   - Any LLM API keys you wish to use for the AI Coach (e.g., `GROQ_API_KEY`, `GEMINI_API_KEY`).
5. Click **"Deploy"**.
6. In ~60 seconds, your app is live at a URL like:  
   **`https://vibe-365-go.vercel.app`**

---

### Step 4: Access From Your Phone like a Native App

1. Open your live Vercel URL in your phone's browser (**Safari** on iPhone, **Chrome** on Android).
2. Install as an App icon on your home screen:
   - **On iPhone (Safari)**: Tap the **Share button** (square with arrow up) at the bottom $\rightarrow$ scroll down and tap **"Add to Home Screen"** $\rightarrow$ tap **"Add"**.
   - **On Android (Chrome)**: Tap the **Three dots menu** in the top right $\rightarrow$ tap **"Add to Home screen"** (or "Install App").
3. Tap the new **VIBE 365** icon on your phone's home screen. It will open in full-screen mode just like a native mobile app!
4. Any habits, workouts, or photos you log on your phone will automatically sync with Supabase and be visible on your desktop.
