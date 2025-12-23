/**
 * Weather Service for Pickerel, Wisconsin
 * Integrates with OpenWeather API to provide current weather and forecast data
 */

export interface WeatherData {
  current: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    description: string;
    icon: string;
    windSpeed: number;
    windDirection: number;
    pressure: number;
    visibility: number;
    uvIndex: number;
  };
  forecast: WeatherForecast[];
  hourlyForecast: HourlyForecast[];
  location: {
    name: string;
    country: string;
    lat: number;
    lon: number;
  };
  lastUpdated: string;
}

export interface WeatherForecast {
  date: string;
  temperature: {
    min: number;
    max: number;
  };
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  hourlyData?: HourlyForecast[]; // Hourly data for this day
}

export interface HourlyForecast {
  time: string; // ISO string
  temperature: number;
  feelsLike: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  windDirection: number;
  precipitation: number;
  precipitationProbability: number;
}

export interface WeatherError {
  message: string;
  code?: string;
}

// Pickerel, Wisconsin coordinates
const PICKEREL_COORDS = {
  lat: 45.359444,
  lon: -88.910833
};

class WeatherService {
  private apiKey: string;
  private baseUrl = 'https://api.openweathermap.org/data/2.5';
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private cacheTimeout = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
    if (!this.apiKey) {
      console.warn('OpenWeather API key not found. Weather features will be disabled.');
    }
  }

  /**
   * Check if weather service is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get current weather data for Pickerel, Wisconsin
   */
  async getCurrentWeather(): Promise<WeatherData> {
    if (!this.isAvailable()) {
      throw new Error('Weather service is not available. Please check your API key configuration.');
    }

    const cacheKey = 'current-weather';
    const cached = this.getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const [currentResponse, forecastResponse] = await Promise.all([
        fetch(
          `${this.baseUrl}/weather?lat=${PICKEREL_COORDS.lat}&lon=${PICKEREL_COORDS.lon}&appid=${this.apiKey}&units=imperial`
        ),
        fetch(
          `${this.baseUrl}/forecast?lat=${PICKEREL_COORDS.lat}&lon=${PICKEREL_COORDS.lon}&appid=${this.apiKey}&units=imperial`
        )
      ]);

      if (!currentResponse.ok) {
        throw new Error(`Weather API error: ${currentResponse.status} ${currentResponse.statusText}`);
      }

      if (!forecastResponse.ok) {
        throw new Error(`Forecast API error: ${forecastResponse.status} ${forecastResponse.statusText}`);
      }

      const currentData = await currentResponse.json();
      const forecastData = await forecastResponse.json();

      const weatherData: WeatherData = {
        current: {
          temperature: Math.round(currentData.main.temp),
          feelsLike: Math.round(currentData.main.feels_like),
          humidity: currentData.main.humidity,
          description: this.capitalizeWords(currentData.weather[0].description),
          icon: currentData.weather[0].icon,
          windSpeed: Math.round(currentData.wind.speed),
          windDirection: currentData.wind.deg,
          pressure: currentData.main.pressure,
          visibility: Math.round(currentData.visibility / 1609.34), // Convert meters to miles
          uvIndex: 0 // Will be populated by UV index API if needed
        },
        forecast: this.processForecastData(forecastData.list),
        hourlyForecast: this.processHourlyForecastData(forecastData.list),
        location: {
          name: currentData.name,
          country: currentData.sys.country,
          lat: currentData.coord.lat,
          lon: currentData.coord.lon
        },
        lastUpdated: new Date().toISOString()
      };

      this.setCachedData(cacheKey, weatherData);
      return weatherData;

    } catch (error: any) {
      console.error('Weather service error:', error);
      throw new Error(`Failed to fetch weather data: ${error.message}`);
    }
  }

  /**
   * Clear the weather cache to force fresh data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get weather forecast for the next 5 days
   */
  async getForecast(): Promise<WeatherForecast[]> {
    const weatherData = await this.getCurrentWeather();
    return weatherData.forecast;
  }

  /**
   * Get hourly forecast for the next 5 days (3-hour intervals)
   */
  async getHourlyForecast(): Promise<HourlyForecast[]> {
    const weatherData = await this.getCurrentWeather();
    return weatherData.hourlyForecast;
  }

  /**
   * Get today's hourly forecast
   */
  async getTodayHourlyForecast(): Promise<HourlyForecast[]> {
    const weatherData = await this.getCurrentWeather();
    const today = new Date().toISOString().split('T')[0];
    return weatherData.hourlyForecast.filter(hour => 
      hour.time.startsWith(today)
    );
  }

  /**
   * Process forecast data from OpenWeather API
   */
  private processForecastData(forecastList: any[]): WeatherForecast[] {
    const dailyForecasts: Map<string, WeatherForecast> = new Map();
    const hourlyByDay: Map<string, HourlyForecast[]> = new Map();
    
    // Get today's date in local timezone (YYYY-MM-DD format)
    const today = new Date().toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD format

    // First, process all hourly data and group by day
    const hourlyData = this.processHourlyForecastData(forecastList);
    hourlyData.forEach((hourly) => {
      // Extract date from ISO string, but convert to local date
      const hourDate = new Date(hourly.time);
      const dateKey = hourDate.toLocaleDateString('en-CA');
      if (!hourlyByDay.has(dateKey)) {
        hourlyByDay.set(dateKey, []);
      }
      hourlyByDay.get(dateKey)!.push(hourly);
    });

    forecastList.forEach((item) => {
      // Convert Unix timestamp to local date
      const date = new Date(item.dt * 1000);
      const dateKey = date.toLocaleDateString('en-CA'); // Local date in YYYY-MM-DD format

      if (!dailyForecasts.has(dateKey)) {
        dailyForecasts.set(dateKey, {
          date: dateKey,
          temperature: {
            min: Math.round(item.main.temp_min),
            max: Math.round(item.main.temp_max)
          },
          description: this.capitalizeWords(item.weather[0].description),
          icon: item.weather[0].icon,
          humidity: item.main.humidity,
          windSpeed: Math.round(item.wind.speed),
          precipitation: item.rain ? item.rain['3h'] || 0 : 0,
          hourlyData: hourlyByDay.get(dateKey) || []
        });
      } else {
        // Update min/max temperatures
        const existing = dailyForecasts.get(dateKey)!;
        existing.temperature.min = Math.min(existing.temperature.min, Math.round(item.main.temp_min));
        existing.temperature.max = Math.max(existing.temperature.max, Math.round(item.main.temp_max));
      }
    });

    // Convert to array, filter out today, and sort by date
    const futureForecasts = Array.from(dailyForecasts.values())
      .filter(forecast => forecast.date > today) // Always exclude today
      .sort((a, b) => a.date.localeCompare(b.date));

    // Return the next 5 days starting from tomorrow
    return futureForecasts.slice(0, 5);
  }

  /**
   * Process hourly forecast data from OpenWeather API
   */
  private processHourlyForecastData(forecastList: any[]): HourlyForecast[] {
    return forecastList.slice(0, 40).map((item) => ({ // Next 5 days (40 x 3-hour intervals)
      time: new Date(item.dt * 1000).toISOString(),
      temperature: Math.round(item.main.temp),
      feelsLike: Math.round(item.main.feels_like),
      description: this.capitalizeWords(item.weather[0].description),
      icon: item.weather[0].icon,
      humidity: item.main.humidity,
      windSpeed: Math.round(item.wind.speed),
      windDirection: item.wind.deg || 0,
      precipitation: item.rain ? item.rain['3h'] || 0 : (item.snow ? item.snow['3h'] || 0 : 0),
      precipitationProbability: Math.round((item.pop || 0) * 100)
    }));
  }

  /**
   * Get weather icon URL
   */
  getIconUrl(iconCode: string): string {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
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
   * Check if it's a good day for cabin activities
   */
  isGoodWeatherForOutdoorActivities(weather: WeatherData): boolean {
    const temp = weather.current.temperature;
    const description = weather.current.description.toLowerCase();
    
    // Good weather: 50-85°F, no severe weather
    return temp >= 50 && 
           temp <= 85 && 
           !description.includes('storm') && 
           !description.includes('heavy rain') &&
           !description.includes('snow');
  }

  /**
   * Get cached data if still valid
   */
  private getCachedData(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  /**
   * Cache data with timestamp
   */
  private setCachedData(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
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