import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { PrivacyScreen, TermsScreen } from '../screens/legal/LegalScreen';
import { OtpVerificationScreen } from '../screens/auth/OtpVerificationScreen';
import { AuthStackParamList } from './routes';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="TermsAndConditions" component={TermsScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
    </Stack.Navigator>
  );
}
