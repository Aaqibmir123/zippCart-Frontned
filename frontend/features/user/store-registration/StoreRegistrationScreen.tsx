import { AppLoader } from '../../../components/AppLoader';
import { useEffect, useRef } from "react";
import { AccessibilityInfo, Alert, BackHandler, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from "expo-linear-gradient";
import {
  AddressStep,
  DocumentsStep,
  PayoutStep,
  StoreDetailsStep,
} from "./RegistrationSteps";
import { palette, s } from "./registration.styles";
import { steps } from "./registration-model";
import { StoreIcon } from "./StoreIcon";
import { useStoreRegistration } from "./useStoreRegistration";
import { SellerPhoneVerification } from './SellerPhoneVerification';
import { StoreDetails } from './store-api';

const stepIcons = ["store", "pin", "document", "wallet"] as const;

export function StoreRegistrationScreen({ onClose, existing, onSaved }: {
  onClose: () => void; existing?: StoreDetails; onSaved?: () => void;
}) {
  const { step, form, errors, busy, submissionError, update, next, back, loginPhone, phoneVerified, verifyPhone, registeredPhone } =
    useStoreRegistration(existing, onSaved);
  const scroll = useRef<ScrollView>(null);
  const current = steps[step];
  const Step = [StoreDetailsStep, AddressStep, DocumentsStep, PayoutStep][step];
  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => { goBack(); return true; });
    return () => listener.remove();
  });

  if (registeredPhone) return <View style={s.page}><View style={s.card}>
    <Text style={s.title}>Registration saved</Text>
    <Text style={s.subtitle}>The store is linked to +91 {registeredPhone}. Sign in with that number to view its status. Seller Mode becomes available after admin approval.</Text>
    <Pressable accessibilityRole="button" onPress={onClose} style={s.secondary}><Text style={s.link}>Back to account</Text></Pressable>
  </View></View>;

  function goBack() {
    if (busy) return;
    Keyboard.dismiss();
    if (step === 0) {
      Alert.alert(
        "Leave store registration?",
        "Unsaved details will be cleared when you leave.",
        [
          { text: "Keep editing", style: "cancel" },
          { text: "Leave", style: "destructive", onPress: onClose },
        ],
      );
    } else {
      back();
      scroll.current?.scrollTo({ y: 0, animated: false });
    }
  }
  async function goNext() {
    if (busy) return;
    Keyboard.dismiss();
    const valid = await next();
    scroll.current?.scrollTo({ y: 0, animated: true });
    AccessibilityInfo.announceForAccessibility(
      valid
        ? step === 3
          ? "Registration received. Pending review."
          : `Step ${step + 2}: ${steps[step + 1].label}`
        : "Please check the form and try again.",
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={s.page}
    >
      <View style={s.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={step ? "Previous step" : "Back to account"}
          disabled={busy}
          onPress={goBack}
          style={s.iconButton}
        >
          <StoreIcon name="back" color={palette.ink} />
        </Pressable>
        <View style={s.headerCopy}>
          <Text style={s.eyebrow}>ZIPPCART SELLER</Text>
          <Text style={s.headerTitle}>Your store</Text>
        </View>
        <Text style={s.stepCount}>{`0${step + 1} / 04`}</Text>
      </View>
      <View
        accessibilityLabel={`Step ${step + 1} of 4: ${current.label}`}
        style={s.progress}
      >
        {steps.map((item, index) => (
          <View key={item.label} style={s.progressItem}>
            <View style={[s.progressLine, index <= step && s.progressActive]} />
            <Text style={[s.progressLabel, index <= step && s.activeLabel]}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
      <ScrollView
        ref={scroll}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={s.scroll}
      >
        {!!submissionError && (
          <Text accessibilityRole="alert" style={s.error}>
            {submissionError}
          </Text>
        )}
        {!!Object.keys(errors).length && (
          <Text accessibilityRole="alert" style={s.error}>
            Please check the highlighted fields below.
          </Text>
        )}
        <LinearGradient
          colors={["#EAE4F6", "#F2EEF9", "#F4F1F8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.hero}
        >
          <View style={s.heroTop}>
            <View style={s.heroIcon}>
              <StoreIcon name={stepIcons[step]} />
            </View>
            <Text style={s.badge}>ALL FIELDS REQUIRED</Text>
          </View>
          <Text accessibilityRole="header" style={s.title}>
            {existing && step === 0 ? existing.status === 'rejected' ? 'Correct your application' : 'Edit store details' : current.title}
          </Text>
          <Text style={s.subtitle}>{existing && step === 0 ? existing.status === 'rejected' ?
            'Correct the review feedback, then submit again for approval.' :
            'Submit changes for admin review. Your approved details stay in use until approval.' : current.subtitle}</Text>
        </LinearGradient>
        <View
          style={s.formStack}
          pointerEvents={busy ? "none" : "auto"}
          accessibilityElementsHidden={busy}
        >
          <Step form={form} errors={errors} update={update} editing={!!existing} />
          {step === 0 && <SellerPhoneVerification key={form.mobile} phone={form.mobile} loginPhone={loginPhone}
            verified={phoneVerified} onVerified={verifyPhone} />}
        </View>
      </ScrollView>
      <View style={s.footer}>
        <View style={s.footerRow}>
          {step > 0 && (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={goBack}
              style={s.secondary}
            >
              <Text style={s.link}>Back</Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy, disabled: busy }}
            disabled={busy}
            onPress={() => void goNext()}
            style={({ pressed }) => [s.primary, (pressed || busy) && s.pressed]}
          >
            {busy ? (
              <>
                <AppLoader color="white" />
                <Text style={s.primaryText}>Submitting…</Text>
              </>
            ) : (
              <>
                <Text style={s.primaryText}>
                  {step === 3 ? existing ? existing.status === 'rejected' ? 'Resubmit application' : 'Submit changes' : 'Submit registration' : 'Continue'}
                </Text>
                <StoreIcon name="arrow" size={18} color="white" />
              </>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
