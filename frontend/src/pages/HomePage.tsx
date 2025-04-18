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
import '../css/HomePage.css';
import { ForecastItem, NewsArticle } from '../types/types';

const ProfileModal = lazy(() => import('../components/ProfileModal'));

const HomePage = () => {
  const [location, setLocation] = useState('');
  const prevLocation = useRef('');
  const [currentWeather, setCurrentWeather] = useState<any>(null);
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

  const unitToParam = (u: 'C' | 'F') => (u === 'F' ? 'imperial' : 'metric');

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
        } catch (err) {
          console.error('Could not fetch user profile for unit:', err);
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
      {isAuthenticated ? (
        <div className="logged-in-layout">
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
            />
          </ProfileModal>
        </Suspense>
      )}
      <footer className="footer">
        <p>© 2025 Weather WebApp made with ♡</p>
      </footer>
    </div>
  );
};

export default HomePage;
