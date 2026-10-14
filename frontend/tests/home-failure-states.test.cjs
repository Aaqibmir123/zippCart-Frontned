const test = require('node:test');
const assert = require('node:assert/strict');
const { sourceLoader } = require('./helpers/load-source.cjs');
const { hookHarness } = require('./helpers/hook-harness.cjs');

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
}
const ui = {
  'react-native': { Pressable: 'Button', Text: 'Text', View: 'View', Image: 'Image', FlatList: 'List',
    useWindowDimensions: () => ({ width: 360 }) },
  '../../theme/ThemeProvider': { useAppTheme: () => ({ colors: {}, isDark: false }) },
  './home.styles': { h: {} },
  '../../features/home/home.styles': { h: {} },
  '../home/home.styles': { h: {}, palette: {} },
};

test('wishlist loading, failure, retry and paused states are distinct and accessible', () => {
  const { WishlistStatus } = sourceLoader(ui)('features/home/WishlistStatus.tsx');
  let retries = 0;
  const render = flags => WishlistStatus({ onRetry: () => retries++, ...flags });
  const loading = render({ pending: true, fetching: true, error: false });
  assert.equal(loading.props.disabled, true);
  assert.equal(loading.props.accessibilityState.busy, true);
  assert.match(loading.props.accessibilityLabel, /Loading wishlist/);
  const failed = render({ pending: false, fetching: false, error: true });
  assert.equal(failed.props.disabled, false);
  assert.match(failed.props.accessibilityLabel, /unavailable.*retry/);
  failed.props.onPress(); assert.equal(retries, 1);
  const retrying = render({ pending: false, fetching: true, error: true });
  assert.equal(retrying.props.disabled, true);
  assert.match(retrying.props.accessibilityLabel, /Retrying/);
  const paused = render({ pending: true, fetching: false, error: false });
  assert.match(paused.props.accessibilityLabel, /unavailable/);
  assert.equal(paused.props.accessibilityState.busy, false);
  assert.equal(render({ pending: false, fetching: false, error: false }), null);
});

test('unavailable wishlist disables the heart without a false mutation spinner or blocking details', () => {
  const { HomeProductCard } = sourceLoader({ ...ui,
    '../../components/AppLoader': { AppLoader: 'Loader' }, './HomeIcon': { HomeIcon: 'Icon' },
  })('features/home/HomeProductCard.tsx');
  let opened;
  const props = { product: { id: 'p1', name: 'Shirt', price: 100, mrp: 100, stock: 1 }, width: 160,
    favorite: false, favoritePending: false, favoriteDisabled: true,
    onOpen: id => { opened = id; }, onFavorite() {}, onAdd() {} };
  const tree = nodes(HomeProductCard.type(props));
  const heart = tree.find(node => node.props.accessibilityLabel === 'Wishlist not ready for Shirt');
  assert.deepEqual(heart.props.accessibilityState, { disabled: true, busy: false, selected: false });
  assert.equal(tree.some(node => node.type === 'Loader'), false);
  tree.find(node => node.props.accessibilityLabel === 'View Shirt').props.onPress();
  assert.equal(opened, 'p1');
  const saving = nodes(HomeProductCard.type({ ...props, favoriteDisabled: false, favoritePending: true }));
  assert.ok(saving.some(node => node.type === 'Loader'));
  assert.ok(saving.some(node => node.props.accessibilityState?.busy === true));
});

