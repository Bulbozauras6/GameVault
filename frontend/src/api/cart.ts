import api from "./client";

export interface CartItem {
  id: number;
  offer_id: number;
  quantity: number;
  price: string;
  currency: string;
  subtotal: string;
  available_stock: number;
  is_available: boolean;
  product: {
    id: number;
    slug: string;
    title: string;
    image: { url: string; alt_text: string | null } | null;
  };
  platform: { id: number; name: string };
  region: { id: number; name: string; code: string };
  seller: { id: number; name: string };
}

export interface CartTotal {
  currency: string;
  subtotal: string;
}

export interface ShoppingCart {
  id: number;
  is_guest?: boolean;
  items: CartItem[];
  item_count: number;
  currency: string | null;
  subtotal: string | null;
  totals_by_currency: CartTotal[];
}

interface CartResponse {
  data: ShoppingCart;
}

export async function fetchCart(): Promise<ShoppingCart> {
  const response = await api.get<CartResponse>("/api/cart");
  return response.data.data;
}

export async function addCartItem(offerId: number, quantity = 1): Promise<ShoppingCart> {
  const response = await api.post<CartResponse>("/api/cart/items", {
    offer_id: offerId,
    quantity,
  });
  return response.data.data;
}

export async function updateCartItem(itemId: number, quantity: number): Promise<ShoppingCart> {
  const response = await api.put<CartResponse>(`/api/cart/items/${itemId}`, { quantity });
  return response.data.data;
}

export async function removeCartItem(itemId: number): Promise<ShoppingCart> {
  const response = await api.delete<CartResponse>(`/api/cart/items/${itemId}`);
  return response.data.data;
}
