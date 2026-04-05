import { useState } from "react";
import * as FileSystem from "expo-file-system";

interface UploadResult {
  url: string;
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export function usePartUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function uploadPhoto(localUri: string): Promise<UploadResult> {
    setUploading(true);
    setProgress(0);

    try {
      const filename = localUri.split("/").pop() ?? "photo.jpg";

      // 1. Get presigned URL from our API
      const presignRes = await fetch(`${API_URL}/api/seller/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, contentType: "image/jpeg" }),
      });
      const { uploadUrl, publicUrl } = (await presignRes.json()) as {
        uploadUrl: string;
        publicUrl: string;
      };

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
