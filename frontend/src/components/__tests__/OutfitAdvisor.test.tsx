import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

import OutfitAdvisor, { SingleOutfitAdvice } from '../OutfitAdvisor';
// import * as outfitSuggester from '../../services/outfitSuggester'; // No longer directly used for suggestions in SingleOutfitAdvice
import * as personalizationApi from '../../api/personalization';

// outfitSuggester.suggestOutfit is no longer directly called by SingleOutfitAdvice for fetching suggestions.
// If OUTFIT_ITEM_NAMES or other constants were used from it, they'd need to be handled if the file was removed.

// Mock the personalization API
vi.mock('../../api/personalization', () => ({
  submitOutfitFeedback: vi.fn(),
  getOutfitSuggestions: vi.fn(), // Added for testing API-driven suggestions
}));

// Mock toLocaleTimeString for consistent time formatting in titles
// and any other Date related formatting if necessary
beforeEach(() => {
  vi.spyOn(Date.prototype, 'toLocaleTimeString').mockReturnValue('12:00 PM');
  // Reset mocks before each test
  // vi.mocked(outfitSuggester.suggestOutfit).mockClear(); // suggestOutfit no longer primary mock target here
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
  unit: 'C', // Added unit for testing
};



// Use one as the default for most tests, can be overridden
const mockWeatherData: personalizationApi.FrontendWeatherData = mockWeatherDataDefault;

const mockOutfitSuggestionFromApi: personalizationApi.OutfitSuggestionApiResponse = {
  suggested_items: ['t_shirt', 'shorts', 'sunglasses'],
  advice_strings: ['Stay hydrated!'],
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
  test('renders SingleOutfitAdvice for current weather', async () => {
    vi.mocked(personalizationApi.getOutfitSuggestions).mockResolvedValue(mockOutfitSuggestionFromApi);
    render(<OutfitAdvisor onClose={vi.fn()} currentWeatherAdvice={mockWeatherDataDefault} userGender="Man" />);
    // Check that getOutfitSuggestions is called by the child SingleOutfitAdvice
    // This implicitly tests that OutfitAdvisor passes the weatherData (with unit) down correctly.
    expect(personalizationApi.getOutfitSuggestions).toHaveBeenCalledWith(mockWeatherDataDefault, 'Man');
    // Check that SingleOutfitAdvice content is rendered (e.g., title and an item)
    // Wait for the suggestions to be fetched and rendered by SingleOutfitAdvice
    expect(await screen.findByRole('heading', { name: 'Current Conditions' })).toBeInTheDocument();
    expect(await screen.findByText('T-Shirt')).toBeInTheDocument(); // From mockOutfitSuggestionFromApi
  });
});

