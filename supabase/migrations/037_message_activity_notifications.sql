-- Notify message authors when someone likes or comments on their message.

CREATE OR REPLACE FUNCTION notify_message_like()
RETURNS TRIGGER AS $$
DECLARE
    message_author_id UUID;
    liker_name TEXT;
BEGIN
    SELECT user_id INTO message_author_id
    FROM public.messages
    WHERE id = NEW.message_id;

    IF message_author_id IS NULL OR message_author_id = NEW.user_id THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(
        NULLIF(trim(first_name || ' ' || last_name), ''),
        'Someone'
    )
    INTO liker_name
    FROM public.profiles
    WHERE id = NEW.user_id;

    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
        message_author_id,
        'Message Liked',
        COALESCE(liker_name, 'Someone') || ' liked your message.',
        'general'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION notify_message_comment()
RETURNS TRIGGER AS $$
DECLARE
    message_author_id UUID;
    commenter_name TEXT;
    comment_preview TEXT;
BEGIN
    SELECT user_id INTO message_author_id
    FROM public.messages
    WHERE id = NEW.message_id;

    IF message_author_id IS NULL OR message_author_id = NEW.user_id THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(
        NULLIF(trim(first_name || ' ' || last_name), ''),
        'Someone'
    )
    INTO commenter_name
    FROM public.profiles
    WHERE id = NEW.user_id;

    comment_preview := LEFT(NEW.content, 100);
    IF LENGTH(NEW.content) > 100 THEN
        comment_preview := comment_preview || '...';
    END IF;

    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
        message_author_id,
        'New Comment',
        COALESCE(commenter_name, 'Someone') || ' commented: ' || comment_preview,
        'general'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_message_like ON public.message_likes;
CREATE TRIGGER trigger_notify_message_like
    AFTER INSERT ON public.message_likes
    FOR EACH ROW
    EXECUTE FUNCTION notify_message_like();

DROP TRIGGER IF EXISTS trigger_notify_message_comment ON public.message_comments;
CREATE TRIGGER trigger_notify_message_comment
    AFTER INSERT ON public.message_comments
    FOR EACH ROW
    EXECUTE FUNCTION notify_message_comment();
