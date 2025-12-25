/**
 * Weather Service for Pickerel, Wisconsin
 * Uses OpenWeather One Call API 3.0 for extended forecasts (8 days)
 * Implements aggressive caching to stay within 1000 calls/day limit
 */

export interface WeatherData {
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    description: string;
    icon: string;
    windSpeed: number;
    windGust?: number;
    windDirection: number;
    pressure: number;
    visibility: number;
    uvIndex: number;
    dewPoint: number;
    clouds: number;
    sunrise: string;
    sunset: string;
  };
  forecast: WeatherForecast[];
  hourlyForecast: HourlyForecast[];
  alerts: WeatherAlert[];
  location: {
    name: string;
    lat: number;
    lon: number;
    timezone: string;
  };
  lastUpdated: string;
}

export interface WeatherForecast {
  date: string;
  temperature: {
    min: number;
    max: number;
    morn: number;
    day: number;
    eve: number;
    night: number;
  };
  feelsLike: {
    morn: number;
    day: number;
    eve: number;
    night: number;
  };
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  windGust?: number;
  windDirection: number;
  precipitation: number;
  precipitationProbability: number;
  uvIndex: number;
  clouds: number;
  sunrise: string;
  sunset: string;
  moonPhase: number;
  summary?: string;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  feelsLike: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  windGust?: number;
  windDirection: number;
  precipitation: number;
  precipitationProbability: number;
  uvIndex: number;
  clouds: number;
  visibility: number;
  dewPoint: number;
}

export interface WeatherAlert {
  senderName: string;
  event: string;
  start: string;
  end: string;
  description: string;
  tags: string[];
}

export interface WeatherError {
  message: string;
  code?: string;
}

// Pickerel, Wisconsin coordinates
const PICKEREL_COORDS = {
  lat: 45.359444,
  lon: -88.910833,
  name: 'Pickerel, WI'
};

// Cache keys for localStorage persistence
const CACHE_KEY = 'weather_cache_v2';
const CACHE_TIMESTAMP_KEY = 'weather_cache_timestamp_v2';

