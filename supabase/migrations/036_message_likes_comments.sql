-- Add likes and comments to message board posts.

CREATE TABLE IF NOT EXISTS public.message_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.message_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (length(trim(content)) > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_likes_message_id ON public.message_likes(message_id);
CREATE INDEX IF NOT EXISTS idx_message_likes_user_id ON public.message_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_message_comments_message_id ON public.message_comments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_comments_created_at ON public.message_comments(created_at);

ALTER TABLE public.message_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all message likes"
    ON public.message_likes FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can like messages"
    ON public.message_likes FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own message likes"
    ON public.message_likes FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view all message comments"
    ON public.message_comments FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can create their own message comments"
    ON public.message_comments FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own message comments"
    ON public.message_comments FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own message comments"
    ON public.message_comments FOR DELETE
    TO authenticated
    USING (
        auth.uid() = user_id
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

DROP TRIGGER IF EXISTS update_message_comments_updated_at ON public.message_comments;
CREATE TRIGGER update_message_comments_updated_at
    BEFORE UPDATE ON public.message_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.message_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_comments;
