import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export const useTracking = () => {
  const location = useLocation();
  const { user } = useAuth();

  const trackEvent = async (eventType: string, metadata?: any) => {
    if (!user) return;

    try {
      await supabase.from('usage_tracking').insert({
        user_id: user.id,
        event_type: eventType,
        page_path: location.pathname,
        metadata: metadata || {}
      });
    } catch (error) {
      console.error('Tracking error:', error);
    }
  };

  useEffect(() => {
    if (user) {
      trackEvent('page_view');
    }
  }, [location.pathname, user]);

  return { trackEvent };
};
