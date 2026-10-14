const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(file, mocks) {
  const filename = path.resolve(__dirname, '..', file);
  const target = new Module(filename);
  target.require = (name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name);
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  return target.exports;
}
function fixture() {
  const slots = []; const effects = []; let cursor = 0;
  const react = {
    useState(initial) {
      const i = cursor++; slots[i] ??= { value: initial };
      return [slots[i].value, (next) => { slots[i].value = typeof next === 'function' ? next(slots[i].value) : next; }];
    },
    useRef(initial) { return slots[cursor++] ??= { current: initial }; },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!slots[i] || deps.some((dep, index) => dep !== slots[i][index])) { slots[i] = deps; effects.push(fn); }
    },
  };
  const { useProgressiveCatalog } = load('features/home/useProgressiveCatalog.ts', { react });
  const calls = []; let finish;
  const query = { hasNextPage: true, isFetching: false, isFetchNextPageError: false,
    fetchNextPage: (options) => { calls.push(options); return new Promise((resolve) => { finish = resolve; }); } };
  return { calls, query, finish: () => finish?.(), render(total = 12, key = 'All') {
    cursor = 0; const value = useProgressiveCatalog(key, total, query); effects.splice(0).forEach((fn) => fn()); return value;
  } };
}

test('mount does not drain pages; a scroll reveals only one local batch', async () => {
  const app = fixture(); let paging = app.render(48);
  assert.equal(paging.count, 6);
  await paging.loadMore(); assert.equal(app.render(48).count, 6);
  paging.arm(); await paging.loadMore(); await paging.loadMore();
  assert.equal(app.render(48).count, 12); assert.equal(app.calls.length, 0);
});

test('rapid end events coalesce into one server request after loaded products are shown', async () => {
  const app = fixture(); let paging = app.render();
  paging.arm(); await paging.loadMore(); paging = app.render();
  paging.arm(); const pending = paging.loadMore(); paging.arm(); await paging.loadMore();
  assert.deepEqual(app.calls, [{ cancelRefetch: false }]);
  app.finish(); await pending;
  assert.equal(app.render(24).count, 18);
});

test('refresh in flight prevents paging and failed pages require explicit retry', async () => {
  const app = fixture(); let paging = app.render(6);
  app.query.isFetching = true; paging.arm(); await paging.loadMore(true);
  assert.equal(app.calls.length, 0);
  app.query.isFetching = false; app.query.isFetchNextPageError = true;
  paging = app.render(6); paging.arm(); await paging.loadMore();
  assert.equal(app.calls.length, 0);
  const retry = paging.loadMore(true); assert.equal(app.calls.length, 1);
  app.finish(); await retry;
});

test('category changes reset visible batches and late requests cannot expand another category', async () => {
  const app = fixture(); let paging = app.render(6);
  paging.arm(); const pending = paging.loadMore();
  assert.equal(app.render(20, 'Fashion').count, 6);
  app.finish(); await pending;
  assert.equal(app.render(20, 'Fashion').count, 6);
  assert.equal(app.render(20, 'All').count, 6);
});

test('terminal page stops loading and pull-to-refresh restores the initial batch', async () => {
  const app = fixture(); app.query.hasNextPage = false;
  let paging = app.render(); paging.arm(); await paging.loadMore(); paging = app.render();
  assert.equal(paging.hasMore, false); await paging.loadMore(true);
  assert.equal(app.calls.length, 0); paging.reset();
  assert.equal(app.render().count, 6);
});

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
}
test('home connects scroll, bounded data and explicit retry to progressive paging', () => {
  let armed = 0; const more = [];
  const products = Array.from({ length: 24 }, (_, i) => ({ id: String(i), price: 10, mrp: 20 }));
  const { HomeScreen } = load('screens/user/HomeScreen.tsx', {
    react: { useCallback: (callback) => callback, useState: (value) => [value, () => {}], useRef: () => ({ current: null }), useEffect() {} },
    'react-native': { FlatList: 'List', View: 'View', Text: 'Text', Pressable: 'Button', useWindowDimensions: () => ({ width: 360 }) },
    '@react-navigation/native': { useIsFocused: () => true, useNavigation: () => ({ navigate() {} }), useRoute: () => ({}) },
    'react-native-safe-area-context': { SafeAreaView: 'SafeArea' },
    '../../components/AppLoader': { AppLoader: 'Loader' },
    '../../components/ProfileDrawer': { ProfileDrawer: 'Drawer' },
    '../../components/shop/SearchPanel': { SearchPanel: 'Search' },
    '../../components/TopFeedbackToast': { TopFeedbackToast: 'Toast' },
    '../../theme/ThemeProvider': { useAppTheme: () => ({ isDark: false, colors: {} }) },
    '../../features/home/HomeHero': { HomeHero: 'Hero' },
    '../../features/home/HomeCategories': { HomeCategories: 'Categories' },
    '../../features/home/HomeProductCard': { HomeProductCard: 'Card' },
    '../../features/home/HomeSection': { HomeSection: 'Section' },
    '../../features/home/WishlistStatus': { WishlistStatus: 'WishlistStatus' },
    '../../features/home/home.styles': { h: {}, palette: {} },
    '../../features/home/useHomeCatalog': { useHomeCatalog: () => ({ products, category: 'All', query: {}, favorites: {}, favoriteIds: new Set(), favoriteMutation: {}, quickAdd: {} }) },
    '../../features/home/useProgressiveCatalog': { useProgressiveCatalog: () => ({ count: 6, hasMore: true,
      arm: () => armed++, loadMore: (manual = false) => more.push(manual) }) },
  });
  const list = nodes(HomeScreen()).find((node) => node.type === 'List');
  assert.equal(list.props.data.length, 6);
  assert.equal(nodes(list.props.ListHeaderComponent).some((node) => node.type === 'List'), false);
  list.props.onScrollBeginDrag(); list.props.onEndReached(); list.props.ListFooterComponent.props.onPress();
  assert.equal(armed, 1); assert.deepEqual(more, [false, true]);
});

