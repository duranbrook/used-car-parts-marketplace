import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { api } from "../../src/api";
import type { PartSummary } from "@car-parts/types";
import { router } from "expo-router";

const MAKES = ["Toyota", "Honda", "Ford", "Chevrolet", "BMW", "Mercedes", "Nissan", "Hyundai"];

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [make, setMake] = useState("");
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<PartSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [vinPermission, requestVinPermission] = useCameraPermissions();

  async function search() {
    setLoading(true);
    try {
      let searchParams: Record<string, string> = {};
      if (query) {
        try {
          const aiParams = await api.ai.smartSearch(query);
          searchParams = Object.fromEntries(
            Object.entries(aiParams)
              .filter(([, v]) => v !== undefined)
              .map(([k, v]) => [k, String(v)])
          );
        } catch {
          searchParams = { q: query };
        }
      }
      if (make) searchParams.make = make;
      const data = await api.parts.search(searchParams);
      setResults(data.parts);
    } finally {
      setLoading(false);
    }
  }

  async function handleVinScan({ data: vin }: { data: string }) {
    setScanning(false);
    setLoading(true);
    try {
      const vehicle = await api.vin.decode(vin);
      setMake(vehicle.make);
      setQuery(`${vehicle.year} ${vehicle.make} ${vehicle.model}`);
      const data = await api.parts.search({
        make: vehicle.make,
        model: vehicle.model,
        year: String(vehicle.year),
      });
      setResults(data.parts);
    } catch {
      // continue
    } finally {
      setLoading(false);
    }
  }

  if (scanning) {
    return (
      <View style={{ flex: 1 }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          onBarcodeScanned={handleVinScan}
          barcodeScannerSettings={{ barcodeTypes: ["code39", "code128", "pdf417"] }}
        >
          <View style={styles.scanOverlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.scanHint}>Scan your VIN barcode</Text>
          </View>
        </CameraView>
        <TouchableOpacity style={styles.cancelScan} onPress={() => setScanning(false)}>
          <Text style={styles.cancelScanText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find Parts</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by part, year, make, or describe it..."
          placeholderTextColor="#555"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={styles.vinButton}
          onPress={async () => {
            if (!vinPermission?.granted) await requestVinPermission();
            setScanning(true);
          }}
        >
          <Text style={styles.vinButtonText}>VIN</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.makeScroll}
      >
        {MAKES.map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.makeChip, make === m && styles.makeChipActive]}
            onPress={() => setMake(make === m ? "" : m)}
          >
            <Text style={[styles.makeChipText, make === m && styles.makeChipTextActive]}>
              {m}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.searchButton} onPress={search} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.searchButtonText}>Search</Text>
        )}
      </TouchableOpacity>

      <FlatList
        data={results}
        keyExtractor={(p) => p.id}
        ListEmptyComponent={
          !loading ? <Text style={styles.emptyText}>Search for parts above</Text> : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.resultCard}
            onPress={() => router.push(`/part/${item.id}`)}
          >
            <Image
              source={{
                uri:
                  item.images[0]?.url ??
                  "https://placehold.co/70x70/111/666?text=Part",
              }}
              style={styles.resultImage}
            />
            <View style={styles.resultInfo}>
              <Text style={styles.resultTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.resultMeta}>
                Grade {item.conditionGrade} · {item.seller.name}
              </Text>
              {item.donorVehicle && (
                <Text style={styles.resultVehicle}>
                  {item.donorVehicle.year} {item.donorVehicle.make} {item.donorVehicle.model}
                </Text>
              )}
              <Text style={styles.resultPrice}>${item.price}</Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  header: { paddingHorizontal: 16, paddingTop: 56, paddingBottom: 8 },
  headerTitle: { fontSize: 26, fontWeight: "700", color: "#fff" },
  searchRow: { flexDirection: "row", marginHorizontal: 16, marginBottom: 10, gap: 8 },
  searchInput: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 14,
  },
  vinButton: {
    backgroundColor: "#1e3a5f",
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  vinButtonText: { color: "#7eb8f7", fontWeight: "700", fontSize: 13 },
  makeScroll: { paddingHorizontal: 12, marginBottom: 10 },
  makeChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#333",
    marginHorizontal: 4,
  },
  makeChipActive: { backgroundColor: "#1e3a5f", borderColor: "#2563eb" },
  makeChipText: { color: "#888", fontSize: 13 },
  makeChipTextActive: { color: "#7eb8f7" },
  searchButton: {
    backgroundColor: "#2563eb",
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 14,
  },
  searchButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  emptyText: { textAlign: "center", color: "#444", marginTop: 40, fontSize: 15 },
  resultCard: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#111",
    borderRadius: 12,
    overflow: "hidden",
  },
  resultImage: { width: 80, height: 90 },
  resultInfo: { flex: 1, padding: 12, justifyContent: "space-between" },
  resultTitle: { fontSize: 13, color: "#ddd", fontWeight: "500", lineHeight: 18 },
  resultMeta: { fontSize: 12, color: "#666", marginTop: 4 },
  resultVehicle: { fontSize: 11, color: "#555", marginTop: 2 },
  resultPrice: { fontSize: 16, fontWeight: "700", color: "#fff", marginTop: 6 },
  scanOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  scanFrame: {
    width: 280,
    height: 70,
    borderWidth: 2,
    borderColor: "#2563eb",
    borderRadius: 6,
    marginBottom: 12,
  },
  scanHint: { color: "#fff", fontSize: 14 },
  cancelScan: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "#111",
    padding: 14,
    borderRadius: 10,
  },
  cancelScanText: { color: "#fff", fontWeight: "600" },
});
