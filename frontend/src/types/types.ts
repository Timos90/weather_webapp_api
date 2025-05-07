export interface WeatherDisplayProps {
  title: string;
  data: any;
  unit: 'C' | 'F';
}

export interface ForecastItem {
  day_name: string;
  date: string;
  uv_index: number;
  sunrise?: string;
  sunset?: string;
  forecasts: {
    datetime: string;
    temperature: number;
    feels_like: number;
    temp_min: number;
    temp_max: number;
    weather_description: string;
    weather_icon: string;
    humidity: number;
    wind_speed: number;
  }[];
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

export interface Favorite {
  city_name: string;
  country_code: string;
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
