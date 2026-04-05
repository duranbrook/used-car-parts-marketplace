# Mobile Apps Implementation Plan (Seller + Buyer)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core screens for both Expo mobile apps: seller app with camera-driven listing creation and inventory management; buyer app with VIN-scan search, part browsing, and order tracking.

**Architecture:** Both apps share `@car-parts/api-client` and `@car-parts/types`. JWT tokens stored in `expo-secure-store`. Navigation uses `expo-router` file-based routing (same mental model as Next.js App Router). Camera and barcode scanning use `expo-camera` + `expo-barcode-scanner`.

**Tech Stack:** Expo SDK 53, expo-router, expo-camera, expo-barcode-scanner, expo-secure-store, expo-image-picker, @expo/vector-icons, React Native, TypeScript

**Prerequisites:** Plan 1 (Monorepo Foundation) complete. Backend running at a reachable URL (use ngrok or LAN IP during development).

---

### Task 1: Seller App — Auth (JWT login + SecureStore)

**Files:**
- Create: `apps/seller-app/src/auth.ts` — token storage
- Create: `apps/seller-app/src/screens/LoginScreen.tsx`
- Modify: `apps/seller-app/src/api.ts` — wire getToken to SecureStore

- [ ] **Step 1: Install expo-secure-store (if not already done)**

```bash
cd apps/seller-app && npx expo install expo-secure-store
```

- [ ] **Step 2: Create apps/seller-app/src/auth.ts**

```typescript
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "seller_jwt";
const REFRESH_KEY = "seller_refresh";

export async function saveTokens(token: string, refresh: string) {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, token),
    SecureStore.setItemAsync(REFRESH_KEY, refresh),
  ]);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_KEY);
}

export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
  ]);
}
```

- [ ] **Step 3: Update apps/seller-app/src/api.ts to use stored token**

```typescript
import { createApiClient } from "@car-parts/api-client";
import { getToken } from "./auth";

// getToken is async, but the api-client expects a sync getter.
// We cache the token on app start and refresh it after login.
let cachedToken: string | null = null;

export function setCachedToken(token: string | null) {
  cachedToken = token;
}

export const api = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
  getToken: () => cachedToken,
});

// Call this on app startup to hydrate the cache
export async function initApiToken() {
  cachedToken = await getToken();
}
```

- [ ] **Step 4: Create apps/seller-app/src/screens/LoginScreen.tsx**

```typescript
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { saveTokens, setCachedToken } from "../auth";
import { router } from "expo-router";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Error", "Email and password are required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/signin-mobile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as { token?: string; refresh?: string; error?: string };

      if (!res.ok) throw new Error(data.error ?? "Login failed");

      await saveTokens(data.token!, data.refresh!);
      setCachedToken(data.token!);
      router.replace("/(tabs)");
    } catch (err) {
      Alert.alert("Login Failed", (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>PartFinder Seller</Text>
      <Text style={styles.subtitle}>Sign in to manage your listings</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign In</Text>
        )}
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "#888",
    marginBottom: 32,
  },
  input: {
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 10,
    padding: 14,
    color: "#fff",
    fontSize: 15,
    marginBottom: 14,
  },
  button: {
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
```

- [ ] **Step 5: Add mobile signin API endpoint to web app**

Create `apps/web/src/app/api/auth/signin-mobile/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);

export async function POST(req: NextRequest) {
  const { email, password } = await req.json() as { email: string; password: string };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.passwordHash) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (user.role !== "SELLER" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "Seller account required" }, { status: 403 });
  }

  const token = await new SignJWT({ sub: user.id, role: user.role, name: user.name })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  const refresh = await new SignJWT({ sub: user.id, type: "refresh" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(JWT_SECRET);

  return NextResponse.json({ token, refresh, user: { id: user.id, name: user.name, role: user.role } });
}
```

Install `jose` in the web app:
```bash
cd apps/web && npm install jose
```

- [ ] **Step 6: Commit**

```bash
git add apps/seller-app/src apps/web/src/app/api/auth/signin-mobile apps/web/package.json
git commit -m "feat(seller-app): add JWT auth with SecureStore + mobile signin endpoint"
```

---

### Task 2: Seller App — Camera listing creation (photo capture + AI)

**Files:**
- Create: `apps/seller-app/app/(tabs)/camera.tsx` — main listing creation screen
- Create: `apps/seller-app/src/components/CameraCapture.tsx`
- Create: `apps/seller-app/src/hooks/usePartUpload.ts`

