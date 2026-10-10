import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, Stop } from 'react-native-svg';

function Leaf({ x, y, scale = 1, rotate = 0 }: { x: number; y: number; scale?: number; rotate?: number }) {
  return <G transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
    <Path d="M0 55C-8 25 8 9 35 0 35 26 29 48 0 55Z" fill="url(#leaf)" />
    <Path d="M0 55 29 9" stroke="#4C9E36" strokeWidth="0.8" />
  </G>;
}

export function AuthBackdrop() {
  return <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
    <Svg width="100%" height="100%" viewBox="0 0 400 850" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="leaf" x1="0" y1="0" x2="1" y2="1"><Stop stopColor="#A4DB3B" /><Stop offset="1" stopColor="#128744" /></LinearGradient>
        <LinearGradient id="wave" x1="0" y1="0" x2="1" y2="1"><Stop stopColor="#B4E79C" /><Stop offset="1" stopColor="#168F4D" /></LinearGradient>
      </Defs>
      <Ellipse cx="-24" cy="0" rx="140" ry="150" fill="#F1F9F2" />
      <Ellipse cx="444" cy="270" rx="135" ry="110" fill="#F1FAF6" />
      <Leaf x={12} y={80} scale={0.8} rotate={-9} />
      <Leaf x={40} y={145} scale={0.4} rotate={15} />
      <Leaf x={375} y={238} scale={0.75} rotate={-60} />
      <Path d="M0 740C95 690 165 825 271 745S367 690 400 682V850H0Z" fill="#ECF8F0" />
      <Path d="M0 793C97 730 163 861 283 768S376 728 400 721V850H0Z" fill="url(#wave)" opacity="0.7" />
      <Path d="M0 831C102 772 184 887 308 803S373 757 400 751V850H0Z" fill="url(#wave)" />
      <Leaf x={-5} y={761} scale={1.6} rotate={-5} />
      <Leaf x={12} y={808} scale={1.6} rotate={28} />
      <Leaf x={400} y={779} scale={1.2} rotate={-65} />
    </Svg>
  </View>;
}
