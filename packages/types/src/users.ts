export type UserRole = "BUYER" | "SELLER" | "ADMIN";
export type SellerTier = "NEW" | "VERIFIED" | "TOP_RATED" | "POWER_SELLER";

export interface UserSummary {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  image: string | null;
}

export interface SellerProfile extends UserSummary {
  location: string | null;
  phone: string | null;
  createdAt: string;
  tier?: SellerTier;
  averageRating?: number;
  reviewCount?: number;
  responseTime?: string;
}