- [ ] **Step 1: Install camera dependencies**

```bash
cd apps/seller-app
npx expo install expo-camera expo-image-picker expo-file-system
```

- [ ] **Step 2: Create apps/seller-app/src/hooks/usePartUpload.ts**

```typescript
import { useState } from "react";
import * as FileSystem from "expo-file-system";
import { api } from "../api";

interface UploadResult {
  url: string;
  aiTags?: string;
}

export function usePartUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function uploadPhoto(localUri: string): Promise<UploadResult> {
    setUploading(true);
    setProgress(0);

    try {
      // 1. Get presigned URL from our API
      const filename = localUri.split("/").pop() ?? "photo.jpg";
      const { uploadUrl, publicUrl } = await (api as any).seller?.uploadUrl?.(filename, "image/jpeg") ??
        await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000"}/api/seller/upload-url`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename, contentType: "image/jpeg" }),
        }).then(r => r.json());

      // 2. Upload directly to S3
      setProgress(30);
      const uploadResult = await FileSystem.uploadAsync(uploadUrl, localUri, {
        httpMethod: "PUT",
        headers: { "Content-Type": "image/jpeg" },
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      });

      if (uploadResult.status !== 200) throw new Error("Upload failed");
      setProgress(100);

      return { url: publicUrl };
    } finally {
      setUploading(false);
    }
  }

  return { uploadPhoto, uploading, progress };
}
```

- [ ] **Step 3: Create apps/seller-app/app/(tabs)/camera.tsx**

```typescript
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
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
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
  const [aiResult, setAiResult] = useState<{ partType?: string; suggestedTitle?: string } | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const { uploadPhoto, uploading } = usePartUpload();

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera access is required to photograph parts.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function takePhoto() {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
    if (photo?.uri) setPhotos(prev => [...prev, photo.uri]);
  }

  async function analyzeAndProceed() {
    if (photos.length === 0) {
      Alert.alert("Add a photo", "Take at least one photo before continuing.");
      return;
    }

    try {
      // Upload first photo for AI analysis
      const { url } = await uploadPhoto(photos[0]);
      const result = await api.ai.identifyPart(url);
      setAiResult(result);
      if (result.suggestedTitle) setTitle(result.suggestedTitle);

      const priceResult = await api.ai.suggestPrice({ partType: result.partType, conditionGrade: grade });
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
      const uploadedUrls = await Promise.all(photos.map(p => uploadPhoto(p)));
      await api.parts.create({
        title,
        partType: aiResult?.partType ?? "other",
        conditionGrade: grade,
        price: parseFloat(price),
        images: uploadedUrls.map(r => ({ url: r.url })),
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
              <TouchableOpacity style={styles.nextButton} onPress={analyzeAndProceed} disabled={uploading}>
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

        {(["A", "B", "C"] as ConditionGrade[]).map(g => (
          <TouchableOpacity
            key={g}
            style={[styles.gradeOption, grade === g && styles.gradeSelected]}
            onPress={() => setGrade(g)}
          >
            <Text style={styles.gradeLabel}>Grade {g}</Text>
            <Text style={styles.gradeDesc}>
              {g === "A" ? "Excellent — minimal wear, fully functional" :
               g === "B" ? "Good — moderate wear, works correctly" :
               "Acceptable — visible wear, still functional"}
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
      <TouchableOpacity style={styles.button} onPress={() => {
        setStep("camera");
        setPhotos([]);
        setTitle("");
        setPrice("");
        setAiResult(null);
      }}>
        <Text style={styles.buttonText}>List Another Part</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  guideBorder: { width: 260, height: 200, borderWidth: 2, borderColor: "rgba(255,255,255,0.6)", borderRadius: 12 },
  guideText: { color: "rgba(255,255,255,0.7)", marginTop: 10, fontSize: 13 },
  cameraControls: { backgroundColor: "#111", padding: 16 },
  thumbnails: { marginBottom: 12 },
  thumbnail: { width: 60, height: 60, borderRadius: 8, marginRight: 8 },
  cameraButtons: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  captureButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" },
  captureInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: "#fff", borderWidth: 2, borderColor: "#333" },
  nextButton: { backgroundColor: "#2563eb", padding: 14, borderRadius: 10, flex: 1, marginLeft: 12, alignItems: "center" },
  formContainer: { flex: 1, backgroundColor: "#0a0a0a", padding: 20 },
  stepTitle: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 20 },
  aiCard: { backgroundColor: "#1a2a4a", borderRadius: 8, padding: 12, marginBottom: 16 },
  aiLabel: { color: "#7eb8f7", fontSize: 13 },
  gradeOption: { backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#333", borderRadius: 10, padding: 16, marginBottom: 10 },
  gradeSelected: { borderColor: "#2563eb", backgroundColor: "#1a2a4a" },
  gradeLabel: { fontSize: 16, fontWeight: "600", color: "#fff", marginBottom: 4 },
  gradeDesc: { fontSize: 13, color: "#888" },
  label: { fontSize: 13, color: "#aaa", marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#333", borderRadius: 10, padding: 14, color: "#fff", fontSize: 15, marginBottom: 8 },
  button: { backgroundColor: "#2563eb", padding: 16, borderRadius: 10, alignItems: "center", marginTop: 16 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  centeredContainer: { flex: 1, backgroundColor: "#0a0a0a", justifyContent: "center", alignItems: "center", padding: 24 },
  centeredText: { color: "#aaa", marginTop: 12, fontSize: 15 },
  centeredTitle: { fontSize: 24, fontWeight: "700", color: "#fff", marginTop: 10, marginBottom: 24 },
  successIcon: { fontSize: 48 },
  permissionContainer: { flex: 1, backgroundColor: "#0a0a0a", justifyContent: "center", alignItems: "center", padding: 24 },
  permissionText: { color: "#aaa", textAlign: "center", marginBottom: 20, fontSize: 15 },
});
```

- [ ] **Step 4: Commit**

```bash
git add apps/seller-app apps/web/src/app/api/auth/signin-mobile
git commit -m "feat(seller-app): camera listing creation with AI identification"
```

---

### Task 3: Seller App — VIN barcode scanner

**Files:**
- Create: `apps/seller-app/app/(tabs)/scan-vin.tsx`

- [ ] **Step 1: Create the VIN scanner screen**

Create `apps/seller-app/app/(tabs)/scan-vin.tsx`:

```typescript
import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
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
          <Text style={styles.vehicleMain}>{vehicle.year} {vehicle.make} {vehicle.model}</Text>
          {vehicle.trim && <Text style={styles.vehicleDetail}>Trim: {vehicle.trim}</Text>}
          {vehicle.engineType && <Text style={styles.vehicleDetail}>Engine: {vehicle.engineType}</Text>}
          {vehicle.transmission && <Text style={styles.vehicleDetail}>Trans: {vehicle.transmission}</Text>}
          <Text style={styles.vin}>VIN: {vehicle.vin}</Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push({ pathname: "/(tabs)/bulk-listing", params: { vin: vehicle.vin } })}
        >
          <Text style={styles.buttonText}>Harvest All Parts from This Vehicle →</Text>
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
        <>
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
          {scanned && (
            <TouchableOpacity style={styles.rescanButton} onPress={() => setScanned(false)}>
              <Text style={styles.buttonText}>Scan Again</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  camera: { flex: 1 },
  scanOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  scanFrame: { width: 300, height: 80, borderWidth: 2, borderColor: "#2563eb", borderRadius: 6, marginBottom: 16 },
  scanHint: { color: "#fff", fontSize: 14, fontWeight: "500" },
  scanHintSub: { color: "#aaa", fontSize: 12, marginTop: 4 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  title: { fontSize: 22, fontWeight: "700", color: "#fff", margin: 20 },
  vehicleCard: { backgroundColor: "#1a1a1a", borderRadius: 12, padding: 18, margin: 16 },
  vehicleMain: { fontSize: 20, fontWeight: "700", color: "#fff", marginBottom: 8 },
  vehicleDetail: { fontSize: 14, color: "#aaa", marginBottom: 4 },
  vin: { fontSize: 12, color: "#555", marginTop: 8, fontFamily: "monospace" },
  text: { color: "#aaa", textAlign: "center", marginBottom: 20 },
  button: { backgroundColor: "#2563eb", margin: 16, padding: 16, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  secondaryButton: { margin: 16, padding: 14, borderRadius: 10, alignItems: "center", borderWidth: 1, borderColor: "#333" },
  secondaryButtonText: { color: "#aaa", fontSize: 15 },
  rescanButton: { backgroundColor: "#2563eb", margin: 16, padding: 14, borderRadius: 10, alignItems: "center" },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/seller-app/app
git commit -m "feat(seller-app): add VIN barcode scanner with NHTSA decode"
```

---

### Task 4: Seller App — Inventory list screen

**Files:**
- Create: `apps/seller-app/app/(tabs)/index.tsx` — inventory home

- [ ] **Step 1: Create the inventory screen**

Create `apps/seller-app/app/(tabs)/index.tsx`:

```typescript
import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Image, ActivityIndicator,
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

  useEffect(() => { load(); }, [load]);

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
        keyExtractor={p => p.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No parts listed yet</Text>
            <TouchableOpacity style={styles.button} onPress={() => router.push("/(tabs)/camera")}>
              <Text style={styles.buttonText}>List Your First Part</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => router.push(`/part/${item.id}`)}>
            <Image
              source={{ uri: item.images[0]?.url ?? "https://placehold.co/80x80/1a1a1a/666?text=Part" }}
              style={styles.partImage}
            />
            <View style={styles.partInfo}>
              <Text style={styles.partTitle} numberOfLines={2}>{item.title}</Text>
              <View style={styles.partMeta}>
                <View style={[styles.gradeBadge, { backgroundColor: GRADE_COLOR[item.conditionGrade] + "22" }]}>
                  <Text style={[styles.gradeText, { color: GRADE_COLOR[item.conditionGrade] }]}>
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
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0a0a" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingTop: 56 },
  headerTitle: { fontSize: 22, fontWeight: "700", color: "#fff" },
  headerCount: { fontSize: 14, color: "#666" },
  card: { flexDirection: "row", backgroundColor: "#111", marginHorizontal: 16, marginBottom: 10, borderRadius: 12, overflow: "hidden" },
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
  button: { backgroundColor: "#2563eb", padding: 14, borderRadius: 10, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "600" },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/seller-app/app/(tabs)/index.tsx
git commit -m "feat(seller-app): add inventory list screen with pull-to-refresh"
```

---

### Task 5: Buyer App — Auth + VIN scan search

**Files:**
- Create: `apps/buyer-app/src/auth.ts`
- Create: `apps/buyer-app/src/api.ts`
- Create: `apps/buyer-app/app/(tabs)/index.tsx` — search screen with VIN scan

- [ ] **Step 1: Create buyer app auth (mirrors seller app)**

Create `apps/buyer-app/src/auth.ts`:

```typescript
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "buyer_jwt";
const REFRESH_KEY = "buyer_refresh";

export async function saveTokens(token: string, refresh: string) {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, token),
    SecureStore.setItemAsync(REFRESH_KEY, refresh),
  ]);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_KEY),
  ]);
}
```

Create `apps/buyer-app/src/api.ts`:

```typescript
import { createApiClient } from "@car-parts/api-client";

let cachedToken: string | null = null;

export function setCachedToken(token: string | null) {
  cachedToken = token;
}

export const api = createApiClient({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
  getToken: () => cachedToken,
});

export async function initApiToken() {
  const { getToken } = await import("./auth");
  cachedToken = await getToken();
}
```

- [ ] **Step 2: Create buyer search screen with VIN scan**

Create `apps/buyer-app/app/(tabs)/index.tsx`:

```typescript
import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Image, ActivityIndicator, ScrollView,
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
      // Try natural language AI parse first
      let searchParams: Record<string, string> = {};
      if (query) {
        try {
          const aiParams = await api.ai.smartSearch(query);
          searchParams = Object.fromEntries(
            Object.entries(aiParams).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
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
      const data = await api.parts.search({ make: vehicle.make, model: vehicle.model, year: String(vehicle.year) });
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
        <CameraView style={{ flex: 1 }} facing="back" onBarcodeScanned={handleVinScan}
          barcodeScannerSettings={{ barcodeTypes: ["code39", "code128", "pdf417"] }}>
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.makeScroll}>
        {MAKES.map(m => (
          <TouchableOpacity
            key={m}
            style={[styles.makeChip, make === m && styles.makeChipActive]}
            onPress={() => setMake(make === m ? "" : m)}
          >
            <Text style={[styles.makeChipText, make === m && styles.makeChipTextActive]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity style={styles.searchButton} onPress={search} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.searchButtonText}>Search</Text>}
      </TouchableOpacity>

      <FlatList
        data={results}
        keyExtractor={p => p.id}
        ListEmptyComponent={
          !loading ? <Text style={styles.emptyText}>Search for parts above</Text> : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.resultCard} onPress={() => router.push(`/part/${item.id}`)}>
            <Image
              source={{ uri: item.images[0]?.url ?? "https://placehold.co/70x70/111/666?text=Part" }}
              style={styles.resultImage}
            />
            <View style={styles.resultInfo}>
              <Text style={styles.resultTitle} numberOfLines={2}>{item.title}</Text>
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
  searchInput: { flex: 1, backgroundColor: "#1a1a1a", borderWidth: 1, borderColor: "#333", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: "#fff", fontSize: 14 },
  vinButton: { backgroundColor: "#1e3a5f", borderRadius: 10, paddingHorizontal: 14, justifyContent: "center" },
  vinButtonText: { color: "#7eb8f7", fontWeight: "700", fontSize: 13 },
  makeScroll: { paddingHorizontal: 12, marginBottom: 10 },
  makeChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: "#333", marginHorizontal: 4 },
  makeChipActive: { backgroundColor: "#1e3a5f", borderColor: "#2563eb" },
  makeChipText: { color: "#888", fontSize: 13 },
  makeChipTextActive: { color: "#7eb8f7" },
  searchButton: { backgroundColor: "#2563eb", marginHorizontal: 16, padding: 14, borderRadius: 10, alignItems: "center", marginBottom: 14 },
  searchButtonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  emptyText: { textAlign: "center", color: "#444", marginTop: 40, fontSize: 15 },
  resultCard: { flexDirection: "row", marginHorizontal: 16, marginBottom: 10, backgroundColor: "#111", borderRadius: 12, overflow: "hidden" },
  resultImage: { width: 80, height: 90 },
  resultInfo: { flex: 1, padding: 12, justifyContent: "space-between" },
  resultTitle: { fontSize: 13, color: "#ddd", fontWeight: "500", lineHeight: 18 },
  resultMeta: { fontSize: 12, color: "#666", marginTop: 4 },
  resultVehicle: { fontSize: 11, color: "#555", marginTop: 2 },
  resultPrice: { fontSize: 16, fontWeight: "700", color: "#fff", marginTop: 6 },
  scanOverlay: { flex: 1, justifyContent: "center", alignItems: "center" },
  scanFrame: { width: 280, height: 70, borderWidth: 2, borderColor: "#2563eb", borderRadius: 6, marginBottom: 12 },
  scanHint: { color: "#fff", fontSize: 14 },
  cancelScan: { position: "absolute", bottom: 40, alignSelf: "center", backgroundColor: "#111", padding: 14, borderRadius: 10 },
  cancelScanText: { color: "#fff", fontWeight: "600" },
});
```

- [ ] **Step 3: Commit**

```bash
git add apps/buyer-app/src apps/buyer-app/app
git commit -m "feat(buyer-app): add auth, VIN scan search, and part results screen"
```

---

### Task 6: Buyer App — Part detail screen

**Files:**
- Create: `apps/buyer-app/app/part/[id].tsx`

- [ ] **Step 1: Create part detail screen**

Create `apps/buyer-app/app/part/[id].tsx`:

```typescript
import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, Dimensions, Alert,
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
    api.parts.get(id).then(p => { setPart(p); setLoading(false); });
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
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }
  if (!part) {
    return <View style={styles.center}><Text style={styles.errorText}>Part not found</Text></View>;
  }

  const images = part.images.length > 0 ? part.images : [{ url: "https://placehold.co/400x300/111/666?text=No+Photo", isPrimary: true, id: "ph" }];

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Image gallery */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={e => setActiveImage(Math.round(e.nativeEvent.contentOffset.x / width))}
          scrollEventThrottle={16}
        >
          {images.map((img, i) => (
            <Image key={i} source={{ uri: img.url }} style={styles.mainImage} resizeMode="cover" />
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
          {/* Grade badge */}
          <View style={styles.gradeRow}>
            <View style={styles.gradeBadge}>
              <Text style={styles.gradeText}>Grade {part.conditionGrade}</Text>
            </View>
            <Text style={styles.partType}>{part.partType}</Text>
          </View>

          <Text style={styles.title}>{part.title}</Text>
          <Text style={styles.price}>${part.price}</Text>

          {/* Seller */}
          <View style={styles.sellerRow}>
            <Text style={styles.sellerLabel}>Sold by</Text>
            <Text style={styles.sellerName}>{part.seller.name}</Text>
          </View>

          {/* Donor vehicle */}
          {part.donorVehicle && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Donor Vehicle</Text>
              <Text style={styles.sectionText}>
                {part.donorVehicle.year} {part.donorVehicle.make} {part.donorVehicle.model}
                {part.donorVehicle.trim ? ` ${part.donorVehicle.trim}` : ""}
              </Text>
            </View>
          )}

          {/* Compatible vehicles */}
          {part.compatibility.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fits These Vehicles</Text>
              {part.compatibility.slice(0, 5).map(c => (
                <Text key={c.id} style={styles.compatItem}>
                  · {c.vehicle.year} {c.vehicle.make} {c.vehicle.model}
                </Text>
              ))}
              {part.compatibility.length > 5 && (
                <Text style={styles.compatMore}>+{part.compatibility.length - 5} more</Text>
              )}
            </View>
          )}

          {/* Part numbers */}
          {(part.partNumber || part.hollanderNumber) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Part Numbers</Text>
              {part.partNumber && <Text style={styles.sectionText}>OEM: {part.partNumber}</Text>}
              {part.hollanderNumber && <Text style={styles.sectionText}>Hollander: {part.hollanderNumber}</Text>}
            </View>
          )}

          {/* Description */}
          {part.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.sectionText}>{part.description}</Text>
            </View>
          )}

          {/* Condition notes */}
          {part.conditionNotes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Condition Notes</Text>
              <Text style={styles.sectionText}>{part.conditionNotes}</Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={styles.stickyBar}>
        <View>
          <Text style={styles.stickyPrice}>${part.price}</Text>
          <Text style={styles.stickyLabel}>+ shipping</Text>
        </View>
        <TouchableOpacity style={styles.addToCartButton} onPress={addToCart} disabled={addingToCart}>
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
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0a0a" },
  errorText: { color: "#888" },
  mainImage: { width, height: 300 },
  dots: { flexDirection: "row", justifyContent: "center", paddingVertical: 8, gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#333" },
  dotActive: { backgroundColor: "#2563eb" },
  content: { padding: 16 },
  gradeRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  gradeBadge: { backgroundColor: "#1e3a5f", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  gradeText: { color: "#7eb8f7", fontSize: 12, fontWeight: "600" },
  partType: { color: "#666", fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 },
  title: { fontSize: 20, fontWeight: "700", color: "#fff", lineHeight: 26, marginBottom: 8 },
  price: { fontSize: 28, fontWeight: "800", color: "#fff", marginBottom: 12 },
  sellerRow: { flexDirection: "row", gap: 6, marginBottom: 16, alignItems: "center" },
  sellerLabel: { fontSize: 13, color: "#666" },
  sellerName: { fontSize: 13, color: "#7eb8f7", fontWeight: "500" },
  section: { marginTop: 18, paddingTop: 18, borderTopWidth: 1, borderTopColor: "#1a1a1a" },
  sectionTitle: { fontSize: 12, color: "#666", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  sectionText: { fontSize: 14, color: "#ccc", lineHeight: 21 },
  compatItem: { fontSize: 13, color: "#aaa", marginBottom: 4 },
  compatMore: { fontSize: 12, color: "#555", marginTop: 4 },
  stickyBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#111", flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderTopWidth: 1, borderTopColor: "#222" },
  stickyPrice: { fontSize: 20, fontWeight: "700", color: "#fff" },
  stickyLabel: { fontSize: 11, color: "#555" },
  addToCartButton: { backgroundColor: "#2563eb", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 10 },
  addToCartText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/buyer-app/app/part
git commit -m "feat(buyer-app): add part detail screen with image gallery and add-to-cart"
```

---

### Task 7: Final — run and verify both apps

- [ ] **Step 1: Start the web backend**

```bash
cd apps/web && npm run dev
```

- [ ] **Step 2: Start the seller app**

```bash
cd apps/seller-app && npx expo start
```

Verify on simulator:
- Login screen appears
- After login, inventory screen loads (empty state for new account)
- Camera tab opens device camera
- VIN scan tab shows barcode scanner

- [ ] **Step 3: Start the buyer app**

```bash
cd apps/buyer-app && npx expo start
```

Verify on simulator:
- Search screen loads
- VIN button opens barcode scanner
- Make chips filter the search
- Part cards show after search
- Tapping a card opens part detail

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: mobile apps complete — seller camera + inventory, buyer search + part detail"
```
