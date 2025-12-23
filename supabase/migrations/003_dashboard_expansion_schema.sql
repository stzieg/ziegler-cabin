-- Dashboard expansion schema migration
-- Creates tables for reservations, maintenance tasks, photos, and notifications
-- Includes proper constraints, indexes, and Row Level Security policies

-- Create enum types for maintenance tasks and notifications
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'maintenance_type') THEN
    CREATE TYPE maintenance_type AS ENUM (
      'repair',
      'cleaning', 
      'improvement',
      'inspection',
      'seasonal'
    );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM (
      'reservation',
      'maintenance',
      'photo',
      'system'
    );
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_level') THEN
    CREATE TYPE priority_level AS ENUM (
      'low',
      'normal',
      'high'
    );
  END IF;
END $$;

-- Create reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  guest_count INTEGER DEFAULT 1 NOT NULL CHECK (guest_count > 0 AND guest_count <= 20),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  -- Ensure end_date is after start_date
  CONSTRAINT valid_date_range CHECK (end_date >= start_date),
  -- Prevent overlapping reservations (will be enforced by trigger)
  EXCLUDE USING gist (
    daterange(start_date, end_date, '[]') WITH &&
  )
);

-- Create maintenance_tasks table
CREATE TABLE IF NOT EXISTS maintenance_tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL CHECK (length(title) >= 1 AND length(title) <= 255),
  description TEXT,
  task_type maintenance_type NOT NULL,
  cost DECIMAL(10,2) CHECK (cost IS NULL OR cost >= 0),
  completion_date DATE NOT NULL,
  photos TEXT[], -- Array of photo URLs/filenames
  recurring_interval INTEGER CHECK (recurring_interval IS NULL OR recurring_interval > 0), -- Days between recurrences
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create photos table
CREATE TABLE IF NOT EXISTS photos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  filename VARCHAR(255) NOT NULL CHECK (length(filename) >= 1 AND length(filename) <= 255),
  url TEXT NOT NULL CHECK (length(url) >= 1),
  caption TEXT,
  tags TEXT[] DEFAULT '{}', -- Array of tags
  album_id UUID, -- Optional album grouping
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  metadata JSONB DEFAULT '{}', -- Store file size, dimensions, format, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL CHECK (length(title) >= 1 AND length(title) <= 255),
  message TEXT NOT NULL CHECK (length(message) >= 1),
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  priority priority_level DEFAULT 'normal' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiration
  -- Ensure expires_at is in the future if set
  CONSTRAINT valid_expiration CHECK (expires_at IS NULL OR expires_at > created_at)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_reservations_date_range ON reservations(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_reservations_start_date ON reservations(start_date);

CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_user_id ON maintenance_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_type ON maintenance_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_completion_date ON maintenance_tasks(completion_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_tasks_recurring ON maintenance_tasks(recurring_interval) WHERE recurring_interval IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_photos_user_id ON photos(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_upload_date ON photos(upload_date);
CREATE INDEX IF NOT EXISTS idx_photos_album_id ON photos(album_id) WHERE album_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_photos_tags ON photos USING gin(tags);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at) WHERE expires_at IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create triggers to automatically update updated_at timestamps
DROP TRIGGER IF EXISTS update_reservations_updated_at ON reservations;
CREATE TRIGGER update_reservations_updated_at 
    BEFORE UPDATE ON reservations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_maintenance_tasks_updated_at ON maintenance_tasks;
CREATE TRIGGER update_maintenance_tasks_updated_at 
    BEFORE UPDATE ON maintenance_tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_photos_updated_at ON photos;
CREATE TRIGGER update_photos_updated_at 
    BEFORE UPDATE ON photos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to check for reservation conflicts
CREATE OR REPLACE FUNCTION check_reservation_conflict()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if there are any overlapping reservations for the same date range
    IF EXISTS (
        SELECT 1 FROM reservations 
        WHERE id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND daterange(start_date, end_date, '[]') && daterange(NEW.start_date, NEW.end_date, '[]')
    ) THEN
        RAISE EXCEPTION 'Reservation conflicts with existing booking for dates % to %', NEW.start_date, NEW.end_date;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to prevent reservation conflicts
DROP TRIGGER IF EXISTS prevent_reservation_conflicts ON reservations;
CREATE TRIGGER prevent_reservation_conflicts
    BEFORE INSERT OR UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION check_reservation_conflict();

-- Create function to automatically expire notifications
CREATE OR REPLACE FUNCTION expire_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM notifications 
    WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
END;
$$ language 'plpgsql';