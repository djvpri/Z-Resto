import { create } from "zustand";
import { CartItem } from "@/types";

interface CartStore {
  items: CartItem[];
  tableId: string | null;
  notes: string;
  setTable: (tableId: string | null) => void;
  setNotes: (notes: string) => void;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (menuItemId: string) => void;
  updateQty: (menuItemId: string, qty: number) => void;
  clearCart: () => void;
  subtotal: () => number;
  tax: () => number;
  total: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  tableId: null,
  notes: "",

  setTable: (tableId) => set({ tableId }),
  setNotes: (notes) => set({ notes }),

  addItem: (item) => {
    const existing = get().items.find((i) => i.menuItemId === item.menuItemId);
    if (existing) {
      set((s) => ({
        items: s.items.map((i) =>
          i.menuItemId === item.menuItemId ? { ...i, quantity: i.quantity + 1 } : i
        ),
      }));
    } else {
      set((s) => ({ items: [...s.items, { ...item, quantity: 1 }] }));
    }
  },

  removeItem: (menuItemId) =>
    set((s) => ({ items: s.items.filter((i) => i.menuItemId !== menuItemId) })),

  updateQty: (menuItemId, qty) => {
    if (qty <= 0) {
      get().removeItem(menuItemId);
      return;
    }
    set((s) => ({
      items: s.items.map((i) =>
        i.menuItemId === menuItemId ? { ...i, quantity: qty } : i
      ),
    }));
  },

  clearCart: () => set({ items: [], tableId: null, notes: "" }),

  subtotal: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
  tax: () => Math.round(get().subtotal() * 0.1),
  total: () => get().subtotal() + get().tax(),
}));
