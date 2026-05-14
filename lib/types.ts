export type DeliveryStatus = "unassigned" | "assigned" | "dispatched" | "delivered";

export interface Delivery {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  notes: string;
  status: DeliveryStatus;
  createdAt: number;
  riderName?: string;
  riderPhone?: string;
}
