import { AppLoader } from '../../components/AppLoader';
import { useEffect, useState } from "react";
import { useMutation } from '@tanstack/react-query';
import { SellerPayoutsScreen } from './payouts/SellerPayoutsScreen';
import { BackHandler, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { ProfileAvatar } from "../../components/account/ProfileAvatar";
import { useAuth } from "../../context/AuthContext";
import { SellerHome } from "./SellerHome";
import { SellerOrders } from "./SellerOrders";
import { SellerProducts } from "./SellerProducts";
import { SellerProductForm } from "./SellerProductForm";
import { SellerDrawer } from "./SellerDrawer";
import { SellerProductInput } from "./products/product-api";
import { useSaveSellerProduct, useSellerProduct, useSellerProducts, useSetSellerProductStatus } from "./products/useSellerProducts";
import { useSellerOrders } from './orders/useSellerOrders';
import { SellerTab } from './seller-types';
import { SellerBottomNav } from './SellerBottomNav';
import { ss as s } from "./seller.styles";
import { storeApi, StoreSummary } from '../user/store-registration/store-api';
import { ReviewWorkspace } from '../reviews/ReviewWorkspace';
import { OperationsQueue } from '../orders/operations-model';
import { SellerAvailabilityToggle } from './availability/SellerAvailabilityToggle';
import { StoreRegistrationEntry } from '../user/store-registration/StoreRegistrationEntry';
import { useNotifications } from '../notifications/NotificationProvider';
import { useScreenActive } from '../../hooks/useScreenActive';

export function SellerWorkspace({
  storeName,
  isOpen,
  onAvailabilityChange,
  onCustomer,
}: {
  storeName: string;
  isOpen: boolean;
  onAvailabilityChange: (store: StoreSummary) => void;
  onCustomer: () => void;
}) {
  const { user } = useAuth();
  const active = useScreenActive();
  const [tab, setTab] = useState<SellerTab>("Home");
  const [drawer, setDrawer] = useState(false);
  const [orderQueue, setOrderQueue] = useState<OperationsQueue>('all');
  const [form, setForm] = useState<{ productId?: string } | null>(null);
  const orderQuery = useSellerOrders(user?.id, orderQueue, !form && (tab === 'Home' || tab === 'Orders'));
  const orders = orderQuery.data?.pages.flatMap((page) => page.orders) ?? [];
  const orderSummary = orderQuery.data?.pages[0]?.summary;
  const productQuery = useSellerProducts(user?.id);
  const saveProduct = useSaveSellerProduct(user?.id);
  const setStatus = useSetSellerProductStatus(user?.id);
  const products = productQuery.data?.pages.flatMap((page) => page.products) ?? [];
  const productCount = productQuery.data?.pages[0]?.total ?? 0;
  const detailQuery = useSellerProduct(user?.id, form?.productId);
  const [feedback, setFeedback] = useState("");
  const { target, consume } = useNotifications();
  useEffect(() => {
    if (!target) return;
    if (target.type === 'order-status') { onCustomer(); return; }
    setTab('Orders'); setOrderQueue('all'); setForm(null); setDrawer(false); consume();
  }, [target, consume, onCustomer]);
  const availability = useMutation({
    mutationFn: storeApi.setAvailability,
    onSuccess: ({ store }) => onAvailabilityChange(store),
    onError: (error) => setFeedback(error instanceof Error ? error.message : 'Could not update store availability.'),
  });
  useEffect(() => {
    if (!feedback) return;
    if (!active) { setFeedback(''); return; }
    const timer = setTimeout(() => setFeedback(""), 4000);
    return () => clearTimeout(timer);
  }, [active, feedback]);
  useEffect(() => {
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (tab === 'Store details') return false;
      if (form) {
        setForm(null);
        return true;
      }
      if (tab !== "Home") {
        setOrderQueue('all');
        setTab("Home");
        return true;
      }
      return false;
    });
    return () => listener.remove();
  }, [form, tab]);
  function navigate(next: SellerTab) {
    if (next === 'Home') setOrderQueue('all');
    setTab(next);
    setForm(null);
  }
  async function save(input: SellerProductInput) {
    await saveProduct.mutateAsync({ id: form?.productId, input });
    setForm(null);
    setTab("Products");
    setFeedback("Product saved.");
  }
  if (tab === 'Store details') return <SafeAreaView style={s.page}>
    <StoreRegistrationEntry onClose={() => navigate('Home')} />
  </SafeAreaView>;
  return (
    <SafeAreaView style={s.page}>
      <View style={s.top}>
        <View style={s.flex}>
          <Text style={s.kicker}>ZIPPCART SELLER</Text>
          <Text numberOfLines={1} style={[s.heading, { marginTop: 4 }]}>
            {storeName}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open seller drawer"
          onPress={() => setDrawer(true)}
        >
          <ProfileAvatar size={44} uri={user?.profileImage} />
        </Pressable>
      </View>
      {!form && tab === 'Home' && (
        <View style={[s.between, { paddingHorizontal: 20, paddingBottom: 8 }]}>
          <View style={s.badge}>
          <Text style={s.badgeText}>DASHBOARD</Text>
          </View>
          <Text style={s.small}>{orderSummary?.pending ?? 0} to dispatch</Text>
        </View>
      )}
      {!form && tab === 'Home' && <SellerAvailabilityToggle isOpen={isOpen}
        pending={availability.isPending} onToggle={() => availability.mutate(!isOpen)} />}
      {!!feedback && (
        <Text accessibilityRole="alert" style={[s.notice, s.link]}>
          {feedback}
        </Text>
      )}
      {form ? (
        form.productId && detailQuery.isPending ? (
          <View style={s.content}><AppLoader accessibilityLabel="Loading product" color="#39785E" /></View>
        ) : form.productId && detailQuery.isError ? (
          <View style={s.content}>
            <Text accessibilityRole="alert" style={s.danger}>Could not load this product.</Text>
            <Pressable accessibilityRole="button" onPress={() => void detailQuery.refetch()} style={s.button}><Text style={s.buttonText}>Try again</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => setForm(null)} style={[s.button, s.secondary]}><Text style={s.link}>Back to products</Text></Pressable>
          </View>
        ) : (
          <SellerProductForm key={form.productId ?? "new"}
            product={detailQuery.data?.product} onSave={save} onClose={() => setForm(null)} />
        )
      ) : tab === 'Earnings' ? <SellerPayoutsScreen /> : tab === 'Reviews' ? <ReviewWorkspace /> : tab === "Orders" ? (
        orderQuery.isPending ? <View style={s.content}><AppLoader accessibilityLabel="Loading orders" color="#39785E" /></View> :
        orderQuery.isError ? <View style={s.content}><Text style={s.danger}>Could not load orders.</Text>
          <Pressable onPress={() => void orderQuery.refetch()} style={s.button}><Text style={s.buttonText}>Try again</Text></Pressable></View> :
        <SellerOrders orders={orders} ownerId={user?.id} refreshing={orderQuery.isRefetching}
          queue={orderQueue} queues={orderQuery.data?.pages[0]?.queues} onQueue={setOrderQueue}
          onRefresh={() => void orderQuery.refetch()} hasMore={!!orderQuery.hasNextPage}
          loadingMore={orderQuery.isFetchingNextPage} onLoadMore={() => void orderQuery.fetchNextPage()} />
      ) : tab === 'Home' && orderQuery.isPending ? (
        <View style={s.content}><AppLoader accessibilityLabel="Loading seller overview" color="#39785E" /></View>
      ) : tab === 'Home' && orderQuery.isError ? (
        <View style={s.content}><Text style={s.danger}>Could not load orders.</Text>
          <Pressable onPress={() => void orderQuery.refetch()} style={s.button}><Text style={s.buttonText}>Try again</Text></Pressable></View>
      ) : productQuery.isPending ? (
        <View style={s.content}><AppLoader accessibilityLabel="Loading products" color="#39785E" /></View>
      ) : productQuery.isError ? (
        <View style={s.content}>
          <Text accessibilityRole="alert" style={s.danger}>Could not load products.</Text>
          <Pressable accessibilityRole="button" onPress={() => void productQuery.refetch()} style={s.button}><Text style={s.buttonText}>Try again</Text></Pressable>
        </View>
      ) : tab === "Home" ? (
        <SellerHome
          queues={orderQuery.data!.pages[0].queues}
          recentOrders={orders.slice(0, 3)}
          productCount={productCount}
          onOrders={(queue) => { setOrderQueue(queue); navigate("Orders"); }}
          onProducts={() => navigate("Products")}
          onEarnings={() => navigate('Earnings')}
        />
      ) : (
        <SellerProducts
          products={products}
          productCount={productCount}
          hasMore={!!productQuery.hasNextPage}
          loadingMore={productQuery.isFetchingNextPage}
          onLoadMore={() => void productQuery.fetchNextPage()}
          onAdd={() => setForm({})}
          onEdit={(product) => setForm({ productId: product.id })}
          onToggle={(id) => {
            if (setStatus.isPending) return;
            const product = products.find((item) => item.id === id);
            if (product) void setStatus.mutateAsync({ id, active: !product.active }).catch((cause) =>
              setFeedback(cause instanceof Error ? cause.message : "Could not update status."));
          }}
        />
      )}
      {!form && <SellerBottomNav
        selected={tab}
        onSelect={navigate}
        onMore={() => setDrawer(true)}
      />}
      <SellerDrawer
        visible={drawer}
        storeName={storeName}
        onClose={() => setDrawer(false)}
        onNavigate={navigate}
        onCustomer={onCustomer}
      />
    </SafeAreaView>
  );
}
