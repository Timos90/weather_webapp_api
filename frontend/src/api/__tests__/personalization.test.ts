// Test suite for personalization API client functions
import { getOutfitSuggestions, submitOutfitFeedback, FrontendWeatherData, OutfitSuggestionApiResponse, OutfitFeedbackPayload } from '../personalization';
import { apiRequest } from '../apiHelpers'; // Import to mock
import { getAuthToken } from '../user'; // Import to mock, user.ts is in src/api/

// Mock modules
vi.mock('../apiHelpers');
vi.mock('../user');

// Remove global.fetch mock as we are mocking apiRequest directly
// global.fetch = vi.fn();

describe('Personalization API Client', () => {
  beforeEach(() => {
    // Clear mocks before each test
    vi.mocked(apiRequest).mockClear();
    vi.mocked(getAuthToken).mockClear();
  });

  describe('getOutfitSuggestions', () => {
    const mockWeatherDataCelsius: FrontendWeatherData = {
      temperature: 20,
      feelsLike: 19,
      precipitationChance: 10,
      windSpeed: 5,
      uvIndex: 3,
      weatherDescription: 'Partly cloudy',
      weatherMain: 'Clouds',
      isDay: true,
      datetime: '2024-05-30T12:00:00Z',
      unit: 'C',
    };

    const mockWeatherDataFahrenheit: FrontendWeatherData = {
      temperature: 68, // 20°C
      feelsLike: 66, // ~19°C
      precipitationChance: 10,
      windSpeed: 5,
      uvIndex: 3,
      weatherDescription: 'Partly cloudy',
      weatherMain: 'Clouds',
      isDay: true,
      datetime: '2024-05-30T13:00:00Z',
      unit: 'F',
    };

    const mockApiResponse: OutfitSuggestionApiResponse = {
      suggested_items: ['t_shirt', 'shorts'],
      advice_strings: ['Enjoy the weather!'],
    };

    test('should call apiRequest with correct URL and payload for Celsius', async () => {
      vi.mocked(apiRequest).mockResolvedValueOnce(mockApiResponse);

      await getOutfitSuggestions(mockWeatherDataCelsius);

      expect(apiRequest).toHaveBeenCalledTimes(1);
      const expectedPayload = {
        temperature: 20,
        feels_like: 19,
        precipitation_chance: 10,
        wind_speed: 5,
        uv_index: 3,
        weather_description: 'Partly cloudy',
        weather_main: 'Clouds',
        is_day: true,
        datetime: '2024-05-30T12:00:00Z',
        unit: 'C',
      };
      // VITE_BASE_PERSONALIZATION_URL is 'http://localhost:8000/api/v1/personalization'
      // getOutfitSuggestions constructs url as `${BASE_URL}/suggest-outfit/`
      const expectedUrl = 'http://localhost:8000/api/v1/personalization/suggest-outfit/';
      expect(apiRequest).toHaveBeenCalledWith(
        expectedUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          data: expectedPayload
        }
      );
    });

    test('should call apiRequest with correct Fahrenheit payload', async () => {
      vi.mocked(apiRequest).mockResolvedValueOnce(mockApiResponse);

      await getOutfitSuggestions(mockWeatherDataFahrenheit);

      expect(apiRequest).toHaveBeenCalledTimes(1);
      const callArgs = vi.mocked(apiRequest).mock.calls[0];
      const payload = callArgs[1]?.data;
      expect(payload.unit).toBe('F');
      expect(payload.temperature).toBe(68);
      expect(payload.feels_like).toBe(66);
    });

    test('should handle API error response from apiRequest', async () => {
      const errorResponse = { 
        isApiError: true, // Assuming apiRequest throws a structured error
        message: 'API request failed with status 400: {"error":"Bad Request"}', 
        status: 400, 
        data: { error: 'Bad Request' } 
      };
      vi.mocked(apiRequest).mockRejectedValueOnce(errorResponse);

      await expect(getOutfitSuggestions(mockWeatherDataCelsius)).rejects.toThrow(errorResponse.message);
    });

    test('should return the response from apiRequest (snake_case to camelCase conversion is done by apiRequest)', async () => {
      const apiResponseWithSnakeCase: OutfitSuggestionApiResponse = {
        suggested_items: ['cool_hat', 'warm_scarf'],
        advice_strings: ['stay_warm', 'drink_tea'],
      };
      // apiRequest is expected to handle the snake_case to camelCase conversion if configured to do so.
      // For getOutfitSuggestions, it seems it returns the raw response from apiRequest.
      // The test in personalization.ts was checking the raw fetch response, 
      // but getOutfitSuggestions itself doesn't do the conversion, it relies on apiRequest or returns as is.
      // The current implementation of getOutfitSuggestions directly returns the result of apiRequest.
      // The apiRequest helper itself might do the conversion, or the backend might return camelCase.
      // For this test, we assume getOutfitSuggestions returns what apiRequest gives it.
      vi.mocked(apiRequest).mockResolvedValueOnce(apiResponseWithSnakeCase);

      const result = await getOutfitSuggestions(mockWeatherDataCelsius);
      expect(result).toEqual(apiResponseWithSnakeCase);
    });

  });

  // Add tests for submitOutfitFeedback if needed, focusing on unit in weather_data
  describe('submitOutfitFeedback', () => {
    beforeEach(() => {
      // Mock getAuthToken to return a dummy token for these tests
      vi.mocked(getAuthToken).mockReturnValue('test-auth-token');
    });
    const mockFeedbackPayload: OutfitFeedbackPayload = {
        weather_data: {
            temperature: 25,
            feelsLike: 24,
            unit: 'C', // Ensure unit is part of the payload
            datetime: '2024-05-30T14:00:00Z',
            weatherMain: 'Sunny'
        },
        suggested_outfit: {
            suggested_items: ['sunglasses', 'hat'],
            advice_strings: ['Protect yourself from the sun']
        },
        feedback_type: 'like',
        user_gender_at_feedback: 'Woman'
    };

    test('should call apiRequest with correct payload including unit in weather_data', async () => {
        vi.mocked(apiRequest).mockResolvedValueOnce({ success: true }); // Assuming a simple success response

        await submitOutfitFeedback(mockFeedbackPayload);

        expect(apiRequest).toHaveBeenCalledTimes(1);
        const callArgs = vi.mocked(apiRequest).mock.calls[0];
        const url = callArgs[0];
        const options = callArgs[1];

        expect(url).toContain('/feedback/outfit/');
        expect(options?.method).toBe('POST');
        expect(options?.headers?.Authorization).toBe('Token test-auth-token');
        expect(options?.data).toEqual(mockFeedbackPayload);
        expect(options?.data.weather_data.unit).toBe('C');
        expect(options?.data.weather_data.temperature).toBe(25);
    });
  });
});
