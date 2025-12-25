import React from 'react';
import { Weather } from '../Weather';
import styles from './WeatherTab.module.css';

interface WeatherTabProps {
  user?: any;
  formState?: any;
  isAdmin?: boolean;
}

/**
 * WeatherTab component - Full weather display with extended forecast
 * Shows current conditions and 8-day forecast for Pickerel, Wisconsin
 */
export const WeatherTab: React.FC<WeatherTabProps> = () => {
  return (
    <div className={styles.weatherTab}>
      <div className={styles.header}>
        <h1>Weather Forecast</h1>
        <p>Current conditions and 8-day forecast for Pickerel, Wisconsin</p>
      </div>
      
      <div className={styles.weatherContent}>
        <Weather showForecast={true} showHourlyForecast={true} compact={false} />
      </div>
    </div>
  );
};