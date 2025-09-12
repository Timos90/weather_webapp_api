import React, { useState, useEffect } from 'react';
// import { WeatherData } from '../services/outfitSuggester'; // Replaced by FrontendWeatherData
import { GenderOption } from '../types/types'; 
import '../css/OutfitAdvisor.css';
import { submitOutfitFeedback, OutfitFeedbackPayload, getOutfitSuggestions, OutfitSuggestionApiResponse, FrontendWeatherData } from '../api/personalization';

/**
 * Props for the {@link OutfitAdvisor} component.
 * Defines the structure for weather advice data (current and forecast) and interaction callbacks.
 */
interface OutfitAdvisorProps {
  /** Weather data and advice for the current conditions. */
  currentWeatherAdvice?: FrontendWeatherData;
  /** Array of forecast data, each element representing a day with multiple time slots. */
  forecastAdvice?: Array<{
    /** The name of the forecasted day (e.g., "Monday"). */
    dayName: string;
    /** Array of weather data for different time slots within the day. */
    slots: FrontendWeatherData[];
  }>;
  /** Callback function to close the advisor modal. */
  onClose: () => void;
  /** Optional gender of the user to tailor suggestions. */
  userGender?: GenderOption;
}

/**
 * Props for the {@link SingleOutfitAdvice} component.
 * Defines the necessary data to display a single piece of outfit advice, including weather data and a title.
 */
interface SingleOutfitAdviceProps {
  /** The weather data for which to display outfit advice. */
  weatherData: FrontendWeatherData;
  /** A title for this specific advice section (e.g., "Current Conditions", "3:00 PM"). */
  title: string;
  userGender?: GenderOption;
  occasion?: string;
}

/**
 * A mapping from outfit item keys (as received from the backend) to human-readable display names.
 * This is used to present outfit suggestions in a user-friendly format.
 * For example, 't_shirt' becomes 'T-Shirt'.
 */
const OUTFIT_ITEM_NAMES: { [key: string]: string } = {
  t_shirt: 'T-Shirt',
  long_sleeve_shirt: 'Long Sleeve Shirt',
  sweater: 'Sweater',
  fleece_jacket: 'Fleece Jacket',
  light_jacket: 'Light Jacket',
  medium_jacket: 'Medium Jacket',
  heavy_coat: 'Heavy Coat',
  shorts: 'Shorts',
  pants: 'Pants',
  raincoat: 'Raincoat',
  umbrella: 'Umbrella',
  sunglasses: 'Sunglasses',
  sun_hat: 'Sun Hat',
  winter_hat: 'Winter Hat',
  gloves: 'Gloves',
  scarf: 'Scarf',
  sandals: 'Sandals',
  sneakers: 'Sneakers',
  boots: 'Boots',
  waterproof_shoes: 'Waterproof Shoes',
  blouse: 'Blouse',
  dress: 'Dress',
  skirt: 'Skirt',
  cardigan: 'Cardigan',
  polo_shirt: 'Polo Shirt',
  tank_top: 'Tank Top',
  vest: 'Vest',
  capris: 'Capris',
  thermal_top: 'Thermal Top',
};

/**
 * Renders outfit advice for a single weather data point (e.g., current conditions or a specific forecast slot).
 * This component fetches outfit suggestions based on the provided weather data and optional user gender,
 * displays the suggestions, and allows users to submit 'like' or 'dislike' feedback.
 * It manages its own state for loading suggestions, handling API errors, and feedback submission status.
 *
 * @param {SingleOutfitAdviceProps} props - The props for the component.
 * @returns {React.ReactElement} The rendered single outfit advice section.
 */
