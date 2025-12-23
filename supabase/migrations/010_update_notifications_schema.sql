-- Migration: Update notifications schema to match new requirements
-- Description: Update existing notifications table to new schema

-- Drop existing table if it has incompatible schema
DROP TABLE IF EXISTS notifications CASCADE;

-- Create notifications table with correct schema
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('reservation', 'maintenance', 'admin', 'general', 'weather')),
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Optional reference to related entities
    related_reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
    related_maintenance_id UUID REFERENCES maintenance_tasks(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_type ON notifications(type);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Admin can create notifications for any user
CREATE POLICY "Admins can create notifications" ON notifications
    FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- System can create notifications (for triggers)
CREATE POLICY "System can create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- Function to create notification for all users
CREATE OR REPLACE FUNCTION create_notification_for_all_users(
    p_title TEXT,
    p_message TEXT,
    p_type TEXT,
    p_related_reservation_id UUID DEFAULT NULL,
    p_related_maintenance_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO notifications (user_id, title, message, type, related_reservation_id, related_maintenance_id)
    SELECT 
        u.id,
        p_title,
        p_message,
        p_type,
        p_related_reservation_id,
        p_related_maintenance_id
    FROM auth.users u
    INNER JOIN profiles p ON u.id = p.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification for specific user
CREATE OR REPLACE FUNCTION create_notification_for_user(
    p_user_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_type TEXT,
    p_related_reservation_id UUID DEFAULT NULL,
    p_related_maintenance_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO notifications (user_id, title, message, type, related_reservation_id, related_maintenance_id)
    VALUES (p_user_id, p_title, p_message, p_type, p_related_reservation_id, p_related_maintenance_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for new reservations
CREATE OR REPLACE FUNCTION notify_new_reservation() RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
BEGIN
    -- Get the user's name
    SELECT COALESCE(p.first_name || ' ' || p.last_name, u.email)
    INTO user_name
    FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.id
    WHERE u.id = NEW.user_id;

    -- Create notification for all users
    PERFORM create_notification_for_all_users(
        'New Reservation',
        user_name || ' made a reservation for ' || 
        TO_CHAR(NEW.start_date, 'Mon DD') || ' - ' || 
        TO_CHAR(NEW.end_date, 'Mon DD, YYYY'),
        'reservation',
        NEW.id,
        NULL
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function for maintenance task updates
CREATE OR REPLACE FUNCTION notify_maintenance_update() RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
    status_text TEXT;
BEGIN
    -- Get the user's name
    SELECT COALESCE(p.first_name || ' ' || p.last_name, u.email)
    INTO user_name
    FROM auth.users u
    LEFT JOIN profiles p ON u.id = p.id
    WHERE u.id = NEW.user_id;

    -- Determine status text
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        status_text := 'completed';
    ELSIF NEW.status = 'in_progress' AND (OLD.status IS NULL OR OLD.status != 'in_progress') THEN
        status_text := 'started';
    ELSE
        RETURN NEW; -- No notification needed
    END IF;

    -- Create notification for all users
    PERFORM create_notification_for_all_users(
        'Maintenance Update',
        user_name || ' ' || status_text || ' maintenance task: ' || NEW.title,
        'maintenance',
        NULL,
        NEW.id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_notify_new_reservation ON reservations;
CREATE TRIGGER trigger_notify_new_reservation
    AFTER INSERT ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_reservation();

DROP TRIGGER IF EXISTS trigger_notify_maintenance_update ON maintenance_tasks;
CREATE TRIGGER trigger_notify_maintenance_update
    AFTER UPDATE ON maintenance_tasks
    FOR EACH ROW
    EXECUTE FUNCTION notify_maintenance_update();

-- Function to clean up old notifications (optional - can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_old_notifications(days_old INTEGER DEFAULT 30) RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_old
    AND read = TRUE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;