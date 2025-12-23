import React, { useState, useEffect } from 'react';
import { weatherService, type WeatherData } from '../utils/weatherService';
import styles from './WeatherForecastCompact.module.css';

/**
 * Compact 5-day weather forecast for display alongside the calendar
 */
export const WeatherForecastCompact: React.FC = () => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWeatherData();
    const interval = setInterval(loadWeatherData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadWeatherData = async () => {
    if (!weatherService.isAvailable()) {
      setError('Weather unavailable');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const data = await weatherService.getCurrentWeather();
      setWeatherData(data);
    } catch (err: any) {
      setError('Weather unavailable');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const todayDateOnly = today.toLocaleDateString('en-CA');
    const tomorrowDateOnly = tomorrow.toLocaleDateString('en-CA');
    
    if (dateString === todayDateOnly) {
      return 'Today';
    } else if (dateString === tomorrowDateOnly) {
      return 'Tomorrow';
    } else {
      const displayDate = new Date(dateString + 'T12:00:00');
      return displayDate.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading forecast...</div>
      </div>
    );
  }

  if (error || !weatherData) {
    return null;
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>5-Day Forecast</h3>
      <div className={styles.forecastList}>
        {weatherData.forecast.map((day) => (
          <div key={day.date} className={styles.forecastItem}>
            <span className={styles.date}>{formatDate(day.date)}</span>
            <img 
              src={weatherService.getIconUrl(day.icon)}
              alt={day.description}
              className={styles.icon}
            />
            <div className={styles.temps}>
              <span className={styles.high}>{day.temperature.max}°</span>
              <span className={styles.low}>{day.temperature.min}°</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
