# Weather Feature Setup Guide

This guide will help you set up the weather feature for your cabin management system, showing current weather and forecasts for Pickerel, Wisconsin.

## Prerequisites

- OpenWeather API key (free tier is sufficient)
- Node.js and npm installed
- Cabin management system running

## Step 1: Get Your OpenWeather API Key

1. Go to [OpenWeather](https://openweathermap.org/)
2. Click "Sign Up" or "Sign In" if you already have an account
3. Navigate to "API keys" in your account dashboard
4. Copy your API key (or create a new one)

**Note:** The free tier includes:
- Current weather data
- 5-day forecast
- 1,000 API calls per day
- Updates every 10 minutes

## Step 2: Configure Your Environment

1. Open your `.env` file in the project root
2. Add your OpenWeather API key:

```bash
# Weather Configuration
VITE_OPENWEATHER_API_KEY=your_actual_api_key_here
```

3. Save the file

**Example:**
```bash
VITE_OPENWEATHER_API_KEY=your_actual_api_key_here
```

## Step 3: Restart Your Development Server

If your development server is running, restart it to load the new environment variable:

```bash
# Stop the server (Ctrl+C)
# Then restart it
npm run dev
```

## Step 4: Verify the Weather Widget

1. Open your cabin management system in a browser
2. Log in to your account
3. You should see the weather widget in the left sidebar showing:
   - Current temperature for Pickerel, WI
   - Weather conditions
   - Humidity and wind information
   - Activity recommendations

## Features

### Current Weather Display
- Real-time temperature in Fahrenheit
- "Feels like" temperature
- Weather description with icon
- Humidity percentage
- Wind speed and direction
- Visibility in miles

### Smart Recommendations
The weather widget provides activity recommendations based on conditions:
- **Perfect weather** (50-85°F, no severe weather): "Perfect weather for cabin activities! 🌞"
- **Cold weather** (below 50°F): "Great weather for cozy indoor activities ☕"
- **Other conditions**: "Check conditions before outdoor activities ⛅"

### 5-Day Forecast
- Daily high and low temperatures
- Weather conditions for each day
- Visual weather icons
- Precipitation information

### Automatic Updates
- Weather data refreshes every 10 minutes
- Cached to minimize API calls
- Graceful error handling if API is unavailable

## Customization

### Change Location

To change the location from Pickerel, Wisconsin to another location:

1. Open `src/utils/weatherService.ts`
2. Find the `PICKEREL_COORDS` constant:
```typescript
const PICKEREL_COORDS = {
  lat: 45.359444,
  lon: -88.910833
};
```
3. Replace with your desired coordinates
4. Save and restart the development server

### Adjust Display Options

You can customize how the weather widget appears:

**Compact Mode** (current default in sidebar):
```typescript
<Weather compact={true} showForecast={false} />
```

**Full Mode** (with forecast):
```typescript
<Weather compact={false} showForecast={true} />
```

### Change Update Frequency

To change how often weather data refreshes:

1. Open `src/components/Weather.tsx`
2. Find the `useEffect` hook with the interval
3. Change `10 * 60 * 1000` (10 minutes) to your desired interval in milliseconds

## Troubleshooting

### Weather Widget Shows "Weather unavailable"

**Possible causes:**
1. API key not configured correctly
2. API key not activated yet (can take a few minutes)
3. Network connectivity issues
4. API rate limit exceeded

**Solutions:**
1. Check your `.env` file has the correct API key
2. Wait a few minutes after creating a new API key
3. Check your internet connection
4. Verify you haven't exceeded 1,000 calls per day

### Weather Data Not Updating

1. Check browser console for errors
2. Verify the API key is valid
3. Clear browser cache and reload
4. Check OpenWeather API status at [status.openweathermap.org](https://status.openweathermap.org/)

### API Key Security

**Important:** Never commit your `.env` file to version control!

The `.env` file is already in `.gitignore`, but double-check:
```bash
# Verify .env is ignored
git status
# Should NOT show .env as a changed file
```

## API Usage and Limits

### Free Tier Limits
- 1,000 API calls per day
- 60 calls per minute
- Current weather + 5-day forecast

### Estimated Usage
With the default 10-minute refresh interval:
- ~144 calls per day per user
- Supports ~6-7 concurrent users within free tier

### Upgrading
If you need more API calls, OpenWeather offers paid plans starting at $40/month for 100,000 calls/day.

## Additional Resources

- [OpenWeather API Documentation](https://openweathermap.org/api)
- [OpenWeather FAQ](https://openweathermap.org/faq)
- [API Status Page](https://status.openweathermap.org/)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review browser console for error messages
3. Verify your API key at openweathermap.org
4. Check that environment variables are loaded correctly

---

**Note:** Weather data is provided by OpenWeather and is subject to their terms of service and data accuracy.