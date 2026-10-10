import { OtpDelivery } from '../services/api/auth-api';

export type AuthStackParamList = {
  Login: undefined;
  TermsAndConditions: undefined;
  PrivacyPolicy: undefined;
  OtpVerification: { phone: string; delivery?: OtpDelivery };
};
