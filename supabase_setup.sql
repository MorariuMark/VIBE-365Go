-- ==============================================================================
-- VIBE 365 | Supabase Database & Photo Storage Initialization
-- Project: MorariuMark's Project (vzdiltjsswuqrcvzyrfn)
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/vzdiltjsswuqrcvzyrfn/sql
-- ==============================================================================

-- 1. Create table for seamless cloud application state synchronization
CREATE TABLE IF NOT EXISTS public.vibe_app_state (
    id TEXT PRIMARY KEY DEFAULT 'primary_user_state',
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.vibe_app_state ENABLE ROW LEVEL SECURITY;

-- Allow seamless public access using the publishable/anon key
DROP POLICY IF EXISTS "Public access for vibe_app_state" ON public.vibe_app_state;
CREATE POLICY "Public access for vibe_app_state"
    ON public.vibe_app_state
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 2. Create the public "photos" storage bucket for mobile & desktop image uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'photos',
    'photos',
    true,
    15728640, -- 15MB limit per photo
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif', 'image/*']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 15728640,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/gif', 'image/*'];

-- 3. Storage bucket access policies
-- Drop any existing conflicting policies on storage.objects for photos
DROP POLICY IF EXISTS "Public select photos" ON storage.objects;
DROP POLICY IF EXISTS "Public upload photos" ON storage.objects;
DROP POLICY IF EXISTS "Public update photos" ON storage.objects;
DROP POLICY IF EXISTS "Public delete photos" ON storage.objects;

-- Allow anyone with the anon key to view photos
CREATE POLICY "Public select photos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'photos');

-- Allow anyone with the anon key to upload photos
CREATE POLICY "Public upload photos"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'photos');

-- Allow updating photos
CREATE POLICY "Public update photos"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'photos');

-- Allow deleting photos
CREATE POLICY "Public delete photos"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'photos');

-- Success confirmation message
SELECT 'VIBE 365 Cloud Setup Completed Successfully!' AS status;
