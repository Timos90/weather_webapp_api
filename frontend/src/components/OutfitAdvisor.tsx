import React, { useState } from 'react';
import { WeatherData, suggestOutfit, OutfitSuggestion } from '../services/outfitSuggester';
import { GenderOption } from '../types/types'; 
import '../css/OutfitAdvisor.css';
import { submitOutfitFeedback, OutfitFeedbackPayload } from '../api/personalization';

interface OutfitAdvisorProps {
  currentWeatherAdvice?: WeatherData;
  forecastAdvice?: Array<{
    dayName: string;
    slots: WeatherData[];
  }>;
  onClose: () => void;
  userGender?: GenderOption;
}

interface SingleOutfitAdviceProps {
  weatherData: WeatherData;
  title: string;
  userGender?: GenderOption;
}

// Helper to convert item IDs to display names
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
};

export const SingleOutfitAdvice: React.FC<SingleOutfitAdviceProps> = ({ weatherData, title, userGender }) => {
  const suggestion: OutfitSuggestion = suggestOutfit(weatherData, userGender);
  const [hasVoted, setHasVoted] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccessMessage, setFeedbackSuccessMessage] = useState<string | null>(null);

  const handleFeedback = async (feedbackType: 'like' | 'dislike') => {
    setFeedbackError(null); 
    setFeedbackSuccessMessage(null); 
    const payload: OutfitFeedbackPayload = {
      weather_data: weatherData,
      suggested_outfit: suggestion,
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

  return (
    <div className="outfit-section">
      <h4>{title}</h4>
      {suggestion.items.length > 0 ? (
        <ul>
          {suggestion.items.map(itemKey => (
            <li key={itemKey}>{OUTFIT_ITEM_NAMES[itemKey] || itemKey}</li>
          ))}
        </ul>
      ) : (
        <p>No specific outfit items to suggest for this period.</p>
      )}
      {suggestion.advice.length > 0 && (
        <>
          <h5>Consider:</h5>
          <ul>
            {suggestion.advice.map((text, index) => (
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
