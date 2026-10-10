import { ViewStyle } from 'react-native';

export const shadows: Record<'soft', ViewStyle> = {
  soft: {
    shadowColor: '#1B2350',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
};