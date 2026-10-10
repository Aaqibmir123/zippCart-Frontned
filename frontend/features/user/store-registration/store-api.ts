import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { apiRequest } from "../../../services/api/client";
import { OtpDelivery } from '../../../services/api/auth-api';
import {
  Attachment,
  buildRegistrationPayload,
  RegistrationForm,
} from "./registration-model";

export type StoreSummary = {
  id: string;
  storeName: string;
  storeCategory: string;
  locality: string;
  pincode: string;
  payoutMethod: "upi" | "bank";
  status: 'none' | 'pending' | 'approved' | 'rejected';
  isActive: boolean;
  isOpen: boolean;
  createdAt: string;
  changesPending?: boolean;
  applicationRevision?: number;
  reviewNote?: string;
};
export type StoreDetails = StoreSummary & {
  ownerFullName: string; mobileNumber: string; fullAddress: string;
  payout: { method: 'upi'; upiId: string } | { method: 'bank'; accountHolder: string; accountNumber: string; ifsc: string };
  documents: string[];
  reviewHistory: { action: string; at: string; note?: string }[];
};
export const storeQueryKey = (userId?: string) =>
  ["store-registration", userId] as const;

async function encodePhoto(photo: Attachment | null) {
  if (!photo) throw new Error("Please select all four document photos.");
  const context = ImageManipulator.manipulate(photo.uri);
  let rendered;
  try {
    const original = await context.renderAsync();
    const scale = Math.min(1, 1600 / Math.max(original.width, original.height));
    context.resize({
      width: Math.round(original.width * scale),
      height: Math.round(original.height * scale),
    });
    original.release();
    rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.8,
      base64: true,
    });
    if (!saved.base64 || saved.base64.length > 1398104) {
      throw new Error(
        "A document photo is too large. Please choose a smaller photo.",
      );
    }
    return `data:image/jpeg;base64,${saved.base64}`;
  } finally {
    rendered?.release();
    context.release();
  }
}

export const storeApi = {
  details: () => apiRequest<{ store: StoreDetails }>('/stores/me/details', { method: 'GET' }),
  requestOwnerOtp: (phone: string) => apiRequest<OtpDelivery>('/stores/owner-phone/request', { body: { phone } }),
  verifyOwnerOtp: (phone: string, code: string) => apiRequest<{ phone: string; ownerPhoneProof: string }>(
    '/stores/owner-phone/verify', { body: { phone, code } }),
  get: () =>
    apiRequest<{ store: StoreSummary | null }>("/stores/me", { method: "GET" }),
  setAvailability: (isOpen: boolean) => apiRequest<{ store: StoreSummary }>('/stores/me/availability', { method: 'PATCH', body: { isOpen } }),
  register: async (form: RegistrationForm, ownerPhoneProof?: string, expectedRevision?: number) => {
    const details = buildRegistrationPayload(form);
    // Convert local URIs to bounded image content; never send a device file path.
    const encode = (photo: Attachment | null) => expectedRevision !== undefined && photo?.saved ? null : encodePhoto(photo);
    const storeFrontPhoto = await encode(form.storePhoto);
    const aadhaarCard = await encode(form.aadhaarCard);
    const panCard = await encode(form.panCard);
    const shopLicense = await encode(form.shopLicense);
    return apiRequest<{ store: StoreSummary; belongsToCurrentAccount: boolean }>(expectedRevision === undefined ? '/stores' : '/stores/me/details', {
      method: expectedRevision === undefined ? 'POST' : 'PATCH',
      body: {
        ...details,
        ...(ownerPhoneProof ? { ownerPhoneProof } : {}),
        ...(expectedRevision === undefined ? {} : { expectedRevision }),
        storeFrontPhoto,
        aadhaarCard,
        panCard,
        shopLicense,
        termsVersion: "2026-09-11",
      },
      timeoutMs: 60000,
    });
  },
};
