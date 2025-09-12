import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

import OutfitAdvisor, { SingleOutfitAdvice } from '../OutfitAdvisor';
import * as personalizationApi from '../../api/personalization';

// Mock the personalization API
vi.mock('../../api/personalization', () => ({
  submitOutfitFeedback: vi.fn(),
  getOutfitSuggestions: vi.fn(),
}));

beforeEach(() => {
  vi.spyOn(Date.prototype, 'toLocaleTimeString').mockReturnValue('12:00 PM');
  vi.mocked(personalizationApi.submitOutfitFeedback).mockClear();
  vi.mocked(personalizationApi.getOutfitSuggestions).mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const mockWeatherDataDefault: personalizationApi.FrontendWeatherData = {
  temperature: 20,
  feelsLike: 19,
  precipitationChance: 10,
  windSpeed: 5,
  uvIndex: 3,
  weatherDescription: 'Partly cloudy',
  weatherMain: 'Clouds',
  isDay: true,
  datetime: '2024-05-29T12:00:00Z',
  unit: 'C',
};

const mockWeatherData: personalizationApi.FrontendWeatherData = mockWeatherDataDefault;

const mockOutfitSuggestionFromApi: personalizationApi.OutfitSuggestionApiResponse = {
  suggested_items: ['t_shirt', 'shorts', 'sunglasses'],
  advice_strings: ['Stay hydrated!'],
};

describe('OutfitAdvisor', () => {
  test('renders title and close button', () => {
    render(<OutfitAdvisor onClose={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /outfit advisor/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /×/i })).toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    const mockOnClose = vi.fn();
    render(<OutfitAdvisor onClose={mockOnClose} />);
    fireEvent.click(screen.getByRole('button', { name: /×/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('displays "no weather data" message when no props are passed', () => {
    render(<OutfitAdvisor onClose={vi.fn()} />);
    expect(screen.getByText('No weather data available to provide advice.')).toBeInTheDocument();
  });

  test('renders SingleOutfitAdvice for current weather', async () => {
    vi.mocked(personalizationApi.getOutfitSuggestions).mockResolvedValue(mockOutfitSuggestionFromApi);
    render(<OutfitAdvisor onClose={vi.fn()} currentWeatherAdvice={mockWeatherDataDefault} userGender="Man" />);
    expect(personalizationApi.getOutfitSuggestions).toHaveBeenCalledWith(mockWeatherDataDefault, 'Man', '');
    expect(await screen.findByRole('heading', { name: 'Current Conditions' })).toBeInTheDocument();
    expect(await screen.findByText('T-Shirt')).toBeInTheDocument();
  });
});

describe('SingleOutfitAdvice', () => {
  test('renders title, outfit items, and advice after successful fetch', async () => {
    vi.mocked(personalizationApi.getOutfitSuggestions).mockResolvedValue(mockOutfitSuggestionFromApi);
    render(<SingleOutfitAdvice weatherData={mockWeatherDataDefault} title="Test Conditions" userGender="Man" />);
    expect(personalizationApi.getOutfitSuggestions).toHaveBeenCalledWith(mockWeatherDataDefault, 'Man', undefined);
    expect(screen.getByText('Loading suggestions...')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Test Conditions' })).toBeInTheDocument();
    expect(await screen.findByText('T-Shirt')).toBeInTheDocument();
    expect(await screen.findByText('Shorts')).toBeInTheDocument();
    expect(await screen.findByText('Sunglasses')).toBeInTheDocument();
    expect(await screen.findByText('Stay hydrated!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /👍 Like/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /👎 Dislike/i })).toBeInTheDocument();
  });

  test('handles successful "Like" feedback', async () => {
    vi.mocked(personalizationApi.getOutfitSuggestions).mockResolvedValue(mockOutfitSuggestionFromApi);
    vi.mocked(personalizationApi.submitOutfitFeedback).mockResolvedValue(undefined);
    render(<SingleOutfitAdvice weatherData={mockWeatherDataDefault} title="Test Like" userGender="Man" />);
    expect(personalizationApi.getOutfitSuggestions).toHaveBeenCalledWith(mockWeatherDataDefault, 'Man', undefined);
    await screen.findByText('T-Shirt');
    const likeButton = screen.getByRole('button', { name: /👍 Like/i });
    fireEvent.click(likeButton);
    await screen.findByText('Thank you for your feedback!');
    expect(personalizationApi.submitOutfitFeedback).toHaveBeenCalledWith({
      weather_data: mockWeatherData,
      suggested_outfit: {
        items: mockOutfitSuggestionFromApi.suggested_items,
        advice: mockOutfitSuggestionFromApi.advice_strings,
      },
      user_gender_at_feedback: 'Man',
      feedback_type: 'like',
    });
    expect(likeButton).toBeDisabled();
    expect(screen.getByRole('button', { name: /👎 Dislike/i })).toBeDisabled();
  });

  test('handles successful "Dislike" feedback', async () => {
    vi.mocked(personalizationApi.getOutfitSuggestions).mockResolvedValue(mockOutfitSuggestionFromApi);
    vi.mocked(personalizationApi.submitOutfitFeedback).mockResolvedValue(undefined);
    render(<SingleOutfitAdvice weatherData={mockWeatherDataDefault} title="Test Dislike" userGender="Woman" />);
    expect(personalizationApi.getOutfitSuggestions).toHaveBeenCalledWith(mockWeatherDataDefault, 'Woman', undefined);
    await screen.findByText('T-Shirt');
    const dislikeButton = screen.getByRole('button', { name: /👎 Dislike/i });
    fireEvent.click(dislikeButton);
    await screen.findByText('Thank you for your feedback!');
    expect(personalizationApi.submitOutfitFeedback).toHaveBeenCalledWith({
      weather_data: mockWeatherData,
      suggested_outfit: {
        items: mockOutfitSuggestionFromApi.suggested_items,
        advice: mockOutfitSuggestionFromApi.advice_strings,
      },
      user_gender_at_feedback: 'Woman',
      feedback_type: 'dislike',
    });
    expect(dislikeButton).toBeDisabled();
    expect(screen.getByRole('button', { name: /👍 Like/i })).toBeDisabled();
  });

  test('handles API error (non-409) on feedback', async () => {
    vi.mocked(personalizationApi.getOutfitSuggestions).mockResolvedValue(mockOutfitSuggestionFromApi);
    const errorMessage = 'Network Error';
    vi.mocked(personalizationApi.submitOutfitFeedback).mockRejectedValue({ message: errorMessage });
    render(<SingleOutfitAdvice weatherData={mockWeatherDataDefault} title="Test Error" userGender="Non-binary" />);
    expect(personalizationApi.getOutfitSuggestions).toHaveBeenCalledWith(mockWeatherDataDefault, 'Non-binary', undefined);
    await screen.findByText('T-Shirt');
    fireEvent.click(screen.getByRole('button', { name: /👍 Like/i }));
    await screen.findByText(`Failed to submit feedback: ${errorMessage}`);
    expect(screen.getByRole('button', { name: /👍 Like/i })).not.toBeDisabled();
  });

  test('handles API error (409 Conflict) on feedback', async () => {
    vi.mocked(personalizationApi.getOutfitSuggestions).mockResolvedValue(mockOutfitSuggestionFromApi);
    const conflictError = {
      isApiError: true,
      status: 409,
      data: { detail: 'You have already voted for this slot.' },
    };
    vi.mocked(personalizationApi.submitOutfitFeedback).mockRejectedValue(conflictError);
    render(<SingleOutfitAdvice weatherData={mockWeatherDataDefault} title="Test Conflict" />);
    expect(personalizationApi.getOutfitSuggestions).toHaveBeenCalledWith(mockWeatherDataDefault, undefined, undefined);
    await screen.findByText('T-Shirt');
    fireEvent.click(screen.getByRole('button', { name: /👎 Dislike/i }));
    await screen.findByText(conflictError.data.detail);
    expect(screen.getByRole('button', { name: /👎 Dislike/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /👍 Like/i })).toBeDisabled();
  });

  test('renders correctly when no items or advice are suggested after fetch', async () => {
    vi.mocked(personalizationApi.getOutfitSuggestions).mockResolvedValue({ suggested_items: [], advice_strings: [] });
    render(<SingleOutfitAdvice weatherData={mockWeatherDataDefault} title="Test Empty" />);
    expect(personalizationApi.getOutfitSuggestions).toHaveBeenCalledWith(mockWeatherDataDefault, undefined, undefined);
    expect(await screen.findByText('No specific outfit items to suggest for this period.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /consider/i })).not.toBeInTheDocument();
  });

  test('displays loading message while fetching suggestions', () => {
    vi.mocked(personalizationApi.getOutfitSuggestions).mockReturnValue(new Promise(() => {}));
    render(<SingleOutfitAdvice weatherData={mockWeatherDataDefault} title="Test Loading" />);
    expect(personalizationApi.getOutfitSuggestions).toHaveBeenCalledWith(mockWeatherDataDefault, undefined, undefined);
    expect(screen.getByText('Loading suggestions...')).toBeInTheDocument();
  });

  test('displays error message if fetching suggestions fails', async () => {
    const errorMessage = 'API Network Error';
    vi.mocked(personalizationApi.getOutfitSuggestions).mockRejectedValue({ message: errorMessage });
    render(<SingleOutfitAdvice weatherData={mockWeatherData} title="Test API Error" />);
    expect(personalizationApi.getOutfitSuggestions).toHaveBeenCalledWith(mockWeatherData, undefined, undefined);
    expect(await screen.findByText(`Error: ${errorMessage}`)).toBeInTheDocument();
  });
});
