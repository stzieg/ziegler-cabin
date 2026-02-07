import React, { useState, useEffect } from 'react';
import {
  weatherService,
  type WeatherData,
  type HourlyForecast,
  type WeatherForecast,
} from '../utils/weatherService';
import styles from './Weather.module.css';

type LakeActivityId = 'swimming' | 'kayaking' | 'fishing' | 'boating' | 'frozen' | 'indoors';

type ActivityRecommendation = {
  text: string;
  icon: React.ReactNode;
};

const IconBase: React.FC<{
  className?: string;
  viewBox?: string;
  children: React.ReactNode;
}> = ({ className, viewBox = '0 0 24 24', children }) => (
  <svg
    className={className}
    viewBox={viewBox}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const IconAlert = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <path d="M10.29 3.86l-8 14A2 2 0 0 0 4 20h16a2 2 0 0 0 1.71-3l-8-14a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </IconBase>
);

const IconMapPin = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <path d="M21 10c0 5-9 12-9 12S3 15 3 10a9 9 0 1 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </IconBase>
);

const IconDroplet = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <path d="M12 2s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" />
  </IconBase>
);

const IconWind = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <path d="M3 12h13a3 3 0 1 0-3-3" />
    <path d="M4 18h12a2 2 0 1 1-2 2" />
    <path d="M2 6h9a2 2 0 1 1-2-2" />
  </IconBase>
);

const IconSun = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <circle cx="12" cy="12" r="4" />
    <line x1="12" y1="2" x2="12" y2="4" />
    <line x1="12" y1="20" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
    <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="4" y2="12" />
    <line x1="20" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
    <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
  </IconBase>
);

const IconEye = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
    <circle cx="12" cy="12" r="3" />
  </IconBase>
);

const IconSunrise = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <path d="M17 18a5 5 0 0 0-10 0" />
    <line x1="12" y1="2" x2="12" y2="8" />
    <line x1="4.22" y1="10.22" x2="5.64" y2="11.64" />
    <line x1="1" y1="18" x2="23" y2="18" />
    <line x1="18.36" y1="11.64" x2="19.78" y2="10.22" />
  </IconBase>
);

const IconSunset = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <path d="M17 18a5 5 0 0 0-10 0" />
    <line x1="12" y1="2" x2="12" y2="8" />
    <line x1="4.22" y1="13.78" x2="5.64" y2="12.36" />
    <line x1="1" y1="18" x2="23" y2="18" />
    <line x1="18.36" y1="12.36" x2="19.78" y2="13.78" />
  </IconBase>
);

const IconMoon = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </IconBase>
);

const IconSnowflake = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <line x1="12" y1="2" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="19.07" y2="4.93" />
  </IconBase>
);

const IconFish = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <path d="M7 12s4 0 6-2 4-2 7-2c-1 4-1 8 0 12-3 0-5 0-7-2s-6-2-6-2" />
    <path d="M7 10l-4-4 1 6-1 6 4-4" />
    <circle cx="15" cy="10" r="1" />
  </IconBase>
);

const IconFlame = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <path d="M12 2c2 3 3 5 3 7a3 3 0 0 1-6 0c0-2 1-4 3-7z" />
    <path d="M6 14a6 6 0 0 0 12 0c0-2-1-4-3-6-1 3-3 4-3 6a3 3 0 0 1-6 0z" />
  </IconBase>
);

const IconWaves = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <path d="M2 16c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />
    <path d="M2 20c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />
  </IconBase>
);

const IconCoffee = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <path d="M3 8h12v6a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" />
    <path d="M15 10h2a3 3 0 0 1 0 6h-2" />
    <line x1="6" y1="2" x2="6" y2="5" />
    <line x1="10" y1="2" x2="10" y2="5" />
  </IconBase>
);

const IconCloudRain = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <path d="M17.5 17a4.5 4.5 0 0 0-.9-8.9 6 6 0 1 0-11.2 2A4 4 0 0 0 6 18h11.5" />
    <line x1="8" y1="19" x2="8" y2="22" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <line x1="16" y1="19" x2="16" y2="22" />
  </IconBase>
);

