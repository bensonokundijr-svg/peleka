export type DeliveryStatus = "unassigned" | "assigned" | "dispatched" | "delivered" | "failed";

export interface Delivery {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  notes: string;
  status: DeliveryStatus;
  createdAt: number;
  riderId?: string;
  riderName?: string;
  riderPhone?: string;
  lat?: number;
  lng?: number;
  queuePosition?: number;
  queueSize?: number;
  dispatchedAt?: number;
  deliveredAt?: number;
  failureReason?: string;
}

export interface Rider {
  id: string;
  name: string;
  phone: string;
}

export interface FeedbackEntry {
  orderRating: number;
  deliveryRating: number;
  comments?: string;
  submittedAt: number;
  sentiment?: "positive" | "neutral" | "negative";
  topics?: string[];
}
