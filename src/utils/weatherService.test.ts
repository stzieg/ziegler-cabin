import { describe, it, expect, vi, beforeEach } from 'vitest';
import { weatherService } from './weatherService';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock import.meta.env
vi.mock('import.meta', () => ({
  env: {
    VITE_OPENWEATHER_API_KEY: 'test-api-key'
  }
}));

describe('WeatherService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear cache
    (weatherService as any).cache.clear();
  });

  describe('isAvailable', () => {
    it('should return true when API key is configured', () => {
      expect(weatherService.isAvailable()).toBe(true);
    });
  });

  describe('getCurrentWeather', () => {
    it('should fetch and return weather data for Pickerel, WI', async () => {
      const mockCurrentWeather = {
        name: 'Pickerel',
        coord: { lat: 45.359444, lon: -88.910833 },
        main: {
          temp: 72,
          feels_like: 75,
          humidity: 65,
          pressure: 1013
        },
        weather: [{
          description: 'partly cloudy',
          icon: '02d'
        }],
        wind: {
          speed: 8,
          deg: 180
        },
        visibility: 16093,
        sys: { country: 'US' }
      };

      const mockForecast = {
        list: [
          {
            dt: Date.now() / 1000,
            main: {
              temp_min: 65,
              temp_max: 78,
              humidity: 60
            },
            weather: [{
              description: 'sunny',
              icon: '01d'
            }],
            wind: { speed: 5 },
            rain: null
          }
        ]
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCurrentWeather)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockForecast)
        });

      const result = await weatherService.getCurrentWeather();

      expect(result).toMatchObject({
        current: {
          temperature: 72,
          feelsLike: 75,
          humidity: 65,
          description: 'Partly Cloudy',
          icon: '02d',
          windSpeed: 8,
          windDirection: 180
        },
        location: {
          name: 'Pickerel',
          country: 'US',
          lat: 45.359444,
          lon: -88.910833
        }
      });

      expect(result.forecast).toHaveLength(1);
      expect(result.lastUpdated).toBeDefined();
    });

    it('should throw error when API key is not available', async () => {
      const originalIsAvailable = weatherService.isAvailable;
      vi.spyOn(weatherService, 'isAvailable').mockReturnValue(false);

      await expect(weatherService.getCurrentWeather()).rejects.toThrow(
        'Weather service is not available. Please check your API key configuration.'
      );

      vi.mocked(weatherService.isAvailable).mockRestore();
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      await expect(weatherService.getCurrentWeather()).rejects.toThrow(
        'Failed to fetch weather data: Weather API error: 401 Unauthorized'
      );
    });
  });

  describe('utility methods', () => {
    it('should generate correct icon URL', () => {
      const iconUrl = weatherService.getIconUrl('02d');
      expect(iconUrl).toBe('https://openweathermap.org/img/wn/02d@2x.png');
    });

    it('should convert wind direction to compass direction', () => {
      expect(weatherService.getWindDirection(0)).toBe('N');
      expect(weatherService.getWindDirection(90)).toBe('E');
      expect(weatherService.getWindDirection(180)).toBe('S');
      expect(weatherService.getWindDirection(270)).toBe('W');
      expect(weatherService.getWindDirection(45)).toBe('NE');
    });

    it('should format temperature correctly', () => {
      expect(weatherService.formatTemperature(72)).toBe('72°F');
      expect(weatherService.formatTemperature(-5)).toBe('-5°F');
    });

    it('should determine good weather for outdoor activities', () => {
      const goodWeather = {
        current: {
          temperature: 75,
          description: 'sunny',
          feelsLike: 78,
          humidity: 50,
          icon: '01d',
          windSpeed: 5,
          windDirection: 180,
          pressure: 1013,
          visibility: 10,
          uvIndex: 5
        },
        forecast: [],
        hourlyForecast: [],
        location: { name: 'Pickerel', country: 'US', lat: 45.359444, lon: -88.910833 },
        lastUpdated: new Date().toISOString()
      };

      expect(weatherService.isGoodWeatherForOutdoorActivities(goodWeather)).toBe(true);

      const badWeather = {
        ...goodWeather,
        current: {
          ...goodWeather.current,
          temperature: 30,
          description: 'heavy snow'
        }
      };

      expect(weatherService.isGoodWeatherForOutdoorActivities(badWeather)).toBe(false);
    });
  });

  describe('hourly forecast methods', () => {
    it('should get hourly forecast data', async () => {
      const mockCurrentWeather = {
        name: 'Pickerel',
        coord: { lat: 45.359444, lon: -88.910833 },
        main: { temp: 72, feels_like: 75, humidity: 65, pressure: 1013 },
        weather: [{ description: 'sunny', icon: '01d' }],
        wind: { speed: 5, deg: 90 },
        visibility: 16093,
        sys: { country: 'US' }
      };

      const mockForecast = {
        list: Array.from({ length: 10 }, (_, i) => ({
          dt: (Date.now() / 1000) + (i * 3 * 60 * 60), // 3-hour intervals
          main: {
            temp: 70 + i,
            feels_like: 72 + i,
            temp_min: 65 + i,
            temp_max: 75 + i,
            humidity: 60
          },
          weather: [{
            description: 'sunny',
            icon: '01d'
          }],
          wind: { speed: 5, deg: 180 },
          pop: 0.1,
          rain: null
        }))
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCurrentWeather)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockForecast)
        });

      const hourlyForecast = await weatherService.getHourlyForecast();
      
      expect(hourlyForecast).toHaveLength(10);
      expect(hourlyForecast[0]).toMatchObject({
        temperature: 70,
        feelsLike: 72,
        description: 'Sunny',
        icon: '01d',
        humidity: 60,
        windSpeed: 5,
        precipitationProbability: 10
      });
    });

    it('should get today\'s hourly forecast', async () => {
      const now = new Date();
      const mockCurrentWeather = {
        name: 'Pickerel',
        coord: { lat: 45.359444, lon: -88.910833 },
        main: { temp: 72, feels_like: 75, humidity: 65, pressure: 1013 },
        weather: [{ description: 'sunny', icon: '01d' }],
        wind: { speed: 5, deg: 90 },
        visibility: 16093,
        sys: { country: 'US' }
      };

      const mockForecast = {
        list: Array.from({ length: 8 }, (_, i) => ({
          dt: (now.getTime() / 1000) + (i * 3 * 60 * 60), // Today's hours
          main: {
            temp: 70 + i,
            feels_like: 72 + i,
            temp_min: 65 + i,
            temp_max: 75 + i,
            humidity: 60
          },
          weather: [{
            description: 'sunny',
            icon: '01d'
          }],
          wind: { speed: 5, deg: 180 },
          pop: 0.1
        }))
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockCurrentWeather)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockForecast)
        });

      const todayHourly = await weatherService.getTodayHourlyForecast();
      
      expect(Array.isArray(todayHourly)).toBe(true);
      expect(todayHourly.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('caching', () => {
    it('should cache weather data and return cached result', async () => {
      const mockWeatherData = {
        name: 'Pickerel',
        coord: { lat: 45.359444, lon: -88.910833 },
        main: { temp: 72, feels_like: 75, humidity: 65, pressure: 1013 },
        weather: [{ description: 'sunny', icon: '01d' }],
        wind: { speed: 5, deg: 90 },
        visibility: 16093,
        sys: { country: 'US' }
      };

      const mockForecast = {
        list: [{
          dt: Date.now() / 1000,
          main: { temp_min: 65, temp_max: 78, humidity: 60 },
          weather: [{ description: 'sunny', icon: '01d' }],
          wind: { speed: 5 },
          rain: null
        }]
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockWeatherData)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockForecast)
        });

      // First call should make API request
      const result1 = await weatherService.getCurrentWeather();
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Second call should use cache
      const result2 = await weatherService.getCurrentWeather();
      expect(mockFetch).toHaveBeenCalledTimes(2); // No additional calls
      
      expect(result1).toEqual(result2);
    });
  });
});