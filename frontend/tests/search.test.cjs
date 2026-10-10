const test = require('node:test');
const assert = require('node:assert/strict');
const { QueryClient, InfiniteQueryObserver } = require('@tanstack/react-query');
const { sourceLoader } = require('./helpers/load-source.cjs');
const { hookHarness, fakeClock } = require('./helpers/hook-harness.cjs');
const theme = { useAppTheme: () => ({ colors: {} }) };
const tick = () => new Promise(setImmediate);
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
}

function panel(t) {
  const clock = fakeClock(t); const h = hookHarness(); let focused = true, visible = true;
  let closed = 0; const opened = [];
  const load = sourceLoader({ react: h.react,
    'react-native': { Modal: 'Modal', View: 'View', Pressable: 'Button', Text: 'Text', TextInput: 'Input' },
    'react-native-safe-area-context': { SafeAreaView: 'SafeArea' },
    '../../theme/ThemeProvider': theme,
    '../../hooks/useScreenActive': { useScreenActive: (enabled) => focused && enabled },
    '../AppLoader': { AppLoader: 'Loader' },
    '../../features/search/SearchResults': { SearchResults: 'Results' },
    '../../features/search/search.styles': { searchStyles: {} },
  });
  const { SearchPanel } = load('components/shop/SearchPanel.tsx');
  const render = () => h.render(() => SearchPanel({ visible, onClose: () => closed++, onOpenProduct: (id) => opened.push(id) }));
  return { clock, render, opened, closed: () => closed,
    input: (value) => nodes(render()).find((node) => node.type === 'Input').props.onChangeText(value),
    focus: (value) => { focused = value; }, visible: (value) => { visible = value; }, unmount: h.unmount };
}
const results = (tree) => nodes(tree).find((node) => node.type === 'Results');

test('search skips empty input and mounts only the final term after a 300ms typing pause', (t) => {
  const h = panel(t);
  assert.equal(results(h.render()), undefined); assert.equal(h.clock.timers.size, 0);
  h.input('s'); h.render(); h.clock.advance(150);
  h.input('sh'); h.render(); h.clock.advance(150);
  h.input(' shirt '); h.render(); h.clock.advance(299);
  assert.equal(results(h.render()), undefined);
  assert.equal(nodes(h.render()).some((node) => node.props?.children === 'No matching products.'), false);
  h.clock.advance(1);
  assert.equal(results(h.render()).props.term, 'shirt');
  h.input(' shirt  '); assert.equal(results(h.render()).props.term, 'shirt');
  assert.equal(h.clock.timers.size, 0, 'whitespace alone does not restart a normalized search');
  h.input('shoes'); assert.equal(results(h.render()), undefined, 'old results disappear immediately');
  h.input(''); assert.equal(results(h.render()), undefined); assert.equal(h.clock.timers.size, 0);
  h.input('   '); assert.equal(results(h.render()), undefined); assert.equal(h.clock.timers.size, 0);
  h.unmount();
});

test('hidden panels and blurred screens remove results and cancel debounce; reopening starts from current text', (t) => {
  const h = panel(t);
  h.input('watch'); h.render(); h.clock.advance(100);
  h.focus(false); assert.equal(h.render().props.visible, false); assert.equal(h.clock.timers.size, 0);
  h.clock.advance(1000); assert.equal(results(h.render()), undefined);
  h.focus(true); h.render(); h.clock.advance(300);
  assert.equal(results(h.render()).props.term, 'watch');
  h.visible(false); assert.equal(results(h.render()), undefined); assert.equal(h.clock.timers.size, 0);
  h.visible(true); assert.equal(results(h.render()), undefined); h.clock.advance(300);
  const child = results(h.render()); child.props.onOpenProduct('product'); assert.deepEqual(h.opened, ['product']);
  h.render().props.onRequestClose(); assert.equal(h.closed(), 1);
  h.input('watch band'); h.render(); assert.equal(h.clock.timers.size, 1);
  h.unmount(); assert.equal(h.clock.timers.size, 0);
});

test('search supports one character and limits pasted input to the backend maximum', (t) => {
  const h = panel(t);
  h.input('a'); h.render(); h.clock.advance(300); assert.equal(results(h.render()).props.term, 'a');
  h.input('x'.repeat(200)); h.render(); h.clock.advance(300);
  assert.equal(results(h.render()).props.term.length, 80);
  assert.equal(nodes(h.render()).find((node) => node.type === 'Input').props.maxLength, 80);
  h.unmount();
});

