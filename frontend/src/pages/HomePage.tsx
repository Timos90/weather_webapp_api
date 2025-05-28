import { useState, useEffect, lazy, Suspense, useRef } from 'react';
import {
  fetchCoordinates,
  fetchCurrentWeather,
  fetchForecast,
  fetchNews,
  fetchFavoriteLocations,
  addToFavorites,
  removeFromFavorites,
} from '../api/weather';
import { fetchUserProfile } from '../api/user';
import WeatherDisplay from '../components/WeatherDisplay';
import ForecastDisplay from '../components/ForecastDisplay';
import NewsDisplay from '../components/NewsDisplay';
import NavBar from '../components/NavBar';
import AlertsButton from '../components/AlertsButton';
import UserProfile from '../components/UserProfileDisplay';
import MapComponent from '../components/MapComponent';
import GeolocationPrompt from '../components/GeolocationPrompt';
import OutfitAdvisor from '../components/OutfitAdvisor';
import '../css/HomePage.css';
import { ForecastItem, NewsArticle, APICurrentWeather, ForecastSlot, GenderOption } from '../types/types';
import { WeatherData } from '../services/outfitSuggester';

const ProfileModal = lazy(() => import('../components/ProfileModal'));

const HomePage = () => {
  const [location, setLocation] = useState('');
  const prevLocation = useRef('');
  const [currentWeather, setCurrentWeather] = useState<APICurrentWeather | null>(null);
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [lat, setLat] = useState<number>();
  const [lon, setLon] = useState<number>();
  const [zoom, setZoom] = useState(6);
  const [layer, setLayer] = useState('temp_new');
  const [favorites, setFavorites] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const isAuthenticated = Boolean(sessionStorage.getItem('auth_token'));
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAdviceModal, setShowAdviceModal] = useState(false);
  const [userGender, setUserGender] = useState<GenderOption | undefined>();

  const unitToParam = (u: 'C' | 'F') => (u === 'F' ? 'imperial' : 'metric');

  const mapCurrentToWeatherData = (apiData: APICurrentWeather | null): WeatherData | undefined => {
    if (!apiData) return undefined;
    let uvFromTodayForecast: number | undefined = undefined;
    if (forecast && forecast.length > 0 && forecast[0].day_name === "Today") {
      uvFromTodayForecast = forecast[0].uv_index;
    }

    return {
      feelsLike: apiData.main.feels_like,
      temperature: apiData.main.temp,
      weatherMain: apiData.weather[0]?.main,
      weatherDescription: apiData.weather[0]?.description,
      uvIndex: uvFromTodayForecast,
      windSpeed: apiData.wind.speed,
      isDay: apiData.dt > apiData.sys.sunrise && apiData.dt < apiData.sys.sunset,
      datetime: new Date(apiData.dt * 1000).toISOString(),
    };
  };

  const mapForecastSlotToWeatherData = (slot: ForecastSlot, dailyData: ForecastItem): WeatherData | undefined => {
    if (!slot) return undefined;
    const slotDateTime = new Date(slot.datetime).getTime();
    const getTimestampFromTimeString = (timeStr: string | undefined, slotDate: Date): number | undefined => {
      if (!timeStr) return undefined;
      const [hours, minutes, seconds] = timeStr.split(':').map(Number);
      const dateWithTime = new Date(slotDate);
      dateWithTime.setHours(hours, minutes, seconds, 0);
      return dateWithTime.getTime();
    };

    const slotDateObject = new Date(slot.datetime);
    const sunriseTimestamp = getTimestampFromTimeString(dailyData.sunrise, slotDateObject);
    const sunsetTimestamp = getTimestampFromTimeString(dailyData.sunset, slotDateObject);

    let isDayInSlot = false;
    if (sunriseTimestamp && sunsetTimestamp) {
      isDayInSlot = slotDateTime > sunriseTimestamp && slotDateTime < sunsetTimestamp;
    }

    return {
      feelsLike: slot.feels_like,
      temperature: slot.temperature,
      weatherMain: slot.weather_main,
      weatherDescription: slot.weather_description,
      uvIndex: dailyData.uv_index,
      windSpeed: slot.wind_speed,
      isDay: isDayInSlot,
      precipitationChance: slot.pop,
      datetime: slot.datetime,
    };
  };

  const handleUserGeo = () => {
    const userPref: 'C' | 'F' = unit;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          sessionStorage.setItem('geo_permission', 'granted');
          handleSearch({ lat: latitude, lon: longitude }, userPref);
        },
        (err) => {
          console.error('Geolocation error:', err);
          sessionStorage.setItem('geo_permission', 'denied');
          setError('Unable to retrieve your location.');
          handleSearch('Berlin', userPref);
        },
        {
          enableHighAccuracy: false,
          timeout: 13000,
          maximumAge: 60000,
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
      handleSearch('Berlin', userPref);
    }
  };

  useEffect(() => {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const geoPref = sessionStorage.getItem('geo_permission');
    let userPref: 'C' | 'F' = 'C';

    const doProfile = async () => {
      if (isAuthenticated) {
        try {
          const profile = await fetchUserProfile();
          userPref = profile.preferred_temperature_unit === 'F' ? 'F' : 'C';
          setUnit(userPref);
          if (profile.gender) {
            setUserGender(profile.gender as GenderOption);
          }
        } catch (err) {
          console.error('Could not fetch user profile for unit and gender:', err);
        }
      }
    };

    doProfile().then(() => {
      if (geoPref === 'granted') {
        handleUserGeo();
      } else if (geoPref === 'denied') {
        handleSearch('Berlin', userPref);
      } else {
        if (!isSafari) {
          handleUserGeo();
        }
      }
    });
  }, [isAuthenticated]);

  const refetchFavorites = async () => {
    try {
      const updated = await fetchFavoriteLocations();
      setFavorites(updated);
    } catch (err) {
      console.error('Unable to fetch favorite locations:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refetchFavorites();
    }
  }, [isAuthenticated]);

  const handleSearch = async (
    loc: string | { lat: number; lon: number },
    overrideUnit?: 'C' | 'F'
  ) => {
    const chosenUnit = overrideUnit || unit;
    const paramUnits = unitToParam(chosenUnit);
    const previous = location;

    try {
      let currentPromise, forecastPromise, coordPromise;
      let cityName = '';

      if (typeof loc === 'string') {
        currentPromise = fetchCurrentWeather(loc, undefined, undefined, paramUnits);
        forecastPromise = fetchForecast(loc, undefined, undefined, paramUnits);
        coordPromise = fetchCoordinates(loc);
      } else {
        currentPromise = fetchCurrentWeather(undefined, loc.lat, loc.lon, paramUnits);
        forecastPromise = fetchForecast(undefined, loc.lat, loc.lon, paramUnits);
        coordPromise = Promise.resolve({ lat: loc.lat, lon: loc.lon });
      }

      const [current, forecastData, { lat, lon }] = await Promise.all([
        currentPromise,
        forecastPromise,
        coordPromise,
      ]);

      cityName = current.name || (typeof loc === 'string' ? loc : 'Unknown');

      setLocation(cityName);
      setCurrentWeather(current);
      setForecast(forecastData);
      setLat(lat);
      setLon(lon);
      setZoom(10);
      prevLocation.current = cityName;

      if (isAuthenticated) {
        try {
          const newsData = await fetchNews(cityName);
          setNews(newsData.slice(0, 5));
        } catch (error) {
          if (
            error instanceof Error &&
            error.message.includes('News API request limit reached')
          ) {
            setError(error.message);
          }
        }
      }

      setError(null);
    } catch (err) {
      console.error('Search error:', err);
      setLocation(previous);
      setTimeout(() => {
        window.alert(`Location "${typeof loc === 'string' ? loc : ''}" not found.`);
      }, 1.5);
    }
  };

  const handleUnitChange = (newUnit: 'C' | 'F') => {
    setUnit(newUnit);
    if (location && location !== 'Your Location') {
      handleSearch(location, newUnit);
    } else if (lat !== undefined && lon !== undefined) {
      handleSearch({ lat, lon }, newUnit);
    }
  };

  const handleAddFavoriteCurrent = async () => {
    if (currentWeather?.name && lat !== undefined && lon !== undefined) {
      try {
        await addToFavorites(location, currentWeather.sys.country, lat, lon);
        alert('Location added to favorites!');
        const updated = await fetchFavoriteLocations();
        setFavorites(updated);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to add location to favorites.');
      }
    }
  };

  const handleDeleteFavoriteCurrent = async () => {
    if (currentWeather?.name && lat !== undefined && lon !== undefined) {
      try {
        await removeFromFavorites(location, currentWeather.sys.country, lat, lon);
        alert('Location removed from favorites!');
        const updated = await fetchFavoriteLocations();
        setFavorites(updated);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to remove location from favorites.');
      }
    }
  };

  const handleLayerChange = (newLayer: string) => {
    setLayer(newLayer);
  };

  const handleProfileGenderChange = (newGender: GenderOption) => {
    setUserGender(newGender);
  };

  return (
    <div className={`home-page ${isAuthenticated ? 'logged-in-active' : ''}`}>
      <div className="top-bar">
        <NavBar
          onSearch={(loc) => handleSearch(loc)}
          currentLocation={
            currentWeather?.sys?.country
              ? `${location}, ${currentWeather.sys.country}`
              : location
          }
          onProfileClick={() => setShowProfileModal(true)}
          favorites={favorites}
          onAddFavorite={handleAddFavoriteCurrent}
          onDeleteFavorite={handleDeleteFavoriteCurrent}
          onUnitChange={handleUnitChange}
          unit={unit}
        />
        {!location &&
          !sessionStorage.getItem('geo_permission') &&
          /^((?!chrome|android).)*safari/i.test(navigator.userAgent) && (
            <GeolocationPrompt onRequest={handleUserGeo} />
          )}
        {isAuthenticated && (
          <AlertsButton
            location={
              currentWeather?.sys?.country
                ? `${location}, ${currentWeather.sys.country}`
                : location
            }
          />
        )}
      </div>
      {isAuthenticated && (currentWeather || forecast) ? (
        <div className="logged-in-layout">
          {/* Floating Outfit Advice Button - Placed here */}
          {!showAdviceModal && isAuthenticated && currentWeather && (
            <button 
              onClick={() => setShowAdviceModal(true)} 
              className="floating-advice-button"
            >
              ✨ Advice
            </button>
          )}
          <div className="card left-top mobile-first">
            {error && <div className="error-message">{error}</div>}
            {currentWeather && (
              <WeatherDisplay title="Current Weather" data={currentWeather} unit={unit} />
            )}
          </div>
          <div className="card right-top">
            {forecast.length > 0 && <ForecastDisplay data={forecast} unit={unit} />}
          </div>
          <div className="card left-bottom mobile-third">
            {lat !== undefined && lon !== undefined && (
              <MapComponent
                lat={lat}
                lon={lon}
                zoom={zoom}
                layer={layer}
                apiKey={import.meta.env.VITE_OPENWEATHERMAP_API_KEY || ''}
                onLayerChange={handleLayerChange}
              />
            )}
          </div>
          <div className="card right-bottom">
            {news.length > 0 ? (
              <NewsDisplay articles={news} />
            ) : (
              <p className="no-news-message">
                No news articles available for {location}.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="two-column-layout">
          <div className="left-column">
            {error && <div className="error-message">{error}</div>}
            {currentWeather && (
              <WeatherDisplay title="Current Weather" data={currentWeather} unit={unit} />
            )}
          </div>
          <div className="right-column">
            {forecast.length > 0 && <ForecastDisplay data={forecast} unit={unit} />}
          </div>
        </div>
      )}
      {showProfileModal && (
        <Suspense fallback={<div>Loading...</div>}>
          <ProfileModal onClose={() => setShowProfileModal(false)}>
            <UserProfile 
              onFavoriteClick={(favLoc: string) => {
                handleSearch(favLoc);
                setShowProfileModal(false);
              }}
              onFavoriteUpdated={refetchFavorites}
              onProfileDataChange={handleProfileGenderChange}
            />
          </ProfileModal>
        </Suspense>
      )}
      {/* Advice Modal */}
      {showAdviceModal && isAuthenticated && (
        <div className="advice-modal-overlay" onClick={() => setShowAdviceModal(false)}>
          <div className="advice-modal-content" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowAdviceModal(false)} className="advice-modal-close-button">
              &times;
            </button>
            <h2>Outfit & Activity Advice</h2>

            {/* Single OutfitAdvisor component call */}
            <OutfitAdvisor
              currentWeatherAdvice={currentWeather ? mapCurrentToWeatherData(currentWeather) : undefined}
              forecastAdvice={forecast
                .slice(0, 5) // Show up to 5 days of forecast
                .map(daily => ({
                  dayName: daily.day_name,
                  slots: daily.forecasts // Use 'forecasts'
                    // Removed the time filter to include all hours
                    .map(slot => mapForecastSlotToWeatherData(slot, daily))
                    .filter(Boolean) as WeatherData[]
                }))}
              onClose={() => setShowAdviceModal(false)}
              userGender={userGender}
            />
          </div>
        </div>
      )}
      <footer className="footer">
        <p> 2025 Weather WebApp made with ♡</p>
      </footer>
    </div>
  );
};

export default HomePage;
