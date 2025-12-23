import React, { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Reservation } from '../types/supabase';
import { supabase } from '../utils/supabase';
import { weatherService, type WeatherForecast, type WeatherData } from '../utils/weatherService';
import styles from './Calendar.module.css';

interface CalendarProps {
  user: User;
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
}

/**
 * Calendar Component - Monthly grid view for reservation management
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 6.2
 */
export const Calendar: React.FC<CalendarProps> = ({
  user,
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
  });

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
  }, [loadReservations]);

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
    
    // Check if there are existing reservations on this date
    const dayReservations = getReservationsForDate(date);
    if (dayReservations.length > 0) {
      // Show existing reservation details
      setEditingReservation(dayReservations[0]);
      setFormData({
        startDate: dayReservations[0].start_date,
        endDate: dayReservations[0].end_date,
        notes: dayReservations[0].notes || '',
      });
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
      });
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
      
      const reservationData = {
        user_id: user.id,
        start_date: formData.startDate,
        end_date: formData.endDate,
        guest_count: 1, // Default value
        notes: formData.notes || null,
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
                    return (
                      <div 
                        key={reservation.id} 
                        className={`${styles.reservationName} ${halfStart ? styles.halfDayStart : ''} ${halfEnd ? styles.halfDayEnd : ''}`}
                      >
                        {reservation.profiles 
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
            
            <form onSubmit={handleReservationSubmit}>
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
          </div>
        </div>
      )}
    </div>
  );
};