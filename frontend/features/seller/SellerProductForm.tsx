import { AppLoader } from '../../components/AppLoader';
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { ProductColor, SellerProduct, SellerProductInput } from "./products/product-api";
import { ProductImageGallery } from "./ProductImageGallery";
import { formStyles as s } from "./seller-product-form.styles";

const categories = ["Fashion", "Watches", "Beauty", "Home", "Accessories", "Electronics", "Other"];
type Field = "name" | "description" | "price" | "mrp" | "stock" | "brand" | "sku" | "sizes";

export function SellerProductForm({ product, onSave, onClose }: {
  product?: SellerProduct; onSave: (value: SellerProductInput) => Promise<void>; onClose: () => void;
}) {
  const [fields, setFields] = useState({
    name: product?.name ?? "", category: product?.category ?? "",
    description: product?.description ?? "", price: product?.price.toString() ?? "",
    mrp: product?.mrp.toString() ?? "", stock: product?.stock.toString() ?? "",
    brand: product?.brand ?? "", sku: product?.sku ?? "",
    sizes: product?.sizes.join(", ") ?? "",
  });
  const [active, setActive] = useState(product?.active ?? true);
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [colors, setColors] = useState<ProductColor[]>(product?.colors ?? []);
  const [variantQuantities, setVariantQuantities] = useState<Record<string, string>>(() => Object.fromEntries((product?.variantStock ?? []).map((item) => [JSON.stringify([item.color, item.size]), String(item.stock)])));
  const [inventoryRevision] = useState(product?.inventoryRevision ?? 0);
  const sizeOptions = fields.sizes.split(',').map((value) => value.trim()).filter(Boolean);
  const variantRows = (colors.length ? colors.map((item) => item.name.trim()) : ['']).flatMap((color) => (sizeOptions.length ? sizeOptions : ['']).map((size) => ({ color, size, key: JSON.stringify([color, size]) })));
  const hasVariants = !!(colors.length || sizeOptions.length);
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const steps = ["Details", "Pricing & stock", "Photos & publish"] as const;

  function update(key: keyof typeof fields, value: string) {
    setFields((old) => ({ ...old, [key]: value }));
    setError("");
  }
  function updateColor(index: number, value: string) {
    setColors((old) => old.map((color, position) => position === index ? { ...color, name: value } : color));
    setError("");
  }
  const photoCount = images.length + colors.reduce((count, color) => count + color.images.length, 0);
  const busy = picking || saving;
  async function pickPhotos(target: { kind: "general" } | { kind: "color"; index: number }) {
    const current = target.kind === "general" ? images.length : colors[target.index].images.length;
    const remaining = Math.min(12 - photoCount, (target.kind === "general" ? 5 : 4) - current);
    if (remaining <= 0) return;
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"], allowsMultipleSelection: true,
        selectionLimit: remaining, quality: 0.8,
      });
      if (!result.canceled) {
        const added: string[] = [];
        for (const asset of result.assets.slice(0, remaining)) {
          const context = ImageManipulator.manipulate(asset.uri);
          context.resize({ width: 800 });
          const image = await context.renderAsync();
          const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.65, base64: true });
          if (!saved.base64 || saved.base64.length > 682664) throw new Error("A photo is too large. Choose a smaller image.");
          added.push(`data:image/jpeg;base64,${saved.base64}`);
        }
        if (target.kind === "general") setImages((old) => [...old, ...added]);
        else setColors((old) => old.map((color, index) =>
          index === target.index ? { ...color, images: [...color.images, ...added] } : color));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not open photos. Please try again.");
    } finally {
      setPicking(false);
    }
  }
  async function save() {
    if (fields.name.trim().length < 2 || !fields.category || !fields.description.trim()) {
      setStep(0);
      return setError("Add a product name, category and description.");
    }
    if (fields.sku.trim() && !/^[A-Za-z0-9_-]+$/.test(fields.sku.trim())) {
      setStep(0);
      return setError("SKU can contain letters, numbers, hyphens and underscores only.");
    }
    if (![fields.price, fields.mrp].every((value) => /^\d+(\.\d{1,2})?$/.test(value) && Number(value) > 0 && Number(value) <= 1000000)) {
      setStep(1);
      return setError("Enter valid prices greater than zero, with up to two decimals.");
    }
    if (Number(fields.price) > Number(fields.mrp)) {
      setStep(1);
      return setError("Selling price cannot be greater than MRP.");
    }
    if (!hasVariants && (!/^\d+$/.test(fields.stock) || Number(fields.stock) > 1000000)) {
      setStep(1);
      return setError("Enter stock as a whole number from 0 to 1,000,000.");
    }
    const sizes = fields.sizes.split(",").map((value) => value.trim()).filter(Boolean);
    if (sizes.length > 20 || sizes.some((value) => value.length > 30) || new Set(sizes.map((value) => value.toLowerCase())).size !== sizes.length) {
      setStep(1);
      return setError("Add up to 20 unique sizes, separated by commas.");
    }
    const cleanColors = colors.map((color) => ({ name: color.name.trim(), images: color.images }));
    if (cleanColors.some((color) => !color.name || color.name.length > 40) ||
      new Set(cleanColors.map((color) => color.name.toLowerCase())).size !== cleanColors.length) {
      setStep(1);
      return setError("Each color needs a unique name.");
    }
    if ([...images, ...cleanColors.flatMap((color) => color.images)].reduce((total, image) => total + image.length, 0) > 4000000) {
      setStep(2);
      return setError("Photos are too large together. Remove some photos.");
    }
    const input: SellerProductInput = {
      name: fields.name.trim(), category: fields.category,
      description: fields.description.trim(), brand: fields.brand.trim(),
      sku: fields.sku.trim(),
      sizes, images, colors: cleanColors,
      price: Number(fields.price), mrp: Number(fields.mrp), stock: Number(fields.stock), active,
      ...(product ? { expectedInventoryRevision: inventoryRevision } : {}),
    };
    if (hasVariants) {
      if (variantRows.some((row) => !/^\d+$/.test(variantQuantities[row.key] ?? '') || Number(variantQuantities[row.key]) > 1000000)) {
        setStep(1);
        return setError('Enter stock for each color/size. Use 0 for unavailable variants.');
      }
      input.variantStock = variantRows.map(({ color, size, key }) => ({ color, size, stock: Number(variantQuantities[key]) }));
      input.stock = input.variantStock.reduce((sum, item) => sum + item.stock, 0);
      if (input.stock > 1000000) {
        setStep(1);
        return setError('Total stock cannot exceed 1,000,000.');
      }
    } else input.variantStock = [];
    setSaving(true);
    try {
      await onSave(input);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save product. Try again.");
    } finally {
      setSaving(false);
    }
  }
  function input(key: Field, label: string, placeholder: string, options?: {
    required?: boolean; numeric?: boolean; multiline?: boolean; maxLength?: number;
  }) {
    return <View style={s.field}>
      <Text style={s.label}>{label}{options?.required ? " *" : ""}</Text>
      <TextInput accessibilityLabel={label} value={fields[key]}
        onChangeText={(value) => update(key, value)} placeholder={placeholder}
        placeholderTextColor="#A0AEA7"
        keyboardType={options?.numeric ? (key === "stock" ? "number-pad" : "decimal-pad") : "default"}
        multiline={options?.multiline} maxLength={options?.maxLength ?? 100}
        style={[s.input, options?.multiline && s.multiline]} />
    </View>;
  }
  return <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.header}>
        <View style={s.flex}>
          <Text style={s.title}>{product ? "Edit product" : "Add a product"}</Text>
        </View>
        <Pressable accessibilityRole="button" disabled={saving} onPress={onClose} style={s.closeButton}><Text style={s.closeText}>Close</Text></Pressable>
      </View>
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: 3, now: step + 1 }} style={s.steps}>
        {steps.map((label, index) => <View key={label} style={s.stepItem}>
          <View style={[s.stepNumber, index <= step && s.stepNumberActive]}>
            <Text style={[s.stepNumberText, index <= step && s.stepNumberTextActive]}>{index + 1}</Text>
          </View>
          <Text style={[s.stepLabel, index === step && s.stepLabelActive]}>{label}</Text>
          {index < steps.length - 1 && <View style={[s.stepLine, index < step && s.stepLineActive]} />}
        </View>)}
      </View>
      <View style={s.stepIntro}>
        <Text style={s.sectionTitle}>{steps[step]}</Text>
        <Text style={s.hint}>Step {step + 1} of {steps.length} · Your changes are kept as you move between steps.</Text>
      </View>
      {step === 0 && <>
        <View style={s.card}>
          <Text style={s.sectionTitle}>Product details</Text>
          {input("name", "Product name", "e.g. Classic denim jacket", { required: true, maxLength: 100 })}
          <View style={s.field}>
            <Text style={s.label}>Category *</Text>
            <View style={s.chips}>{categories.map((category) => <Pressable key={category}
              accessibilityRole="button" accessibilityState={{ selected: fields.category === category }}
              onPress={() => update("category", category)} style={[s.chip, fields.category === category && s.chipSelected]}>
              <Text style={[s.chipText, fields.category === category && s.chipTextSelected]}>{category}</Text>
            </Pressable>)}</View>
          </View>
          {input("description", "Description", "Describe the product, features and what is included", { required: true, multiline: true, maxLength: 1000 })}
          {input("brand", "Brand (optional)", "e.g. Your store brand", { maxLength: 80 })}
          {input("sku", "SKU / Product code (optional)", "Generated automatically if left blank", { maxLength: 60 })}
        </View>
      </>}
      {step === 1 && <>
        <View style={s.card}>
          <Text style={s.sectionTitle}>Pricing & stock</Text>
          {!!product?.exchangeReserved && <Text style={s.hint}>{product.exchangeReserved} units reserved for exchanges. Stock fields show available units only; keep sizes/colors unchanged until reservations clear.</Text>}
          <View style={s.twoColumns}>
            <View style={s.flex}>{input("price", "Selling price (₹)", "0.00", { required: true, numeric: true, maxLength: 10 })}</View>
            <View style={s.flex}>{input("mrp", "MRP / Original price (₹)", "0.00", { required: true, numeric: true, maxLength: 10 })}</View>
          </View>
          {!hasVariants && input("stock", "Stock quantity", "e.g. 24", { required: true, numeric: true, maxLength: 7 })}
          {hasVariants && <Text style={s.hint}>Total stock is calculated from the color/size quantities below.</Text>}
          {input("sizes", "Sizes (optional)", "e.g. S, M, L", { maxLength: 300 })}
          <Text style={s.hint}>Separate sizes with commas.</Text>
        </View>
        <View style={s.card}>
          <Text style={s.sectionTitle}>Colors</Text>
          {colors.map((color, index) => <View key={index} style={s.colorCard}>
            <View style={s.colorHeader}>
              <Text style={s.colorTitle}>Color {index + 1}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove color ${index + 1}`}
                disabled={busy} onPress={() => setColors((old) => old.filter((_, position) => position !== index))}>
                <Text style={s.remove}>Remove</Text>
              </Pressable>
            </View>
            <TextInput accessibilityLabel={`Color ${index + 1} name`} value={color.name}
              onChangeText={(value) => updateColor(index, value)} placeholder="e.g. Navy blue"
              placeholderTextColor="#A0AEA7" maxLength={40} style={s.input} />
          </View>)}
          {colors.length < 8 && <Pressable accessibilityRole="button" disabled={busy}
            onPress={() => setColors((old) => [...old, { name: "", images: [] }])} style={s.addColor}>
            <Text style={s.addColorText}>+ Add color</Text>
          </Pressable>}
          {hasVariants && <>
            <Text style={s.sectionTitle}>Stock per variant</Text>
            <Text style={s.hint}>Each combination has its own stock. Enter 0 to disable purchasing that option.</Text>
            {variantRows.map((row) => <View key={row.key} style={s.variantRow}>
              <Text style={[s.label, s.variantName]}>{[row.color, row.size].filter(Boolean).join(' / ') || 'Default stock'}</Text>
              <TextInput accessibilityLabel={`Stock ${row.color} ${row.size}`} value={variantQuantities[row.key] ?? ''}
                keyboardType="number-pad" maxLength={7} onChangeText={(value) => setVariantQuantities((old) => ({ ...old, [row.key]: value }))}
                style={[s.input, s.variantInput]} />
            </View>)}
          </>}
        </View>
      </>}
      {step === 2 && <>
        <View style={s.card}>
          <Text style={s.sectionTitle}>Product photos</Text>
          <ProductImageGallery title="General product photos" images={images} disabled={busy}
            canAdd={images.length < 5 && photoCount < 12} onAdd={() => void pickPhotos({ kind: "general" })}
            onRemove={(index) => setImages((old) => old.filter((_, position) => position !== index))} />
          <Text style={s.hint}>Add up to 5 general photos. The first general photo, or first color photo, appears on the product card.</Text>
          {colors.map((color, index) => <View key={index} style={s.colorCard}>
            <Text style={s.colorTitle}>{color.name.trim() || `Color ${index + 1}`} photos</Text>
            <ProductImageGallery title={`${color.name.trim() || `Color ${index + 1}`} photos`}
              images={color.images} disabled={busy} canAdd={color.images.length < 4 && photoCount < 12}
              onAdd={() => void pickPhotos({ kind: "color", index })}
              onRemove={(imageIndex) => setColors((old) => old.map((item, position) =>
                position === index ? { ...item, images: item.images.filter((_, photoPosition) => photoPosition !== imageIndex) } : item))} />
            <Text style={s.hint}>Up to 4 photos for this color.</Text>
          </View>)}
          <Text style={s.hint}>Maximum 12 photos total across the product.</Text>
        </View>
        <View style={s.card}>
          <Text style={s.sectionTitle}>Listing status</Text>
          <Text style={s.hint}>Choose whether this product should be visible to customers after saving.</Text>
          <View style={s.twoColumns}>{([true, false] as const).map((value) => <Pressable key={String(value)}
            accessibilityRole="radio" accessibilityState={{ checked: active === value }} onPress={() => setActive(value)}
            style={[s.statusOption, active === value && s.statusSelected]}>
            <View style={[s.radio, active === value && s.radioSelected]} />
            <Text style={s.statusText}>{value ? "Active" : "Inactive"}</Text>
          </Pressable>)}</View>
        </View>
      </>}
      <View style={s.stepActions}>
        {step > 0 && <Pressable accessibilityRole="button" disabled={busy} onPress={() => setStep(step - 1)}
          style={[s.actionButton, s.backButton]}><Text style={s.backText}>Back</Text></Pressable>}
        {step < steps.length - 1
          ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => setStep(step + 1)} style={[s.actionButton, s.nextButton]}>
            <Text style={s.saveText}>Continue</Text>
          </Pressable>
          : <Pressable accessibilityRole="button" disabled={saving || picking} onPress={() => void save()} style={[s.actionButton, s.saveButton]}>
            {saving ? <AppLoader color="#FFFFFF" /> : <Text style={s.saveText}>{product ? "Save changes" : "Save product"}</Text>}
          </Pressable>}
      </View>
    </ScrollView>
  </KeyboardAvoidingView>;
}
