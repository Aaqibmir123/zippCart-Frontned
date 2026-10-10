import { Image } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
export const avatarColors = ['#D9D1FA', '#C9E6DA', '#F4DCC6'];
export function ProfileAvatar({ size = 64, color = avatarColors[0], uri }: { size?: number; color?: string; uri?: string | null }) {
  if (uri) return <Image accessibilityLabel="Profile photo" source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: 'white' }} />;
  return <Svg accessibilityLabel="Profile avatar" width={size} height={size} viewBox="0 0 64 64">
    <Circle cx={32} cy={32} r={31} fill={color} stroke="#FFFFFF" strokeWidth={2} />
    <Path d="M10 54c2-13 11-18 22-18s20 5 22 18a30 30 0 0 1-44 0" fill="#535C82" />
    <Circle cx={32} cy={25} r={12} fill="#FFF5E9" />
    <Path d="M20 25c-3-16 23-20 25-1-7-1-10-6-11-8-2 5-8 8-14 9" fill="#39425E" />
  </Svg>;
}
