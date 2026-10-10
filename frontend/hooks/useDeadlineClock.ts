import { useEffect, useState } from 'react';
import { useScreenActive } from './useScreenActive';

// Render once on return-window expiry, without a recurring screen clock.
export function useDeadlineClock(deadline?: string | null) {
  const active = useScreenActive();
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (!active) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function update() {
      const current = Date.now();
      setNow(current);
      const remaining = deadline ? new Date(deadline).getTime() - current : 0;
      if (Number.isFinite(remaining) && remaining > 0) {
        timer = setTimeout(update, Math.min(remaining + 1, 2147483647));
      }
    }
    update();
    return () => clearTimeout(timer);
  }, [active, deadline]);
  return now;
}
