-- Create shared_images table
CREATE TABLE "public"."shared_images" (
    "id" uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    "user_id" uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    "url" text NOT NULL,
    "caption" text,
    "file_path" text NOT NULL,
    "created_at" timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updated_at" timestamp WITH time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true);

-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'images' AND
    auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their own images
CREATE POLICY "Allow users to delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'images' AND
    auth.uid()::text = owner
);

-- Allow public access to images
CREATE POLICY "Allow public to view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'images');

-- Add RLS to shared_images table
ALTER TABLE "public"."shared_images" ENABLE ROW LEVEL SECURITY;

-- Allow users to view all shared images
CREATE POLICY "Allow users to view all shared images"
ON "public"."shared_images"
FOR SELECT
TO authenticated
USING (true);

-- Allow users to insert their own images
CREATE POLICY "Allow users to insert their own images"
ON "public"."shared_images"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own images
CREATE POLICY "Allow users to delete their own images"
ON "public"."shared_images"
FOR DELETE
TO authenticated
USING (auth.uid() = user_id); 