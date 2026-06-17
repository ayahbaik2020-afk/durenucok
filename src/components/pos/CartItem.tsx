'use client'

import { CartItem } from '@/types'
import { useCartStore } from '@/store/cartStore'
import { formatRupiah } from '@/lib/utils'
import { useState } from 'react'

interface CartItemRowProps {
  item: CartItem
}

export default function CartItemRow({ item }: CartItemRowProps) {
  const { updateQty, removeItem, updateDiscount } = useCartStore()
  const [showDiscount, setShowDiscount] = useState(false)

  return (
    <div className="animate-slide-up border-b border-gray-800/60 pb-3 mb-3 last:border-0">
      <div className="flex items-start gap-2">
        {/* Emoji */}
        <span className="text-2xl mt-0.5">{item.product.emoji}</span>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium leading-tight truncate">{item.product.name}</p>
          <p className="text-gray-500 text-xs mt-0.5">{formatRupiah(item.product.price)} / pcs</p>

          {/* Qty controls */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => updateQty(item.product.id, item.qty - 1)}
              className="touch-btn w-8 h-8 rounded-lg bg-gray-800 hover:bg-red-500/20 hover:text-red-400 text-gray-300 flex items-center justify-center font-bold transition-all border border-gray-700"
            >
              −
            </button>
            <span className="text-white font-bold text-sm w-6 text-center">{item.qty}</span>
            <button
              onClick={() => updateQty(item.product.id, item.qty + 1)}
              className="touch-btn w-8 h-8 rounded-lg bg-gray-800 hover:bg-amber-500/20 hover:text-amber-400 text-gray-300 flex items-center justify-center font-bold transition-all border border-gray-700"
            >
              +
            </button>

            {/* Discount toggle */}
            <button
              onClick={() => setShowDiscount(!showDiscount)}
              className={`touch-btn ml-1 text-xs px-2 py-1 rounded-lg border transition-all ${
                item.discount > 0
                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                  : 'bg-gray-800 text-gray-500 border-gray-700 hover:text-white'
              }`}
            >
              %
            </button>
          </div>

          {/* Discount input */}
          {showDiscount && (
            <div className="mt-2 animate-slide-up">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs">Diskon Rp</span>
                <input
                  type="number"
                  value={item.discount || ''}
                  onChange={(e) => updateDiscount(item.product.id, parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-28 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Subtotal + Remove */}
        <div className="text-right flex flex-col items-end gap-1">
          <p className="text-amber-400 font-bold text-sm">{formatRupiah(item.subtotal)}</p>
          {item.discount > 0 && (
            <p className="text-green-400 text-xs">-{formatRupiah(item.discount)}</p>
          )}
          <button
            onClick={() => removeItem(item.product.id)}
            className="touch-btn text-gray-600 hover:text-red-400 transition-colors mt-1"
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
