import React, { useState, useEffect } from 'react';
import { weatherService, type WeatherData, type HourlyForecast } from '../utils/weatherService';
import styles from './Weather.module.css';

export interface WeatherProps {
  showForecast?: boolean;
  showHourlyForecast?: boolean;
  compact?: boolean;
}

export const Weather: React.FC<WeatherProps> = ({ 
  showForecast = true,
  showHourlyForecast = true,
  compact = false 
}) => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWeatherData();
    
    // Refresh weather data every 10 minutes
    const interval = setInterval(loadWeatherData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadWeatherData = async () => {
    if (!weatherService.isAvailable()) {
      setError('Weather service is not configured');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      // Clear cache to ensure fresh data
      weatherService.clearCache();
      const data = await weatherService.getCurrentWeather();
      setWeatherData(data);
    } catch (err: any) {
      console.error('Failed to load weather data:', err);
      setError(err.message || 'Failed to load weather data');
    } finally {
      setLoading(false);
    }
  };

  const formatForecastDate = (dateString: string): string => {
    // dateString is in format "YYYY-MM-DD" from the weather service
    // We need to compare it directly without timezone conversion issues
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    // Get local date strings in YYYY-MM-DD format
    const todayDateOnly = today.toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD format
    const tomorrowDateOnly = tomorrow.toLocaleDateString('en-CA');
    
    // dateString is already in YYYY-MM-DD format from the weather service
    const forecastDateOnly = dateString;
    
    if (forecastDateOnly === todayDateOnly) {
      return 'Today';
    } else if (forecastDateOnly === tomorrowDateOnly) {
      return 'Tomorrow';
    } else {
      // Parse the date for display formatting
      // Add time component to avoid timezone issues
      const displayDate = new Date(dateString + 'T12:00:00');
      return displayDate.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const formatTime = (timeString: string): string => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric',
      hour12: true
    });
  };

  const getTodayHourlyForecast = (hourlyData: HourlyForecast[]): HourlyForecast[] => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    return hourlyData
      .filter(hour => {
        const hourDate = new Date(hour.time);
        const hourDateString = hourDate.toISOString().split('T')[0];
        return hourDateString === today && hourDate > now;
      })
      .slice(0, 8); // Next 8 intervals (24 hours)
  };

  const getActivityRecommendation = (weather: WeatherData): string => {
    if (weatherService.isGoodWeatherForOutdoorActivities(weather)) {
      return "Perfect weather for cabin activities! 🌞";
    } else if (weather.current.temperature < 50) {
      return "Great weather for cozy indoor activities ☕";
    } else {
      return "Check conditions before outdoor activities ⛅";
    }
  };

  if (loading) {
    return (
      <div className={`${styles.weatherContainer} ${compact ? styles.compact : ''}`}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <span>Loading weather...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.weatherContainer} ${compact ? styles.compact : ''}`}>
        <div className={styles.error}>
          <span className={styles.errorIcon}>⚠️</span>
          <span>Weather unavailable</span>
          <button 
            className={styles.retryButton}
            onClick={loadWeatherData}
            aria-label="Retry loading weather"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!weatherData) {
    return null;
  }

  return (
    <div className={`${styles.weatherContainer} ${compact ? styles.compact : ''}`}>
      {/* Current Weather */}
      <div className={styles.currentWeather}>
        <div className={styles.location}>
          <h3>📍 {weatherData.location.name}, WI</h3>
          <span className={styles.lastUpdated}>
            Updated: {new Date(weatherData.lastUpdated).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit' 
            })}
          </span>
        </div>

        <div className={styles.mainWeather}>
          <div className={styles.temperature}>
            <img 
              src={weatherService.getIconUrl(weatherData.current.icon)}
              alt={weatherData.current.description}
              className={styles.weatherIcon}
            />
            <span className={styles.temp}>
              {weatherService.formatTemperature(weatherData.current.temperature)}
            </span>
          </div>
          
          <div className={styles.details}>
            <p className={styles.description}>{weatherData.current.description}</p>
            <p className={styles.feelsLike}>
              Feels like {weatherService.formatTemperature(weatherData.current.feelsLike)}
            </p>
          </div>
        </div>

        {!compact && (
          <>
            <div className={styles.conditions}>
              <div className={styles.conditionItem}>
                <span className={styles.label}>Humidity</span>
                <span className={styles.value}>{weatherData.current.humidity}%</span>
              </div>
              <div className={styles.conditionItem}>
                <span className={styles.label}>Wind</span>
                <span className={styles.value}>
                  {weatherData.current.windSpeed} mph {weatherService.getWindDirection(weatherData.current.windDirection)}
                </span>
              </div>
              <div className={styles.conditionItem}>
                <span className={styles.label}>Visibility</span>
                <span className={styles.value}>{weatherData.current.visibility} mi</span>
              </div>
            </div>

            <div className={styles.recommendation}>
              {getActivityRecommendation(weatherData)}
            </div>
          </>
        )}
      </div>

      {/* Forecast */}
      {showForecast && !compact && weatherData.forecast.length > 0 && (
        <div className={styles.forecast}>
          <h4>Weather Forecast</h4>
          
          {/* Today's Hourly Forecast */}
          {showHourlyForecast && weatherData.hourlyForecast.length > 0 && (
            <div className={styles.hourlyForecast}>
              <h5>Today's Hourly Forecast</h5>
              <div className={styles.hourlyGrid}>
                {getTodayHourlyForecast(weatherData.hourlyForecast).map((hour) => (
                  <div key={hour.time} className={styles.hourlyItem}>
                    <span className={styles.hourlyTime}>
                      {formatTime(hour.time)}
                    </span>
                    <img 
                      src={weatherService.getIconUrl(hour.icon)}
                      alt={hour.description}
                      className={styles.hourlyIcon}
                    />
                    <span className={styles.hourlyTemp}>
                      {hour.temperature}°
                    </span>
                    {hour.precipitationProbability > 0 && (
                      <span className={styles.hourlyPrecip}>
                        <span className={styles.precipIcon}>💧</span>
                        {hour.precipitationProbability}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5-Day Forecast */}
          <div className={styles.dailyForecast}>
            <h5>5-Day Forecast</h5>
            <div className={styles.forecastGrid}>
              {weatherData.forecast.map((day) => (
                <div key={day.date} className={styles.forecastDay}>
                  <span className={styles.forecastDate}>
                    {formatForecastDate(day.date)}
                  </span>
                  <img 
                    src={weatherService.getIconUrl(day.icon)}
                    alt={day.description}
                    className={styles.forecastIcon}
                  />
                  <div className={styles.forecastTemps}>
                    <span className={styles.high}>{day.temperature.max}°</span>
                    <span className={styles.low}>{day.temperature.min}°</span>
                  </div>
                  <span className={styles.forecastDesc}>{day.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};