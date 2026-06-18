import { create } from "zustand";
import { CartItem } from "@/types";

interface TableInfo {
  id: string;
  number: string;
  capacity: number;
  status: string;
  activeOrderCount: number;
  activeOrderTotal: number;
  firstOrderAt: string | null;
}

interface CartStore {
  items: CartItem[];
  tableId: string | null;
  tableInfo: TableInfo | null;
  notes: string;
  taxRate: number;
  activeOrderId: string | null;
  setTable: (tableId: string | null, tableInfo?: TableInfo | null) => void;
  setNotes: (notes: string) => void;
  setTaxRate: (rate: number) => void;
  setActiveOrderId: (orderId: string | null) => void;
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
  tableInfo: null,
  notes: "",
  taxRate: 10,
  activeOrderId: null,

  setTable: (tableId, tableInfo = null) => set({ tableId, tableInfo }),
  setNotes: (notes) => set({ notes }),
  setTaxRate: (taxRate) => set({ taxRate }),
  setActiveOrderId: (orderId) => set({ activeOrderId: orderId }),

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

  clearCart: () => set({ items: [], tableId: null, tableInfo: null, notes: "", activeOrderId: null }),

  subtotal: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
  tax: () => Math.round(get().subtotal() * (get().taxRate / 100)),
  total: () => get().subtotal() + get().tax(),
}));
