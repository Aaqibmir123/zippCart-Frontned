import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { StoreIcon } from "../user/store-registration/StoreIcon";
import { money } from '../../utils/money';
import { SellerProductSummary } from "./products/product-api";
import { ss as s } from "./seller.styles";

export function SellerProducts({
  products,
  productCount,
  onAdd,
  onEdit,
  onToggle,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  products: SellerProductSummary[];
  productCount: number;
  onAdd: () => void;
  onEdit: (product: SellerProductSummary) => void;
  onToggle: (id: string) => void;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "listed" | "hidden">("all");
  const visible = products.filter((product) =>
    (filter === "all" || product.active === (filter === "listed")) &&
    `${product.name} ${product.category} ${product.brand ?? ""}`
      .toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <ScrollView
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={s.between}>
        <View style={s.flex}>
          <Text style={s.title}>Your products</Text>
          <Text style={s.text}>{productCount} products in your catalogue</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onAdd} style={s.button}>
          <Text style={s.buttonText}>+ Add</Text>
        </Pressable>
      </View>
      <TextInput
        accessibilityLabel="Search products"
        placeholder="Search products or categories"
        value={search}
        onChangeText={setSearch}
        style={s.input}
      />
      <View style={s.row}>
        {([
          ["all", "All"],
          ["listed", "Listed"],
          ["hidden", "Hidden"],
        ] as const).map(([value, label]) => <Pressable key={value}
          accessibilityRole="button" accessibilityState={{ selected: filter === value }}
          onPress={() => setFilter(value)} style={[s.chip, filter === value && s.chipActive]}>
          <Text style={[s.link, filter !== value && s.small]}>{label}</Text>
        </Pressable>)}
      </View>
      <Text style={s.small}>Search and filters apply to products loaded so far.</Text>
      {visible.map((product) => (
        <View key={product.id} style={s.card}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Edit ${product.name}`}
            onPress={() => onEdit(product)}
            style={s.row}
          >
            {product.coverImage ? (
              <Image source={{ uri: product.coverImage }} style={s.photo} />
            ) : (
              <View style={s.photo}>
                <StoreIcon name="store" color="#6838F5" />
              </View>
            )}
            <View style={s.flex}>
              <Text style={s.heading}>{product.name}</Text>
              <Text style={s.small}>
                {product.category}{product.brand ? ` · ${product.brand}` : ""}
              </Text>
              <Text style={s.link}>
                {money(product.price)}{" "}
                <Text
                  style={{
                    textDecorationLine: "line-through",
                    color: "#9BA79F",
                  }}
                >
                  {money(product.mrp)}
                </Text>
              </Text>
            </View>
          </Pressable>
          <View style={s.between}>
            <Text style={[s.small, product.stock <= 5 && s.danger]}>
              {product.stock === 0
                ? "Out of stock"
                : `${product.stock} in stock${product.stock <= 5 ? " · Low stock" : ""}`}
            </Text>
            <View style={s.row}>
              <Text style={s.small}>
                {product.active ? "Listed" : "Hidden"}
              </Text>
              <Switch
                accessibilityLabel={`List ${product.name}`}
                value={product.active}
                onValueChange={() => onToggle(product.id)}
                trackColor={{ true: "#8C68F7" }}
              />
            </View>
          </View>
          {!!product.exchangeReserved && <Text style={s.small}>{product.exchangeReserved} reserved for exchanges · excluded from available stock</Text>}
          <Pressable
            accessibilityRole="button"
            onPress={() => onEdit(product)}
            style={[s.button, s.secondary]}
          >
            <Text style={s.link}>Edit product & stock</Text>
          </Pressable>
        </View>
      ))}
      {!visible.length && (
        <View style={s.card}>
          <Text style={s.heading}>No products found</Text>
          <Text style={s.text}>
            Try a different search or add your first product.
          </Text>
        </View>
      )}
      {hasMore && <Pressable accessibilityRole="button" disabled={loadingMore} onPress={onLoadMore} style={s.button}>
        <Text style={s.buttonText}>{loadingMore ? "Loading…" : "Load more products"}</Text>
      </Pressable>}
    </ScrollView>
  );
}
