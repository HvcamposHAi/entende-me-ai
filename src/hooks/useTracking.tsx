import { useLocation } from 'react-router-dom';

export const useTracking = () => {
  const location = useLocation();

  const trackEvent = async (eventType: string, metadata?: any) => {
    // Tracking disabled - no authentication
    console.log('Event tracked:', eventType, metadata);
  };

  return { trackEvent };
};
