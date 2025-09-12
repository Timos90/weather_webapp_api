import { useState, useEffect, lazy, Suspense, useRef } from 'react';
import {
  fetchCurrentWeather,
  fetchForecast,
  fetchNews,
  fetchFavoriteLocations,
  addToFavorites,
  removeFromFavorites,
  fetchAlerts, // Added fetchAlerts
} from '../api/weather';
import { fetchUserProfile, logoutUser, getAccessToken } from '../api/user';
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
import { ForecastItem, NewsArticle, APICurrentWeather, ForecastSlot, GenderOption, UserProfileData } from '../types/types';
import { FrontendWeatherData, WeatherAlert } from '../api/personalization'; // Added WeatherAlert

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
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getAccessToken()));
  const [unit, setUnit] = useState<'C' | 'F'>('C');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAdviceModal, setShowAdviceModal] = useState(false);
  const [userGender, setUserGender] = useState<GenderOption | undefined>();
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false); // Added loading state
  // currentWeatherAdvice state was already declared, ensuring it's correctly defined here
  const [currentWeatherAdvice, setCurrentWeatherAdvice] = useState<FrontendWeatherData | undefined>();

  const handleUnitChange = (newUnit: 'C' | 'F') => { // Renamed from handleTemperatureUnitChange
    const oldUnit = unit;
    setUnit(newUnit);

    // If unit actually changed and we have a location, re-fetch weather data
    if (newUnit !== oldUnit) {
      if (lat !== undefined && lon !== undefined) {
        handleSearch({ lat, lon }, newUnit, 'unit-change');
      } else if (location && location.trim() !== '') {
        // Ensure 'location' reflects the currently displayed weather's location string
        handleSearch(location, newUnit, 'unit-change');
      }
    }
  };

  const unitToParam = (u: 'C' | 'F') => (u === 'F' ? 'imperial' : 'metric');

  const mapCurrentToWeatherData = (
    apiData: APICurrentWeather | null,
    alertsData?: WeatherAlert[] | null
  ): FrontendWeatherData | undefined => {
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
      alerts: alertsData,
    };
  };

  const mapForecastSlotToWeatherData = (slot: ForecastSlot, dailyData: ForecastItem): FrontendWeatherData | undefined => {
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

  // This useEffect updates currentWeatherAdvice whenever relevant data changes.
  useEffect(() => {
    const adviceData = mapCurrentToWeatherData(currentWeather, weatherAlerts);
    if (adviceData) {
      // Ensure unit is included in the advice data for OutfitAdvisor
      setCurrentWeatherAdvice({ ...adviceData, unit: unit });
    } else {
      setCurrentWeatherAdvice(undefined);
    }
  }, [currentWeather, weatherAlerts, unit, forecast]); // Corrected dependencies

  const handleUserGeo = (preferredUnit?: 'C' | 'F') => {
    const userPref: 'C' | 'F' = preferredUnit || unit;

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          sessionStorage.setItem('geo_permission', 'granted');
          handleSearch({ lat: latitude, lon: longitude }, userPref, 'geolocation');
        },
        (err) => {
          console.error('Geolocation error:', err);
          sessionStorage.setItem('geo_permission', 'denied');
          setError('Unable to retrieve your location.');
          handleSearch('Berlin', userPref, 'geolocation');
        },
        {
          enableHighAccuracy: false,
          timeout: 13000,
          maximumAge: 60000,
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
      handleSearch('Berlin', userPref, 'geolocation');
    }
  };

  useEffect(() => {
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const geoPref = sessionStorage.getItem('geo_permission');
    let userPref: 'C' | 'F' = 'C';

    const doProfile = async () => {
      if (!isAuthenticated) return;
      try {
        const profile = await fetchUserProfile();
        setUserProfile(profile);
        if (profile && profile.gender) {
          setUserGender(profile.gender as GenderOption);
        }
      } catch (error) {
        console.error('Failed to fetch user profile for gender:', error);
      }
    };

    doProfile().then(() => {
      // After doProfile, userPref variable in this scope holds the correct preference.
      // The 'unit' state has also been set via setUnit(userPref) but might not be updated yet for immediate reads.
      if (geoPref === 'granted') {
        // Pass the definitive userPref to handleUserGeo, which will then pass it to handleSearch
        handleUserGeo(userPref);
      } else if (geoPref === 'denied') {
        handleSearch('Berlin', userPref, 'geolocation');
      } else {
        if (!isSafari) {
          // Pass the definitive userPref to handleUserGeo
          handleUserGeo(userPref);
        }
      }
    });
  }, [isAuthenticated]);

  const refetchFavorites = async () => {
    try {
      const updated = await fetchFavoriteLocations();
      setFavorites(updated);
    } catch (err: any) {
      console.error('Unable to fetch favorite locations:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      refetchFavorites();
    }
  }, [isAuthenticated]);

  const handleSearch = async (
    searchParam: string | { lat: number; lon: number },
    overrideUnit?: 'C' | 'F',
    searchInitiator: 'user-search' | 'geolocation' | 'map-click' | 'unit-change' = 'user-search'
  ) => {
    setError(null); // Clear previous errors first
    setWeatherAlerts(null); // Clear previous alerts
    setLoading(true); // Indicate loading state
    const chosenUnit = overrideUnit || unit;
    const paramUnits = unitToParam(chosenUnit);

    try {
      let currentPromise, forecastPromise;
      let cityName: string; // Used for news, alerts, and internal logic

      if (typeof searchParam === 'string') {
        currentPromise = fetchCurrentWeather(searchParam, undefined, undefined, paramUnits);
        forecastPromise = fetchForecast(searchParam, undefined, undefined, paramUnits);
      } else { // searchParam is {lat, lon}
        currentPromise = fetchCurrentWeather(undefined, searchParam.lat, searchParam.lon, paramUnits);
        forecastPromise = fetchForecast(undefined, searchParam.lat, searchParam.lon, paramUnits);
      }

      const [current, forecastData] = await Promise.all([
        currentPromise,
        forecastPromise,
      ]);

      if (!current || !forecastData) {
        throw new Error('Failed to fetch essential weather data.');
      }

      const resolvedLocationWithCountry = `${current.name}, ${current.sys.country}`;
      
      // Determine cityName for news/alerts and update displayed location string
      if (searchInitiator === 'user-search' && typeof searchParam === 'string') {
        setLocation(searchParam); // User typed a name, display that name
        cityName = searchParam;
      } else if (searchInitiator === 'geolocation' || searchInitiator === 'map-click') {
        const apiName = current.name || 'Unknown Location';
        setLocation(apiName); // Geolocation or map click, use API's name for display
        cityName = apiName;
      } else { // 'unit-change' or other internal calls like favorite click
        // Preserve existing `location` state (which holds the name for the current view).
        // Use this `location` state for fetching news/alerts if it's a unit change for the current view.
        cityName = location; 
      }

      setCurrentWeather(current);
      setForecast(forecastData);
      setLat(current.coord.lat);
      setLon(current.coord.lon);
      setZoom(10); // Reset zoom on new successful search
      prevLocation.current = cityName; // Update prevLocation for consistent news/alerts if user navigates away and back

      // Fetch alerts (conditionally)
      if (isAuthenticated) {
        if (resolvedLocationWithCountry && resolvedLocationWithCountry.trim() !== '') {
          try {
            const alertsData = await fetchAlerts(resolvedLocationWithCountry, current.coord.lat, current.coord.lon);
            setWeatherAlerts(alertsData);
          } catch (alertsError: any) {
            console.warn(`Failed to fetch alerts for ${resolvedLocationWithCountry}:`, alertsError.message);
            setWeatherAlerts(null); // Ensure alerts are cleared on error
          }
        } else {
          setWeatherAlerts(null); // No resolved location, clear alerts
        }
      } else {
        setWeatherAlerts(null); // Not authenticated, clear alerts
      }

      // Fetch news (conditionally)
      if (isAuthenticated) {
        if (resolvedLocationWithCountry && resolvedLocationWithCountry.trim() !== '') {
          try {
            const newsData = await fetchNews(resolvedLocationWithCountry);
            setNews(newsData.slice(0, 5));
          } catch (newsError: any) {
            if (newsError instanceof Error && newsError.message.includes('News API request limit reached')) {
              setError(newsError.message); // Show specific error to user
            } else {
              console.error(`Error fetching news for ${resolvedLocationWithCountry}:`, newsError);
            }
            setNews([]); // Clear news on any news fetch error or if limit reached
          }
        } else {
          setNews([]); // No resolved location, clear news
        }
      } else {
        setNews([]); // Not authenticated, clear news
      }
      
      // If all successful, ensure error state is null (unless news API limit was hit)
      if (!(error && error.includes('News API request limit reached'))) { // Corrected error.message to error
        setError(null); 
      }
      setLoading(false);

    } catch (err: any) {
      console.error('Error in handleSearch:', err); // Log the error for debugging
      setLoading(false);

      let failedLocationString = "";
      if (typeof searchParam === 'string') {
        failedLocationString = searchParam; // What the user typed
      } else if (location && searchInitiator !== 'user-search') {
        // If search was by lat/lon, or unit change for a resolved location, use current `location` state for message
        failedLocationString = location;
      }

      if (err.isApiError && err.status === 404) {
        const message = failedLocationString 
          ? `Location "${failedLocationString}" not found. Please check the spelling or try another search.`
          : "Location not found. Please check the spelling or try another search.";
        alert(message); // Display as a browser alert
        setError(null); // Clear any previous generic error messages from the UI
      } else {
        setError(err.message || 'Failed to fetch weather data. Please try again.');
        // Clear all weather-related data ONLY for non-404 errors
        setCurrentWeather(null);
        setForecast([]);
        setNews([]);
        setWeatherAlerts(null);
        setLat(undefined);
        setLon(undefined);
      }
      // `location` state (search input) is intentionally preserved for user context
      // `prevLocation.current` also remains, holding the last term that initiated a search or was resolved.
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

  const handleProfileUpdate = async () => {
    try {
      const profile = await fetchUserProfile();
      setUserProfile(profile);
      if (profile && profile.gender) {
        setUserGender(profile.gender as GenderOption);
      }
    } catch (error) {
      console.error('Failed to refetch user profile after update:', error);
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    refetchFavorites(); // Refetch favorites after login
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setIsAuthenticated(false);
      alert('You have been logged out.');
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Failed to log out. Please try again.');
    }
  };

  return (
    <div className={`home-page ${isAuthenticated ? 'logged-in-active' : ''}`}>
      <div className="top-bar">
        <NavBar
          isAuthenticated={isAuthenticated}
          onLoginSuccess={handleLoginSuccess}
          onLogout={handleLogout}
          onSearch={handleSearch}
          currentLocation={location}
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
      {loading && <div className="loading-indicator">Loading weather data...</div>}
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
              <WeatherDisplay title="Current Weather" data={currentWeather} unit={unit} displayedLocationName={location} />
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
            <NewsDisplay articles={news} locationName={location} loading={loading} />
          </div>
        </div>
      ) : (
        <div className="two-column-layout">
          <div className="left-column">
            {error && <div className="error-message">{error}</div>}
            {currentWeather && (
              <WeatherDisplay title="Current Weather" data={currentWeather} unit={unit} displayedLocationName={location} />
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
              onProfileDataChange={handleProfileUpdate}
              onTemperatureUnitChange={handleUnitChange}
              profile={userProfile}
              favorites={favorites}
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
              currentWeatherAdvice={currentWeatherAdvice}
              forecastAdvice={forecast
                .slice(0, 5) // Show up to 5 days of forecast
                .map(daily => ({
                  dayName: daily.day_name,
                  slots: daily.forecasts // Use 'forecasts'
                    // Removed the time filter to include all hours
                    .map(slot => mapForecastSlotToWeatherData(slot, daily))
                    .filter(Boolean) as FrontendWeatherData[]
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
