import api from "./client";

export interface PurchasedKey {
  id: number;
  key: string;
}

export interface OrderItem {
  id: number;
  offer_id: number;
  product_id: number;
  product_title: string;
  seller_name: string;
  platform_name: string;
  region_name: string;
  quantity: number;
  unit_price: string;
  line_total: string;
  currency: string;
  digital_keys: PurchasedKey[];
}

export interface GameOrder {
  id: number;
  order_number: string;
  status: string;
  currency: string;
  subtotal: string;
  total: string;
  placed_at: string | null;
  items: OrderItem[];
}

export interface OrderSummary extends Omit<GameOrder, "items"> {
  item_count: number;
}

interface OrderResponse {
  data: GameOrder;
}

interface OrdersResponse {
  data: OrderSummary[];
}

export async function createCheckout(): Promise<GameOrder> {
  const response = await api.post<OrderResponse>("/api/checkout");
  return response.data.data;
}

export async function fetchOrder(orderId: number): Promise<GameOrder> {
  const response = await api.get<OrderResponse>(`/api/orders/${orderId}`);
  return response.data.data;
}

export async function fetchOrders(): Promise<OrderSummary[]> {
  const response = await api.get<OrdersResponse>("/api/orders");
  return response.data.data;
}