test('bottom tabs preserve routes, cancellation and account drawer navigation', async () => {
  const { TabActions, TabRouter, CommonActions } = await import('@react-navigation/routers');
  const dispatched = []; const events = []; let opened = false; let cancel = false;
  const { ShopTabBar } = load('components/shop/ShopTabBar.tsx', {
    react: { useEffect() {}, useState: () => [opened, (value) => { opened = value; }] },
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Button', StyleSheet: { create: (s) => s } },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 34, left: 0, right: 0 }) },
    '@react-navigation/native': { useIsFocused: () => true, TabActions },
    '../ProfileDrawer': { ProfileDrawer: 'Drawer' },
    '../../features/home/HomeIcon': { HomeIcon: 'Icon' }, '../../features/home/home.styles': { palette: {} },
    '../../theme/ThemeProvider': { useAppTheme: () => ({ isDark: false, colors: {} }) },
  });
  const props = { state: { index: 0, routes: ['Home', 'Orders', 'Favorites', 'Account'].map((name) => ({ name, key: name })) },
    navigation: { dispatch: (action) => dispatched.push(action), emit: (event) => { events.push(event); return { defaultPrevented: cancel }; } } };
  props.state.routes[0].params = { view: 'categories', preserved: 'value' };
  const tree = ShopTabBar(props); const tabs = nodes(tree).filter((n) => n.props.accessibilityRole === 'tab');
  tabs[1].props.onPress(); tabs[2].props.onPress(); cancel = true; tabs[0].props.onPress();
  assert.deepEqual(dispatched.map(action => action.payload.name), ['Orders', 'Favorites']); assert.equal(events.length, 3);
  tabs[3].props.onPress(); assert.equal(opened, false);
  cancel = false; tabs[3].props.onPress(); assert.equal(opened, true);
  const next = ShopTabBar(props); const drawer = nodes(next).find((n) => n.type === 'Drawer');
  drawer.props.onOpenFavorites(); assert.equal(opened, false); assert.equal(dispatched.at(-1).payload.name, 'Favorites');
  tabs[0].props.onPress();
  assert.deepEqual(dispatched.at(-1), TabActions.jumpTo('Home', { view: 'home', preserved: 'value' }));
  assert.deepEqual(props.state.routes.map(route => route.key), ['Home', 'Orders', 'Favorites', 'Account']);
  assert.equal(props.state.routes[0].params.view, 'categories', 'The incoming route state is not mutated');
  const router = TabRouter({ initialRouteName: 'Home', backBehavior: 'history' });
  const options = { routeNames: props.state.routes.map(route => route.name), routeParamList: {}, routeGetIdList: {} };
  let state = router.getInitialState(options);
  state = router.getStateForAction(state, TabActions.jumpTo('Orders'), options);
  state = router.getStateForAction(state, TabActions.jumpTo('Home', props.state.routes[0].params), options);
  const before = state;
  state = router.getStateForAction(state, dispatched.at(-1), options);
  assert.deepEqual(state.routes.map(route => route.key), before.routes.map(route => route.key));
  assert.deepEqual(state.history, before.history);
  assert.equal(state.routes[state.index].params.view, 'home');
  state = router.getStateForAction(state, CommonActions.goBack(), options);
  assert.equal(state.routes[state.index].name, 'Orders');
});


test('refresh keeps its first batch when an older page request completes', async () => {
  const app = fixture(); let paging = app.render(6);
  paging.arm(); const pending = paging.loadMore(); paging.reset();
  app.finish(); await pending; assert.equal(app.render(24).count, 6);
});

test('empty offer pages do not accumulate a larger visible batch', async () => {
  const app = fixture();
  for (let page = 0; page < 3; page++) {
    const paging = app.render(0); const pending = paging.loadMore(true);
    app.finish(); await pending;
  }
  assert.equal(app.render(12).count, 6);
});
