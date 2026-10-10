const test = require('node:test');
const assert = require('node:assert/strict');
const { QueryClient, InfiniteQueryObserver } = require('@tanstack/react-query');
const { sourceLoader } = require('./helpers/load-source.cjs');
const tick = () => new Promise(setImmediate);

function setup(t, list) {
  let session, focused = true;
  const calls = [];
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const load = sourceLoader({
    '@tanstack/react-query': { useInfiniteQuery: (options) => options },
    '../../hooks/useScreenActive': { useScreenActive: () => focused },
    '../../context/AuthContext': { useAuth: () => ({ session, user: session?.userId ? { id: session.userId } : null }) },
    '../cart/cart-queries': { cartKey: () => ['cart'] },
    '../api/order-api': { orderApi: { list: async (params, signal) => { calls.push({ params, signal }); return list(params, signal); } } },
  });
  const sessions = load('services/auth/session-scope.ts');
  session = sessions.setSessionUser('buyer');
  const queries = load('services/orders/order-queries.ts');
  t.after(() => client.clear());
  return { queries, calls, client,
    focus: (value) => { focused = value; },
    login: (id) => { session = sessions.setSessionUser(id, true); },
  };
}

test('order history fetches bounded pages with cancellation and stops at the last cursor', async (t) => {
  const h = setup(t, async ({ cursor }) => cursor
    ? { orders: [{ id: 'old' }], nextCursor: null }
    : { orders: [{ id: 'new' }], nextCursor: 'cursor-1' });
  const observer = new InfiniteQueryObserver(h.client, h.queries.useOrders('past'));
  await observer.refetch();
  assert.equal(h.calls.length, 1);
  assert.deepEqual(h.calls[0].params, { tab: 'past', limit: 20, cursor: undefined });
  assert.ok(h.calls[0].signal instanceof AbortSignal);
  await observer.fetchNextPage({ cancelRefetch: false });
  assert.deepEqual(observer.getCurrentResult().data.pages.flatMap((page) => page.orders).map((order) => order.id), ['new', 'old']);
  assert.equal(observer.getCurrentResult().hasNextPage, false);
  await observer.fetchNextPage({ cancelRefetch: false });
  assert.equal(h.calls.length, 2);
});

test('repeated load-more calls coalesce and a failed page preserves loaded orders for retry', async (t) => {
  let rejectPage;
  let fail = true;
  const h = setup(t, ({ cursor }) => !cursor ? Promise.resolve({ orders: [{ id: 'new' }], nextCursor: 'next' })
    : fail ? new Promise((_resolve, reject) => { rejectPage = reject; })
      : Promise.resolve({ orders: [{ id: 'old' }], nextCursor: null }));
  const observer = new InfiniteQueryObserver(h.client, h.queries.useOrders('past'));
  await observer.refetch();
  const first = observer.fetchNextPage({ cancelRefetch: false });
  const duplicate = observer.fetchNextPage({ cancelRefetch: false });
  await tick();
  assert.equal(h.calls.length, 2);
  rejectPage(new Error('Offline'));
  await Promise.all([first, duplicate]);
  assert.equal(observer.getCurrentResult().isFetchNextPageError, true);
  assert.equal(observer.getCurrentResult().data.pages[0].orders[0].id, 'new');
  fail = false;
  await observer.fetchNextPage({ cancelRefetch: false });
  assert.equal(observer.getCurrentResult().data.pages.length, 2);
  assert.equal(h.calls[2].params.cursor, 'next');
});

test('refresh recomputes later cursors when a new order arrives', async (t) => {
  let refreshed = false;
  const h = setup(t, async ({ cursor }) => !cursor
    ? { orders: [{ id: refreshed ? 'inserted' : 'new' }], nextCursor: refreshed ? 'new-boundary' : 'old-boundary' }
    : { orders: [{ id: refreshed ? 'new' : 'old' }], nextCursor: null });
  const observer = new InfiniteQueryObserver(h.client, h.queries.useOrders('past'));
  await observer.refetch(); await observer.fetchNextPage();
  refreshed = true;
  await observer.refetch();
  assert.deepEqual(h.calls.slice(2).map((call) => call.params.cursor), [undefined, 'new-boundary']);
  assert.deepEqual(observer.getCurrentResult().data.pages.flatMap((page) => page.orders).map((order) => order.id), ['inserted', 'new']);
});

