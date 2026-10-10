import { AppLoader } from '../../../components/AppLoader';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { StoreIcon } from '../../user/store-registration/StoreIcon';
import { availabilityStyles as s } from './availability.styles';

export function SellerAvailabilityToggle({ isOpen, pending, onToggle }: {
  isOpen: boolean;
  pending: boolean;
  onToggle: () => void;
}) {
  const position = useRef(new Animated.Value(isOpen ? 36 : 0)).current;

  useEffect(() => {
    const animation = Animated.spring(position, {
      toValue: isOpen ? 36 : 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 240,
      mass: 0.7,
    });
    animation.start();
    return () => animation.stop();
  }, [isOpen, position]);

  const color = isOpen ? '#6838F5' : '#697586';
  return <Pressable
    accessibilityRole="switch"
    accessibilityLabel="Store availability"
    accessibilityHint={isOpen ? 'Pause new customer orders' : 'Start accepting customer orders'}
    accessibilityState={{ checked: isOpen, disabled: pending, busy: pending }}
    disabled={pending}
    onPress={onToggle}
    style={({ pressed }) => [s.card, isOpen ? s.openBorder : s.closedBorder, pressed && s.pressed]}
  >
    <LinearGradient colors={isOpen ? ['#EDF8F1', '#FAFDFB'] : ['#F0F2F6', '#FCFCFD']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.content} pointerEvents="none">
      <View style={[s.icon, isOpen ? s.openIcon : s.closedIcon]}>
        <StoreIcon name="store" size={23} color={color} />
      </View>
      <View style={s.copy}>
        <View style={s.statusRow}>
          <View style={[s.dot, { backgroundColor: color }]} />
          <Text style={[s.title, { color }]}>{isOpen ? 'Store is open' : 'Store is closed'}</Text>
        </View>
        <Text accessibilityLiveRegion="polite" style={s.subtitle}>
          {pending ? 'Updating availability…' : isOpen ? 'Accepting new orders' : 'New orders are paused'}
        </Text>
      </View>
      <View style={[s.track, isOpen ? s.openTrack : s.closedTrack]}>
        <Text maxFontSizeMultiplier={1.2} style={[s.switchLabel, isOpen ? s.onLabel : s.offLabel]}>{isOpen ? 'ON' : 'OFF'}</Text>
        <Animated.View style={[s.thumb, { transform: [{ translateX: position }] }]}>
          {pending ? <AppLoader size="small" color={color} /> :
            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
              <Path d="M12 3v9m-5.7-6a8 8 0 1 0 11.4 0" stroke={color} strokeWidth={2.3} strokeLinecap="round" />
            </Svg>}
        </Animated.View>
      </View>
    </LinearGradient>
  </Pressable>;
}