describe('SingleOutfitAdvice', () => {
  // Tests for the SingleOutfitAdvice sub-component will go here
  beforeEach(() => {
    // Setup default mock implementation for suggestOutfit for most tests
    // vi.mocked(outfitSuggester.suggestOutfit).mockReturnValue(mockOutfitSuggestion); // To be replaced by getOutfitSuggestions mock
  });

  test('renders title, outfit items, and advice after successful fetch', async () => {
    vi.mocked(personalizationApi.getOutfitSuggestions).mockResolvedValue(mockOutfitSuggestionFromApi);
    render(<SingleOutfitAdvice weatherData={mockWeatherDataDefault} title="Test Conditions" userGender="Man" />);
    // Verify getOutfitSuggestions was called with weatherData containing the unit
    expect(personalizationApi.getOutfitSuggestions).toHaveBeenCalledWith(mockWeatherDataDefault, 'Man');

    expect(screen.getByText('Loading suggestions...')).toBeInTheDocument(); // Check for loading state initially

    // Wait for suggestions to load and be displayed
    expect(await screen.findByRole('heading', { name: 'Test Conditions' })).toBeInTheDocument();
    expect(await screen.findByText('T-Shirt')).toBeInTheDocument();
    expect(await screen.findByText('Shorts')).toBeInTheDocument();
    expect(await screen.findByText('Sunglasses')).toBeInTheDocument();
    expect(await screen.findByText('Stay hydrated!')).toBeInTheDocument();
    
    // Check for feedback buttons
    expect(screen.getByRole('button', { name: /👍 Like/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /👎 Dislike/i })).toBeInTheDocument();
  });

  // More tests for SingleOutfitAdvice interactions (feedback buttons)
  test('handles successful "Like" feedback', async () => {
    vi.mocked(personalizationApi.getOutfitSuggestions).mockResolvedValue(mockOutfitSuggestionFromApi);
    vi.mocked(personalizationApi.submitOutfitFeedback).mockResolvedValue(undefined); // Simulate successful API call
    render(<SingleOutfitAdvice weatherData={mockWeatherDataDefault} title="Test Like" userGender="Man" />);
    // Verify getOutfitSuggestions was called correctly
    expect(personalizationApi.getOutfitSuggestions).toHaveBeenCalledWith(mockWeatherDataDefault, 'Man');
    await screen.findByText('T-Shirt'); // Wait for suggestions to load

    const likeButton = screen.getByRole('button', { name: /👍 Like/i });
    fireEvent.click(likeButton);

    // Wait for state updates and API call resolution
    await screen.findByText('Feedback (like) submitted successfully for "Test Like"!');

    expect(personalizationApi.submitOutfitFeedback).toHaveBeenCalledWith({
      weather_data: mockWeatherData,
      suggested_outfit: mockOutfitSuggestionFromApi,
      user_gender_at_feedback: 'Man',
      feedback_type: 'like',
    });
    expect(likeButton).toBeDisabled();
    expect(screen.getByRole('button', { name: /👎 Dislike/i })).toBeDisabled();
    expect(screen.queryByRole('alert', { name: /error/i })).not.toBeInTheDocument(); // Assuming errors might have an alert role or specific class
  });

  test('handles successful "Dislike" feedback', async () => {
    vi.mocked(personalizationApi.getOutfitSuggestions).mockResolvedValue(mockOutfitSuggestionFromApi);
    vi.mocked(personalizationApi.submitOutfitFeedback).mockResolvedValue(undefined);
    render(<SingleOutfitAdvice weatherData={mockWeatherDataDefault} title="Test Dislike" userGender="Woman" />);
    expect(personalizationApi.getOutfitSuggestions).toHaveBeenCalledWith(mockWeatherDataDefault, 'Woman');
    await screen.findByText('T-Shirt'); // Wait for suggestions to load

    const dislikeButton = screen.getByRole('button', { name: /👎 Dislike/i });
    fireEvent.click(dislikeButton);

    await screen.findByText('Feedback (dislike) submitted successfully for "Test Dislike"!');

    expect(personalizationApi.submitOutfitFeedback).toHaveBeenCalledWith({
      weather_data: mockWeatherData,
      suggested_outfit: mockOutfitSuggestionFromApi,
      user_gender_at_feedback: 'Woman',
      feedback_type: 'dislike',
    });
    expect(dislikeButton).toBeDisabled();
    expect(screen.getByRole('button', { name: /👍 Like/i })).toBeDisabled();
  });

  test('handles API error (non-409) on feedback', async () => {
    vi.mocked(personalizationApi.getOutfitSuggestions).mockResolvedValue(mockOutfitSuggestionFromApi);
    const errorMessage = 'Network Error';
    vi.mocked(personalizationApi.submitOutfitFeedback).mockRejectedValue({ message: errorMessage }); // Simulate generic error
    render(<SingleOutfitAdvice weatherData={mockWeatherDataDefault} title="Test Error" userGender="Non-binary" />);
    expect(personalizationApi.getOutfitSuggestions).toHaveBeenCalledWith(mockWeatherDataDefault, 'Non-binary');
    await screen.findByText('T-Shirt'); // Wait for suggestions to load

    fireEvent.click(screen.getByRole('button', { name: /👍 Like/i }));

    await screen.findByText(`Failed to submit feedback: ${errorMessage}`);
    expect(screen.queryByText(/submitted successfully/i)).not.toBeInTheDocument();
    // Buttons should remain enabled after a generic API error
    expect(screen.getByRole('button', { name: /👍 Like/i })).not.toBeDisabled(); 
  });

  test('handles API error (409 Conflict) on feedback', async () => {
    vi.mocked(personalizationApi.getOutfitSuggestions).mockResolvedValue(mockOutfitSuggestionFromApi);
    const conflictError = { 
      isApiError: true, 
      status: 409, 
      data: { detail: 'You have already voted for this slot.' }
    };
    vi.mocked(personalizationApi.submitOutfitFeedback).mockRejectedValue(conflictError);
    render(<SingleOutfitAdvice weatherData={mockWeatherDataDefault} title="Test Conflict" />);
    expect(personalizationApi.getOutfitSuggestions).toHaveBeenCalledWith(mockWeatherDataDefault, undefined); // No gender prop provided
    await screen.findByText('T-Shirt'); // Wait for suggestions to load

    fireEvent.click(screen.getByRole('button', { name: /👎 Dislike/i }));

    await screen.findByText(conflictError.data.detail);
    expect(screen.getByRole('button', { name: /👎 Dislike/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /👍 Like/i })).toBeDisabled();
  });

  test('renders correctly when no items or advice are suggested after fetch', async () => {
    vi.mocked(personalizationApi.getOutfitSuggestions).mockResolvedValue({ suggested_items: [], advice_strings: [] });
    render(<SingleOutfitAdvice weatherData={mockWeatherDataDefault} title="Test Empty" />);
    expect(personalizationApi.getOutfitSuggestions).toHaveBeenCalledWith(mockWeatherDataDefault, undefined);

    expect(screen.getByText('Loading suggestions...')).toBeInTheDocument();

    expect(await screen.findByText('No specific outfit items to suggest for this period.')).toBeInTheDocument();
    // Check that the 'Consider:' heading for advice is not present if advice is empty
    expect(screen.queryByRole('heading', { name: /consider/i })).not.toBeInTheDocument();
  });

  test('displays loading message while fetching suggestions', () => {
    vi.mocked(personalizationApi.getOutfitSuggestions).mockReturnValue(new Promise(() => {})); // Promise that never resolves
    render(<SingleOutfitAdvice weatherData={mockWeatherDataDefault} title="Test Loading" />);
    expect(personalizationApi.getOutfitSuggestions).toHaveBeenCalledWith(mockWeatherDataDefault, undefined);
    expect(screen.getByText('Loading suggestions...')).toBeInTheDocument();
  });

  test('displays error message if fetching suggestions fails', async () => {
    const errorMessage = 'API Network Error';
    vi.mocked(personalizationApi.getOutfitSuggestions).mockRejectedValue({ message: errorMessage });
    render(<SingleOutfitAdvice weatherData={mockWeatherData} title="Test API Error" />);

    expect(screen.getByText('Loading suggestions...')).toBeInTheDocument();
    expect(await screen.findByText(`Error: ${errorMessage}`)).toBeInTheDocument();
  });
});
