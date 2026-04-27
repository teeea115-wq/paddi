# Decision Match - Setup Guide

## 1. Environment Variables
Create a `.env.local` file in the root directory and add the following:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# SerpAPI Configuration (Server-side only)
SERPAPI_KEY=your_serpapi_api_key
```

## 2. Database Setup
Go to your Supabase Project -> SQL Editor and run the files in this order:
1. `supabase_schema.sql` (Initial tables, functions, and RLS)
2. `monetization_updates.sql` (Paywall and access control logic)

## 3. Local Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 4. Deployment (Vercel)
1. Push this code to a GitHub repository.
2. Connect the repository to Vercel.
3. Add the environment variables listed in step 1 in the Vercel Dashboard (Settings -> Environment Variables).
4. Vercel will automatically detect Next.js and deploy the app.

## 5. PWA Support
To enable full PWA functionality, ensure you provide `icon-192.png` and `icon-512.png` in the `/public` directory.
