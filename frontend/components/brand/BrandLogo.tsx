import { SvgXml } from 'react-native-svg';
import { brandLogoSvg } from './brand';

export function BrandLogo({ size = 112 }: { size?: number }) {
  return <SvgXml xml={brandLogoSvg} width={size} height={size * 160 / 180} accessible={false} />;
}
