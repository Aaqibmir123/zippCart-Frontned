import { AppLoader } from '../AppLoader';
﻿import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Pressable, Text, View } from 'react-native';
import { apiRequest } from '../../services/api/client';
import { useAuth } from '../../context/AuthContext';
import { useScreenActive } from '../../hooks/useScreenActive';
import { ss as s } from '../../features/seller/seller.styles';

type StockAlert = { productId: string; productName: string; storeId: string; color: string; size: string; stock: number; outOfStock: boolean };
export function InventoryAlerts({ admin = false }: { admin?: boolean }) {
  const { user } = useAuth();
  const active = useScreenActive();
  const [visible, setVisible] = useState(5);
  const query = useInfiniteQuery({ queryKey: ['inventory-alerts', user?.id, admin], enabled: active && !!user, refetchInterval: active ? 30000 : false,
    initialPageParam: 1,
    queryFn: ({ pageParam }) => apiRequest<{ alerts: StockAlert[]; nextPage: number | null }>(`${admin ? '/admin/stock-alerts' : '/seller/inventory/alerts'}?page=${pageParam}`, { method: 'GET' }),
    getNextPageParam: (last) => last.nextPage ?? undefined });
  const alerts = query.data?.pages.flatMap((page) => page.alerts) ?? [];
  return <View style={s.card}><Text style={s.title}>Stock alerts</Text>
    {query.isPending ? <AppLoader /> : query.isError ? <Pressable onPress={() => void query.refetch()}><Text style={s.danger}>Could not load stock alerts. Tap to retry.</Text></Pressable> : <>
      {!alerts.length && <Text style={s.small}>No low-stock items.</Text>}
      {alerts.slice(0, visible).map((item) => <Text key={JSON.stringify([item.productId, item.color, item.size])} style={item.outOfStock ? s.danger : s.text}>{item.productName} {[item.color, item.size].filter(Boolean).join(' / ')} — {item.outOfStock ? 'Out of stock' : `${item.stock} left`}</Text>)}
      {(visible < alerts.length || query.hasNextPage) && <Pressable disabled={query.isFetchingNextPage} onPress={() => {
        setVisible((value) => value + 20);
        if (visible >= alerts.length) void query.fetchNextPage();
      }}><Text style={s.link}>{query.isFetchingNextPage ? 'Loading…' : 'Show more stock alerts'}</Text></Pressable>}
    </>}
  </View>;
}
