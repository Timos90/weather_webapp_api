export interface WeatherDisplayProps {
  title: string;
  data: any;
  unit: 'C' | 'F';
}

export interface ForecastSlot {
  datetime: string;
  temperature: number;
  feels_like: number;
  temp_min: number;
  temp_max: number;
  weather_main?: string;
  weather_description: string;
  weather_icon: string;
  humidity: number;
  wind_speed: number;
  pop?: number;
}

export interface ForecastItem {
  day_name: string;
  date: string;
  uv_index: number;
  sunrise?: string;
  sunset?: string;
  forecasts: ForecastSlot[];
}

export interface APICurrentWeather {
  coord: {
    lon: number;
    lat: number;
  };
  weather: Array<{
    id: number;
    main: string;
    description: string;
    icon: string;
  }>;
  base: string;
  main: {
    temp: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    pressure: number;
    humidity: number;
    sea_level?: number;
    grnd_level?: number;
  };
  visibility: number;
  wind: {
    speed: number;
    deg: number;
    gust?: number;
  };
  rain?: {
    '1h'?: number;
    '3h'?: number;
  };
  snow?: {
    '1h'?: number;
    '3h'?: number;
  };
  clouds: {
    all: number;
  };
  dt: number;
  sys: {
    type?: number;
    id?: number;
    country: string;
    sunrise: number;
    sunset: number;
  };
  timezone: number;
  id: number;
  name: string;
  cod: number;
}

export interface MapComponentProps {
  lat: number;
  lon: number;
  zoom: number;
  layer: string;
  apiKey: string;
}

export interface NewsArticle {
  title: string;
  url: string;
  publishedAt: string;
  content: string;
  urlToImage: string | null;
}

export interface NewsDisplayProps {
  articles: NewsArticle[];
}

export type GenderOption = "Man" | "Woman" | "Non-binary";

export interface Favorite {
  city_name: string;
  country_code: string;
}

export interface UserProfile {
  id: number; 
  username: string;
  email: string;
  favorites?: Favorite[];
  gender?: GenderOption; 
}

export interface NavBarProps {
  onSearch: (location: string) => void;
  currentLocation?: string;
  onProfileClick: () => void;
  favorites: Favorite[];
  onAddFavorite: () => void;
  onDeleteFavorite: () => void;
  onUnitChange: (newUnit: 'C' | 'F') => void;
  unit: 'C' | 'F';
}

export interface ModalProps {
  onClose: () => void;
  children: React.ReactNode;
}

export interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterSuccess?: () => void;
}

export interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
}

export interface AlertsButtonProps {
  location: string;
}

export interface UserProfileProps {
  onFavoriteClick: (location: string) => void;
  onFavoriteUpdated?: () => void;
}
