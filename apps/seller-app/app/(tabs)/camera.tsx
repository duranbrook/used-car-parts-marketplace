import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { usePartUpload } from "../../src/hooks/usePartUpload";
import { api } from "../../src/api";
import type { ConditionGrade } from "@car-parts/types";

type Step = "camera" | "grade" | "details" | "submitting" | "done";

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>("camera");
  const [photos, setPhotos] = useState<string[]>([]);
  const [grade, setGrade] = useState<ConditionGrade>("B");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [aiResult, setAiResult] = useState<{ partType?: string; suggestedTitle?: string } | null>(
    null
  );
  const cameraRef = useRef<CameraView>(null);
  const { uploadPhoto, uploading } = usePartUpload();

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Camera access is required to photograph parts.
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function takePhoto() {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
    if (photo?.uri) setPhotos((prev) => [...prev, photo.uri]);
  }

  async function analyzeAndProceed() {
    if (photos.length === 0) {
      Alert.alert("Add a photo", "Take at least one photo before continuing.");
      return;
    }
    try {
      const { url } = await uploadPhoto(photos[0]);
      const result = await api.ai.identifyPart(url);
      setAiResult(result);
      if (result.suggestedTitle) setTitle(result.suggestedTitle);
      const priceResult = await api.ai.suggestPrice({
        partType: result.partType,
        conditionGrade: grade,
      });
      setPrice(String(priceResult.suggested));
      setStep("grade");
    } catch {
      Alert.alert("Analysis failed", "Continue manually.");
      setStep("grade");
    }
  }

  async function submitListing() {
    if (!title || !price) {
      Alert.alert("Required", "Title and price are required.");
      return;
    }
    setStep("submitting");
    try {
      const uploadedUrls = await Promise.all(photos.map((p) => uploadPhoto(p)));
      await api.parts.create({
        title,
        partType: aiResult?.partType ?? "other",
        conditionGrade: grade,
        price: parseFloat(price),
        images: uploadedUrls.map((r) => ({ url: r.url })),
      });
      setStep("done");
    } catch (err) {
      Alert.alert("Error", (err as Error).message);
      setStep("details");
    }
  }

  if (step === "camera") {
    return (
      <View style={styles.container}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          <View style={styles.cameraOverlay}>
            <View style={styles.guideBorder} />
            <Text style={styles.guideText}>Frame the part clearly</Text>
          </View>
        </CameraView>
        <View style={styles.cameraControls}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnails}>
            {photos.map((p, i) => (
              <Image key={i} source={{ uri: p }} style={styles.thumbnail} />
            ))}
          </ScrollView>
          <View style={styles.cameraButtons}>
            <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
              <View style={styles.captureInner} />
            </TouchableOpacity>
            {photos.length > 0 && (
              <TouchableOpacity
                style={styles.nextButton}
                onPress={analyzeAndProceed}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Analyze & Continue →</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  }

  if (step === "grade") {
    return (
      <ScrollView style={styles.formContainer}>
        <Text style={styles.stepTitle}>Condition Grade</Text>
        {aiResult && (
          <View style={styles.aiCard}>
            <Text style={styles.aiLabel}>AI identified: {aiResult.partType}</Text>
          </View>
        )}
        {(["A", "B", "C"] as ConditionGrade[]).map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.gradeOption, grade === g && styles.gradeSelected]}
            onPress={() => setGrade(g)}
          >
            <Text style={styles.gradeLabel}>Grade {g}</Text>
            <Text style={styles.gradeDesc}>
              {g === "A"
                ? "Excellent — minimal wear, fully functional"
                : g === "B"
                  ? "Good — moderate wear, works correctly"
                  : "Acceptable — visible wear, still functional"}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={styles.button} onPress={() => setStep("details")}>
          <Text style={styles.buttonText}>Next: Details →</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (step === "details") {
    return (
      <ScrollView style={styles.formContainer}>
        <Text style={styles.stepTitle}>Listing Details</Text>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. 2015 Toyota Camry LE Headlight Assembly"
          placeholderTextColor="#666"
        />
        <Text style={styles.label}>Price ($) *</Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#666"
        />
        <TouchableOpacity style={styles.button} onPress={submitListing}>
          <Text style={styles.buttonText}>List Part</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (step === "submitting") {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.centeredText}>Creating listing...</Text>
      </View>
    );
  }

  return (
    <View style={styles.centeredContainer}>
      <Text style={styles.successIcon}>✅</Text>
      <Text style={styles.centeredTitle}>Part listed!</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          setStep("camera");
          setPhotos([]);
          setTitle("");
          setPrice("");
          setAiResult(null);
        }}
      >
        <Text style={styles.buttonText}>List Another Part</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  guideBorder: {
    width: 260,
    height: 200,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.6)",
    borderRadius: 12,
  },
  guideText: { color: "rgba(255,255,255,0.7)", marginTop: 10, fontSize: 13 },
  cameraControls: { backgroundColor: "#111", padding: 16 },
  thumbnails: { marginBottom: 12 },
  thumbnail: { width: 60, height: 60, borderRadius: 8, marginRight: 8 },
  cameraButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  captureInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#333",
  },
  nextButton: {
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 10,
    flex: 1,
    marginLeft: 12,
    alignItems: "center",
  },
  formContainer: { flex: 1, backgroundColor: "#0a0a0a", padding: 20 },
  stepTitle: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 20 },
  aiCard: { backgroundColor: "#1a2a4a", borderRadius: 8, padding: 12, marginBottom: 16 },
  aiLabel: { color: "#7eb8f7", fontSize: 13 },
  gradeOption: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
  },
  gradeSelected: { borderColor: "#2563eb", backgroundColor: "#1a2a4a" },
  gradeLabel: { fontSize: 16, fontWeight: "600", color: "#fff", marginBottom: 4 },
  gradeDesc: { fontSize: 13, color: "#888" },
  label: { fontSize: 13, color: "#aaa", marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    padding: 14,
    color: "#fff",
    fontSize: 15,
    marginBottom: 8,
  },
  button: {
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  centeredContainer: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  centeredText: { color: "#aaa", marginTop: 12, fontSize: 15 },
  centeredTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginTop: 10,
    marginBottom: 24,
  },
  successIcon: { fontSize: 48 },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  permissionText: { color: "#aaa", textAlign: "center", marginBottom: 20, fontSize: 15 },
});
