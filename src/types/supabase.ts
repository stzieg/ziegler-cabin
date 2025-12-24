import type { User } from '@supabase/supabase-js';

// Database table types
export interface UserProfile {
  id: string;             // References auth.users.id
  first_name: string;     // User's first name (required, 1-50 characters)
  last_name: string;      // User's last name (required, 1-50 characters)
  phone_number?: string;  // User's phone number (optional, valid phone format)
  is_admin?: boolean;     // Admin flag (default false)
  created_at: string;     // Profile creation timestamp
  updated_at: string;     // Profile last update timestamp
}

export interface Invitation {
  id: string;             // UUID primary key
  email: string;          // Invited email address
  token: string;          // Unique invitation token
  created_by: string;     // References auth.users.id (admin who sent invitation)
  created_at: string;     // Invitation creation timestamp
  expires_at: string;     // Invitation expiration timestamp (7 days from creation)
  used_at?: string;       // Timestamp when invitation was used (null if unused)
  used_by?: string;       // References auth.users.id (user who used invitation)
  status: 'pending' | 'used' | 'expired'; // Invitation status
}

// Dashboard expansion types
export type MaintenanceType = 'repair' | 'cleaning' | 'improvement' | 'inspection' | 'seasonal';
export type NotificationType = 'reservation' | 'maintenance' | 'photo' | 'system';
export type PriorityLevel = 'low' | 'normal' | 'high';

export interface Reservation {
  id: string;             // UUID primary key
  user_id: string;        // References auth.users.id
  start_date: string;     // Reservation start date (ISO date string)
  end_date: string;       // Reservation end date (ISO date string)
  guest_count: number;    // Number of guests (1-20)
  notes?: string;         // Optional reservation notes
  created_at: string;     // Creation timestamp
  updated_at: string;     // Last update timestamp
  profiles?: {            // User profile data (when joined)
    first_name: string;
    last_name: string;
  };
}

export interface MaintenanceTask {
  id: string;             // UUID primary key
  user_id: string;        // References auth.users.id
  title: string;          // Task title (1-255 characters)
  description?: string;   // Optional task description
  task_type: MaintenanceType; // Type of maintenance task
  cost?: number;          // Optional cost (decimal)
  completion_date: string; // Date task was completed (ISO date string)
  photos?: string[];      // Array of photo URLs/filenames
  recurring_interval?: number; // Days between recurrences (optional)
  created_at: string;     // Creation timestamp
  updated_at: string;     // Last update timestamp
  profiles?: {            // User profile data (when joined)
    first_name: string;
    last_name: string;
  };
}

export interface Photo {
  id: string;             // UUID primary key
  user_id: string;        // References auth.users.id
  filename: string;       // Original filename (1-255 characters)
  url: string;            // Photo URL
  caption?: string;       // Optional photo caption
  tags: string[];         // Array of tags
  album_id?: string;      // Optional album grouping
  upload_date: string;    // Upload timestamp
  metadata: PhotoMetadata; // Photo metadata (JSONB)
  created_at: string;     // Creation timestamp
  updated_at: string;     // Last update timestamp
}

export interface PhotoMetadata {
  size?: number;          // File size in bytes
  dimensions?: {          // Image dimensions
    width: number;
    height: number;
  };
  format?: string;        // File format (jpg, png, etc.)
  dateTaken?: string;     // Date photo was taken (from EXIF data)
  [key: string]: any;     // Additional metadata
}

export interface Notification {
  id: string;             // UUID primary key
  user_id: string;        // References auth.users.id
  title: string;          // Notification title (1-255 characters)
  message: string;        // Notification message
  type: 'reservation' | 'maintenance' | 'admin' | 'general' | 'weather'; // Type of notification
  read: boolean;          // Read status (default false)
  created_at: string;     // Creation timestamp
  updated_at: string;     // Last update timestamp
  related_reservation_id?: string; // Optional reference to reservation
  related_maintenance_id?: string; // Optional reference to maintenance task
}