export const SingleOutfitAdvice: React.FC<SingleOutfitAdviceProps> = ({ weatherData, title, userGender, occasion }) => {
  /** 
   * State for storing the outfit suggestion data fetched from the API.
   * It holds the response from `getOutfitSuggestions`, including suggested items and advice strings.
   * Initialized to `null` and updated upon successful API call.
   */
  const [apiSuggestion, setApiSuggestion] = useState<OutfitSuggestionApiResponse | null>(null);
  /** 
   * State to track whether outfit suggestions are currently being loaded from the API.
   * `true` while fetching, `false` otherwise. Used to display loading indicators.
   */
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(true);
  /** 
   * State for storing any error message that occurs while fetching outfit suggestions.
   * `null` if no error, or a string message if an error occurs.
   */
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  /** 
   * State to track if the user has already submitted feedback for this suggestion.
   * `true` after the first vote to disable feedback buttons.
   */
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  /** 
   * State for storing any error message that occurs during feedback submission.
   * `null` if no error, or a string message if an error occurs.
   */
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  /**
   * State for displaying a success message after feedback is submitted.
   * Set to a confirmation message on success, and cleared on subsequent actions.
   */
  const [feedbackSuccessMessage, setFeedbackSuccessMessage] = useState<string | null>(null);

  /**
   * Asynchronously fetches outfit data from the backend API.
   * Updates component state based on the API response (suggestions, loading status, errors).
   */
  const fetchOutfitData = async () => {
    setIsLoadingSuggestions(true);
    setSuggestionError(null);
    try {
      const suggestions = await getOutfitSuggestions(weatherData, userGender, occasion);
      setApiSuggestion(suggestions);
    } catch (error: any) { 
      const errorMessage = error.data?.detail || error.message || 'Could not fetch suggestions.';
      setSuggestionError(errorMessage);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    fetchOutfitData();
  }, [weatherData, userGender, occasion]);

  /**
   * Handles the submission of outfit feedback (like/dislike) to the API.
   * It constructs the payload using current weather data, the API suggestion, and user gender (if available).
   * It also manages the UI state for feedback submission, including success and error messages, and disables buttons after a vote.
   *
   * @param {'like' | 'dislike'} feedbackType - The type of feedback being submitted ('like' or 'dislike').
   */
  const handleFeedback = async (feedbackType: 'like' | 'dislike') => {
    if (hasVoted) return; // Prevent multiple submissions
    if (!apiSuggestion) {
      setFeedbackError('Cannot submit feedback: no suggestion was loaded.');
      return;
    }

    setFeedbackError(null);
    setFeedbackSuccessMessage(null);

    const feedbackPayload: OutfitFeedbackPayload = {
      weather_data: weatherData,
      suggested_outfit: {
        items: apiSuggestion.suggested_items,
        advice: apiSuggestion.advice_strings,
      },
      feedback_type: feedbackType,
      user_gender_at_feedback: userGender,
    };

    try {
      await submitOutfitFeedback(feedbackPayload);
      setFeedbackSuccessMessage('Thank you for your feedback!');
      setHasVoted(true); // Disable buttons after successful vote
    } catch (error: any) {
      let errorMessage = 'An unexpected error occurred.';
      if (error && error.isApiError && error.status === 409) {
        errorMessage = error.data?.detail || 'You have already submitted feedback for this time slot.';
        setHasVoted(true); 
      } else if (error && error.isApiError && error.data?.detail) {
        errorMessage = `Failed to submit feedback: ${error.data.detail}`;
      } else if (error && error.message) {
        errorMessage = `Failed to submit feedback: ${error.message}`;
      }
      setFeedbackError(errorMessage);
    }
  };

  if (isLoadingSuggestions) {
    return <div className="outfit-section"><h4>{title}</h4><p>Loading suggestions...</p></div>;
  }

  if (suggestionError) {
    return <div className="outfit-section"><h4>{title}</h4><p className="error-message">Error: {suggestionError}</p></div>;
  }

  if (!apiSuggestion) {
    return <div className="outfit-section"><h4>{title}</h4><p>No suggestions available at the moment.</p></div>;
  }

  return (
    <div className="outfit-section">
      <h4>{title}</h4>
      {apiSuggestion?.suggested_items?.length > 0 ? (
        <ul>
          {apiSuggestion.suggested_items.map(itemKey => (
            <li key={itemKey}>{OUTFIT_ITEM_NAMES[itemKey] || itemKey}</li>
          ))}
        </ul>
      ) : (
        <p>No specific outfit items to suggest for this period.</p>
      )}
      {apiSuggestion?.advice_strings?.length > 0 && (
        <>
          <h5>Consider:</h5>
          <ul>
            {apiSuggestion.advice_strings.map((text, index) => (
              <li key={index}>{text}</li>
            ))}
          </ul>
        </>
      )}
      <div className="outfit-feedback-actions">
        <button onClick={() => handleFeedback('like')} className="feedback-button like-button" disabled={hasVoted}>
          👍 Like
        </button>
        <button onClick={() => handleFeedback('dislike')} className="feedback-button dislike-button" disabled={hasVoted}>
          👎 Dislike
        </button>
      </div>
      {feedbackError && <p className="error-message feedback-error">{feedbackError}</p>}
      {feedbackSuccessMessage && <p className="success-message feedback-success">{feedbackSuccessMessage}</p>}
    </div>
  );
};


/**
 * The main OutfitAdvisor component. It renders as a modal and displays outfit advice
 * for current weather conditions and for forecast periods (if provided).
 * It utilizes the {@link SingleOutfitAdvice} component for rendering individual advice sections for current weather
 * and each relevant forecast slot.
 *
 * @param {OutfitAdvisorProps} props - The props for the component.
 * @returns {React.ReactElement} The rendered outfit advisor modal.
 */
const OutfitAdvisor: React.FC<OutfitAdvisorProps> = ({ currentWeatherAdvice, forecastAdvice, onClose, userGender }) => {
  const [occasion, setOccasion] = useState<string>('');

  const handleOccasionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setOccasion(event.target.value);
  };

  return (
    <div className="outfit-advisor-modal-backdrop">
      <div className="outfit-advisor-modal-content">
        <button onClick={onClose} className="outfit-advisor-close-button">
          &times;
        </button>
        <h2>Outfit Advisor</h2>
        
        <div className="outfit-advisor-controls">
          <label htmlFor="occasion-select">Select Occasion:</label>
          <select id="occasion-select" value={occasion} onChange={handleOccasionChange}>
            <option value="">None</option>
            <option value="Work Office">Work Office</option>
            <option value="Casual Outing">Casual Outing</option>
            <option value="Formal Event">Formal Event</option>
            <option value="Sports">Sports</option>
          </select>
        </div>

        {currentWeatherAdvice && (
          <SingleOutfitAdvice 
            weatherData={currentWeatherAdvice} 
            title="Current Conditions" 
            userGender={userGender} 
            occasion={occasion}
          />
        )}

        {forecastAdvice && forecastAdvice.map((day, dayIndex) => (
          <div key={`day-${dayIndex}`} className="forecast-day-section">
            <h3>{day.dayName}</h3>
            {day.slots.map((slotData, slotIndex) => (
              <SingleOutfitAdvice
                key={`slot-${dayIndex}-${slotIndex}`}
                weatherData={slotData}
                title={new Date(slotData.datetime || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} 
                userGender={userGender}
                occasion={occasion}
              />
            ))}
          </div>
        ))}
        
        {(!currentWeatherAdvice && (!forecastAdvice || forecastAdvice.length === 0)) && (
            <p>No weather data available to provide advice.</p>
        )}
      </div>
    </div>
  );
};

export default OutfitAdvisor;
