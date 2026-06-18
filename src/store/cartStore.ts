import { create } from 'zustand'
import { CartItem, Product } from '@/types'

interface CartStore {
  items: CartItem[]
  addItem: (product: Product) => void
  removeItem: (productId: number) => void
  updateQty: (productId: number, qty: number) => void
  updateDiscount: (productId: number, discount: number) => void
  clearCart: () => void
  getSubtotal: () => number
  getTotalDiscount: () => number
  getTotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  addItem: (product: Product) => {
    set((state) => {
      const existing = state.items.find((i) => i.product.id === product.id)
      if (existing) {
        // Cek apakah penambahan qty melebihi batas stok yang tersedia
        if (product.stock !== undefined && product.stock !== null && existing.qty >= product.stock) {
          alert(`Stok tidak mencukupi. Maksimal pembelian ${product.name} adalah ${product.stock} porsi.`)
          return { items: state.items }
        }
        return {
          items: state.items.map((i) =>
            i.product.id === product.id
              ? {
                  ...i,
                  qty: i.qty + 1,
                  subtotal: (i.qty + 1) * i.product.price - i.discount,
                }
              : i
          ),
        }
      }
      return {
        items: [
          ...state.items,
          {
            product,
            qty: 1,
            discount: 0,
            subtotal: product.price,
          },
        ],
      }
    })
  },

  removeItem: (productId: number) => {
    set((state) => ({
      items: state.items.filter((i) => i.product.id !== productId),
    }))
  },

  updateQty: (productId: number, qty: number) => {
    if (qty <= 0) {
      get().removeItem(productId)
      return
    }
    const item = get().items.find((i) => i.product.id === productId)
    if (item && item.product.stock !== undefined && item.product.stock !== null && qty > item.product.stock) {
      alert(`Stok tidak mencukupi. Maksimal pembelian ${item.product.name} adalah ${item.product.stock} porsi.`)
      return
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId
          ? { ...i, qty, subtotal: qty * i.product.price - i.discount }
          : i
      ),
    }))
  },

  updateDiscount: (productId: number, discount: number) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.product.id === productId
          ? { ...i, discount, subtotal: i.qty * i.product.price - discount }
          : i
      ),
    }))
  },

  clearCart: () => set({ items: [] }),

  getSubtotal: () => {
    return get().items.reduce((sum: number, i) => sum + i.qty * i.product.price, 0)
  },

  getTotalDiscount: () => {
    return get().items.reduce((sum: number, i) => sum + i.discount, 0)
  },

  getTotal: () => {
    return get().items.reduce((sum: number, i) => sum + i.subtotal, 0)
  },

  getItemCount: () => {
    return get().items.reduce((sum: number, i) => sum + i.qty, 0)
  },
}))
