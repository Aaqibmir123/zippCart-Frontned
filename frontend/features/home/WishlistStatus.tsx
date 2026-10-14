import { Pressable, Text } from 'react-native';
import { useAppTheme } from '../../theme/ThemeProvider';
import { h } from './home.styles';

export function WishlistStatus({ pending, fetching, error, onRetry }: {
  pending: boolean; fetching: boolean; error: boolean; onRetry: () => void;
}) {
  const theme = useAppTheme();
  if (!pending && !error) return null;
  const message = fetching
    ? error ? 'Retrying wishlist…' : 'Loading wishlist…'
    : 'Wishlist unavailable. Tap to retry.';
  return <Pressable accessibilityRole="button" accessibilityLabel={message}
    accessibilityState={{ disabled: fetching, busy: fetching }} disabled={fetching}
    onPress={onRetry} style={h.retry}>
    <Text accessibilityLiveRegion="polite" style={[h.hint, { color: theme.colors.muted }]}>{message}</Text>
  </Pressable>;
}
