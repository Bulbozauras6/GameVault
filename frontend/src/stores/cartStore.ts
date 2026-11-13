import { isAxiosError } from "axios";
import { create } from "zustand";
import {
  addCartItem,
  fetchCart,
  removeCartItem,
  updateCartItem,
  type CartItem,
  type ShoppingCart,
} from "../api/cart";
import type { MarketplaceOffer, ProductDetail } from "../api/types";
import { useAuthStore } from "./authStore";

const guestCartStorageKey = "gamevault-guest-cart-v1";

interface GuestCartEntry {
  offer_id: number;
  quantity: number;
  price: string;
  currency: string;
  available_stock: number;
  product: CartItem["product"];
  platform: CartItem["platform"];
  region: CartItem["region"];
  seller: CartItem["seller"];
}

interface GuestOfferDetails {
  product: ProductDetail;
  offer: MarketplaceOffer;
}

interface CartMergeNotice {
  changedPriceTitles: string[];
  unavailableTitles: string[];
}

interface CartState {
  cart: ShoppingCart | null;
  userId: number | null;
  guestItems: GuestCartEntry[];
  guestLoaded: boolean;
  loading: boolean;
  pending: boolean;
  error: string | null;
  mergeNotice: CartMergeNotice | null;
  miniCartOpen: boolean;
  loadCart: (force?: boolean) => Promise<void>;
  addItem: (offerId: number, details?: GuestOfferDetails, quantity?: number) => Promise<void>;
  updateItem: (itemId: number, quantity: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  toggleMiniCart: () => void;
  closeMiniCart: () => void;
  clear: () => void;
  clearError: () => void;
  clearMergeNotice: () => void;
}

function getErrorMessage(error: unknown): string {
  if (isAxiosError<{ message?: string; errors?: Record<string, string[]> }>(error)) {
    return error.response?.data?.errors
      ? Object.values(error.response.data.errors).flat()[0] ?? "The cart request could not be completed."
      : error.response?.data?.message ?? "The cart request could not be completed.";
  }

  if (error instanceof Error) return error.message;

  return "The cart request could not be completed.";
}

function isGuestCartEntry(value: unknown): value is GuestCartEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<GuestCartEntry>;

  return Number.isInteger(entry.offer_id)
    && Number.isInteger(entry.quantity)
    && typeof entry.price === "string"
    && typeof entry.currency === "string"
    && Number.isInteger(entry.available_stock)
    && Boolean(entry.product && typeof entry.product.title === "string" && typeof entry.product.slug === "string")
    && Boolean(entry.platform && typeof entry.platform.name === "string")
    && Boolean(entry.region && typeof entry.region.name === "string")
    && Boolean(entry.seller && typeof entry.seller.name === "string");
}

function readGuestItems(): GuestCartEntry[] {
  const stored = window.localStorage.getItem(guestCartStorageKey);
  if (!stored) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    throw new Error("The saved guest cart could not be read. Clear the damaged cart data and try again.");
  }

  if (!Array.isArray(parsed) || !parsed.every(isGuestCartEntry)) {
    throw new Error("The saved guest cart contains invalid data. Clear the damaged cart data and try again.");
  }

  return parsed;
}

function persistGuestItems(items: GuestCartEntry[]): void {
  if (items.length === 0) {
    window.localStorage.removeItem(guestCartStorageKey);
    return;
  }

  window.localStorage.setItem(guestCartStorageKey, JSON.stringify(items));
}

function moneyToCents(amount: string): number {
  return Math.round(Number(amount) * 100);
}

function formatCents(amount: number): string {
  return `${Math.floor(amount / 100)}.${String(amount % 100).padStart(2, "0")}`;
}

function guestCartItem(entry: GuestCartEntry): CartItem {
  const unitCents = moneyToCents(entry.price);

  return {
    id: entry.offer_id,
    ...entry,
    subtotal: formatCents(unitCents * entry.quantity),
    is_available: entry.available_stock >= entry.quantity,
  };
}

