import { ReactNode } from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthBrand } from './AuthBrand';

export function SplashArtwork({ children }: { children?: ReactNode }) {
  return <ImageBackground source={require('../../assets/auth/kashmir-splash.png')} resizeMode="cover" style={s.page}>
    <StatusBar style="dark" />
    <SafeAreaView style={s.safe}>
      <View style={s.brand}><AuthBrand large />{children}</View>
    </SafeAreaView>
  </ImageBackground>;
}

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' },
  safe: { flex: 1, alignItems: 'center' },
  brand: { position: 'absolute', top: '14%', alignItems: 'center', width: '100%' },
});
