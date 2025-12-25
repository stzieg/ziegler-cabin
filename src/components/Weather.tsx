import React, { useState, useEffect } from 'react';
import {
  weatherService,
  type WeatherData,
  type HourlyForecast,
  type WeatherForecast,
} from '../utils/weatherService';
import styles from './Weather.module.css';

export interface WeatherProps {
  showForecast?: boolean;
  showHourlyForecast?: boolean;
  compact?: boolean;
}

export const Weather: React.FC<WeatherProps> = ({
  showForecast = true,
  showHourlyForecast = true,
  compact = false,
}) => {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<WeatherForecast | null>(null);

  useEffect(() => {
    loadWeatherData();

    // Refresh weather data every 30 minutes (matches cache timeout)
    const interval = setInterval(loadWeatherData, 30 * 60 * 1000);
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
        day: 'numeric',
      });
    }
  };

  const formatTime = (timeString: string): string => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      hour12: true,
    });
  };

  const formatSunTime = (timeString: string): string => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getNext48Hours = (hourlyData: HourlyForecast[]): HourlyForecast[] => {
    const now = new Date();
    return hourlyData.filter((hour) => new Date(hour.time) > now).slice(0, 24);
  };

  const getActivityRecommendation = (forecast: WeatherForecast): string => {
    if (weatherService.isGoodWeatherForOutdoorActivities(forecast)) {
      return 'Perfect weather for cabin activities! 🌞';
    } else if (forecast.temperature.day < 45) {
      return 'Great weather for cozy indoor activities ☕';
    } else if (forecast.precipitationProbability > 50) {
      return 'Rain likely - plan indoor activities 🌧️';
    } else {
      return 'Check conditions before outdoor activities ⛅';
    }
  };

  // Check for frost/ice warning (overnight low below 32°F)
  const hasFrostWarning = (forecast: WeatherForecast): boolean => {
    return forecast.temperature.night < 32 || forecast.temperature.min < 32;
  };

  // Get fishing conditions based on moon phase and weather
  const getFishingConditions = (forecast: WeatherForecast): { rating: string; reason: string } => {
    const moonPhase = forecast.moonPhase;
    const isNewOrFullMoon = moonPhase < 0.1 || (moonPhase > 0.45 && moonPhase < 0.55) || moonPhase > 0.9;
    const isGoodPressure = forecast.humidity < 70; // Lower humidity often correlates with stable pressure
    const isCalm = forecast.windSpeed < 15;
    const noPrecip = forecast.precipitationProbability < 30;

    let score = 0;
    const reasons: string[] = [];

    if (isNewOrFullMoon) {
      score += 2;
      reasons.push(weatherService.getMoonPhaseName(moonPhase));
    }
    if (isCalm) {
      score += 1;
      reasons.push('calm winds');
    }
    if (noPrecip) {
      score += 1;
      reasons.push('low precip chance');
    }
    if (isGoodPressure) {
      score += 1;
    }

    if (score >= 4) return { rating: 'Excellent', reason: reasons.join(', ') };
    if (score >= 3) return { rating: 'Good', reason: reasons.join(', ') };
    if (score >= 2) return { rating: 'Fair', reason: reasons.join(', ') };
    return { rating: 'Poor', reason: 'unfavorable conditions' };
  };

  // Get campfire conditions based on wind and precipitation
  const getCampfireConditions = (forecast: WeatherForecast): { safe: boolean; reason: string } => {
    if (forecast.windSpeed > 20) {
      return { safe: false, reason: 'Too windy - fire hazard' };
    }
    if (forecast.windGust && forecast.windGust > 25) {
      return { safe: false, reason: 'Gusty winds - not recommended' };
    }
    if (forecast.precipitationProbability > 60) {
      return { safe: false, reason: 'Rain likely' };
    }
    if (forecast.windSpeed > 12) {
      return { safe: true, reason: 'Breezy - use caution' };
    }
    return { safe: true, reason: 'Good conditions' };
  };

  // Get lake activity rating
  const getLakeConditions = (forecast: WeatherForecast): { rating: string; activities: string[] } => {
    const temp = forecast.temperature.day;
    const wind = forecast.windSpeed;
    const precip = forecast.precipitationProbability;
    const activities: string[] = [];

    // Swimming conditions (temp > 70, low wind, no rain)
    if (temp > 70 && wind < 10 && precip < 30) {
      activities.push('🏊 Swimming');
    }
    // Kayaking/canoeing (moderate conditions)
    if (temp > 55 && wind < 15 && precip < 40) {
      activities.push('🛶 Kayaking');
    }
    // Fishing (almost always possible)
    if (wind < 20 && precip < 50) {
      activities.push('🎣 Fishing');
    }
    // Boating
    if (wind < 15 && precip < 30) {
      activities.push('🚤 Boating');
    }

    if (activities.length >= 3) return { rating: 'Excellent', activities };
    if (activities.length >= 2) return { rating: 'Good', activities };
    if (activities.length >= 1) return { rating: 'Limited', activities };
    return { rating: 'Poor', activities: ['Indoor activities recommended'] };
  };

  // Get snow info if applicable
  const getSnowInfo = (forecast: WeatherForecast): string | null => {
    const desc = forecast.description.toLowerCase();
    if (desc.includes('snow')) {
      if (forecast.precipitation > 0.5) {
        return `${forecast.precipitation.toFixed(1)}" expected`;
      }
      return 'Light snow possible';
    }
    return null;
  };

  // Current weather versions of activity functions
  const getCurrentFishingConditions = (
    current: WeatherData['current'],
    todayForecast?: WeatherForecast
  ): { rating: string; reason: string } => {
    const moonPhase = todayForecast?.moonPhase ?? 0.5;
    const isNewOrFullMoon =
      moonPhase < 0.1 || (moonPhase > 0.45 && moonPhase < 0.55) || moonPhase > 0.9;
    const isGoodPressure = current.humidity < 70;
    const isCalm = current.windSpeed < 15;

    let score = 0;
    const reasons: string[] = [];

    if (isNewOrFullMoon) {
      score += 2;
      reasons.push(weatherService.getMoonPhaseName(moonPhase));
    }
    if (isCalm) {
      score += 1;
      reasons.push('calm winds');
    }
    if (isGoodPressure) {
      score += 1;
    }

    if (score >= 3) return { rating: 'Excellent', reason: reasons.join(', ') || 'favorable conditions' };
    if (score >= 2) return { rating: 'Good', reason: reasons.join(', ') || 'decent conditions' };
    if (score >= 1) return { rating: 'Fair', reason: reasons.join(', ') || 'mixed conditions' };
    return { rating: 'Poor', reason: 'unfavorable conditions' };
  };

  const getCurrentCampfireConditions = (
    current: WeatherData['current']
  ): { safe: boolean; reason: string } => {
    if (current.windSpeed > 20) {
      return { safe: false, reason: 'Too windy - fire hazard' };
    }
    if (current.windGust && current.windGust > 25) {
      return { safe: false, reason: 'Gusty winds - not recommended' };
    }
    if (current.windSpeed > 12) {
      return { safe: true, reason: 'Breezy - use caution' };
    }
    return { safe: true, reason: 'Good conditions' };
  };

  const getCurrentLakeConditions = (
    current: WeatherData['current']
  ): { rating: string; activities: string[] } => {
    const temp = current.temperature;
    const wind = current.windSpeed;
    const activities: string[] = [];

    if (temp > 70 && wind < 10) {
      activities.push('🏊 Swimming');
    }
    if (temp > 55 && wind < 15) {
      activities.push('🛶 Kayaking');
    }
    if (wind < 20) {
      activities.push('🎣 Fishing');
    }
    if (wind < 15) {
      activities.push('🚤 Boating');
    }

    if (activities.length >= 3) return { rating: 'Excellent', activities };
    if (activities.length >= 2) return { rating: 'Good', activities };
    if (activities.length >= 1) return { rating: 'Limited', activities };
    return { rating: 'Poor', activities: ['Indoor activities recommended'] };
  };

  const getCurrentSnowInfo = (current: WeatherData['current']): string | null => {
    const desc = current.description.toLowerCase();
    if (desc.includes('snow')) {
      return 'Snow conditions';
    }
    return null;
  };

  // Get today's forecast for frost warning and moon phase
  const getTodayForecast = (): WeatherForecast | undefined => {
    if (!weatherData) return undefined;
    const today = new Date().toLocaleDateString('en-CA');
    return weatherData.forecast.find((f) => f.date === today);
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
            onClick={() => {
              weatherService.clearCache();
              loadWeatherData();
            }}
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
      {/* Weather Alerts */}
      {weatherData.alerts.length > 0 && (
        <div className={styles.alerts}>
          {weatherData.alerts.map((alert, index) => (
            <div key={index} className={styles.alert}>
              <span className={styles.alertIcon}>⚠️</span>
              <div className={styles.alertContent}>
                <strong>{alert.event}</strong>
                <p>{alert.description.slice(0, 200)}...</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Current Weather */}
      <div className={styles.currentWeather}>
        <div className={styles.location}>
          <h3>📍 {weatherData.location.name}</h3>
          <span className={styles.lastUpdated}>
            Updated:{' '}
            {new Date(weatherData.lastUpdated).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
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
                <span className={styles.label}>💧 Humidity</span>
                <span className={styles.value}>{weatherData.current.humidity}%</span>
              </div>
              <div className={styles.conditionItem}>
                <span className={styles.label}>💨 Wind</span>
                <span className={styles.value}>
                  {weatherData.current.windSpeed} mph{' '}
                  {weatherService.getWindDirection(weatherData.current.windDirection)}
                  {weatherData.current.windGust && ` (gusts ${weatherData.current.windGust})`}
                </span>
              </div>
              <div className={styles.conditionItem}>
                <span className={styles.label}>☀️ UV Index</span>
                <span className={styles.value}>{weatherData.current.uvIndex}</span>
              </div>
              <div className={styles.conditionItem}>
                <span className={styles.label}>👁️ Visibility</span>
                <span className={styles.value}>{weatherData.current.visibility} mi</span>
              </div>
              <div className={styles.conditionItem}>
                <span className={styles.label}>🌅 Sunrise</span>
                <span className={styles.value}>{formatSunTime(weatherData.current.sunrise)}</span>
              </div>
              <div className={styles.conditionItem}>
                <span className={styles.label}>🌇 Sunset</span>
                <span className={styles.value}>{formatSunTime(weatherData.current.sunset)}</span>
              </div>
            </div>

            {/* Current Day Warnings */}
            {getTodayForecast() && hasFrostWarning(getTodayForecast()!) && (
              <div className={styles.frostWarning}>
                <span>🥶 Frost/Ice Warning Tonight</span>
                <p>Overnight low: {getTodayForecast()!.temperature.night}°F - Protect pipes and plants</p>
              </div>
            )}

            {getCurrentSnowInfo(weatherData.current) && (
              <div className={styles.snowInfo}>
                <span>❄️ {getCurrentSnowInfo(weatherData.current)}</span>
              </div>
            )}

            {/* Current Activity Conditions */}
            <div className={styles.activityConditions}>
              <h6>Current Activity Conditions</h6>
              <div className={styles.activityGrid}>
                <div className={styles.activityItem}>
                  <span className={styles.activityIcon}>🎣</span>
                  <div className={styles.activityInfo}>
                    <span className={styles.activityName}>Fishing</span>
                    <span
                      className={`${styles.activityRating} ${styles[`rating${getCurrentFishingConditions(weatherData.current, getTodayForecast()).rating}`]}`}
                    >
                      {getCurrentFishingConditions(weatherData.current, getTodayForecast()).rating}
                    </span>
                    <span className={styles.activityReason}>
                      {getCurrentFishingConditions(weatherData.current, getTodayForecast()).reason}
                    </span>
                  </div>
                </div>

                <div className={styles.activityItem}>
                  <span className={styles.activityIcon}>🔥</span>
                  <div className={styles.activityInfo}>
                    <span className={styles.activityName}>Campfire</span>
                    <span
                      className={`${styles.activityRating} ${getCurrentCampfireConditions(weatherData.current).safe ? styles.ratingGood : styles.ratingPoor}`}
                    >
                      {getCurrentCampfireConditions(weatherData.current).safe ? 'Safe' : 'Not Safe'}
                    </span>
                    <span className={styles.activityReason}>
                      {getCurrentCampfireConditions(weatherData.current).reason}
                    </span>
                  </div>
                </div>

                <div className={styles.activityItem}>
                  <span className={styles.activityIcon}>🌊</span>
                  <div className={styles.activityInfo}>
                    <span className={styles.activityName}>Lake</span>
                    <span
                      className={`${styles.activityRating} ${styles[`rating${getCurrentLakeConditions(weatherData.current).rating}`]}`}
                    >
                      {getCurrentLakeConditions(weatherData.current).rating}
                    </span>
                    <span className={styles.activityReason}>
                      {getCurrentLakeConditions(weatherData.current).activities.join(' ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Forecast */}
      {showForecast && !compact && weatherData.forecast.length > 0 && (
        <div className={styles.forecast}>
          <h4>8-Day Forecast</h4>

          {/* Hourly Forecast - Next 24 hours */}
          {showHourlyForecast && weatherData.hourlyForecast.length > 0 && (
            <div className={styles.hourlyForecast}>
              <h5>Next 24 Hours</h5>
              <div className={styles.hourlyGrid}>
                {getNext48Hours(weatherData.hourlyForecast).map((hour) => (
                  <div key={hour.time} className={styles.hourlyItem}>
                    <span className={styles.hourlyTime}>{formatTime(hour.time)}</span>
                    <img
                      src={weatherService.getIconUrl(hour.icon)}
                      alt={hour.description}
                      className={styles.hourlyIcon}
                    />
                    <span className={styles.hourlyTemp}>{hour.temperature}°</span>
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

          {/* 8-Day Forecast */}
          <div className={styles.dailyForecast}>
            <h5>Daily Forecast</h5>
            <div className={styles.forecastGrid}>
              {weatherData.forecast.map((day) => (
                <div
                  key={day.date}
                  className={`${styles.forecastDay} ${selectedDay?.date === day.date ? styles.selected : ''}`}
                  onClick={() => setSelectedDay(selectedDay?.date === day.date ? null : day)}
                >
                  <span className={styles.forecastDate}>{formatForecastDate(day.date)}</span>
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
                  {day.precipitationProbability > 0 && (
                    <span className={styles.forecastPrecip}>
                      💧 {day.precipitationProbability}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Selected Day Details */}
          {selectedDay && (
            <div className={styles.dayDetails}>
              <h5>{formatForecastDate(selectedDay.date)} Details</h5>
              
              {/* Frost Warning */}
              {hasFrostWarning(selectedDay) && (
                <div className={styles.frostWarning}>
                  <span>🥶 Frost/Ice Warning</span>
                  <p>Overnight low: {selectedDay.temperature.night}°F - Protect pipes and plants</p>
                </div>
              )}

              {/* Snow Info */}
              {getSnowInfo(selectedDay) && (
                <div className={styles.snowInfo}>
                  <span>❄️ Snow: {getSnowInfo(selectedDay)}</span>
                </div>
              )}

              <div className={styles.dayDetailsGrid}>
                <div className={styles.dayDetailItem}>
                  <span className={styles.label}>🌅 Sunrise</span>
                  <span className={styles.value}>{formatSunTime(selectedDay.sunrise)}</span>
                </div>
                <div className={styles.dayDetailItem}>
                  <span className={styles.label}>🌇 Sunset</span>
                  <span className={styles.value}>{formatSunTime(selectedDay.sunset)}</span>
                </div>
                <div className={styles.dayDetailItem}>
                  <span className={styles.label}>🌙 Moon</span>
                  <span className={styles.value}>
                    {weatherService.getMoonPhaseName(selectedDay.moonPhase)}
                  </span>
                </div>
                <div className={styles.dayDetailItem}>
                  <span className={styles.label}>☀️ UV Index</span>
                  <span className={styles.value}>{selectedDay.uvIndex}</span>
                </div>
                <div className={styles.dayDetailItem}>
                  <span className={styles.label}>💨 Wind</span>
                  <span className={styles.value}>
                    {selectedDay.windSpeed} mph{' '}
                    {weatherService.getWindDirection(selectedDay.windDirection)}
                  </span>
                </div>
                <div className={styles.dayDetailItem}>
                  <span className={styles.label}>💧 Humidity</span>
                  <span className={styles.value}>{selectedDay.humidity}%</span>
                </div>
              </div>

              {/* Activity Conditions */}
              <div className={styles.activityConditions}>
                <h6>Activity Conditions</h6>
                <div className={styles.activityGrid}>
                  {/* Fishing */}
                  <div className={styles.activityItem}>
                    <span className={styles.activityIcon}>🎣</span>
                    <div className={styles.activityInfo}>
                      <span className={styles.activityName}>Fishing</span>
                      <span className={`${styles.activityRating} ${styles[`rating${getFishingConditions(selectedDay).rating}`]}`}>
                        {getFishingConditions(selectedDay).rating}
                      </span>
                      <span className={styles.activityReason}>{getFishingConditions(selectedDay).reason}</span>
                    </div>
                  </div>

                  {/* Campfire */}
                  <div className={styles.activityItem}>
                    <span className={styles.activityIcon}>🔥</span>
                    <div className={styles.activityInfo}>
                      <span className={styles.activityName}>Campfire</span>
                      <span className={`${styles.activityRating} ${getCampfireConditions(selectedDay).safe ? styles.ratingGood : styles.ratingPoor}`}>
                        {getCampfireConditions(selectedDay).safe ? 'Safe' : 'Not Safe'}
                      </span>
                      <span className={styles.activityReason}>{getCampfireConditions(selectedDay).reason}</span>
                    </div>
                  </div>

                  {/* Lake Activities */}
                  <div className={styles.activityItem}>
                    <span className={styles.activityIcon}>🌊</span>
                    <div className={styles.activityInfo}>
                      <span className={styles.activityName}>Lake</span>
                      <span className={`${styles.activityRating} ${styles[`rating${getLakeConditions(selectedDay).rating}`]}`}>
                        {getLakeConditions(selectedDay).rating}
                      </span>
                      <span className={styles.activityReason}>{getLakeConditions(selectedDay).activities.join(' ')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.tempBreakdown}>
                <h6>Temperature Throughout Day</h6>
                <div className={styles.tempGrid}>
                  <div className={styles.tempItem}>
                    <span>Morning</span>
                    <span>{selectedDay.temperature.morn}°</span>
                  </div>
                  <div className={styles.tempItem}>
                    <span>Day</span>
                    <span>{selectedDay.temperature.day}°</span>
                  </div>
                  <div className={styles.tempItem}>
                    <span>Evening</span>
                    <span>{selectedDay.temperature.eve}°</span>
                  </div>
                  <div className={styles.tempItem}>
                    <span>Night</span>
                    <span>{selectedDay.temperature.night}°</span>
                  </div>
                </div>
              </div>
              {selectedDay.summary && (
                <p className={styles.daySummary}>{selectedDay.summary}</p>
              )}
              <div className={styles.recommendation}>{getActivityRecommendation(selectedDay)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
