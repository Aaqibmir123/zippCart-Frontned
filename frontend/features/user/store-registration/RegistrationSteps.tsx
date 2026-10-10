import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { DocumentUpload } from "./DocumentUpload";
import { FormField } from "./FormField";
import {
  FormErrors,
  RegistrationForm,
  storeCategories,
} from "./registration-model";
import { s } from "./registration.styles";
import { StoreIcon } from "./StoreIcon";

export type StepProps = {
  form: RegistrationForm;
  errors: FormErrors;
  editing?: boolean;
  update: <K extends keyof RegistrationForm>(
    key: K,
    value: RegistrationForm[K],
  ) => void;
};

export function StoreDetailsStep({ form, errors, update, editing }: StepProps) {
  return (
    <View style={s.card}>
      <FormField
        label="Store name"
        placeholder="e.g. The Corner Store"
        value={form.storeName}
        onChangeText={(v) => update("storeName", v)}
        error={errors.storeName}
        maxLength={100}
        autoCapitalize="words"
      />
      <FormField
        label="Owner full name"
        placeholder="Name as shown on Aadhaar card"
        value={form.ownerName}
        onChangeText={(v) => update("ownerName", v)}
        error={errors.ownerName}
        maxLength={100}
        autoCapitalize="words"
        autoComplete="name"
      />
      <FormField
        label="Seller login number"
        placeholder="10-digit mobile number"
        hint={editing ? 'Seller login number stays linked to this store. Verify it below to submit changes.' : 'This number will own the store and get Seller Mode after approval. Verify it if different from your current login.'}
        editable={!editing}
        value={form.mobile}
        onChangeText={(v) => update("mobile", v.replace(/\D/g, ""))}
        error={errors.mobile}
        maxLength={10}
        keyboardType="phone-pad"
        autoComplete="tel-national"
      />
      <View style={s.field}>
        <Text style={s.label}>Store category</Text>
        <View style={s.chips}>
          {storeCategories.map((category) => (
            <Pressable
              key={category}
              accessibilityRole="radio"
              accessibilityState={{ checked: form.category === category }}
              onPress={() => update("category", category)}
              style={[s.chip, form.category === category && s.chipSelected]}
            >
              <Text
                style={[
                  s.chipText,
                  form.category === category && s.chipTextSelected,
                ]}
              >
                {category}
              </Text>
            </Pressable>
          ))}
        </View>
        {!!errors.category && (
          <Text accessibilityRole="alert" style={s.error}>
            {errors.category}
          </Text>
        )}
      </View>
    </View>
  );
}

export function AddressStep({ form, errors, update }: StepProps) {
  return (
    <View style={s.card}>
      <FormField
        label="Full address"
        placeholder="Shop / building no., street, city and state"
        value={form.address}
        onChangeText={(v) => update("address", v)}
        error={errors.address}
        maxLength={350}
        multiline
        autoCapitalize="sentences"
      />
      <FormField
        label="Area / Locality"
        placeholder="e.g. Main Market, Kupwara"
        value={form.locality}
        onChangeText={(v) => update("locality", v)}
        error={errors.locality}
        maxLength={100}
        autoCapitalize="words"
      />
      <FormField
        label="Pincode"
        placeholder="6-digit pincode"
        value={form.pincode}
        onChangeText={(v) => update("pincode", v.replace(/\D/g, ""))}
        error={errors.pincode}
        maxLength={6}
        keyboardType="number-pad"
        autoComplete="postal-code"
      />
    </View>
  );
}

export function DocumentsStep({ form, errors, update }: StepProps) {
  return (
    <View style={s.card}>
      <DocumentUpload
        label="Store front photo"
        hint="Show the entrance and store sign."
        value={form.storePhoto}
        error={errors.storePhoto}
        onChange={(v) => update("storePhoto", v)}
      />
      <DocumentUpload
        label="Aadhaar card"
        hint="A clear photo of the owner's Aadhaar card."
        value={form.aadhaarCard}
        error={errors.aadhaarCard}
        onChange={(v) => update("aadhaarCard", v)}
      />
      <DocumentUpload
        label="Shop license"
        hint="Show the full license with readable details."
        value={form.shopLicense}
        error={errors.shopLicense}
        onChange={(v) => update("shopLicense", v)}
      />
      <DocumentUpload
        label="PAN card"
        hint="A clear photo of the owner's PAN card."
        value={form.panCard}
        error={errors.panCard}
        onChange={(v) => update("panCard", v)}
      />
    </View>
  );
}

