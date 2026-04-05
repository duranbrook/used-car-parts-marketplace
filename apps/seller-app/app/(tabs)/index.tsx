import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
  ActivityIndicator,
} from "react-native";
import { api } from "../../src/api";
import type { PartSummary } from "@car-parts/types";
import { router } from "expo-router";

const GRADE_COLOR: Record<string, string> = { A: "#6dcea0", B: "#f0c060", C: "#e07070" };

export default function InventoryScreen() {
  const [parts, setParts] = useState<PartSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.parts.my();
      setParts(data);
    } catch {
      // silently fail — user will see empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Inventory</Text>
        <Text style={styles.headerCount}>{parts.length} parts</Text>
      </View>

      <FlatList
        data={parts}
        keyExtractor={(p) => p.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No parts listed yet</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.push("/(tabs)/camera")}
            >
              <Text style={styles.buttonText}>List Your First Part</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/part/${item.id}`)}>
            <Image
              source={{
                uri:
                  item.images[0]?.url ??
                  "https://placehold.co/80x80/1a1a1a/666?text=Part",
              }}
              style={styles.partImage}
            />
            <View style={styles.partInfo}>
              <Text style={styles.partTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.partMeta}>
                <View
                  style={[
                    styles.gradeBadge,
                    { backgroundColor: GRADE_COLOR[item.conditionGrade] + "22" },
                  ]}
                >
                  <Text
                    style={[
                      styles.gradeText,
                      { color: GRADE_COLOR[item.conditionGrade] },
                    ]}
                  >
                    Grade {item.conditionGrade}
                  </Text>
                </View>
                <Text style={styles.status}>{item.status}</Text>
              </View>
              <View style={styles.partFooter}>
                <Text style={styles.price}>${item.price}</Text>
                <Text style={styles.views}>{item.views} views</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={parts.length === 0 ? { flex: 1 } : { paddingBottom: 20 }}
      />
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 56,
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#fff" },
  headerCount: { fontSize: 14, color: "#666" },
  card: {
    flexDirection: "row",
    backgroundColor: "#111",
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    overflow: "hidden",
  },
  partImage: { width: 80, height: 80 },
  partInfo: { flex: 1, padding: 12, justifyContent: "space-between" },
  partTitle: { fontSize: 14, color: "#ddd", fontWeight: "500", lineHeight: 19 },
  partMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  gradeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  gradeText: { fontSize: 11, fontWeight: "600" },
  status: { fontSize: 11, color: "#666", textTransform: "lowercase" },
  partFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  price: { fontSize: 15, fontWeight: "700", color: "#fff" },
  views: { fontSize: 12, color: "#555" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  emptyTitle: { fontSize: 18, color: "#888", marginBottom: 20 },
  button: {
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600" },
});