const IconCloudSun = ({ className }: { className?: string }) => (
  <IconBase className={className}>
    <path d="M18 14a4 4 0 0 0-3.87-3 5 5 0 1 0-9.6 1.7A4 4 0 0 0 6 20h12a4 4 0 0 0 0-6z" />
    <line x1="12" y1="2" x2="12" y2="4" />
    <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
    <line x1="2" y1="12" x2="4" y2="12" />
  </IconBase>
);

const getLakeActivityLabel = (activity: LakeActivityId): string => {
  switch (activity) {
    case 'swimming':
      return 'Swimming';
    case 'kayaking':
      return 'Kayaking';
    case 'fishing':
      return 'Fishing';
    case 'boating':
      return 'Boating';
    case 'frozen':
      return 'Lake likely frozen';
    case 'indoors':
      return 'Indoor activities recommended';
    default:
      return 'Activity';
  }
};

const getLakeActivityIcon = (activity: LakeActivityId, className?: string): React.ReactNode => {
  switch (activity) {
    case 'swimming':
      return <IconWaves className={className} />;
    case 'kayaking':
      return <IconWaves className={className} />;
    case 'fishing':
      return <IconFish className={className} />;
    case 'boating':
      return <IconWaves className={className} />;
    case 'frozen':
      return <IconSnowflake className={className} />;
    case 'indoors':
      return <IconCoffee className={className} />;
    default:
      return <IconWaves className={className} />;
  }
};

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

  const getActivityRecommendation = (forecast: WeatherForecast): ActivityRecommendation => {
    if (weatherService.isGoodWeatherForOutdoorActivities(forecast)) {
      return { text: 'Perfect weather for cabin activities!', icon: <IconSun className={styles.inlineIcon} /> };
    } else if (forecast.temperature.day < 45) {
      return { text: 'Great weather for cozy indoor activities', icon: <IconCoffee className={styles.inlineIcon} /> };
    } else if (forecast.precipitationProbability > 50) {
      return { text: 'Rain likely - plan indoor activities', icon: <IconCloudRain className={styles.inlineIcon} /> };
    } else {
      return { text: 'Check conditions before outdoor activities', icon: <IconCloudSun className={styles.inlineIcon} /> };
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
    const temp = forecast.temperature.day;
    const isComfortableTemp = temp >= 45 && temp <= 85;

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
    if (isComfortableTemp) {
      score += 1;
      reasons.push('comfortable temps');
    } else if (temp < 45) {
      reasons.push('cold temps');
    } else if (temp > 85) {
      reasons.push('hot temps');
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
  const getLakeConditions = (forecast: WeatherForecast): { rating: string; activities: LakeActivityId[] } => {
    const temp = forecast.temperature.day;
    const wind = forecast.windSpeed;
    const precip = forecast.precipitationProbability;
    const activities: LakeActivityId[] = [];

    if (temp <= 32) {
      return { rating: 'Poor', activities: ['frozen'] };
    }

    // Swimming conditions (temp > 70, low wind, no rain)
    if (temp > 70 && wind < 10 && precip < 30) {
      activities.push('swimming');
    }
    // Kayaking/canoeing (moderate conditions)
    if (temp > 55 && wind < 15 && precip < 40) {
      activities.push('kayaking');
    }
    // Fishing (almost always possible)
    if (temp >= 45 && wind < 20 && precip < 50) {
      activities.push('fishing');
    }
    // Boating
    if (wind < 15 && precip < 30) {
      activities.push('boating');
    }

    if (activities.length >= 3) return { rating: 'Excellent', activities };
    if (activities.length >= 2) return { rating: 'Good', activities };
    if (activities.length >= 1) return { rating: 'Limited', activities };
    return { rating: 'Poor', activities: ['indoors'] };
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
    const temp = current.temperature;
    const isComfortableTemp = temp >= 45 && temp <= 85;

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
    if (isComfortableTemp) {
      score += 1;
      reasons.push('comfortable temps');
    } else if (temp < 45) {
      reasons.push('cold temps');
    } else if (temp > 85) {
      reasons.push('hot temps');
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
  ): { rating: string; activities: LakeActivityId[] } => {
    const temp = current.temperature;
    const wind = current.windSpeed;
    const activities: LakeActivityId[] = [];

    if (temp <= 32) {
      return { rating: 'Poor', activities: ['frozen'] };
    }

    if (temp > 70 && wind < 10) {
      activities.push('swimming');
    }
    if (temp > 55 && wind < 15) {
      activities.push('kayaking');
    }
    if (temp >= 45 && wind < 20) {
      activities.push('fishing');
    }
    if (wind < 15) {
      activities.push('boating');
    }

    if (activities.length >= 3) return { rating: 'Excellent', activities };
    if (activities.length >= 2) return { rating: 'Good', activities };
    if (activities.length >= 1) return { rating: 'Limited', activities };
    return { rating: 'Poor', activities: ['indoors'] };
  };

  const getCurrentSnowInfo = (current: WeatherData['current']): string | null => {
    const desc = current.description.toLowerCase();
    if (desc.includes('snow')) {
      return 'Snow conditions';
    }
    return null;
  };

  const renderLakeActivities = (activities: LakeActivityId[]): React.ReactNode => (
    <div className={styles.activityReasonList}>
      {activities.map((activity) => (
        <span key={activity} className={styles.activityTag}>
          {getLakeActivityIcon(activity, styles.tagIcon)}
          <span>{getLakeActivityLabel(activity)}</span>
        </span>
      ))}
    </div>
  );

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
          <span className={styles.errorIcon}>
            <IconAlert className={styles.iconSm} />
          </span>
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
              <span className={styles.alertIcon}>
                <IconAlert className={styles.iconSm} />
              </span>
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
          <h3 className={styles.locationTitle}>
            <IconMapPin className={styles.inlineIcon} /> {weatherData.location.name}
          </h3>
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
                <span className={styles.label}>
                  <IconDroplet className={styles.labelIcon} /> Humidity
                </span>
                <span className={styles.value}>{weatherData.current.humidity}%</span>
              </div>
              <div className={styles.conditionItem}>
                <span className={styles.label}>
                  <IconWind className={styles.labelIcon} /> Wind
                </span>
                <span className={styles.value}>
                  {weatherData.current.windSpeed} mph{' '}
                  {weatherService.getWindDirection(weatherData.current.windDirection)}
                  {weatherData.current.windGust && ` (gusts ${weatherData.current.windGust})`}
                </span>
              </div>
              <div className={styles.conditionItem}>
                <span className={styles.label}>
                  <IconSun className={styles.labelIcon} /> UV Index
                </span>
                <span className={styles.value}>{weatherData.current.uvIndex}</span>
              </div>
              <div className={styles.conditionItem}>
                <span className={styles.label}>
                  <IconEye className={styles.labelIcon} /> Visibility
                </span>
                <span className={styles.value}>{weatherData.current.visibility} mi</span>
              </div>
              <div className={styles.conditionItem}>
                <span className={styles.label}>
                  <IconSunrise className={styles.labelIcon} /> Sunrise
                </span>
                <span className={styles.value}>{formatSunTime(weatherData.current.sunrise)}</span>
              </div>
              <div className={styles.conditionItem}>
                <span className={styles.label}>
                  <IconSunset className={styles.labelIcon} /> Sunset
                </span>
                <span className={styles.value}>{formatSunTime(weatherData.current.sunset)}</span>
              </div>
            </div>

            {/* Current Day Warnings */}
            {getTodayForecast() && hasFrostWarning(getTodayForecast()!) && (
              <div className={styles.frostWarning}>
                <span className={styles.warningTitle}>
                  <IconSnowflake className={styles.inlineIcon} /> Frost/Ice Warning Tonight
                </span>
                <p>Overnight low: {getTodayForecast()!.temperature.night}°F - Protect pipes and plants</p>
              </div>
            )}

            {getCurrentSnowInfo(weatherData.current) && (
              <div className={styles.snowInfo}>
                <span>
                  <IconSnowflake className={styles.inlineIcon} /> {getCurrentSnowInfo(weatherData.current)}
                </span>
              </div>
            )}

            {/* Current Activity Conditions */}
            <div className={styles.activityConditions}>
              <h6>Current Activity Conditions</h6>
              <div className={styles.activityGrid}>
                <div className={styles.activityItem}>
                  <span className={styles.activityIcon}>
                    <IconFish className={styles.iconLg} />
                  </span>
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
                  <span className={styles.activityIcon}>
                    <IconFlame className={styles.iconLg} />
                  </span>
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
                  <span className={styles.activityIcon}>
                    <IconWaves className={styles.iconLg} />
                  </span>
                  <div className={styles.activityInfo}>
                    <span className={styles.activityName}>Lake</span>
                    <span
                      className={`${styles.activityRating} ${styles[`rating${getCurrentLakeConditions(weatherData.current).rating}`]}`}
                    >
                      {getCurrentLakeConditions(weatherData.current).rating}
                    </span>
                    {renderLakeActivities(getCurrentLakeConditions(weatherData.current).activities)}
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
                        <span className={styles.precipIcon}>
                          <IconDroplet className={styles.iconSm} />
                        </span>
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
                      <IconDroplet className={styles.iconSm} /> {day.precipitationProbability}%
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
                  <span className={styles.warningTitle}>
                    <IconSnowflake className={styles.inlineIcon} /> Frost/Ice Warning
                  </span>
                  <p>Overnight low: {selectedDay.temperature.night}°F - Protect pipes and plants</p>
                </div>
              )}

              {/* Snow Info */}
              {getSnowInfo(selectedDay) && (
                <div className={styles.snowInfo}>
                  <span>
                    <IconSnowflake className={styles.inlineIcon} /> Snow: {getSnowInfo(selectedDay)}
                  </span>
                </div>
              )}

              <div className={styles.dayDetailsGrid}>
                <div className={styles.dayDetailItem}>
                  <span className={styles.label}>
                    <IconSunrise className={styles.labelIcon} /> Sunrise
                  </span>
                  <span className={styles.value}>{formatSunTime(selectedDay.sunrise)}</span>
                </div>
                <div className={styles.dayDetailItem}>
                  <span className={styles.label}>
                    <IconSunset className={styles.labelIcon} /> Sunset
                  </span>
                  <span className={styles.value}>{formatSunTime(selectedDay.sunset)}</span>
                </div>
                <div className={styles.dayDetailItem}>
                  <span className={styles.label}>
                    <IconMoon className={styles.labelIcon} /> Moon
                  </span>
                  <span className={styles.value}>
                    {weatherService.getMoonPhaseName(selectedDay.moonPhase)}
                  </span>
                </div>
                <div className={styles.dayDetailItem}>
                  <span className={styles.label}>
                    <IconSun className={styles.labelIcon} /> UV Index
                  </span>
                  <span className={styles.value}>{selectedDay.uvIndex}</span>
                </div>
                <div className={styles.dayDetailItem}>
                  <span className={styles.label}>
                    <IconWind className={styles.labelIcon} /> Wind
                  </span>
                  <span className={styles.value}>
                    {selectedDay.windSpeed} mph{' '}
                    {weatherService.getWindDirection(selectedDay.windDirection)}
                  </span>
                </div>
                <div className={styles.dayDetailItem}>
                  <span className={styles.label}>
                    <IconDroplet className={styles.labelIcon} /> Humidity
                  </span>
                  <span className={styles.value}>{selectedDay.humidity}%</span>
                </div>
              </div>

              {/* Activity Conditions */}
              <div className={styles.activityConditions}>
                <h6>Activity Conditions</h6>
                <div className={styles.activityGrid}>
                  {/* Fishing */}
                  <div className={styles.activityItem}>
                    <span className={styles.activityIcon}>
                      <IconFish className={styles.iconLg} />
                    </span>
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
                    <span className={styles.activityIcon}>
                      <IconFlame className={styles.iconLg} />
                    </span>
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
                    <span className={styles.activityIcon}>
                      <IconWaves className={styles.iconLg} />
                    </span>
                    <div className={styles.activityInfo}>
                      <span className={styles.activityName}>Lake</span>
                      <span className={`${styles.activityRating} ${styles[`rating${getLakeConditions(selectedDay).rating}`]}`}>
                        {getLakeConditions(selectedDay).rating}
                      </span>
                      {renderLakeActivities(getLakeConditions(selectedDay).activities)}
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
              {(() => {
                const recommendation = getActivityRecommendation(selectedDay);
                return (
                  <div className={styles.recommendation}>
                    {recommendation.icon}
                    <span>{recommendation.text}</span>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