test('removing a search observer aborts its request and late responses cannot replace a newer search', async (t) => {
  const pending = new Map(); const calls = [];
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  t.after(() => client.clear());
  const load = sourceLoader({ '@tanstack/react-query': { useInfiniteQuery: (options) => options },
    '../api/product-api': { productApi: { list: (page, category, search, signal) => {
      calls.push({ page, category, search, signal });
      return new Promise((resolve) => pending.set(search, resolve));
    } } },
  });
  const { useShopProducts } = load('services/products/product-queries.ts');
  const first = new InfiniteQueryObserver(client, useShopProducts('All', 'shirt'));
  const unsubscribe = first.subscribe(() => {}); await tick();
  unsubscribe(); assert.equal(calls[0].signal.aborted, true);
  const next = new InfiniteQueryObserver(client, useShopProducts('All', 'watch'));
  const stop = next.subscribe(() => {}); await tick();
  pending.get('watch')({ products: [{ id: 'watch' }], nextPage: null }); await tick();
  pending.get('shirt')({ products: [{ id: 'shirt' }], nextPage: null }); await tick();
  assert.equal(next.getCurrentResult().data.pages[0].products[0].id, 'watch');
  assert.equal(client.getQueryData(['shop-products', 'All', 'shirt']), undefined);
  stop();
});

test('closing search preserves a shared request still used by another visible observer', async (t) => {
  let finish, signal; let calls = 0;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  t.after(() => client.clear());
  const { useShopProducts } = sourceLoader({ '@tanstack/react-query': { useInfiniteQuery: (options) => options },
    '../api/product-api': { productApi: { list: (_page, _category, _search, abort) => {
      calls++; signal = abort; return new Promise((resolve) => { finish = resolve; });
    } } },
  })('services/products/product-queries.ts');
  const first = new InfiniteQueryObserver(client, useShopProducts('All', 'watch'));
  const second = new InfiniteQueryObserver(client, useShopProducts('All', 'watch'));
  const close = first.subscribe(() => {}); const stop = second.subscribe(() => {}); await tick();
  close(); assert.equal(signal.aborted, false); assert.equal(calls, 1);
  finish({ products: [{ id: 'watch' }], nextPage: null }); await tick();
  assert.equal(second.getCurrentResult().data.pages[0].products[0].id, 'watch'); stop();
});

test('search result paging retains loaded rows on failure and guards duplicate fetches', () => {
  const requests = []; let retries = 0;
  const result = { data: { pages: [{ products: [{ id: 'one', name: 'Watch', price: 20 }] }, { products: [{ id: 'one' }, { id: 'two' }] }] },
    hasNextPage: true, isFetching: false, isFetchNextPageError: true, isFetchingNextPage: false,
    fetchNextPage: (options) => requests.push(options), refetch: () => retries++ };
  const { SearchResults } = sourceLoader({
    react: { useMemo: (fn) => fn() }, 'react-native': { FlatList: 'List', Image: 'Image', Pressable: 'Button', Text: 'Text', View: 'View' },
    '../../components/AppLoader': { AppLoader: 'Loader' }, '../../theme/ThemeProvider': theme,
    './search.styles': { searchStyles: {} },
    '../../services/products/product-queries': { useShopProducts: (category, term) => {
      assert.equal(category, 'All'); assert.equal(term, 'watch'); return result;
    } },
  })('features/search/SearchResults.tsx');
  let opened; const render = () => SearchResults({ term: 'watch', onOpenProduct: (id) => { opened = id; } });
  let tree = render(); assert.deepEqual(tree.props.data.map((product) => product.id), ['one', 'two']);
  assert.ok(nodes(tree.props.ListFooterComponent).some((node) => node.props?.children === 'Could not load more. Tap to retry.'));
  tree.props.ListFooterComponent.props.onPress(); assert.deepEqual(requests, [{ cancelRefetch: false }]);
  result.isFetching = true; tree = render(); assert.equal(tree.props.ListFooterComponent.props.disabled, true);
  tree.props.ListFooterComponent.props.onPress(); assert.equal(requests.length, 1);
  result.isFetchingNextPage = true; assert.equal(render().props.ListFooterComponent.type, 'Loader');
  result.isFetchingNextPage = false; result.isFetching = false; result.isRefetchError = true;
  tree = render(); tree.props.ListHeaderComponent.props.onPress(); assert.equal(retries, 1);
  tree.props.renderItem({ item: result.data.pages[0].products[0] }).props.onPress(); assert.equal(opened, 'one');
});