function guestCart(items: GuestCartEntry[]): ShoppingCart {
  const cartItems = items.map(guestCartItem);
  const totals = new Map<string, number>();

  for (const item of cartItems) {
    totals.set(item.currency, (totals.get(item.currency) ?? 0) + moneyToCents(item.subtotal));
  }

  const totalsByCurrency = [...totals.entries()].map(([currency, subtotal]) => ({
    currency,
    subtotal: formatCents(subtotal),
  }));

  return {
    id: 0,
    is_guest: true,
    items: cartItems,
    item_count: cartItems.reduce((total, item) => total + item.quantity, 0),
    currency: totalsByCurrency.length === 1 ? totalsByCurrency[0].currency : null,
    subtotal: totalsByCurrency.length === 1 ? totalsByCurrency[0].subtotal : totalsByCurrency.length === 0 ? "0.00" : null,
    totals_by_currency: totalsByCurrency,
  };
}

function guestEntryFromOffer(details: GuestOfferDetails): GuestCartEntry {
  const { offer, product } = details;
  const platform = offer.platform ?? product.platforms?.[0];
  const region = offer.region ?? product.regions?.[0];
  const availableStock = offer.available_stock;

  if (!platform || !region || availableStock === undefined) {
    throw new Error("Offer availability is missing. Refresh the product page and try again.");
  }

  const image = product.images?.find((item) => item.is_primary) ?? product.images?.[0];

  return {
    offer_id: offer.id,
    quantity: 1,
    price: offer.price,
    currency: offer.currency,
    available_stock: availableStock,
    product: {
      id: product.id,
      slug: product.slug,
      title: product.title,
      image: image ? { url: image.url, alt_text: image.alt_text } : null,
    },
    platform: { id: platform.id, name: platform.name },
    region: { id: region.id, name: region.name, code: region.code },
    seller: { id: offer.seller.id, name: offer.seller.name },
  };
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: null,
  userId: null,
  guestItems: [],
  guestLoaded: false,
  loading: false,
  pending: false,
  error: null,
  mergeNotice: null,
  miniCartOpen: false,

  async loadCart(force = false) {
    const user = useAuthStore.getState().user;
    if (get().loading) return;

    if (!user) {
      set({ loading: true, error: null });
      try {
        const items = readGuestItems();
        set({
          cart: guestCart(items),
          userId: null,
          guestItems: items,
          guestLoaded: true,
        });
      } catch (error) {
        set({ cart: null, guestItems: [], guestLoaded: true, error: getErrorMessage(error) });
      } finally {
        set({ loading: false });
      }
      return;
    }

    if (!force && get().userId === user.id && get().cart && get().guestLoaded && get().guestItems.length === 0) return;
    set({ loading: true, error: null });

    try {
      let guestItems = get().guestLoaded ? get().guestItems : readGuestItems();
      const changedPriceTitles: string[] = [];
      const unavailableTitles: string[] = [];
      set({ guestItems, guestLoaded: true });

      for (const guestItem of [...guestItems]) {
        if (useAuthStore.getState().user?.id !== user.id) return;

        try {
          const mergedCart = await addCartItem(guestItem.offer_id, guestItem.quantity);
          const mergedItem = mergedCart.items.find((item) => item.offer_id === guestItem.offer_id);
          if (mergedItem && (mergedItem.price !== guestItem.price || mergedItem.currency !== guestItem.currency)) {
            changedPriceTitles.push(guestItem.product.title);
          }
          guestItems = guestItems.filter((item) => item.offer_id !== guestItem.offer_id);
          persistGuestItems(guestItems);
          set({ guestItems });
        } catch (error) {
          if (!isAxiosError(error) || error.response?.status !== 422) throw error;

          unavailableTitles.push(guestItem.product.title);
          guestItems = guestItems.filter((item) => item.offer_id !== guestItem.offer_id);
          persistGuestItems(guestItems);
          set({ guestItems });
        }
      }

      const cart = await fetchCart();
      if (useAuthStore.getState().user?.id === user.id) {
        set({
          cart,
          userId: user.id,
          guestItems,
          guestLoaded: true,
          mergeNotice: changedPriceTitles.length > 0 || unavailableTitles.length > 0
            ? { changedPriceTitles, unavailableTitles }
            : get().mergeNotice,
        });
      }
    } catch (error) {
      if (useAuthStore.getState().user?.id === user.id) {
        set({
          cart: null,
          guestItems: get().guestLoaded ? get().guestItems : [],
          guestLoaded: true,
          error: getErrorMessage(error),
        });
      }
    } finally {
      set({ loading: false });
    }
  },

  async addItem(offerId, details, quantity = 1) {
    const user = useAuthStore.getState().user;
    set({ pending: true, error: null });
    try {
      if (!user) {
        if (!details) throw new Error("Offer details are required for guest cart items.");
        const entry = guestEntryFromOffer(details);
        const items = get().guestLoaded ? [...get().guestItems] : readGuestItems();
        const existing = items.find((item) => item.offer_id === offerId);
        const nextQuantity = (existing?.quantity ?? 0) + quantity;

        if (entry.available_stock < nextQuantity) {
          throw new Error("There is not enough stock available for this offer.");
        }

        const nextItems = existing
          ? items.map((item) => item.offer_id === offerId ? { ...entry, quantity: nextQuantity } : item)
          : [...items, { ...entry, quantity }];
        persistGuestItems(nextItems);
        set({
          cart: guestCart(nextItems),
          userId: null,
          guestItems: nextItems,
          guestLoaded: true,
          miniCartOpen: true,
        });
        return;
      }

      const cart = await addCartItem(offerId, quantity);
      if (useAuthStore.getState().user?.id === user.id) {
        set({ cart, userId: user.id, miniCartOpen: true });
      }
    } catch (error) {
      set({ error: getErrorMessage(error) });
      throw error;
    } finally {
      set({ pending: false });
    }
  },

  async updateItem(itemId, quantity) {
    set({ pending: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        const items = get().guestLoaded ? [...get().guestItems] : readGuestItems();
        const target = items.find((item) => item.offer_id === itemId);
        if (!target || quantity < 1 || quantity > target.available_stock) {
          throw new Error("The requested quantity is not available.");
        }

        const nextItems = items.map((item) => item.offer_id === itemId ? { ...item, quantity } : item);
        persistGuestItems(nextItems);
        set({ cart: guestCart(nextItems), guestItems: nextItems, guestLoaded: true });
        return;
      }

      const cart = await updateCartItem(itemId, quantity);
      if (useAuthStore.getState().user?.id === user.id) set({ cart, userId: user.id });
    } catch (error) {
      set({ error: getErrorMessage(error) });
    } finally {
      set({ pending: false });
    }
  },

  async removeItem(itemId) {
    set({ pending: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        const items = get().guestLoaded ? [...get().guestItems] : readGuestItems();
        const nextItems = items.filter((item) => item.offer_id !== itemId);
        persistGuestItems(nextItems);
        set({ cart: guestCart(nextItems), guestItems: nextItems, guestLoaded: true });
        return;
      }

      const cart = await removeCartItem(itemId);
      if (useAuthStore.getState().user?.id === user.id) set({ cart, userId: user.id });
    } catch (error) {
      set({ error: getErrorMessage(error) });
    } finally {
      set({ pending: false });
    }
  },

  toggleMiniCart() {
    set((state) => ({ miniCartOpen: !state.miniCartOpen }));
  },

  closeMiniCart() {
    set({ miniCartOpen: false });
  },

  clear() {
    set({
      cart: null,
      userId: null,
      guestItems: [],
      guestLoaded: false,
      loading: false,
      pending: false,
      error: null,
      mergeNotice: null,
      miniCartOpen: false,
    });
  },

  clearError() {
    set({ error: null });
  },

  clearMergeNotice() {
    set({ mergeNotice: null });
  },
}));
