import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path } from 'react-native-svg';
import { BrandLogo } from '../../components/brand/BrandLogo';
import { BrandWordmark } from '../../components/brand/BrandWordmark';
import { APP_NAME, APP_TAGLINE } from '../../components/brand/brand';
import { AuthStackParamList } from '../../navigation/routes';
import { supportContact } from '../../constants/support';
import { LegalDocument, privacyDocument, termsDocument } from './legal-content';
import { s } from './legal.styles';

function DocumentScreen({ document, onBack }: { document: LegalDocument; onBack: () => void }) {
  const [emailError, setEmailError] = useState(false);

  async function openEmail() {
    setEmailError(false);
    try {
      await Linking.openURL(`mailto:${supportContact.email}`);
    } catch {
      setEmailError(true);
    }
  }

  return (
    <SafeAreaView style={s.page}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={onBack}
          style={({ pressed }) => [s.back, pressed && s.pressed]}>
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" accessible={false}>
            <Path d="m14 6-6 6 6 6M8 12h12" stroke="#082725" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
        <Text accessibilityRole="header" style={s.pageTitle}>{document.title}</Text>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        <LinearGradient colors={['#F1F8EE', '#F5FBF7', '#FFFFFF']} style={s.intro}>
          <View style={s.brandRow}><BrandLogo size={38} /><BrandWordmark style={s.wordmark} /></View>
          <Text style={s.eyebrow}>{document.eyebrow}</Text>
          <Text style={s.lead}>{document.intro}</Text>
          <View style={s.documentMeta}>
            <View style={s.accent} />
            <Text style={s.metaText}>{document.sections.length} sections</Text>
          </View>
        </LinearGradient>
        <View style={s.document}>
          {document.sections.map((section, index) => (
            <View key={section.title} style={[s.section, index > 0 && s.divider]}>
              <View style={s.heading}>
                <View style={s.numberBadge}>
                  <Text style={s.number}>{String(index + 1).padStart(2, '0')}</Text>
                </View>
                <Text accessibilityRole="header" style={s.title}>{section.title}</Text>
              </View>
              <Text selectable style={s.body}>{section.body}</Text>
            </View>
          ))}
        </View>
        <View style={s.contact}>
          <View style={s.contactHeading}>
            <View style={s.contactIcon}>
              <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" accessible={false}>
                <Path d="M4 5h16v14H4V5Zm0 1 8 6 8-6" stroke="#13872E" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </View>
            <Text accessibilityRole="header" style={s.contactTitle}>Get in touch</Text>
          </View>
          <Text style={s.body}>For questions about these terms or your privacy.</Text>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Email ${APP_NAME} at ${supportContact.email}`}
            onPress={() => void openEmail()}
            style={({ pressed }) => [s.emailLink, pressed && s.pressed]}
          >
            <Text selectable style={s.email}>{supportContact.email}</Text>
          </Pressable>
          {emailError && <Text accessibilityRole="alert" style={s.error}>Could not open email. Copy the address above into your email app.</Text>}
          <Text style={s.location}>{supportContact.location}</Text>
        </View>
        <View style={s.footer}>
          <BrandWordmark style={s.footerBrand} />
          <Text style={s.tagline}>{APP_TAGLINE}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export function TermsScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'TermsAndConditions'>) {
  return <DocumentScreen document={termsDocument} onBack={() => navigation.goBack()} />;
}

export function PrivacyScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'PrivacyPolicy'>) {
  return <DocumentScreen document={privacyDocument} onBack={() => navigation.goBack()} />;
}

