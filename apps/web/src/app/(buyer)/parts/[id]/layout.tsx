import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const part = await prisma.part.findUnique({
    where: { id },
    include: { donorVehicle: true, images: { where: { isPrimary: true }, take: 1 } },
  });

  if (!part) return { title: "Part Not Found — PartFinder" };

  const vehicle = part.donorVehicle
    ? `${part.donorVehicle.year} ${part.donorVehicle.make} ${part.donorVehicle.model}`
    : "";
  const title = `${part.title} — PartFinder`;
  const description = `Used ${part.partType} ${vehicle ? `from ${vehicle}` : ""}. Condition: Grade ${part.conditionGrade}. $${parseFloat(part.price.toString()).toFixed(2)}. ${part.description || ""}`.slice(0, 160);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: part.images[0]?.url ? [part.images[0].url] : [],
      type: "website",
    },
    other: {
      "product:price:amount": part.price.toString(),
      "product:price:currency": "USD",
      "product:condition": part.conditionGrade === "A" ? "new" : "used",
    },
  };
}

export default function PartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
