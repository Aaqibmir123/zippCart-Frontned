import { Text, View } from 'react-native';
import { BrandLogo } from '../../components/brand/BrandLogo';
import { BrandWordmark } from '../../components/brand/BrandWordmark';
import { APP_TAGLINE } from '../../components/brand/brand';
import { a } from './auth.styles';
import { useAuthLayout } from './AuthFrame';

export function AuthBrand({ large = false }: { large?: boolean }) {
  const { compact } = useAuthLayout();
  const small = compact && !large;
  // Keep a native boundary when the brand changes size so its siblings retain focus.
  return <View collapsable={false} style={small ? a.brandCompact : a.brand}>
    <BrandLogo size={large ? 168 : small ? 40 : 112} />
    <BrandWordmark style={small ? a.brandTextCompact : [a.brandText, large && a.brandLarge]} />
    {!small && <Text style={[a.brandTag, large && a.tagLarge]}>{APP_TAGLINE}</Text>}
    {!small && <View style={a.underline} />}
  </View>;
}
