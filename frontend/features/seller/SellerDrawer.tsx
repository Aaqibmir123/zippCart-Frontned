import { AppLoader } from '../../components/AppLoader';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { ProfileAvatar } from "../../components/account/ProfileAvatar";
import { useAuth } from "../../context/AuthContext";
import { useLogout } from "../../services/auth/auth-mutations";
import { SellerTab } from './seller-types';
import { ss as s } from "./seller.styles";

export function SellerDrawer({
  visible,
  storeName,
  onClose,
  onNavigate,
  onCustomer,
}: {
  visible: boolean;
  storeName: string;
  onClose: () => void;
  onNavigate: (tab: SellerTab) => void;
  onCustomer: () => void;
}) {
  const { user } = useAuth();
  const logout = useLogout();
  async function signOut() {
    onClose();
    await logout.mutateAsync().catch(() => undefined);
  }
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={s.backdrop}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close seller menu"
          onPress={onClose}
          style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
        />
        <SafeAreaView style={s.drawer}>
          <View style={s.drawerHead}>
            <View style={s.between}>
              <ProfileAvatar size={56} uri={user?.profileImage} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close menu"
                onPress={onClose}
                style={s.button}
              >
                <Text style={s.buttonText}>✕</Text>
              </Pressable>
            </View>
            <Text style={[s.title, { color: "white" }]}>{storeName}</Text>
            <Text style={s.heroText}>
              {user?.fullName || "Store owner"} · Seller workspace
            </Text>
          </View>
          <ScrollView contentContainerStyle={[s.content, { flexGrow: 1 }]}>
            <Text style={s.kicker}>MANAGE YOUR STORE</Text>
            {(["Home", "Orders", "Products", "Reviews", "Earnings", "Store details"] as const).map((tab) => (
              <Pressable
                key={tab}
                accessibilityRole="button"
                onPress={() => {
                  onNavigate(tab);
                  onClose();
                }}
                style={s.card}
              >
                <Text style={s.heading}>
                  {tab === "Home" ? "Dashboard" : tab === 'Earnings' ? 'My payouts' : tab}
                </Text>
              </Pressable>
            ))}
            <View style={{ marginTop: "auto", gap: 12, paddingTop: 24 }}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onClose();
                  onCustomer();
                }}
                style={[s.button, s.secondary]}
              >
                <Text style={s.link}>Switch to Customer Mode</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={logout.isPending}
                onPress={() => void signOut()}
                style={[s.button, { backgroundColor: "#F3E7E6" }]}
              >
                {logout.isPending ? (
                  <AppLoader />
                ) : (
                  <Text style={s.danger}>Log out</Text>
                )}
              </Pressable>
              {logout.isError && (
                <Text accessibilityRole="alert" style={s.danger}>
                  Could not log out. Please try again.
                </Text>
              )}
              <Text style={s.small}>JhelumKart seller</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