function screenFixture(screen) {
  const hooks = hookHarness();
  let route = screen === 'Home' ? { params: { view: 'home' } } : { params: { category: 'Fashion', title: 'Fashion' } };
  const calls = { products: 0, favorites: 0, categories: [], scroll: [], navigation: [] };
  const navigation = { navigate: (...args) => calls.navigation.push(args), goBack() {} };
  const product = { id: 'p1', name: 'Shirt', mrp: 100, price: 100 };
  const catalog = { products: [product], category: 'All', favoriteIds: new Set(), pendingFavoriteIds: new Set(),
    setCategory: value => calls.categories.push(value), toggleFavorite() {}, addToCart() {},
    favorites: { isSuccess: false, isPending: false, isFetching: false, isError: true, refetch: () => calls.favorites++ },
    query: { isError: true, isPending: false, isFetching: false, refetch: () => calls.products++ } };
  const loader = sourceLoader({ ...ui, react: hooks.react,
    '@react-navigation/native': { useNavigation: () => navigation, useRoute: () => route, useIsFocused: () => true },
    'react-native-safe-area-context': { SafeAreaView: 'SafeArea' },
    '../../components/AppLoader': { AppLoader: 'Loader' },
    '../../components/ProfileDrawer': { ProfileDrawer: 'Drawer' },
    '../../components/shop/SearchPanel': { SearchPanel: 'Search' },
    '../../components/TopFeedbackToast': { TopFeedbackToast: 'Toast' },
    '../../features/home/HomeHero': { HomeHero: 'Hero' },
    '../../features/home/HomeCategories': { HomeCategories: 'Categories' },
    '../../features/home/HomeProductCard': { HomeProductCard: 'Card' },
    '../home/HomeProductCard': { HomeProductCard: 'Card' },
    '../../features/home/HomeSection': { HomeSection: 'Section' },
    '../../features/home/WishlistStatus': { WishlistStatus: 'WishlistStatus' },
    '../home/WishlistStatus': { WishlistStatus: 'WishlistStatus' },
    '../../features/home/useHomeCatalog': { useHomeCatalog: () => catalog },
    '../home/useHomeCatalog': { useHomeCatalog: () => catalog },
    '../../features/home/useProgressiveCatalog': { useProgressiveCatalog: () => ({ count: 6, hasMore: false }) },
  });
  const Component = screen === 'Home' ? loader('screens/user/HomeScreen.tsx').HomeScreen
    : loader('features/catalog/ProductListingScreen.tsx').ProductListingScreen;
  return { catalog, calls, product, setMode: view => { route = { params: { view } }; },
    render: () => nodes(hooks.render(Component)).find(node => node.type === 'List') };
}

for (const screen of ['Home', 'ProductListing']) {
  test(`${screen} exposes separate wishlist and catalog retries, preserves products on failure`, () => {
    const app = screenFixture(screen); let list = app.render();
    const header = nodes(list.props.ListHeaderComponent);
    const wishlist = header.find(node => node.type === 'WishlistStatus');
    assert.equal(wishlist.props.error, true); assert.equal(wishlist.props.fetching, false);
    wishlist.props.onRetry(); assert.equal(app.calls.favorites, 1); assert.equal(app.calls.products, 0);
    header.find(node => node.type === 'Button' && !node.props.accessibilityLabel).props.onPress();
    assert.equal(app.calls.products, 1);
    assert.equal(list.props.data.length, 1);
    const card = list.props.renderItem({ item: app.product });
    assert.equal(card.props.favoriteDisabled, true); assert.equal(card.props.favoritePending, false);
    app.catalog.products = [];
    list = app.render();
    nodes(list.props.ListEmptyComponent).find(node => node.type === 'Button').props.onPress();
    assert.equal(app.calls.products, 2);
    app.catalog.favorites = { ...app.catalog.favorites, isError: false, isSuccess: true };
    app.catalog.pendingFavoriteIds.add('p1');
    const saving = app.render().props.renderItem({ item: app.product });
    assert.equal(saving.props.favoriteDisabled, false); assert.equal(saving.props.favoritePending, true);
  });
}

test('Home mode changes reset once; category and unrelated renders preserve scrolling', () => {
  const app = screenFixture('Home'); let list = app.render();
  list.props.ref.current = { scrollToOffset: value => app.calls.scroll.push(value) };
  const seeAll = nodes(list.props.ListHeaderComponent).find(node => node.type === 'Section').props.onSeeAll;
  seeAll();
  assert.deepEqual(app.calls.navigation, [['ShopTabs', { screen: 'Home', params: { view: 'categories' } }]]);
  app.setMode('categories'); list = app.render();
  assert.equal(nodes(list.props.ListHeaderComponent).some(node => node.type === 'Hero'), false);
  app.setMode('home'); list = app.render();
  assert.equal(nodes(list.props.ListHeaderComponent).some(node => node.type === 'Hero'), true);
  assert.equal(app.calls.categories.length, 3); assert.equal(app.calls.scroll.length, 2);
  app.catalog.category = 'Fashion'; app.render(); app.render();
  assert.equal(app.calls.categories.length, 3); assert.equal(app.calls.scroll.length, 2);
});