class WeatherService {
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/3.0';
  private memoryCache: WeatherData | null = null;
  private memoryCacheTimestamp: number = 0;
  // Cache for 30 minutes to be efficient with API calls (48 calls/day max)
  private cacheTimeout = 30 * 60 * 1000;

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
    if (!this.apiKey) {
      console.warn('OpenWeather API key not found. Weather features will be disabled.');
    }
    // Load from localStorage on init
    this.loadFromLocalStorage();
  }

  /**
   * Check if weather service is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Load cached data from localStorage
   */
  private loadFromLocalStorage(): void {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      if (cached && timestamp) {
        this.memoryCache = JSON.parse(cached);
        this.memoryCacheTimestamp = parseInt(timestamp, 10);
      }
    } catch (e) {
      console.warn('Failed to load weather cache from localStorage');
    }
  }

  /**
   * Save data to localStorage for persistence across page reloads
   */
  private saveToLocalStorage(data: WeatherData): void {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (e) {
      console.warn('Failed to save weather cache to localStorage');
    }
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    return this.memoryCache !== null && 
           (Date.now() - this.memoryCacheTimestamp) < this.cacheTimeout;
  }

  /**
   * Get current weather and forecast data using One Call API 3.0
   */
  async getCurrentWeather(): Promise<WeatherData> {
    if (!this.isAvailable()) {
      throw new Error('Weather service is not available. Please check your API key configuration.');
    }

    // Return cached data if valid
    if (this.isCacheValid() && this.memoryCache) {
      return this.memoryCache;
    }

    try {
      // One Call API 3.0 - single call gets everything
      const response = await fetch(
        `${this.baseUrl}/onecall?lat=${PICKEREL_COORDS.lat}&lon=${PICKEREL_COORDS.lon}&appid=${this.apiKey}&units=imperial&exclude=minutely`
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Weather API error:', response.status, errorText);
        throw new Error(`Weather API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const weatherData = this.processOneCallData(data);

      // Update cache
      this.memoryCache = weatherData;
      this.memoryCacheTimestamp = Date.now();
      this.saveToLocalStorage(weatherData);

      return weatherData;

    } catch (error: any) {
      console.error('Weather service error:', error);
      
      // Return stale cache if available
      if (this.memoryCache) {
        console.warn('Returning stale weather cache due to API error');
        return this.memoryCache;
      }
      
      throw new Error(`Failed to fetch weather data: ${error.message}`);
    }
  }

  /**
   * Process One Call API 3.0 response
   */
  private processOneCallData(data: any): WeatherData {
    const current = data.current;
    const daily = data.daily || [];
    const hourly = data.hourly || [];
    const alerts = data.alerts || [];

    return {
      current: {
        temperature: Math.round(current.temp),
        feelsLike: Math.round(current.feels_like),
        humidity: current.humidity,
        description: this.capitalizeWords(current.weather[0].description),
        icon: current.weather[0].icon,
        windSpeed: Math.round(current.wind_speed),
        windGust: current.wind_gust ? Math.round(current.wind_gust) : undefined,
        windDirection: current.wind_deg,
        pressure: current.pressure,
        visibility: Math.round((current.visibility || 10000) / 1609.34),
        uvIndex: Math.round(current.uvi),
        dewPoint: Math.round(current.dew_point),
        clouds: current.clouds,
        sunrise: new Date(current.sunrise * 1000).toISOString(),
        sunset: new Date(current.sunset * 1000).toISOString(),
      },
      forecast: daily.map((day: any) => this.processDailyForecast(day)),
      hourlyForecast: hourly.slice(0, 48).map((hour: any) => this.processHourlyForecast(hour)),
      alerts: alerts.map((alert: any) => ({
        senderName: alert.sender_name,
        event: alert.event,
        start: new Date(alert.start * 1000).toISOString(),
        end: new Date(alert.end * 1000).toISOString(),
        description: alert.description,
        tags: alert.tags || [],
      })),
      location: {
        name: PICKEREL_COORDS.name,
        lat: data.lat,
        lon: data.lon,
        timezone: data.timezone,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Process daily forecast data
   */
  private processDailyForecast(day: any): WeatherForecast {
    return {
      date: new Date(day.dt * 1000).toISOString().split('T')[0],
      temperature: {
        min: Math.round(day.temp.min),
        max: Math.round(day.temp.max),
        morn: Math.round(day.temp.morn),
        day: Math.round(day.temp.day),
        eve: Math.round(day.temp.eve),
        night: Math.round(day.temp.night),
      },
      feelsLike: {
        morn: Math.round(day.feels_like.morn),
        day: Math.round(day.feels_like.day),
        eve: Math.round(day.feels_like.eve),
        night: Math.round(day.feels_like.night),
      },
      description: this.capitalizeWords(day.weather[0].description),
      icon: day.weather[0].icon,
      humidity: day.humidity,
      windSpeed: Math.round(day.wind_speed),
      windGust: day.wind_gust ? Math.round(day.wind_gust) : undefined,
      windDirection: day.wind_deg,
      precipitation: (day.rain || 0) + (day.snow || 0),
      precipitationProbability: Math.round((day.pop || 0) * 100),
      uvIndex: Math.round(day.uvi),
      clouds: day.clouds,
      sunrise: new Date(day.sunrise * 1000).toISOString(),
      sunset: new Date(day.sunset * 1000).toISOString(),
      moonPhase: day.moon_phase,
      summary: day.summary,
    };
  }

  /**
   * Process hourly forecast data
   */
  private processHourlyForecast(hour: any): HourlyForecast {
    return {
      time: new Date(hour.dt * 1000).toISOString(),
      temperature: Math.round(hour.temp),
      feelsLike: Math.round(hour.feels_like),
      description: this.capitalizeWords(hour.weather[0].description),
      icon: hour.weather[0].icon,
      humidity: hour.humidity,
      windSpeed: Math.round(hour.wind_speed),
      windGust: hour.wind_gust ? Math.round(hour.wind_gust) : undefined,
      windDirection: hour.wind_deg,
      precipitation: (hour.rain?.['1h'] || 0) + (hour.snow?.['1h'] || 0),
      precipitationProbability: Math.round((hour.pop || 0) * 100),
      uvIndex: Math.round(hour.uvi),
      clouds: hour.clouds,
      visibility: Math.round((hour.visibility || 10000) / 1609.34),
      dewPoint: Math.round(hour.dew_point),
    };
  }

  /**
   * Clear the weather cache to force fresh data
   */
  clearCache(): void {
    this.memoryCache = null;
    this.memoryCacheTimestamp = 0;
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
  }

  /**
   * Get weather forecast for the next 8 days
   */
  async getForecast(): Promise<WeatherForecast[]> {
    const weatherData = await this.getCurrentWeather();
    return weatherData.forecast;
  }

  /**
   * Get hourly forecast for the next 48 hours
   */
  async getHourlyForecast(): Promise<HourlyForecast[]> {
    const weatherData = await this.getCurrentWeather();
    return weatherData.hourlyForecast;
  }

  /**
   * Get weather alerts
   */
  async getAlerts(): Promise<WeatherAlert[]> {
    const weatherData = await this.getCurrentWeather();
    return weatherData.alerts;
  }

  /**
   * Get forecast for a specific date
   */
  async getForecastForDate(date: string): Promise<WeatherForecast | undefined> {
    const weatherData = await this.getCurrentWeather();
    return weatherData.forecast.find(f => f.date === date);
  }

  /**
   * Get weather icon URL
   */
  getIconUrl(iconCode: string, size: '1x' | '2x' | '4x' = '2x'): string {
    const sizeMap = { '1x': '', '2x': '@2x', '4x': '@4x' };
    return `https://openweathermap.org/img/wn/${iconCode}${sizeMap[size]}.png`;
  }

  /**
   * Convert wind direction degrees to compass direction
   */
  getWindDirection(degrees: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  }

  /**
   * Format temperature with unit
   */
  formatTemperature(temp: number): string {
    return `${temp}°F`;
  }

  /**
   * Get moon phase name
   */
  getMoonPhaseName(phase: number): string {
    if (phase === 0 || phase === 1) return 'New Moon';
    if (phase < 0.25) return 'Waxing Crescent';
    if (phase === 0.25) return 'First Quarter';
    if (phase < 0.5) return 'Waxing Gibbous';
    if (phase === 0.5) return 'Full Moon';
    if (phase < 0.75) return 'Waning Gibbous';
    if (phase === 0.75) return 'Last Quarter';
    return 'Waning Crescent';
  }

  /**
   * Check if it's a good day for cabin activities
   */
  isGoodWeatherForOutdoorActivities(forecast: WeatherForecast): boolean {
    const temp = forecast.temperature.day;
    const description = forecast.description.toLowerCase();
    const precip = forecast.precipitationProbability;
    
    return temp >= 45 && 
           temp <= 85 && 
           precip < 40 &&
           !description.includes('storm') && 
           !description.includes('heavy');
  }

  /**
   * Capitalize each word in a string
   */
  private capitalizeWords(str: string): string {
    return str.replace(/\b\w/g, char => char.toUpperCase());
  }
}

// Export singleton instance
export const weatherService = new WeatherService();
