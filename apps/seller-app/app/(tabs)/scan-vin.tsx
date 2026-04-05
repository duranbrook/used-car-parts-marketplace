import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { api } from "../../src/api";
import type { VinDecodeResult } from "@car-parts/types";
import { router } from "expo-router";

export default function ScanVinScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [vehicle, setVehicle] = useState<VinDecodeResult | null>(null);

  if (!permission?.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Camera required to scan VIN barcodes.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function handleBarcodeScan({ data }: { data: string }) {
    if (scanned) return;
    setScanned(true);
    setLoading(true);
    try {
      const result = await api.vin.decode(data);
      setVehicle(result);
    } catch {
      Alert.alert("VIN not found", "Try scanning again or enter manually.", [
        { text: "Try Again", onPress: () => setScanned(false) },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (vehicle) {
    return (
      <ScrollView style={styles.container}>
        <Text style={styles.title}>Vehicle Decoded</Text>
        <View style={styles.vehicleCard}>
          <Text style={styles.vehicleMain}>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </Text>
          {vehicle.trim && <Text style={styles.vehicleDetail}>Trim: {vehicle.trim}</Text>}
          {vehicle.engineType && (
            <Text style={styles.vehicleDetail}>Engine: {vehicle.engineType}</Text>
          )}
          {vehicle.transmission && (
            <Text style={styles.vehicleDetail}>Trans: {vehicle.transmission}</Text>
          )}
          <Text style={styles.vin}>VIN: {vehicle.vin}</Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            router.push({
              pathname: "/(tabs)/camera",
              params: { vin: vehicle.vin },
            })
          }
        >
          <Text style={styles.buttonText}>List Parts from This Vehicle →</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => setVehicle(null)}>
          <Text style={styles.secondaryButtonText}>Scan Another VIN</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.text}>Looking up VIN...</Text>
        </View>
      ) : (
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarcodeScan}
          barcodeScannerSettings={{ barcodeTypes: ["code39", "code128", "pdf417", "qr"] }}
        >
          <View style={styles.scanOverlay}>
            <View style={styles.scanFrame} />
            <Text style={styles.scanHint}>Point camera at the VIN barcode</Text>
            <Text style={styles.scanHintSub}>(usually on dashboard or door jamb)</Text>
          </View>
        </CameraView>
      )}
      {scanned && !loading && (
        <TouchableOpacity style={styles.rescanButton} onPress={() => setScanned(false)}>
          <Text style={styles.buttonText}>Scan Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  camera: { flex: 1 },
  scanOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  scanFrame: {
    width: 300,
    height: 80,
    borderWidth: 2,
    borderColor: "#2563eb",
    borderRadius: 6,
    marginBottom: 16,
  },
  scanHint: { color: "#fff", fontSize: 14, fontWeight: "500" },
  scanHintSub: { color: "#aaa", fontSize: 12, marginTop: 4 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 22, fontWeight: "700", color: "#fff", margin: 20 },
  vehicleCard: { backgroundColor: "#1a1a1a", borderRadius: 12, padding: 18, margin: 16 },
  vehicleMain: { fontSize: 20, fontWeight: "700", color: "#fff", marginBottom: 8 },
  vehicleDetail: { fontSize: 14, color: "#aaa", marginBottom: 4 },
  vin: { fontSize: 12, color: "#555", marginTop: 8, fontFamily: "monospace" },
  text: { color: "#aaa", textAlign: "center", marginBottom: 20 },
  button: {
    backgroundColor: "#2563eb",
    margin: 16,
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  secondaryButton: {
    margin: 16,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#333",
  },
  secondaryButtonText: { color: "#aaa", fontSize: 15 },
  rescanButton: {
    backgroundColor: "#2563eb",
    margin: 16,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
});
