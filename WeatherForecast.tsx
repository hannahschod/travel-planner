import React, { useEffect, useState } from 'react';

interface WeatherForecastProps {
  destination: string;
  startDate: string;
  endDate: string;
}

interface WeatherDay {
  date: string;
  temp: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
}

function WeatherForecast({ destination, startDate, endDate }: WeatherForecastProps) {
  const [weather, setWeather] = useState<WeatherDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!destination || !startDate) return;

    const fetchWeather = async () => {
      setLoading(true);
      setError('');

      try {
        const apiKey = process.env.REACT_APP_OPENWEATHER_API_KEY;
        
        if (!apiKey) {
          setError('OpenWeather API key not configured');
          setLoading(false);
          return;
        }

        const geocodeUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(destination)}&limit=1&appid=${apiKey}`;
        const geoResponse = await fetch(geocodeUrl);
        const geoData = await geoResponse.json();

        if (!geoData || geoData.length === 0) {
          setError('Could not find location');
          setLoading(false);
          return;
        }

        const { lat, lon } = geoData[0];

        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`;
        const forecastResponse = await fetch(forecastUrl);
        const forecastData = await forecastResponse.json();

        if (forecastData.cod !== '200') {
          setError('Could not fetch weather data');
          setLoading(false);
          return;
        }

        const dailyForecasts: WeatherDay[] = [];
        const processedDates = new Set<string>();

        // Parse trip dates as LOCAL time (not UTC)
        const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
        const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
        const tripStart = new Date(startYear, startMonth - 1, startDay);
        const tripEnd = new Date(endYear, endMonth - 1, endDay);
        tripEnd.setHours(23, 59, 59, 999);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Calculate if trip is within forecast range
        const daysUntilTrip = Math.ceil((tripStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        console.log('Weather: Trip dates', tripStart, 'to', tripEnd);
        console.log('Weather: Days until trip:', daysUntilTrip);

        forecastData.list.forEach((item: any) => {
        const date = new Date(item.dt * 1000);
        const hour = date.getHours();

        // Create local date string (not UTC)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // Create a date-only version for comparison (no time component)
        const forecastDateOnly = new Date(year, date.getMonth(), date.getDate());

        if (!processedDates.has(dateStr) && hour >= 11 && hour <= 13) {
            console.log('Checking date:', dateStr, 'forecastDateOnly:', forecastDateOnly, 'tripStart:', tripStart, 'tripEnd:', tripEnd, 'in range?', forecastDateOnly >= tripStart && forecastDateOnly <= tripEnd);
            processedDates.add(dateStr);
            
            // If trip is within 5 days, only include trip dates
            // Otherwise, include all dates for next 5 days
            if (daysUntilTrip <= 5) {
            if (forecastDateOnly >= tripStart && forecastDateOnly <= tripEnd) {
                console.log('Adding weather for trip date:', dateStr);
                dailyForecasts.push({
                date: dateStr,
                temp: Math.round(item.main.temp),
                description: item.weather[0].description,
                icon: item.weather[0].icon,
                humidity: item.main.humidity,
                windSpeed: Math.round(item.wind.speed),
                });
            }
            } else {
            // Trip is far away, show next 5 days
            dailyForecasts.push({
                date: dateStr,
                temp: Math.round(item.main.temp),
                description: item.weather[0].description,
                icon: item.weather[0].icon,
                humidity: item.main.humidity,
                windSpeed: Math.round(item.wind.speed),
            });
            }
        }
        });

        setWeather(daysUntilTrip > 5 ? dailyForecasts.slice(0, 5) : dailyForecasts);
      } catch (err) {
        console.error('Weather fetch error:', err);
        setError('Failed to fetch weather');
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
  }, [destination, startDate, endDate]);

  const getWeatherEmoji = (description: string) => {
    const lower = description.toLowerCase();
    if (lower.includes('clear')) return '☀️';
    if (lower.includes('cloud')) return '☁️';
    if (lower.includes('rain')) return '🌧️';
    if (lower.includes('snow')) return '❄️';
    if (lower.includes('thunder')) return '⛈️';
    if (lower.includes('mist') || lower.includes('fog')) return '🌫️';
    return '🌤️';
  };

  const formatDate = (dateStr: string) => {
    // Parse as local date, not UTC
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
    });
 };

  if (loading) {
    return (
      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#e3f2fd', borderRadius: '12px' }}>
        <h3>🌤️ Weather Forecast</h3>
        <p>Loading weather data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#fff3cd', borderRadius: '12px' }}>
        <h3>🌤️ Weather Forecast</h3>
        <p style={{ color: '#856404' }}>{error}</p>
      </div>
    );
  }

  const tripStart = new Date(startDate);
  const today = new Date();
  const daysUntilTrip = Math.ceil((tripStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (weather.length === 0) {
    return null;
    }
    
    return (
  <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#e3f2fd', borderRadius: '12px' }}>
    <h3>🌤️ Weather Forecast for {destination}</h3>
    
    {/* Warning for distant trips - now inside the box */}
    {daysUntilTrip > 5 && (
      <div style={{ 
        padding: '12px', 
        backgroundColor: '#fff3cd', 
        borderRadius: '8px', 
        marginTop: '15px',
        marginBottom: '15px',
        border: '1px solid #ffc107'
      }}>
        <p style={{ color: '#856404', margin: 0, fontSize: '14px' }}>
          ℹ️ Your trip is {daysUntilTrip} days away. Showing the next 5 days of weather instead.
        </p>
      </div>
    )}

    {/* Weather forecast cards */}
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
      gap: '15px', 
      marginTop: '15px' 
    }}>
      {weather.map((day, index) => (
        <div
          key={index}
          style={{
            padding: '15px',
            backgroundColor: 'white',
            borderRadius: '8px',
            textAlign: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px' }}>
            {formatDate(day.date)}
          </div>
          <div style={{ fontSize: '40px', margin: '10px 0' }}>
            {getWeatherEmoji(day.description)}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2B579A' }}>
            {day.temp}°F
          </div>
          <div style={{ fontSize: '13px', color: '#666', marginTop: '8px', textTransform: 'capitalize' }}>
            {day.description}
          </div>
          <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
            💧 {day.humidity}% • 💨 {day.windSpeed} mph
          </div>
        </div>
      ))}
    </div>
  </div>
);
}

export default WeatherForecast;