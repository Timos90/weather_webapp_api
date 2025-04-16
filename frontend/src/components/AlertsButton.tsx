import React, { useState, useEffect, lazy, Suspense } from 'react';
import { fetchAlerts } from '../api/weather';
import '../css/AlertsButton.css'; // Import your CSS file for styling
import { AlertsButtonProps } from '../types/types';

const LazyAlertsModal = lazy(() => import('./AlertsModal'));

const AlertsButton: React.FC<AlertsButtonProps> = ({ location }) => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Clear old alerts immediately on location change.
    setAlerts([]);
    setError(''); // Clear previous error

    // If there's no location, do nothing.
    if (!location) {
      setAlerts([]);
      return;
    }

    // Set up a cancellation flag to prevent updating state if location changes quickly.
    let isCancelled = false;

    // Optionally debounce the request (e.g., 300ms delay).
    const timeoutId = setTimeout(() => {
      const getAlerts = async () => {
        try {
          const data = await fetchAlerts(location);
          if (!isCancelled) {
            // If no alerts are returned, explicitly set alerts to an empty array.
            setAlerts(data || []);
          }
        } catch (err) {
          if (!isCancelled) {
            setError(err instanceof Error ? err.message : 'Failed to fetch alerts.');
          }
        }
      };
      getAlerts();
    }, 300);

    return () => {
      clearTimeout(timeoutId);
      isCancelled = true;
    };
  }, [location]);

  const handleClick = () => {
    setShowModal(true);
  };

  return (
    <div>
      {/* Display error message if one exists */}
      {error && <p className="error-message" style={{ color: 'red' }}>{error}</p>}

      <button 
        className={`alerts-button ${alerts.length > 0 ? 'glow' : ''}`} 
        onClick={handleClick}
        title={alerts.length > 0 ? "You have active weather alerts" : "No alerts"}
      >
        Alerts {alerts.length > 0 ? `(${alerts.length})` : ''}
      </button>

      {showModal && (
        <Suspense fallback={<div>Loading alerts...</div>}>
          <LazyAlertsModal onClose={() => setShowModal(false)}>
            <div className="alerts-modal-content">
              <h2>Weather Alerts for {location}</h2>
              {alerts.length > 0 ? (
                alerts.map((alert, index) => (
                  <div key={index} className="alert-item">
                    <h3>{alert.headline}</h3>
                    <p><strong>Event:</strong> {alert.event}</p>
                    <p><strong>Type:</strong> {alert.msgtype}</p>
                    <p><strong>Urgency:</strong> {alert.urgency}</p>
                    <p>
                      <strong>Effective:</strong> {new Date(alert.effective).toLocaleString()}
                    </p>
                    <p>
                      <strong>Expires:</strong> {new Date(alert.expires).toLocaleString()}
                    </p>
                    <p>{alert.desc}</p>
                  </div>
                ))
              ) : (
                <p>No alerts available.</p>
              )}
            </div>
          </LazyAlertsModal>
        </Suspense>
      )}
    </div>
  );
};

export default AlertsButton;
