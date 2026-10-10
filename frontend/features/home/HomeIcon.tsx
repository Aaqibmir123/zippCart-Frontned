import Svg, { Path } from 'react-native-svg';

const paths = {
  location: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  home: 'm3 10 9-7 9 7v10h-6v-7H9v7H3V10Z',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  heart: 'M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-4 5 3 11 8 15 5-4 12-10 8-15Z',
  account: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21v-2a8 8 0 0 1 16 0v2H4Z',
  tag: 'M3 12 12 3h8v8l-9 10-8-9ZM16 7h.01',
  orders: 'M4 5h16v16H4V5ZM8 5V3h8v2M8 10h8M8 14h8M8 18h5',
  search: 'M20 20l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z',
  cart: 'M2 3h3l3 12h11l3-9H6M9 20h.01M18 20h.01',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  close: 'm6 6 12 12M6 18 18 6',
} as const;

export function HomeIcon({ name, size = 24, color = '#101D46', filled = false }: {
  name: keyof typeof paths; size?: number; color?: string; filled?: boolean;
}) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'}>
    <Path d={paths[name]} stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>;
}
