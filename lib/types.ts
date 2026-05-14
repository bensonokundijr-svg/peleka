export type DeliveryStatus = "unassigned" | "assigned" | "dispatched" | "delivered";

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
}

export interface Rider {
  id: string;
  name: string;
  phone: string;
}
