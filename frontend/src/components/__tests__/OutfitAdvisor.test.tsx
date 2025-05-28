import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

import OutfitAdvisor, { SingleOutfitAdvice } from '../OutfitAdvisor';
import * as outfitSuggester from '../../services/outfitSuggester';
import * as personalizationApi from '../../api/personalization';

// Mock the outfitSuggester service
vi.mock('../../services/outfitSuggester', () => ({
  suggestOutfit: vi.fn(),
  // OUTFIT_ITEM_NAMES is used directly, so we don't mock it here unless it causes issues.
  // If it's complex or has side effects, we might need to.
}));

// Mock the personalization API
vi.mock('../../api/personalization', () => ({
  submitOutfitFeedback: vi.fn(),
}));

// Mock toLocaleTimeString for consistent time formatting in titles
// and any other Date related formatting if necessary
beforeEach(() => {
  vi.spyOn(Date.prototype, 'toLocaleTimeString').mockReturnValue('12:00 PM');
  // Reset mocks before each test
  vi.mocked(outfitSuggester.suggestOutfit).mockClear();
  vi.mocked(personalizationApi.submitOutfitFeedback).mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const mockWeatherData: outfitSuggester.WeatherData = {
  temperature: 20,
  feelsLike: 19,
  precipitationChance: 10,
  windSpeed: 5,
  uvIndex: 3,
  weatherDescription: 'Partly cloudy',
  weatherMain: 'Clouds',
  isDay: true,
  datetime: '2024-05-29T12:00:00Z',
};

const mockOutfitSuggestion = {
  items: ['t_shirt', 'shorts', 'sunglasses'],
  advice: ['Stay hydrated!'],
};

describe('OutfitAdvisor', () => {
  // Tests for the main OutfitAdvisor component will go here
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

  // More tests for OutfitAdvisor rendering SingleOutfitAdvice components based on props
  test('renders SingleOutfitAdvice for current weather', () => {
    vi.mocked(outfitSuggester.suggestOutfit).mockReturnValue(mockOutfitSuggestion);
    render(<OutfitAdvisor onClose={vi.fn()} currentWeatherAdvice={mockWeatherData} userGender="Man" />);
    // Check that SingleOutfitAdvice content is rendered (e.g., title and an item)
    expect(screen.getByRole('heading', { name: 'Current Conditions' })).toBeInTheDocument();
    expect(screen.getByText('T-Shirt')).toBeInTheDocument(); // From mockOutfitSuggestion
  });
});

describe('SingleOutfitAdvice', () => {
  // Tests for the SingleOutfitAdvice sub-component will go here
  beforeEach(() => {
    // Setup default mock implementation for suggestOutfit for most tests
    vi.mocked(outfitSuggester.suggestOutfit).mockReturnValue(mockOutfitSuggestion);
  });

  test('renders title, outfit items, and advice', () => {
    render(<SingleOutfitAdvice weatherData={mockWeatherData} title="Test Conditions" userGender="Man" />);
    
    expect(screen.getByRole('heading', { name: 'Test Conditions' })).toBeInTheDocument();
    
    // Check for rendered items (using the OUTFIT_ITEM_NAMES mapping)
    expect(screen.getByText('T-Shirt')).toBeInTheDocument();
    expect(screen.getByText('Shorts')).toBeInTheDocument();
    expect(screen.getByText('Sunglasses')).toBeInTheDocument();
    
    // Check for advice
    expect(screen.getByText('Stay hydrated!')).toBeInTheDocument();
    
    // Check for feedback buttons
    expect(screen.getByRole('button', { name: /👍 Like/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /👎 Dislike/i })).toBeInTheDocument();
  });

  // More tests for SingleOutfitAdvice interactions (feedback buttons)
  test('handles successful "Like" feedback', async () => {
    vi.mocked(personalizationApi.submitOutfitFeedback).mockResolvedValue(undefined); // Simulate successful API call
    render(<SingleOutfitAdvice weatherData={mockWeatherData} title="Test Like" userGender="Man" />);

    const likeButton = screen.getByRole('button', { name: /👍 Like/i });
    fireEvent.click(likeButton);

    // Wait for state updates and API call resolution
    await screen.findByText('Feedback (like) submitted successfully for "Test Like"!');

    expect(personalizationApi.submitOutfitFeedback).toHaveBeenCalledWith({
      weather_data: mockWeatherData,
      suggested_outfit: mockOutfitSuggestion,
      user_gender_at_feedback: 'Man',
      feedback_type: 'like',
    });
    expect(likeButton).toBeDisabled();
    expect(screen.getByRole('button', { name: /👎 Dislike/i })).toBeDisabled();
    expect(screen.queryByRole('alert', { name: /error/i })).not.toBeInTheDocument(); // Assuming errors might have an alert role or specific class
  });

  test('handles successful "Dislike" feedback', async () => {
    vi.mocked(personalizationApi.submitOutfitFeedback).mockResolvedValue(undefined);
    render(<SingleOutfitAdvice weatherData={mockWeatherData} title="Test Dislike" userGender="Woman" />);

    const dislikeButton = screen.getByRole('button', { name: /👎 Dislike/i });
    fireEvent.click(dislikeButton);

    await screen.findByText('Feedback (dislike) submitted successfully for "Test Dislike"!');

    expect(personalizationApi.submitOutfitFeedback).toHaveBeenCalledWith({
      weather_data: mockWeatherData,
      suggested_outfit: mockOutfitSuggestion,
      user_gender_at_feedback: 'Woman',
      feedback_type: 'dislike',
    });
    expect(dislikeButton).toBeDisabled();
    expect(screen.getByRole('button', { name: /👍 Like/i })).toBeDisabled();
  });

  test('handles API error (non-409) on feedback', async () => {
    const errorMessage = 'Network Error';
    vi.mocked(personalizationApi.submitOutfitFeedback).mockRejectedValue({ message: errorMessage }); // Simulate generic error
    render(<SingleOutfitAdvice weatherData={mockWeatherData} title="Test Error" userGender="Non-binary" />);

    fireEvent.click(screen.getByRole('button', { name: /👍 Like/i }));

    await screen.findByText(`Failed to submit feedback: ${errorMessage}`);
    expect(screen.queryByText(/submitted successfully/i)).not.toBeInTheDocument();
    // Buttons should remain enabled after a generic API error
    expect(screen.getByRole('button', { name: /👍 Like/i })).not.toBeDisabled(); 
  });

  test('handles API error (409 Conflict) on feedback', async () => {
    const conflictError = { 
      isApiError: true, 
      status: 409, 
      data: { detail: 'You have already voted for this slot.' }
    };
    vi.mocked(personalizationApi.submitOutfitFeedback).mockRejectedValue(conflictError);
    render(<SingleOutfitAdvice weatherData={mockWeatherData} title="Test Conflict" />);

    fireEvent.click(screen.getByRole('button', { name: /👎 Dislike/i }));

    await screen.findByText(conflictError.data.detail);
    expect(screen.getByRole('button', { name: /👎 Dislike/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /👍 Like/i })).toBeDisabled();
  });

  test('renders correctly when no items or advice are suggested', () => {
    vi.mocked(outfitSuggester.suggestOutfit).mockReturnValue({ items: [], advice: [] });
    render(<SingleOutfitAdvice weatherData={mockWeatherData} title="Test Empty" />);

    expect(screen.getByText('No specific outfit items to suggest for this period.')).toBeInTheDocument();
    // Check that the 'Consider:' heading for advice is not present if advice is empty
    expect(screen.queryByRole('heading', { name: /consider/i })).not.toBeInTheDocument();
  });
});
