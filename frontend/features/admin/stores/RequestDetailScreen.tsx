import { AppLoader } from '../../../components/AppLoader';
import { useState } from "react";
import { useAdminConfirmation } from "../components/useAdminConfirmation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useAuth } from "../../../context/AuthContext";
import { StoreIcon } from "../../user/store-registration/StoreIcon";
import { adminStoreApi, DocumentName } from "./admin-api";
import { AdminDocumentViewer } from "./AdminDocumentViewer";
import { StatusBadge } from "./RequestCard";
import { s } from "./admin.styles";

const documents: { name: DocumentName; title: string }[] = [
  { name: "storeFrontPhoto", title: "Store front" },
  { name: "aadhaarCard", title: "Aadhaar card" },
  { name: "panCard", title: "PAN card" },
  { name: "shopLicense", title: "Shop license" },
];
export function RequestDetailScreen({
  id,
  onClose,
  onReviewed,
}: {
  id: string;
  onClose: () => void;
  onReviewed: (message: string) => void;
}) {
  const { user } = useAuth();
  const client = useQueryClient();
  const confirmation = useAdminConfirmation();
  const [note, setNote] = useState('');
  const [document, setDocument] = useState<(typeof documents)[number] | null>(
    null,
  );
  const query = useQuery({
    queryKey: ["admin-store-detail", user?.id, id],
    queryFn: () => adminStoreApi.detail(id),
    gcTime: 0,
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: (status: "approved" | "rejected") =>
      adminStoreApi.review(id, status, query.data?.store.status, query.data?.store.applicationRevision ?? 0, note),
    onSuccess: (result) => {
      void client.invalidateQueries({ queryKey: ["admin-stores"] });
      void client.invalidateQueries({ queryKey: ["admin-store-counts"] });
      void client.invalidateQueries({ queryKey: ["account-access"] });
      void client.invalidateQueries({ queryKey: ["store-registration"] });
      void client.invalidateQueries({ queryKey: ["admin-analytics"] });
    },
  });
  const store = query.data?.store;
  function review(status: "approved" | "rejected") {
    confirmation.confirm({
      title: status === "approved" ? "Approve this store?" : "Reject this request?",
      message: store?.changesPending ? (status === 'approved' ? 'Apply these proposed details to the active store?' : 'Keep the current approved details and send feedback to the seller?') :
        `${store?.storeName ?? 'Store'}: ${status === "approved" ? 'The owner will gain Seller Mode access.' : 'Seller Mode will remain unavailable.'}`,
      label: status === "approved" ? "Approve store" : "Reject request",
      destructive: status === "rejected",
      onConfirm: () => mutation.mutateAsync(status),
      onDone: () => onReviewed(`${store?.storeName ?? 'Store'} ${status}.`),
    });
  }
  return (
    <View style={s.page}>
      {confirmation.dialog}
      <View style={s.header}>
        <Pressable
          disabled={mutation.isPending}
          accessibilityRole="button"
          accessibilityLabel="Back to requests"
          onPress={onClose}
          style={s.back}
        >
          <StoreIcon name="back" />
        </Pressable>
        <View style={s.flex}>
          <Text style={s.eyebrow}>APPLICATION REVIEW</Text>
          <Text style={s.headerTitle}>Store details</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={s.content}>
        {query.isPending ? (
          <AppLoader />
        ) : query.isError ? (
          <View style={s.empty}>
            <Text accessibilityRole="alert" style={s.error}>
              {query.error.message}
            </Text>
            <Pressable onPress={() => void query.refetch()} style={s.button}>
              <Text style={s.link}>Try again</Text>
            </Pressable>
          </View>
        ) : (
          store && (
            <>
              <View style={s.card}>
                <View style={s.between}>
                  <Text style={[s.title, s.flex]}>{store.storeName}</Text>
                  <StatusBadge status={store.changesPending ? 'pending' : store.status} />
                </View>
                <Text style={s.copy}>
                  {store.storeCategory} · Submitted{" "}
                  {new Date(store.createdAt).toLocaleDateString("en-IN")}
                </Text>
                <Text style={s.copy}>Reference: {store.id}</Text>
                {store.changesPending && <Text style={s.copy}>Proposed changes below. Current approved details remain active until you approve.</Text>}
              </View>
              <View style={s.card}>
                <Text style={s.title}>Owner & location</Text>
                <Info label="OWNER" value={store.ownerFullName} />
                <Info label="MOBILE" value={`+91 ${store.mobileNumber}`} />
                <Info label="ADDRESS" value={store.fullAddress} />
                <Info
                  label="LOCALITY / PINCODE"
                  value={`${store.locality}, ${store.pincode}`}
                />
              </View>
              <View style={s.card}>
                <Text style={s.title}>Documents</Text>
                <Text style={s.copy}>
                  Open each photo to check the submitted details.
                </Text>
                <View style={s.documents}>
                  {documents.map((item) => (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`View ${item.title}`}
                      key={item.name}
                      onPress={() => setDocument(item)}
                      style={s.document}
                    >
                      <StoreIcon name="document" size={23} />
                      <Text style={s.link}>{item.title} ↗</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <View style={s.card}>
                <Text style={s.title}>Payout details</Text>
                {store.payout.method === "upi" ? (
                  <Info label="UPI ID" value={store.payout.upiId} />
                ) : (
                  <>
                    <Info
                      label="ACCOUNT HOLDER"
                      value={store.payout.accountHolder}
                    />
                    <Info
                      label="ACCOUNT NUMBER"
                      value={store.payout.accountNumber}
                    />
                    <Info label="IFSC" value={store.payout.ifsc} />
                  </>
                )}
              </View>
              <View style={s.card}>
                <Text style={s.title}>Seller agreement</Text>
                <Text style={s.copy}>
                  Accepted on{" "}
                  {new Date(store.termsAcceptedAt).toLocaleString("en-IN")} ·
                  Version {store.termsVersion}
                </Text>
              </View>
              {!!store.reviewHistory?.length && <View style={s.card}>
                <Text style={s.title}>Review history</Text>
                {store.reviewHistory.map((event, index) => <Text key={index} style={s.copy}>
                  {new Date(event.at).toLocaleString('en-IN')} · {event.action.replaceAll('_', ' ')}{event.note ? `: ${event.note}` : ''}
                </Text>)}
              </View>}
              {(store.status === 'pending' || store.changesPending) && <View style={s.card}>
                <Text style={s.title}>Feedback for seller</Text>
                <TextInput accessibilityLabel="Review feedback" placeholder="Required when rejecting: explain what needs correction"
                  value={note} onChangeText={setNote} multiline maxLength={500} editable={!mutation.isPending} style={s.value} />
              </View>}
            </>
          )
        )}
        {mutation.isError && (
          <View style={s.card}>
            <Text accessibilityRole="alert" style={s.error}>
              {mutation.error.message}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                mutation.reset();
                void query.refetch();
              }}
              style={s.button}
            >
              <Text style={s.link}>Refresh request</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      {(store?.status === "pending" || store?.changesPending) && !query.isError && (
        <View style={s.footer}>
          <Pressable
            accessibilityRole="button"
            disabled={mutation.isPending || note.trim().length < 5}
            onPress={() => review("rejected")}
            style={[s.button, s.rejectButton, mutation.isPending && s.pressed]}
          >
            <Text style={s.rejectedText}>Reject</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={mutation.isPending}
            onPress={() => review("approved")}
            style={[s.button, s.approveButton, mutation.isPending && s.pressed]}
          >
            {mutation.isPending ? (
              <AppLoader color="white" />
            ) : (
              <Text style={s.whiteText}>{store.changesPending ? 'Approve changes' : 'Approve store'}</Text>
            )}
          </Pressable>
        </View>
      )}
      {document && (
        <AdminDocumentViewer
          id={id}
          name={document.name}
          title={document.title}
          onClose={() => setDocument(null)}
        />
      )}
    </View>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <Text selectable style={s.value}>
        {value}
      </Text>
    </View>
  );
}