export function PayoutStep({ form, errors, update }: StepProps) {
  const [termsOpen, setTermsOpen] = useState(false);
  return (
    <>
      <View style={s.card}>
        <View style={s.methodRow}>
          {(["upi", "bank"] as const).map((method) => (
            <Pressable
              key={method}
              accessibilityRole="radio"
              accessibilityLabel={
                method === "upi" ? "UPI payout" : "Bank account payout"
              }
              accessibilityState={{ checked: form.payoutMethod === method }}
              onPress={() => update("payoutMethod", method)}
              style={[s.method, form.payoutMethod === method && s.chipSelected]}
            >
              <StoreIcon
                name={method === "upi" ? "wallet" : "store"}
                size={20}
              />
              <Text
                style={[
                  s.chipText,
                  form.payoutMethod === method && s.chipTextSelected,
                ]}
              >
                {method === "upi" ? "UPI ID" : "Bank account"}
              </Text>
            </Pressable>
          ))}
        </View>
        {form.payoutMethod === "upi" ? (
          <FormField
            label="Payout UPI ID"
            placeholder="yourstore@bank"
            value={form.upi}
            onChangeText={(v) => update("upi", v.replace(/\s/g, ""))}
            error={errors.upi}
            maxLength={320}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />
        ) : (
          <>
            <FormField
              label="Account holder name"
              placeholder="Name on your bank account"
              value={form.accountHolder}
              onChangeText={(v) => update("accountHolder", v)}
              error={errors.accountHolder}
              maxLength={100}
              autoCapitalize="words"
            />
            <FormField
              label="Bank account number"
              placeholder="Enter account number"
              value={form.accountNumber}
              onChangeText={(v) =>
                update("accountNumber", v.replace(/\D/g, ""))
              }
              error={errors.accountNumber}
              maxLength={18}
              keyboardType="number-pad"
            />
            <FormField
              label="IFSC code"
              placeholder="e.g. SBIN0001234"
              value={form.ifsc}
              onChangeText={(v) =>
                update("ifsc", v.toUpperCase().replace(/[^A-Z0-9]/g, ""))
              }
              error={errors.ifsc}
              maxLength={11}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </>
        )}
      </View>
      <View style={s.card}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: termsOpen }}
          onPress={() => setTermsOpen(!termsOpen)}
          style={s.textButton}
        >
          <Text style={s.link}>
            {termsOpen ? "Hide Seller Terms −" : "Read Seller Terms ↗"}
          </Text>
        </Pressable>
        {termsOpen && (
          <View style={s.terms}>
            <Text style={s.label}>Store registration terms</Text>
            <Text style={s.hint}>
              Provide accurate store, owner, address and payout details. Only
              share documents you are authorised to provide.
            </Text>
            <Text style={s.hint}>
              By submitting, you agree to send your store photo, Aadhaar card,
              PAN card, shop license and payout details to JhelumKart for seller
              registration. Your acceptance is recorded with this application.
            </Text>
            <Text style={s.hint}>
              You confirm that you are authorised to register this store and
              that the supplied identity and shop license documents belong to
              the owner or business.
            </Text>
            <Text style={s.hint}>
              A submitted registration will require review before a store can
              become active. Submitting this form does not activate your store.
            </Text>
          </View>
        )}
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: form.acceptedTerms }}
          onPress={() => update("acceptedTerms", !form.acceptedTerms)}
          style={s.checkRow}
        >
          <View style={[s.checkbox, form.acceptedTerms && s.checked]}>
            {form.acceptedTerms && (
              <StoreIcon name="check" size={16} color="white" />
            )}
          </View>
          <Text style={s.checkText}>
            I have read and accept the Seller Terms.
          </Text>
        </Pressable>
        {!!errors.acceptedTerms && (
          <Text accessibilityRole="alert" style={s.error}>
            {errors.acceptedTerms}
          </Text>
        )}
      </View>
    </>
  );
}