test('tabs and login generations use distinct caches; only focused Active orders poll', async (t) => {
  const h = setup(t, async () => ({ orders: [], nextCursor: null }));
  const active = h.queries.useOrders('active');
  const past = h.queries.useOrders('past');
  assert.notDeepEqual(active.queryKey, past.queryKey);
  assert.equal(active.refetchInterval, 30000);
  assert.equal(past.refetchInterval, false);
  h.focus(false);
  assert.equal(h.queries.useOrders().enabled, false);
  assert.equal(h.queries.useOrders().refetchInterval, false);
  h.login(null);
  assert.equal(h.queries.useOrders().enabled, false);
  h.login('buyer');
  assert.notDeepEqual(h.queries.useOrders().queryKey, active.queryKey);
  await assert.rejects(active.queryFn({ signal: new AbortController().signal }), /session changed/);
  assert.equal(h.calls.length, 0);
});

test('an order page resolving after account switch cannot populate the new session', async (t) => {
  let finish;
  const h = setup(t, () => new Promise((resolve) => { finish = resolve; }));
  const pending = h.queries.useOrders('past').queryFn({ signal: new AbortController().signal });
  h.login('other');
  finish({ orders: [{ id: 'private' }], nextCursor: null });
  await assert.rejects(pending, /session changed/);
});

test('order API encodes tab/cursor and forwards the abort signal', async () => {
  let request;
  const load = sourceLoader({ './client': { apiRequest: async (...args) => { request = args; return {}; } } });
  const { orderApi } = load('services/api/order-api.ts');
  const signal = new AbortController().signal;
  const cursor = '2026-10-09T12:00:00.000Z|000000000000000000000001';
  await orderApi.list({ tab: 'past', cursor }, signal);
  const url = new URL(request[0], 'https://example.test');
  assert.equal(url.searchParams.get('cursor'), cursor);
  assert.equal(url.searchParams.get('tab'), 'past');
  assert.equal(url.searchParams.get('limit'), '20');
  assert.deepEqual(request[1], { method: 'GET', signal });
});

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
}
function screen() {
  let index = 0; const state = []; const tabs = []; const requests = [];
  const query = { data: { pages: [{ orders: [{ id: 'one' }], nextCursor: 'next' }, { orders: [{ id: 'one' }, { id: 'two' }], nextCursor: null }] },
    hasNextPage: true, isFetching: false, isFetchNextPageError: false, isFetchingNextPage: false,
    fetchNextPage: async (options) => requests.push(options), refetch: async () => {} };
  const load = sourceLoader({
    react: { useState: (initial) => { const slot = index++; if (!(slot in state)) state[slot] = initial;
      return [state[slot], (next) => { state[slot] = next; }]; }, useMemo: (fn) => fn(), useCallback: (fn) => fn },
    'react-native': { FlatList: 'List', Pressable: 'Button', Text: 'Text', View: 'View' },
    '@react-navigation/native': { useNavigation: () => ({ navigate() {} }) },
    'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView' },
    '../../services/orders/order-queries': { useOrders: (tab) => { tabs.push(tab); return query; } },
    '../../components/AppLoader': { AppLoader: 'Loader' },
    '../../components/shop/orders/OrderHistoryCard': { OrderHistoryCard: 'Card' },
    '../../components/shop/orders/ReorderSheet': { ReorderSheet: 'Sheet' },
    '../../features/orders/orders.styles': { s: {} },
    '../../theme/ThemeProvider': { useAppTheme: () => ({ colors: {} }) },
  });
  const { OrdersScreen } = load('screens/user/OrdersScreen.tsx');
  return { query, tabs, requests, render: () => { index = 0; return OrdersScreen(); } };
}

test('history UI appends unique rows, switches server tabs and guards automatic retries', () => {
  const h = screen();
  let tree = h.render(); let list = nodes(tree).find((node) => node.type === 'List');
  assert.deepEqual(list.props.data.map((order) => order.id), ['one', 'two']);
  list.props.onEndReached(); assert.equal(h.requests.length, 1);
  h.query.isFetching = true;
  nodes(h.render()).find((node) => node.type === 'List').props.onEndReached();
  assert.equal(h.requests.length, 1);
  h.query.isFetching = false; h.query.isFetchNextPageError = true;
  list = nodes(h.render()).find((node) => node.type === 'List');
  list.props.onEndReached(); assert.equal(h.requests.length, 1);
  list.props.ListFooterComponent.props.onPress(); assert.equal(h.requests.length, 2);
  assert.deepEqual(h.requests[1], { cancelRefetch: false });
  nodes(tree).find((node) => node.props?.accessibilityRole === 'tab' && nodes(node).some((child) => child.props?.children === 'History')).props.onPress();
  h.render(); assert.equal(h.tabs.at(-1), 'past');
  h.query.hasNextPage = false;
  list = nodes(h.render()).find((node) => node.type === 'List');
  assert.equal(list.props.ListFooterComponent, null);
  list.props.onEndReached(); assert.equal(h.requests.length, 2);
});
