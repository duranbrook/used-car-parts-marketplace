import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  href: string;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user, partCount, orderCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, image: true, phone: true, location: true, businessName: true },
    }),
    prisma.part.count({ where: { sellerId: session.user.id } }),
    prisma.order.count({ where: { sellerId: session.user.id } }),
  ]);

  const steps: OnboardingStep[] = [
    {
      id: "profile",
      title: "Complete your profile",
      description: "Add your name and profile photo so buyers trust you",
      completed: !!(user?.name && user?.image),
      href: "/dashboard/settings",
    },
    {
      id: "location",
      title: "Add your location",
      description: "Buyers filter by distance — your location improves visibility",
      completed: !!(user?.location),
      href: "/dashboard/settings",
    },
    {
      id: "phone",
      title: "Add a phone number",
      description: "Required for Stripe payouts and order notifications",
      completed: !!(user?.phone),
      href: "/dashboard/settings",
    },
    {
      id: "first_listing",
      title: "Create your first listing",
      description: "List a part to start selling",
      completed: partCount > 0,
      href: "/parts/new",
    },
    {
      id: "first_sale",
      title: "Make your first sale",
      description: "Your first order is on its way",
      completed: orderCount > 0,
      href: "/dashboard/orders",
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;

  return NextResponse.json({
    steps,
    percentComplete: Math.round((completedCount / steps.length) * 100),
  });
}
