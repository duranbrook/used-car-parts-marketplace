export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SHIPPED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";

export interface OrderItem {
  id: string;
  partId: string;
  quantity: number;
  price: string;
  part: {
    id: string;
    title: string;
    partType: string;
    images: { url: string; isPrimary: boolean }[];
  };
}

export interface Order {
  id: string;
  buyerId: string;
  sellerId: string;
  status: OrderStatus;
  subtotal: string;
  shippingCost: string;
  platformFee: string;
  total: string;
  trackingNumber: string | null;
  shippingCarrier: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  buyer?: { id: string; name: string | null; email: string };
  seller?: { id: string; name: string | null; email: string };
}

export interface CreateOrderInput {
  items: { partId: string; quantity: number }[];
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  notes?: string;
}