export type SwapRequestStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface ReservationSwapRequest {
  id: string;                      // UUID primary key
  requester_id: string;            // User requesting the swap
  requester_reservation_id: string; // Reservation being offered
  target_user_id: string;          // User being asked to swap
  target_reservation_id: string;   // Reservation being requested
  status: SwapRequestStatus;       // Current status
  message?: string;                // Optional message from requester
  token: string;                   // Unique token for email links
  created_at: string;              // Creation timestamp
  updated_at: string;              // Last update timestamp
  responded_at?: string;           // When the target user responded
  expires_at: string;              // When the request expires
  // Joined data
  requester_profile?: {
    first_name: string;
    last_name: string;
  };
  requester_reservation?: Reservation;
  target_reservation?: Reservation;
}

// Form data types
export interface RegistrationData {
  email: string;          // User's email (required, valid email format)
  password: string;       // User's password (required, min 8 characters)
  firstName: string;      // User's first name (required, 1-50 characters)
  lastName: string;       // User's last name (required, 1-50 characters)
  phoneNumber: string;    // User's phone number (optional, valid phone format)
  invitationToken: string; // Required invitation token for registration
}

export interface LoginData {
  email: string;          // User's email (required, valid email format)
  password: string;       // User's password (required)
}

// Authentication state types
export interface AuthState {
  user: User | null;      // Current authenticated user
  profile: UserProfile | null; // User profile data
  loading: boolean;       // Authentication loading state
  error: string | null;   // Authentication error message
}

// Database schema type for Supabase client
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, 'created_at' | 'updated_at'> & {
          id: string;
          first_name: string;
          last_name: string;
          phone_number?: string;
          is_admin?: boolean;
        };
        Update: Partial<Omit<UserProfile, 'id' | 'created_at'>> & {
          updated_at?: string;
        };
      };
      invitations: {
        Row: Invitation;
        Insert: {
          email: string;
          token: string;
          created_by: string;
        };
        Update: Partial<{
          used_at: string;
          used_by: string;
          status: 'pending' | 'used' | 'expired';
        }>;
      };
      reservations: {
        Row: Reservation;
        Insert: Omit<Reservation, 'id' | 'created_at' | 'updated_at'> & {
          user_id: string;
          start_date: string;
          end_date: string;
          guest_count?: number;
          notes?: string;
        };
        Update: Partial<Omit<Reservation, 'id' | 'created_at'>> & {
          updated_at?: string;
        };
      };
      maintenance_tasks: {
        Row: MaintenanceTask;
        Insert: Omit<MaintenanceTask, 'id' | 'created_at' | 'updated_at'> & {
          user_id: string;
          title: string;
          description?: string;
          task_type: MaintenanceType;
          cost?: number;
          completion_date: string;
          photos?: string[];
          recurring_interval?: number;
        };
        Update: Partial<Omit<MaintenanceTask, 'id' | 'created_at'>> & {
          updated_at?: string;
        };
      };
      photos: {
        Row: Photo;
        Insert: Omit<Photo, 'id' | 'created_at' | 'updated_at' | 'upload_date'> & {
          user_id: string;
          filename: string;
          url: string;
          caption?: string;
          tags?: string[];
          album_id?: string;
          metadata?: PhotoMetadata;
        };
        Update: Partial<Omit<Photo, 'id' | 'created_at' | 'upload_date'>> & {
          updated_at?: string;
        };
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'> & {
          user_id: string;
          type: NotificationType;
          title: string;
          message: string;
          is_read?: boolean;
          priority?: PriorityLevel;
          expires_at?: string;
        };
        Update: Partial<Omit<Notification, 'id' | 'created_at'>> & {
          is_read?: boolean;
        };
      };
    };
    Enums: {
      maintenance_type: MaintenanceType;
      notification_type: NotificationType;
      priority_level: PriorityLevel;
    };
  };
}