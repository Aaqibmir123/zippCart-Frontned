import { useCallback, useEffect, useState } from 'react';
import { useScreenActive } from './useScreenActive';

export type FeedbackTone = 'error' | 'success';
export type FeedbackVariant = 'favoriteAdded' | 'favoriteRemoved';
export type TimedFeedback = { message: string; tone: FeedbackTone; variant?: FeedbackVariant };

export function useTimedFeedback(durationMs = 2800) {
  const [feedback, setFeedback] = useState<TimedFeedback | null>(null);
  const active = useScreenActive();

  const showFeedback = useCallback((message: string, tone: FeedbackTone, variant?: FeedbackVariant) => {
    setFeedback({ message, tone, variant });
  }, []);

  useEffect(() => {
    if (!feedback) return undefined;
    if (!active) { setFeedback(null); return; }
    const timeout = setTimeout(() => setFeedback(null), durationMs);
    return () => clearTimeout(timeout);
  }, [active, durationMs, feedback]);

  return { feedback, showFeedback };
}
