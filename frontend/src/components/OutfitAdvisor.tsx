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
export const SingleOutfitAdvice: React.FC<SingleOutfitAdviceProps> = ({ weatherData, title, userGender }) => {
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
   * `null` if no error, or a string message if an error occurs. Displayed to the user.
   */
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  /** 
   * State to track if the user has already submitted feedback (liked/disliked) for the current suggestion.
   * Used to disable feedback buttons after a vote to prevent multiple submissions.
   * Set to `true` after a successful feedback submission or if a 409 conflict (already voted) is received.
   */
  const [hasVoted, setHasVoted] = useState(false);
  /** 
   * State for storing any error message that occurs while submitting outfit feedback.
   * `null` if no error, or a string message if an error occurs. Displayed to the user.
   */
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  /** 
   * State for storing a success message after outfit feedback is successfully submitted.
   * `null` initially, or a string message upon successful submission. Displayed to the user.
   */
  const [feedbackSuccessMessage, setFeedbackSuccessMessage] = useState<string | null>(null);

  /**
   * Fetches outfit suggestions from the API when the component mounts or when
   * `weatherData` or `userGender` props change. It handles loading states and errors.
   */
  useEffect(() => {
    /**
     * Asynchronously fetches outfit data from the backend API.
     * Updates component state based on the API response (suggestions, loading status, errors).
     */
    const fetchOutfitData = async () => {
      if (!weatherData) {
        setSuggestionError("No weather data provided to suggest an outfit.");
        setIsLoadingSuggestions(false);
        return;
      }
      setIsLoadingSuggestions(true);
      setSuggestionError(null);
      setApiSuggestion(null);
      try {
        const response = await getOutfitSuggestions(weatherData, userGender);
        setApiSuggestion(response);
      } catch (err: any) {
        let msg = 'Failed to fetch outfit suggestions.';
        if (err.data && typeof err.data.detail === 'string') {
          msg = err.data.detail;
        } else if (err.message) {
          msg = err.message;
        }
        setSuggestionError(msg);
        console.error("Failed to fetch outfit suggestions:", err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    fetchOutfitData();
  }, [weatherData, userGender]);

  /**
   * Handles the submission of outfit feedback (like/dislike) to the API.
   * It constructs the payload and updates the UI based on the API response (success/error).
   * @param feedbackType - The type of feedback to submit ('like' or 'dislike').
   */
  /**
   * Handles the submission of outfit feedback (like/dislike) to the API.
   * It constructs the payload using current weather data, the API suggestion, and user gender (if available).
   * It then calls `submitOutfitFeedback` and updates the UI with success or error messages,
   * and sets `hasVoted` to true to prevent further submissions for the same suggestion.
   *
   * @param {'like' | 'dislike'} feedbackType - The type of feedback being submitted ('like' or 'dislike').
   */
  const handleFeedback = async (feedbackType: 'like' | 'dislike') => {
    setFeedbackError(null); 
    setFeedbackSuccessMessage(null); 
    if (!apiSuggestion) {
      setFeedbackError("Cannot submit feedback: outfit suggestion not available.");
      return;
    }
    const payload: OutfitFeedbackPayload = {
      weather_data: weatherData, // weatherData from props is already camelCase FrontendWeatherData
      suggested_outfit: apiSuggestion, // apiSuggestion (OutfitSuggestionApiResponse) has the correct structure
      user_gender_at_feedback: userGender,
      feedback_type: feedbackType,
    };

    try {
      await submitOutfitFeedback(payload);
      setFeedbackSuccessMessage(`Feedback (${feedbackType}) submitted successfully for "${title}"!`);
      setHasVoted(true); 
    } catch (error: any) {
      console.error('Failed to submit outfit feedback:', error);
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
      {apiSuggestion.suggested_items.length > 0 ? (
        <ul>
          {apiSuggestion.suggested_items.map(itemKey => (
            <li key={itemKey}>{OUTFIT_ITEM_NAMES[itemKey] || itemKey}</li>
          ))}
        </ul>
      ) : (
        <p>No specific outfit items to suggest for this period.</p>
      )}
      {apiSuggestion.advice_strings.length > 0 && (
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
  return (
    <div className="outfit-advisor-modal-backdrop">
      <div className="outfit-advisor-modal-content">
        <button onClick={onClose} className="outfit-advisor-close-button">
          &times;
        </button>
        <h2>Outfit Advisor</h2>
        
        {currentWeatherAdvice && (
          <SingleOutfitAdvice 
            weatherData={currentWeatherAdvice} 
            title="Current Conditions" 
            userGender={userGender} 
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
