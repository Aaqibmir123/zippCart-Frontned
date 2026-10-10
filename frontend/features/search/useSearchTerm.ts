import { useEffect, useState } from 'react';

export const SEARCH_MAX_LENGTH = 80;
export const SEARCH_DEBOUNCE_MS = 300;

export function useSearchTerm(input: string, active: boolean) {
  const term = input.trim();
  const [settled, setSettled] = useState('');
  const valid = term.length > 0 && term.length <= SEARCH_MAX_LENGTH;
  useEffect(() => {
    if (!active || !valid) { setSettled(''); return; }
    setSettled('');
    const timer = setTimeout(() => setSettled(term), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [active, term, valid]);
  // Unmount the old observer as soon as input changes, cancelling obsolete work.
  return active && valid && settled === term ? term : null;
}
