const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const frontendRequire = Module.createRequire(path.resolve(__dirname, '../package.json'));
const ts = frontendRequire('typescript');

function loadProductDetails() {
  const filename = path.resolve(__dirname, '..', 'screens/user/ProductDetailsScreen.tsx');
  const target = new Module(filename);
  target.require = (name) => {
    if (name === 'react/jsx-runtime') return {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
      Fragment: 'Fragment',
    };
    if (name === 'react') return react;
    if (name === 'react-native') return {
      Image: 'Image', Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', View: 'View',
    };
    if (name === 'react-native-safe-area-context') return { SafeAreaView: 'SafeAreaView' };
    if (name === 'react-native-svg') return { __esModule: true, default: 'Svg', Path: 'Path' };
    if (name.endsWith('/HomeIcon')) return { HomeIcon: 'HomeIcon' };
    if (name.endsWith('/AppLoader')) return { AppLoader: 'AppLoader' };
    if (name.endsWith('/ProductInformation')) return { ProductInformation: 'ProductInformation' };
    if (name.endsWith('/ProductRecommendations')) return { ProductRecommendations: 'ProductRecommendations' };
    if (name.endsWith('/ProductReviews')) return { ProductReviews: 'ProductReviews' };
    if (name.endsWith('/ProductGallery')) return { ProductGallery: 'ProductGallery' };
    if (name.endsWith('/TopFeedbackToast')) return { TopFeedbackToast: 'TopFeedbackToast' };
    if (name.endsWith('/ThemeProvider')) return { useAppTheme: () => ({ isDark: false, colors: { background: '#fff', text: '#000', muted: '#777', surface: '#fff', border: '#eee', raised: '#f5f5f5', primary: '#7139F5' } }) };
    if (name.endsWith('/product-details.styles')) return { productDetailsStyles: {} };
    if (name.endsWith('/ProductPurchaseBar')) return { ProductPurchaseBar: 'ProductPurchaseBar' };
    if (name.endsWith('/useTimedFeedback')) return { useTimedFeedback: () => ({ feedback: null, showFeedback() {} }) };
    if (name.endsWith('/product-queries')) return {
      useShopProduct: () => ({ data: { product }, isPending: false, isError: true, isFetching: true }),
      useShopProductMedia: () => ({ data: { images: [], colors: [] }, isError: false }),
      useShopProducts: () => ({ data: { pages: [] }, isPending: false, isError: false }),
    };
    if (name.endsWith('/favorite-queries')) return {
      useFavorites: () => ({ data: { favorites: [] } }),
      useToggleFavorite: () => ({ isPending: false, mutateAsync: async () => {} }),
    };
    if (name.endsWith('/cart-queries')) return {
      useCart: () => ({ data: { items: [] }, isFetching: false, isPending: false, isError: false }),
      useAddCartItem: () => ({ isPending: false, mutateAsync: async (item) => added.push(item) }),
    };
    if (name.endsWith('/theme')) return { colors: { primary: 'purple' } };
    if (name.endsWith('/money')) return { money: String };
    if (name.endsWith('/stock')) return {
      availableStock: (stock) => stock,
      productQuantity: () => 0,
      variantAvailableStock: (item, color, size) => item.variantStock.find((v) => v.color === color && v.size === size)?.stock ?? 0,
    };
    return {};
  };
  target._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, filename);
  return target.exports.ProductDetailsScreen;
}

let hooks;
let product;
let added;
const react = {
  useState(initial) {
    const index = hooks.index++;
    if (!(index in hooks.state)) hooks.state[index] = initial;
    return [hooks.state[index], (value) => { hooks.state[index] = value; }];
  },
  useRef(initial) {
    const index = hooks.index++;
    if (!(index in hooks.state)) hooks.state[index] = { current: initial };
    return hooks.state[index];
  },
};
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
}
function render(ProductDetailsScreen) {
  hooks.index = 0;
  return ProductDetailsScreen({
    navigation: { navigate() {}, goBack() {} },
    route: { params: { productId: product.id } },
  });
}

test('product details require explicit size and color choices before cart add', async () => {
  hooks = { index: 0, state: [] };
  added = [];
  product = {
    id: 'shirt', name: 'Shirt', category: 'Fashion', brand: 'Test', description: 'A shirt', sku: 'S1',
    price: 10, mrp: 10, stock: 3, coverImage: null, storeName: 'Store', storeOpen: true,
    sizes: ['M'], colors: [{ name: 'Blue', images: [] }], variantStock: [{ color: 'Blue', size: 'M', stock: 3 }],
  };
  const ProductDetailsScreen = loadProductDetails();
  let tree = render(ProductDetailsScreen);
  let purchaseBar = nodes(tree).find((node) => node.type === 'ProductPurchaseBar');
  assert.equal(purchaseBar.props.variantSelectionRequired, true);
  assert.equal(purchaseBar.props.selectionPrompt, 'Choose size and color');
  const colorButton = nodes(tree).find((node) => node.props?.accessibilityLabel === 'Color: Blue');
  const sizeButton = nodes(tree).find((node) => node.props?.accessibilityLabel === 'Size: M');
  assert.equal(colorButton.props.accessibilityState.selected, false);
  assert.equal(sizeButton.props.accessibilityState.selected, false);
  await purchaseBar.props.onAddToCart();
  assert.deepEqual(added, []);

  colorButton.props.onPress();
  tree = render(ProductDetailsScreen);
  purchaseBar = nodes(tree).find((node) => node.type === 'ProductPurchaseBar');
  assert.equal(purchaseBar.props.selectionPrompt, 'Choose a size');
  await purchaseBar.props.onAddToCart();
  assert.deepEqual(added, []);

  nodes(tree).find((node) => node.props?.accessibilityLabel === 'Size: M').props.onPress();
  tree = render(ProductDetailsScreen);
  purchaseBar = nodes(tree).find((node) => node.type === 'ProductPurchaseBar');
  assert.equal(purchaseBar.props.variantSelectionRequired, false);
  await purchaseBar.props.onAddToCart();
  assert.deepEqual(added, [{ productId: 'shirt', color: 'Blue', size: 'M', quantity: 1 }]);
});
