import { NextRequest, NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@/lib/auth";
import { randomBytes } from "crypto";

// Google Cloud Storage via its S3-compatible XML API.
// Uses HMAC keys from GCS → Settings → Interoperability.
const s3 = new S3Client({
  region: "auto",
  endpoint: "https://storage.googleapis.com",
  credentials: {
    accessKeyId: process.env.GCS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.GCS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.GCS_BUCKET ?? "car-parts-media";
const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SELLER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Sellers only" }, { status: 403 });
  }

  const { filename, contentType } = (await req.json()) as {
    filename: string;
    contentType: string;
  };

  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return NextResponse.json({ error: "Invalid content type" }, { status: 400 });
  }

  const ext = filename.split(".").pop() ?? "jpg";
  const key = `parts/${session.user.id}/${randomBytes(16).toString("hex")}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  const publicUrl = `https://storage.googleapis.com/${BUCKET}/${key}`;

  return NextResponse.json({ uploadUrl, key, publicUrl });
}
