import { prisma } from "@/lib/prisma";
import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let parts: { id: string; updatedAt: Date }[] = [];
  try {
    parts = await prisma.part.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 50000,
    });
  } catch {
    // Database not available during build
  }

  const partUrls: MetadataRoute.Sitemap = parts.map((part) => ({
    url: `${process.env.AUTH_URL || "https://partfinder.com"}/parts/${part.id}`,
    lastModified: part.updatedAt,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [
    { url: `${process.env.AUTH_URL || "https://partfinder.com"}`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${process.env.AUTH_URL || "https://partfinder.com"}/search`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    ...partUrls,
  ];
}
