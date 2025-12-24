import React, { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Reservation } from '../types/supabase';
import { supabase } from '../utils/supabase';
import { weatherService, type WeatherForecast, type WeatherData } from '../utils/weatherService';
import { SwapRequestModal } from './SwapRequestModal';
import styles from './Calendar.module.css';

// Color palette for reservations - visually distinct, accessible colors
const RESERVATION_COLORS = [
  { bg: '#e8f5e9', border: '#4caf50', text: '#1b5e20' }, // Green
  { bg: '#e3f2fd', border: '#2196f3', text: '#0d47a1' }, // Blue
  { bg: '#fff3e0', border: '#ff9800', text: '#e65100' }, // Orange
  { bg: '#f3e5f5', border: '#9c27b0', text: '#4a148c' }, // Purple
  { bg: '#e0f7fa', border: '#00bcd4', text: '#006064' }, // Cyan
  { bg: '#fce4ec', border: '#e91e63', text: '#880e4f' }, // Pink
  { bg: '#fff8e1', border: '#ffc107', text: '#ff6f00' }, // Amber
  { bg: '#e8eaf6', border: '#3f51b5', text: '#1a237e' }, // Indigo
  { bg: '#efebe9', border: '#795548', text: '#3e2723' }, // Brown
  { bg: '#f1f8e9', border: '#8bc34a', text: '#33691e' }, // Light Green
];

// Specific color overrides for family members
const COLORS = {
  red: { bg: '#ffebee', border: '#f44336', text: '#b71c1c' },
  purple: { bg: '#f3e5f5', border: '#9c27b0', text: '#4a148c' },
  orange: { bg: '#fff3e0', border: '#ff9800', text: '#e65100' },
  blue: { bg: '#e3f2fd', border: '#2196f3', text: '#0d47a1' },
};

// Name-based color overrides (case-insensitive)
const NAME_COLOR_OVERRIDES: Record<string, typeof COLORS.red> = {
  'todd ziegler': COLORS.red,
  'mark ziegler': COLORS.purple,
  'paul ziegler': COLORS.orange,
  'dan ziegler': COLORS.blue,
};

/**
 * Generate a consistent color index based on a string (user ID or name)
 */
const getColorIndex = (identifier: string): number => {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    const char = identifier.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % RESERVATION_COLORS.length;
};

/**
 * Get color for a reservation based on user ID or custom name
 */
const getReservationColor = (reservation: Reservation) => {
  // Check for name-based override first
  const displayName = reservation.custom_name || 
    (reservation.profiles ? `${reservation.profiles.first_name} ${reservation.profiles.last_name}` : '');
  
  const nameOverride = NAME_COLOR_OVERRIDES[displayName.toLowerCase().trim()];
  if (nameOverride) {
    return nameOverride;
  }
  
  const identifier = reservation.custom_name || reservation.user_id || 'default';
  return RESERVATION_COLORS[getColorIndex(identifier)];
};

interface CalendarProps {
  user: User;
  isAdmin?: boolean;
  onReservationCreate?: (reservation: Reservation) => void;
  onReservationUpdate?: (reservation: Reservation) => void;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  reservations: Reservation[];
  weather?: WeatherForecast;
  currentWeather?: WeatherData['current'];
}

interface ReservationFormData {
  startDate: string;
  endDate: string;
  notes: string;
  assignedUserId: string;
  customName: string;
}

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
}

/**
 * Calendar Component - Monthly grid view for reservation management
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.2
 */
