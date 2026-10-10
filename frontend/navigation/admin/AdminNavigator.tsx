import { useCallback, useEffect, useState } from "react";
import { useNotifications } from '../../features/notifications/NotificationProvider';
import { AdminPayoutsScreen } from '../../features/admin/payouts/AdminPayoutsScreen';
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProfileAvatar } from "../../components/account/ProfileAvatar";
import { useAuth } from "../../context/AuthContext";
import { AdminStoresScreen } from "../../features/admin/stores";
import {
  AdminDrawer,
  AdminTab,
  adminTabs,
} from "../../features/admin/stores/AdminDrawer";
import { AdminDashboard } from "../../features/admin/dashboard/AdminDashboard";
import { OrderQueue } from "../../features/admin/dashboard/dashboard-api";
import { ReturnWorkspace, SupportInboxTab } from "../../features/admin/returns/ReturnWorkspace";
import { AdminCaseDetail } from "../../features/admin/returns/AdminCaseDetail";
import { RequestDetailScreen } from "../../features/admin/stores/RequestDetailScreen";
import { shell } from "../../features/admin/stores/AdminShell.styles";
import { s } from "../../features/admin/stores/admin.styles";
import { StoreIcon } from "../../features/user/store-registration/StoreIcon";
import { ShopNavigator } from "../user/ShopNavigator";
import { AdminShippingScreen } from '../../features/admin/shipping/AdminShippingScreen';
import { ReviewWorkspace } from '../../features/reviews/ReviewWorkspace';

export function AdminNavigator() {
  const { user } = useAuth();
  const [shopping, setShopping] = useState(false);
  const [tab, setTab] = useState<AdminTab>("Overview");
  const [drawer, setDrawer] = useState(false);
  const [shippingQueue, setShippingQueue] = useState<OrderQueue>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [supportCase, setSupportCase] = useState<{ orderId: string; caseId: string } | null>(null);
  const [supportTab, setSupportTab] = useState<SupportInboxTab>('active');
  const { target, consume } = useNotifications();
  const [notificationOrder, setNotificationOrder] = useState<string | undefined>();
  const notificationOpened = useCallback(() => setNotificationOrder(undefined), []);
  useEffect(() => {
    if (!target) return;
    if (target.type === 'order-status') { setShopping(true); return; }
    setShopping(false); setDrawer(false); setSelected(null); setSupportCase(null);
    setShippingQueue('all'); setTab('Shipping'); setNotificationOrder(target.orderId); consume();
  }, [target, consume]);
  function navigate(next: AdminTab) {
    setTab(next);
    setSelected(null);
    setSupportCase(null);
    setFeedback("");
  }
  if (shopping)
    return (
      <SafeAreaView style={shell.page} edges={["bottom"]}>
        <View style={shell.top}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setShopping(false)}
            style={shell.item}
          >
            <StoreIcon name="back" />
            <Text style={shell.itemText}>Back to admin dashboard</Text>
          </Pressable>
        </View>
        <ShopNavigator />
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={shell.page}>
      {supportCase ? <AdminCaseDetail {...supportCase} onClose={() => setSupportCase(null)} /> : selected ? (
        <RequestDetailScreen
          id={selected}
          onClose={() => setSelected(null)}
          onReviewed={(message) => {
            setSelected(null);
            setFeedback(message);
          }}
        />
      ) : (
        <>
          <View style={shell.top}>
            <View style={shell.flex}>
              <Text style={shell.brand}>
                {tab === "Overview"
                  ? "JhelumKart"
                  : tab === "Stores"
                    ? "Approved stores"
                    : tab === 'Earnings' ? 'Seller payouts' : tab === "Returns" ? "Support" : tab === "Shipping" ? "Shipping" : tab === "Reviews" ? "Reviews" : "Store requests"}
              </Text>
              <Text style={shell.caption}>ADMIN WORKSPACE</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open account menu"
              onPress={() => setDrawer(true)}
            >
              <ProfileAvatar size={44} uri={user?.profileImage} />
            </Pressable>
          </View>
          {!!feedback && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss review confirmation"
              onPress={() => setFeedback("")}
            >
              <Text accessibilityRole="alert" style={s.success}>
                {feedback}
              </Text>
            </Pressable>
          )}
          {tab === "Overview" ? (
            <AdminDashboard onNavigate={navigate} onQueue={(queue) => { setShippingQueue(queue); navigate('Shipping'); }} />
          ) : tab === 'Earnings' ? <AdminPayoutsScreen /> : tab === 'Reviews' ? <ReviewWorkspace admin /> : tab === 'Shipping' ? (
            <AdminShippingScreen initialQueue={shippingQueue} initialOrderId={notificationOrder} onNotificationOpened={notificationOpened} onNavigate={navigate} />
          ) : tab === "Returns" ? (
            <ReturnWorkspace tab={supportTab} onTabChange={setSupportTab} onOpen={setSupportCase} />
          ) : (
            <AdminStoresScreen
              key={tab}
              embedded
              initialFilter={tab === "Stores" ? "approved" : "pending"}
              onClose={() => navigate("Overview")}
              onOpenRequest={setSelected}
            />
          )}
          <View accessibilityRole="tablist" style={shell.tabs}>
            {adminTabs.map((item) => (
              <Pressable
                key={item.name}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === item.name }}
                onPress={() => navigate(item.name)}
                style={[shell.tab, tab === item.name && shell.active]}
              >
                <StoreIcon
                  name={item.icon}
                  size={22}
                  color={tab === item.name ? "#6D568C" : "#8B8197"}
                />
                <Text
                  style={[shell.tabText, tab === item.name && shell.activeText]}
                >
                  {item.name === "Returns" ? "Support" : item.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      <AdminDrawer
        visible={drawer}
        current={tab}
        onClose={() => setDrawer(false)}
        onNavigate={navigate}
        onShop={() => setShopping(true)}
      />
    </SafeAreaView>
  );
}
