import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

const themeStorageKey = 'zippcart.theme.mode.v1';

const palettes = {
  light: {
    background: '#FAF8FC',
    surface: '#FFFFFF',
    raised: '#F4EFF8',
    text: '#282238',
    muted: '#787184',
    border: '#EBE5F1',
    primary: '#7139F5',
    accent: '#EB477D',
  },
  dark: {
    background: '#15121C',
    surface: '#211D2A',
    raised: '#2D2738',
    text: '#F6F0FC',
    muted: '#B9AEC8',
    border: '#40364E',
    primary: '#B69AFF',
    accent: '#FF7EA9',
  },
} as const;

type ThemeMode = keyof typeof palettes;
type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  colors: (typeof palettes)[ThemeMode];
  toggleTheme: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<ThemeMode>('light');
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(themeStorageKey).then((saved) => {
      if (active && (saved === 'dark' || saved === 'light')) setMode(saved);
    }).catch(() => {
      if (active) Alert.alert('Theme setting unavailable', 'Your saved appearance could not be loaded. Light mode is being used.');
    });
    return () => { active = false; };
  }, []);
  const toggleTheme = useCallback(async () => {
    const previous = mode;
    const next = previous === 'dark' ? 'light' : 'dark';
    setMode(next);
    try {
      await AsyncStorage.setItem(themeStorageKey, next);
    } catch (error) {
      setMode(previous);
      throw error;
    }
  }, [mode]);
  const value = useMemo(() => ({ mode, isDark: mode === 'dark', colors: palettes[mode], toggleTheme }), [mode, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useAppTheme must be used within ThemeProvider.');
  return value;
}