export const Calendar: React.FC<CalendarProps> = ({
  user,
  isAdmin = false,
  onReservationCreate,
  onReservationUpdate,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [weatherForecast, setWeatherForecast] = useState<WeatherForecast[]>([]);
  const [currentWeather, setCurrentWeather] = useState<WeatherData['current'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setSelectedDate] = useState<Date | null>(null);
  const [showReservationForm, setShowReservationForm] = useState(false);
  const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);
  const [formData, setFormData] = useState<ReservationFormData>({
    startDate: '',
    endDate: '',
    notes: '',
    assignedUserId: '',
    customName: '',
  });
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapTargetReservation, setSwapTargetReservation] = useState<Reservation | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [useCustomName, setUseCustomName] = useState(false);

  /**
   * Load reservations for the current month
   * Requirements: 2.1 - Display existing reservations
   */
  const loadReservations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      // Get reservations that overlap with the current month
      // A reservation overlaps if: start_date <= end of month AND end_date >= start of month
      const { data: reservationsData, error: fetchError } = await supabase
        .from('reservations')
        .select('*')
        .lte('start_date', endOfMonth.toISOString().split('T')[0])
        .gte('end_date', startOfMonth.toISOString().split('T')[0])
        .order('start_date');

      if (fetchError) {
        throw fetchError;
      }

      // Then get user profiles for the reservations
      let enrichedReservations = reservationsData || [];
      
      if (reservationsData && reservationsData.length > 0) {
        const userIds = [...new Set(reservationsData.map(r => r.user_id))];
        
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);

        if (!profilesError && profilesData) {
          // Merge profile data with reservations
          enrichedReservations = reservationsData.map(reservation => ({
            ...reservation,
            profiles: profilesData.find(profile => profile.id === reservation.user_id)
          }));
        }
      }

      const data = enrichedReservations;

      setReservations(data || []);
    } catch (err) {
      console.error('Error loading reservations:', err);
      
      // If the table doesn't exist, just show empty calendar
      if (err instanceof Error && err.message.includes('relation "reservations" does not exist')) {
        setReservations([]);
        setError('Database not fully set up. Please run migrations to enable reservations.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load reservations');
        setReservations([]); // Show empty calendar on error
      }
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    loadReservations();
    loadWeatherForecast();
    if (isAdmin) {
      loadAllUsers();
    }
  }, [loadReservations, isAdmin]);

  /**
   * Load all users for admin reservation assignment
   */
  const loadAllUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .order('last_name');
      
      if (error) throw error;
      setAllUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  /**
   * Load weather forecast data
   */
  const loadWeatherForecast = async () => {
    if (!weatherService.isAvailable()) return;
    
    try {
      const data = await weatherService.getCurrentWeather();
      setWeatherForecast(data.forecast || []);
      setCurrentWeather(data.current || null);
    } catch (err) {
      console.error('Failed to load weather forecast:', err);
    }
  };

  /**
   * Get weather forecast for a specific date
   */
  const getWeatherForDate = (date: Date): WeatherForecast | undefined => {
    const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
    return weatherForecast.find(forecast => forecast.date === dateStr);
  };

  /**
   * Generate calendar days for the current month
   * Requirements: 2.1 - Monthly calendar view
   */
  const generateCalendarDays = useCallback((): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    const daysInMonth = lastDayOfMonth.getDate();
    
    const days: CalendarDay[] = [];
    const today = new Date();
    
    // Add days from previous month
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        reservations: getReservationsForDate(date),
        weather: getWeatherForDate(date),
      });
    }
    
    // Add days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === today.toDateString();
      days.push({
        date,
        isCurrentMonth: true,
        isToday,
        reservations: getReservationsForDate(date),
        weather: getWeatherForDate(date),
        currentWeather: isToday ? (currentWeather || undefined) : undefined,
      });
    }
    
    // Add days from next month to complete the grid
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: false,
        reservations: getReservationsForDate(date),
        weather: getWeatherForDate(date),
      });
    }
    
    return days;
  }, [currentDate, reservations, weatherForecast, currentWeather]);

  /**
   * Get reservations that include a specific date
   * Requirements: 2.3 - Display reservation details
   */
  const getReservationsForDate = (date: Date): Reservation[] => {
    const dateStr = date.toISOString().split('T')[0];
    return reservations.filter(reservation => {
      return dateStr >= reservation.start_date && dateStr <= reservation.end_date;
    });
  };

  /**
   * Check if a reservation starts on this date and it's a Friday (half-day start at noon)
   */
  const isHalfDayStart = (date: Date, reservation: Reservation): boolean => {
    const dateStr = date.toISOString().split('T')[0];
    const isFriday = date.getDay() === 5;
    return isFriday && reservation.start_date === dateStr;
  };

  /**
   * Check if a reservation ends on this date and it's a Friday (half-day end at noon)
   */
  const isHalfDayEnd = (date: Date, reservation: Reservation): boolean => {
    const dateStr = date.toISOString().split('T')[0];
    const isFriday = date.getDay() === 5;
    return isFriday && reservation.end_date === dateStr;
  };

  /**
   * Check if a date range conflicts with existing reservations
   * Requirements: 2.4 - Prevent overlapping bookings
   * Note: Friday overlaps are allowed (one ends at noon, another starts at noon)
   */
  const checkReservationConflict = (startDate: string, endDate: string, excludeId?: string): boolean => {
    const startDay = new Date(startDate + 'T00:00:00').getDay();
    const endDay = new Date(endDate + 'T00:00:00').getDay();
    
    return reservations.some(reservation => {
      if (excludeId && reservation.id === excludeId) return false;
      
      const existingStartDay = new Date(reservation.start_date + 'T00:00:00').getDay();
      const existingEndDay = new Date(reservation.end_date + 'T00:00:00').getDay();
      
      // Check if date ranges overlap
      const rangesOverlap = startDate <= reservation.end_date && endDate >= reservation.start_date;
      
      if (!rangesOverlap) return false;
      
      // Allow Friday noon transitions:
      // If new reservation starts on Friday and existing ends on same Friday, that's OK
      if (startDate === reservation.end_date && startDay === 5 && existingEndDay === 5) {
        return false;
      }
      
      // If new reservation ends on Friday and existing starts on same Friday, that's OK
      if (endDate === reservation.start_date && endDay === 5 && existingStartDay === 5) {
        return false;
      }
      
      return true;
    });
  };

  /**
   * Handle date selection for new reservations
   * Requirements: 2.2 - Allow reservation creation with date selection
   */
  const handleDateClick = (date: Date) => {
    if (!date) return;
    
    setSelectedDate(date);
    const dateStr = date.toISOString().split('T')[0];
    const isFriday = date.getDay() === 5;
    
    // Check if there are existing reservations on this date
    const dayReservations = getReservationsForDate(date);
    
    // On Fridays, check if all reservations are ENDING on this day (not starting or spanning)
    // If so, allow creating a new reservation that starts on this Friday
    const allEndingOnFriday = isFriday && dayReservations.length > 0 && 
      dayReservations.every(r => r.end_date === dateStr);
    
    if (dayReservations.length > 0 && !allEndingOnFriday) {
      // Show existing reservation details
      setEditingReservation(dayReservations[0]);
      setFormData({
        startDate: dayReservations[0].start_date,
        endDate: dayReservations[0].end_date,
        notes: dayReservations[0].notes || '',
        assignedUserId: dayReservations[0].user_id || '',
        customName: dayReservations[0].custom_name || '',
      });
      setUseCustomName(!!dayReservations[0].custom_name);
    } else {
      // Create new reservation - default end date is 1 week after start
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 7);
      const endDateStr = endDate.toISOString().split('T')[0];
      
      setEditingReservation(null);
      setFormData({
        startDate: dateStr,
        endDate: endDateStr,
        notes: '',
        assignedUserId: user.id,
        customName: '',
      });
      setUseCustomName(false);
    }
    
    setShowReservationForm(true);
  };

  /**
   * Handle reservation form submission
   * Requirements: 2.2, 2.4 - Create/update reservations with conflict detection
   */
  const handleReservationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError(null);
      
      // Validate dates
      if (formData.startDate > formData.endDate) {
        throw new Error('End date must be after start date');
      }
      
      // Check for conflicts
      if (checkReservationConflict(formData.startDate, formData.endDate, editingReservation?.id)) {
        throw new Error(`Reservation conflicts with existing booking for dates ${formData.startDate} to ${formData.endDate}`);
      }
      
      // Determine user_id - admin can assign to others or use custom name
      const assignedUserId = isAdmin && useCustomName ? null : (isAdmin ? formData.assignedUserId : user.id);
      
      const reservationData: Record<string, unknown> = {
        user_id: assignedUserId,
        start_date: formData.startDate,
        end_date: formData.endDate,
        guest_count: 1,
        notes: formData.notes || null,
        custom_name: isAdmin && useCustomName ? formData.customName : null,
      };
      
      if (editingReservation) {
        // Update existing reservation
        const { data, error: updateError } = await supabase
          .from('reservations')
          .update(reservationData)
          .eq('id', editingReservation.id)
          .select()
          .single();
          
        if (updateError) throw updateError;
        
        onReservationUpdate?.(data);
      } else {
        // Create new reservation
        console.log('Creating reservation with data:', reservationData);
        const { data, error: createError } = await supabase
          .from('reservations')
          .insert(reservationData)
          .select()
          .single();
          
        if (createError) {
          console.error('Supabase error details:', createError);
          throw createError;
        }
        
        onReservationCreate?.(data);
      }
      
      // Reload reservations and close form
      await loadReservations();
      setShowReservationForm(false);
      setSelectedDate(null);
      setEditingReservation(null);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save reservation');
    }
  };

  /**
   * Handle reservation deletion
   * Requirements: 2.3 - Reservation editing and deletion
   */
  const handleReservationDelete = async () => {
    if (!editingReservation) return;
    
    try {
      setError(null);
      
      const { error: deleteError } = await supabase
        .from('reservations')
        .delete()
        .eq('id', editingReservation.id);
        
      if (deleteError) throw deleteError;
      
      // Reload reservations and close form
      await loadReservations();
      setShowReservationForm(false);
      setSelectedDate(null);
      setEditingReservation(null);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete reservation');
    }
  };

  const calendarDays = generateCalendarDays();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  if (loading) {
    return (
      <div className={styles.calendar}>
        <div className={styles.loading}>Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className={styles.calendar}>
      {/* Calendar Header */}
      <div className={styles.header}>
        <button
          className={styles.navButton}
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
          aria-label="Previous month"
        >
          ←
        </button>
        <h2 className={styles.monthTitle}>
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <button
          className={styles.navButton}
          onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
          aria-label="Next month"
        >
          →
        </button>
      </div>

      {/* Day Headers */}
      <div className={styles.dayHeaders}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className={styles.dayHeader}>
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className={styles.grid}>
        {calendarDays.map((day, index) => {
          // Check if any reservation starts or ends on this Friday
          const hasHalfDayStart = day.reservations.some(r => isHalfDayStart(day.date, r));
          const hasHalfDayEnd = day.reservations.some(r => isHalfDayEnd(day.date, r));
          
          return (
            <button
              key={index}
              className={`${styles.day} ${
                day.isCurrentMonth ? styles.currentMonth : styles.otherMonth
              } ${day.isToday ? styles.today : ''} ${
                day.reservations.length > 0 ? styles.hasReservation : ''
              } ${hasHalfDayStart ? styles.halfDayCellStart : ''} ${hasHalfDayEnd ? styles.halfDayCellEnd : ''}`}
              onClick={() => handleDateClick(day.date)}
              disabled={!day.isCurrentMonth}
            >
              <div className={styles.dayContent}>
                <span className={styles.dayNumber}>{day.date.getDate()}</span>
                {day.isToday && day.currentWeather && (
                  <div className={styles.dayWeather}>
                    <img 
                      src={weatherService.getIconUrl(day.currentWeather.icon)}
                      alt={day.currentWeather.description}
                      className={styles.weatherIcon}
                    />
                    <span className={styles.weatherTemp}>
                      {Math.round(day.currentWeather.temperature)}°
                    </span>
                  </div>
                )}
                {!day.isToday && day.weather && day.isCurrentMonth && (
                  <div className={styles.dayWeather}>
                    <img 
                      src={weatherService.getIconUrl(day.weather.icon)}
                      alt={day.weather.description}
                      className={styles.weatherIcon}
                    />
                    <span className={styles.weatherTemp}>
                      {day.weather.temperature.max}°
                    </span>
                  </div>
                )}
              </div>
              {day.reservations.length > 0 && (
                <div className={`${styles.reservationIndicator} ${
                  day.reservations.some(r => isHalfDayEnd(day.date, r)) && day.reservations.some(r => isHalfDayStart(day.date, r)) 
                    ? styles.splitReservations 
                    : ''
                }`}>
                  {day.reservations.map((reservation) => {
                    const halfStart = isHalfDayStart(day.date, reservation);
                    const halfEnd = isHalfDayEnd(day.date, reservation);
                    const color = getReservationColor(reservation);
                    return (
                      <div 
                        key={reservation.id} 
                        className={`${styles.reservationName} ${halfStart ? styles.halfDayStart : ''} ${halfEnd ? styles.halfDayEnd : ''}`}
                        style={{
                          backgroundColor: color.bg,
                          borderLeft: `3px solid ${color.border}`,
                          color: color.text,
                        }}
                      >
                        {reservation.custom_name 
                          ? reservation.custom_name
                          : reservation.profiles 
                            ? `${reservation.profiles.first_name} ${reservation.profiles.last_name}`
                            : 'Reserved'
                        }
                      </div>
                    );
                  })}
              </div>
            )}
          </button>
          );
        })}
      </div>

      {/* Error Display */}
      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {/* Reservation Form Modal */}
      {showReservationForm && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>
              {editingReservation ? 'Edit Reservation' : 'New Reservation'}
            </h3>
            
            {/* Show reservation owner info if viewing someone else's reservation (non-admin) */}
            {editingReservation && editingReservation.user_id !== user.id && !isAdmin && (
              <div className={styles.ownerInfo}>
                <p>
                  This reservation belongs to{' '}
                  <strong>
                    {editingReservation.custom_name 
                      ? editingReservation.custom_name
                      : editingReservation.profiles
                        ? `${editingReservation.profiles.first_name} ${editingReservation.profiles.last_name}`
                        : 'another user'}
                  </strong>
                </p>
                {/* Only show swap button if reservation has a real user (not custom_name) */}
                {editingReservation.user_id && !editingReservation.custom_name && (
                  <button
                    type="button"
                    className={styles.swapButton}
                    onClick={() => {
                      setSwapTargetReservation(editingReservation);
                      setShowSwapModal(true);
                      setShowReservationForm(false);
                    }}
                  >
                    🔄 Request Swap
                  </button>
                )}
                {editingReservation.custom_name && (
                  <p className={styles.fieldHint}>
                    Swap requests are not available for reservations that haven't been linked to a user yet.
                  </p>
                )}
              </div>
            )}
            
            {/* Show form if: new reservation, own reservation, or admin */}
            {(!editingReservation || editingReservation.user_id === user.id || isAdmin) && (
              <form onSubmit={handleReservationSubmit}>
                {/* Admin-only: User assignment */}
                {isAdmin && (
                  <div className={styles.adminSection}>
                    {/* Show link option if editing a custom name reservation */}
                    {editingReservation?.custom_name && (
                      <div className={styles.linkNotice}>
                        <p>This reservation uses a custom name: <strong>{editingReservation.custom_name}</strong></p>
                        <p className={styles.linkHint}>To link to a registered user, uncheck "Use custom name" and select the user below.</p>
                      </div>
                    )}
                    
                    <div className={styles.formGroup}>
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={useCustomName}
                          onChange={(e) => setUseCustomName(e.target.checked)}
                        />
                        Use custom name (for future users)
                      </label>
                    </div>
                    
                    {useCustomName ? (
                      <div className={styles.formGroup}>
                        <label htmlFor="customName">Name:</label>
                        <input
                          id="customName"
                          type="text"
                          value={formData.customName}
                          onChange={(e) => setFormData(prev => ({ ...prev, customName: e.target.value }))}
                          placeholder="Enter name for reservation"
                          required
                        />
                        <p className={styles.fieldHint}>
                          ⚠️ Custom name reservations cannot use swap functionality until linked to a user.
                        </p>
                      </div>
                    ) : (
                      <div className={styles.formGroup}>
                        <label htmlFor="assignedUser">Assign to:</label>
                        <select
                          id="assignedUser"
                          value={formData.assignedUserId}
                          onChange={(e) => setFormData(prev => ({ ...prev, assignedUserId: e.target.value }))}
                          required
                        >
                          <option value="">Select a user</option>
                          {allUsers.map(u => (
                            <option key={u.id} value={u.id}>
                              {u.first_name} {u.last_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
                
                <div className={styles.formGroup}>
                  <label htmlFor="startDate">Start Date:</label>
                  <input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    required
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="endDate">End Date:</label>
                  <input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    required
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="notes">Notes (optional):</label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>
                
                <div className={styles.formActions}>
                  <button type="submit" className={styles.submitButton}>
                    {editingReservation ? 'Update' : 'Create'} Reservation
                  </button>
                  
                  {editingReservation && (
                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={handleReservationDelete}
                    >
                      Delete Reservation
                    </button>
                  )}
                  
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={() => {
                      setShowReservationForm(false);
                      setSelectedDate(null);
                      setEditingReservation(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
            
            {/* Close button for non-admin viewing other's reservations */}
            {editingReservation && editingReservation.user_id !== user.id && !isAdmin && (
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => {
                    setShowReservationForm(false);
                    setSelectedDate(null);
                    setEditingReservation(null);
                  }}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Swap Request Modal */}
      {showSwapModal && swapTargetReservation && (
        <SwapRequestModal
          targetReservation={swapTargetReservation}
          currentUser={user}
          onClose={() => {
            setShowSwapModal(false);
            setSwapTargetReservation(null);
          }}
          onSuccess={() => {
            setShowSwapModal(false);
            setSwapTargetReservation(null);
            loadReservations();
          }}
        />
      )}
    </div>
  );
};