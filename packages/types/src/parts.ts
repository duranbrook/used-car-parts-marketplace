export type ConditionGrade = "A" | "B" | "C";
export type PartStatus = "DRAFT" | "ACTIVE" | "SOLD" | "RESERVED" | "INACTIVE";

export interface PartImage {
  id: string;
  url: string;
  isPrimary: boolean;
  aiTags: string | null;
  order: number;
}

export interface VehicleSummary {
  id: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  vin?: string | null;
}

export interface PartCompatibility {
  id: string;
  vehicleId: string;
  yearStart: number | null;
  yearEnd: number | null;
  vehicle: VehicleSummary;
}

export interface PartSummary {
  id: string;
  title: string;
  partType: string;
  conditionGrade: ConditionGrade;
  price: string;
  status: PartStatus;
  views: number;
  createdAt: string;
  images: PartImage[];
  seller: { id: string; name: string | null };
  donorVehicle: VehicleSummary | null;
}

export interface PartDetail extends PartSummary {
  description: string | null;
  partNumber: string | null;
  hollanderNumber: string | null;
  conditionNotes: string | null;
  suggestedPrice: string | null;
  quantity: number;
  weight: string | null;
  compatibility: PartCompatibility[];
  updatedAt: string;
}

export interface CreatePartInput {
  title: string;
  description?: string;
  partType: string;
  partNumber?: string;
  hollanderNumber?: string;
  conditionGrade: ConditionGrade;
  conditionNotes?: string;
  price: number;
  quantity?: number;
  weight?: number;
  images?: { url: string; aiTags?: string }[];
  compatibility?: { year: number; make: string; model: string; yearStart?: number; yearEnd?: number }[];
  donorVehicle?: {
    vin?: string;
    year: number;
    make: string;
    model: string;
    trim?: string;
    engineType?: string;
  };
}

export interface PartSearchParams {
  q?: string;
  partType?: string;
  make?: string;
  model?: string;
  year?: string;
  minPrice?: string;
  maxPrice?: string;
  conditionGrade?: string;
  page?: number;
  limit?: number;
}
