import { AppLoader } from '../../../components/AppLoader';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { ProfileAvatar } from "../../../components/account/ProfileAvatar";
import { useAuth } from "../../../context/AuthContext";
import { useLogout } from "../../../services/auth/auth-mutations";
import { StoreIcon } from "../../user/store-registration/StoreIcon";
import { shell } from "./AdminShell.styles";

export type AdminTab = "Overview" | "Requests" | "Stores" | "Returns" | "Shipping" | "Reviews" | "Earnings";
export const adminTabs = [
  { name: "Overview", icon: "wallet" },
  { name: "Requests", icon: "document" },
  { name: "Stores", icon: "store" },
  { name: "Returns", icon: "document" },
  { name: "Shipping", icon: "document" },
  { name: "Reviews", icon: "document" },
] as const;
export function AdminDrawer({
  visible,
  current,
  onClose,
  onNavigate,
  onShop,
}: {
  visible: boolean;
  current: AdminTab;
  onClose: () => void;
  onNavigate: (tab: AdminTab) => void;
  onShop: () => void;
}) {
  const { user } = useAuth();
  const logout = useLogout();
  async function signOut() {
    onClose();
    await logout.mutateAsync().catch(() => undefined);
  }
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={shell.backdrop}>
        <Pressable
          accessibilityLabel="Close admin menu"
          onPress={onClose}
          style={{ position: "absolute", inset: 0 }}
        />
        <SafeAreaView style={shell.drawer}>
          <LinearGradient
            colors={["#403752", "#273349"]}
            style={shell.drawerHead}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <ProfileAvatar size={60} uri={user?.profileImage} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close menu"
                onPress={onClose}
                style={shell.icon}
              >
                <Text style={shell.menu}>×</Text>
              </Pressable>
            </View>
            <Text style={shell.drawerName}>
              {user?.fullName || "JhelumKart Admin"}
            </Text>
            <Text style={shell.drawerPhone}>+91 {user?.phone}</Text>
          </LinearGradient>
          <ScrollView contentContainerStyle={shell.drawerContent}>
            <Text style={shell.section}>WORKSPACE</Text>
            {[...adminTabs, { name: 'Earnings', icon: 'wallet' } as const].map((tab) => (
              <Pressable
                key={tab.name}
                accessibilityRole="button"
                accessibilityState={{ selected: current === tab.name }}
                onPress={() => {
                  onNavigate(tab.name);
                  onClose();
                }}
                style={[shell.item, current === tab.name && shell.active]}
              >
                <StoreIcon name={tab.icon} size={21} />
                <Text style={shell.itemText}>
                  {tab.name === "Stores" ? "Approved stores" : tab.name === "Returns" ? "Support" : tab.name === 'Earnings' ? 'Seller payouts' : tab.name}
                </Text>
                <StoreIcon name="arrow" size={16} />
              </Pressable>
            ))}
            <View style={shell.bottom}>
              <Text style={shell.section}>ACCOUNT</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onClose();
                  onShop();
                }}
                style={shell.item}
              >
                <StoreIcon name="store" size={21} />
                <Text style={shell.itemText}>Shop as customer</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={logout.isPending}
                onPress={() => void signOut()}
                style={[shell.item, shell.logout]}
              >
                <StoreIcon name="back" color="#A8576C" size={21} />
                <Text style={[shell.itemText, shell.logoutText]}>Log out</Text>
                {logout.isPending && <AppLoader />}
              </Pressable>
              {logout.isError && (
                <Text accessibilityRole="alert" style={shell.logoutText}>
                  Could not log out. Please try again.
                </Text>
              )}
              <Text style={shell.footer}>ZIPPCART · ADMIN WORKSPACE</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
