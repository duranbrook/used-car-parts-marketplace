import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { api } from "../../src/api";
import type { PartDetail } from "@car-parts/types";

const { width } = Dimensions.get("window");

export default function PartDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [part, setPart] = useState<PartDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    api.parts.get(id).then((p) => {
      setPart(p);
      setLoading(false);
    });
  }, [id]);

  async function addToCart() {
    setAddingToCart(true);
    try {
      await api.cart.add(id);
      Alert.alert("Added to cart", "Go to cart to complete your purchase.", [
        { text: "Keep Shopping" },
        { text: "View Cart", onPress: () => router.push("/(tabs)/orders") },
      ]);
    } catch (err) {
      Alert.alert("Error", (err as Error).message);
    } finally {
      setAddingToCart(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }
  if (!part) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Part not found</Text>
      </View>
    );
  }

  const images =
    part.images.length > 0
      ? part.images
      : [{ url: "https://placehold.co/400x300/111/666?text=No+Photo", isPrimary: true, id: "ph" }];

  return (
    <View style={styles.container}>
      <ScrollView>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(e) =>
            setActiveImage(Math.round(e.nativeEvent.contentOffset.x / width))
          }
          scrollEventThrottle={16}
        >
          {images.map((img, i) => (
            <Image
              key={i}
              source={{ uri: img.url }}
              style={styles.mainImage}
              resizeMode="cover"
            />
          ))}
        </ScrollView>
        {images.length > 1 && (
          <View style={styles.dots}>
            {images.map((_, i) => (
              <View key={i} style={[styles.dot, activeImage === i && styles.dotActive]} />
            ))}
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.gradeRow}>
            <View style={styles.gradeBadge}>
              <Text style={styles.gradeText}>Grade {part.conditionGrade}</Text>
            </View>
            <Text style={styles.partType}>{part.partType}</Text>
          </View>

          <Text style={styles.title}>{part.title}</Text>
          <Text style={styles.price}>${part.price}</Text>

          <View style={styles.sellerRow}>
            <Text style={styles.sellerLabel}>Sold by</Text>
            <Text style={styles.sellerName}>{part.seller.name}</Text>
          </View>

          {part.donorVehicle && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Donor Vehicle</Text>
              <Text style={styles.sectionText}>
                {part.donorVehicle.year} {part.donorVehicle.make} {part.donorVehicle.model}
                {part.donorVehicle.trim ? ` ${part.donorVehicle.trim}` : ""}
              </Text>
            </View>
          )}

          {part.compatibility.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fits These Vehicles</Text>
              {part.compatibility.slice(0, 5).map((c) => (
                <Text key={c.id} style={styles.compatItem}>
                  · {c.vehicle.year} {c.vehicle.make} {c.vehicle.model}
                </Text>
              ))}
              {part.compatibility.length > 5 && (
                <Text style={styles.compatMore}>+{part.compatibility.length - 5} more</Text>
              )}
            </View>
          )}

          {(part.partNumber || part.hollanderNumber) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Part Numbers</Text>
              {part.partNumber && (
                <Text style={styles.sectionText}>OEM: {part.partNumber}</Text>
              )}
              {part.hollanderNumber && (
                <Text style={styles.sectionText}>Hollander: {part.hollanderNumber}</Text>
              )}
            </View>
          )}

          {part.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.sectionText}>{part.description}</Text>
            </View>
          )}

          {part.conditionNotes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Condition Notes</Text>
              <Text style={styles.sectionText}>{part.conditionNotes}</Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      <View style={styles.stickyBar}>
        <View>
          <Text style={styles.stickyPrice}>${part.price}</Text>
          <Text style={styles.stickyLabel}>+ shipping</Text>
        </View>
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={addToCart}
          disabled={addingToCart}
        >
          {addingToCart ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.addToCartText}>Add to Cart</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0a0a0a",
  },
  errorText: { color: "#888" },
  mainImage: { width, height: 300 },
  dots: { flexDirection: "row", justifyContent: "center", paddingVertical: 8, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#333" },
  dotActive: { backgroundColor: "#2563eb" },
  content: { padding: 16 },
  gradeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  gradeBadge: {
    backgroundColor: "#1e3a5f",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  gradeText: { color: "#7eb8f7", fontSize: 12, fontWeight: "600" },
  partType: { color: "#666", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 },
  title: { fontSize: 20, fontWeight: "700", color: "#fff", lineHeight: 26, marginBottom: 8 },
  price: { fontSize: 28, fontWeight: "800", color: "#fff", marginBottom: 12 },
  sellerRow: { flexDirection: "row", gap: 6, marginBottom: 16, alignItems: "center" },
  sellerLabel: { fontSize: 13, color: "#666" },
  sellerName: { fontSize: 13, color: "#7eb8f7", fontWeight: "500" },
  section: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
  },
  sectionTitle: {
    fontSize: 12,
    color: "#666",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  sectionText: { fontSize: 14, color: "#ccc", lineHeight: 21 },
  compatItem: { fontSize: 13, color: "#aaa", marginBottom: 4 },
  compatMore: { fontSize: 12, color: "#555", marginTop: 4 },
  stickyBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#111",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#222",
  },
  stickyPrice: { fontSize: 20, fontWeight: "700", color: "#fff" },
  stickyLabel: { fontSize: 11, color: "#555" },
  addToCartButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  addToCartText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
