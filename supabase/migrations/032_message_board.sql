-- Migration: Message Board
-- Creates a message board for family communication

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies: All authenticated users can read all messages
CREATE POLICY "Users can view all messages"
    ON public.messages FOR SELECT
    TO authenticated
    USING (true);

-- Users can create their own messages
CREATE POLICY "Users can create their own messages"
    ON public.messages FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own messages
CREATE POLICY "Users can update their own messages"
    ON public.messages FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages (admins can delete any)
CREATE POLICY "Users can delete their own messages"
    ON public.messages FOR DELETE
    TO authenticated
    USING (
        auth.uid() = user_id 
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- Function to notify all users when a new message is posted
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
    poster_name TEXT;
    message_preview TEXT;
BEGIN
    -- Get the poster's name
    SELECT COALESCE(first_name || ' ' || last_name, 'A family member')
    INTO poster_name
    FROM public.profiles
    WHERE id = NEW.user_id;

    -- Create a preview of the message (first 100 chars)
    message_preview := LEFT(NEW.content, 100);
    IF LENGTH(NEW.content) > 100 THEN
        message_preview := message_preview || '...';
    END IF;

    -- Create notifications for all users except the poster
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT 
        p.id,
        'New Message from ' || poster_name,
        message_preview,
        'general'
    FROM public.profiles p
    WHERE p.id != NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new message notifications
DROP TRIGGER IF EXISTS trigger_notify_new_message ON public.messages;
CREATE TRIGGER trigger_notify_new_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_message();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
