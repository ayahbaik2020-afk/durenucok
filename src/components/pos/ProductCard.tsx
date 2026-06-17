'use client'

import { Product } from '@/types'
import { formatRupiah } from '@/lib/utils'
import { useCartStore } from '@/store/cartStore'

interface ProductCardProps {
  product: Product
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem, items } = useCartStore()

  const cartItem = items.find((i) => i.product.id === product.id)
  const inCart = cartItem ? cartItem.qty : 0
  const isOutOfStock = product.stock != null && product.stock <= 0

  return (
    <button
      onClick={() => !isOutOfStock && addItem(product)}
      disabled={isOutOfStock}
      className={`touch-btn relative w-full rounded-2xl overflow-hidden border transition-all duration-200 text-left group ${
        isOutOfStock
          ? 'opacity-50 cursor-not-allowed border-gray-800 bg-gray-900'
          : 'bg-gray-900 border-gray-800 hover:border-amber-500/60 hover:shadow-lg hover:shadow-amber-500/10 active:scale-95'
      }`}
    >
      {/* Cart count badge */}
      {inCart > 0 && (
        <div className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center shadow-md">
          {inCart}
        </div>
      )}

      {/* Out of stock overlay */}
      {isOutOfStock && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-950/60 rounded-2xl">
          <span className="text-xs font-bold text-red-400 bg-red-500/20 px-2 py-1 rounded-lg">HABIS</span>
        </div>
      )}

      {/* Category color bar */}
      <div
        className="h-1 w-full"
        style={{ backgroundColor: product.category.color }}
      />

      <div className="p-3">
        {/* Emoji */}
        <div className="text-4xl mb-2 text-center group-hover:scale-110 transition-transform duration-200">
          {product.emoji}
        </div>

        {/* Name */}
        <h3 className="text-white font-semibold text-sm leading-tight line-clamp-2 mb-1 group-hover:text-amber-400 transition-colors">
          {product.name}
        </h3>

        {/* Category */}
        <p className="text-gray-500 text-xs mb-2">{product.category.emoji} {product.category.name}</p>

        {/* Stock indicator */}
        {product.stock != null && (
          <p className={`text-xs mb-2 ${product.stock <= 5 ? 'text-red-400' : 'text-gray-500'}`}>
            Stok: {product.stock}
          </p>
        )}

        {/* Price */}
        <div className="flex items-center justify-between">
          <span className="text-amber-400 font-bold text-sm">{formatRupiah(product.price)}</span>
          {!isOutOfStock && (
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 group-hover:bg-amber-500 flex items-center justify-center text-amber-400 group-hover:text-white transition-all">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
