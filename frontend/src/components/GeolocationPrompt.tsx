import React from 'react';
import '../css/GeolocationPrompt.css'; // Optional: add custom styling

type Props = {
  onRequest: () => void;
};

const GeolocationPrompt: React.FC<Props> = ({ onRequest }) => {
  return (
    <div className="geo-prompt">
      <p>Want local weather data?</p>
      <button onClick={onRequest} className="geo-button">
        Use My Location
      </button>
    </div>
  );
};

export default GeolocationPrompt;
