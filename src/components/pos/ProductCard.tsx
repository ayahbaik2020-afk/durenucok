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
      className={`touch-btn relative w-full rounded-2xl overflow-hidden border transition-all duration-200 text-left group flex flex-col justify-between h-full shadow-sm hover:shadow-md cursor-pointer ${
        isOutOfStock
          ? 'opacity-40 cursor-not-allowed border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-900/50'
          : 'bg-gray-900 border-gray-800 hover:border-emerald-500/50 hover:shadow-emerald-500/5 active:scale-[0.98]'
      }`}
      style={{ minHeight: '180px' }}
    >
      {/* Active Selection / Cart Indicator Border */}
      {inCart > 0 && (
        <div className="absolute inset-0 border-2 border-emerald-500 rounded-2xl pointer-events-none z-10 animate-fade-in" />
      )}

      {/* Cart count badge */}
      {inCart > 0 && (
        <div className="absolute top-2.5 right-2.5 z-20 min-w-7 h-7 px-1.5 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center shadow-lg border border-emerald-400">
          {inCart}
        </div>
      )}

      {/* Out of stock overlay */}
      {isOutOfStock && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-950/60 rounded-2xl">
          <span className="text-[10px] tracking-wider font-bold text-red-100 bg-red-600 px-2.5 py-1.5 rounded-full shadow-lg">
            HABIS
          </span>
        </div>
      )}

      <div className="w-full">
        {/* Category color indicator strip at the top */}
        <div
          className="h-1.5 w-full opacity-80"
          style={{ backgroundColor: product.category.color }}
        />

        <div className="p-3.5 pb-2">
          {/* Image / Emoji wrapper */}
          <div className="h-16 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-350 ease-out">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                className="w-16 h-16 object-cover rounded-xl shadow-sm border border-gray-800 bg-gray-800"
              />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gray-800/40 flex items-center justify-center text-4xl border border-gray-850">
                {product.emoji}
              </div>
            )}
          </div>

          {/* Name */}
          <h3 className="text-gray-100 font-semibold text-sm leading-snug line-clamp-2 mb-1 group-hover:text-emerald-400 transition-colors">
            {product.name}
          </h3>

          {/* Category */}
          <p className="text-gray-500 text-xs flex items-center gap-1">
            <span>{product.category.emoji}</span>
            <span>{product.category.name}</span>
          </p>
        </div>
      </div>

      <div className="p-3.5 pt-0 w-full">
        {/* Stock / Bundle list Info */}
        {product.stock != null ? (
          <p className={`text-[11px] mb-2.5 font-medium ${product.stock <= 5 ? 'text-red-400 font-semibold' : 'text-gray-500'}`}>
            Stok: {product.stock} {product.stock <= 5 && '⚠️'}
          </p>
        ) : product.bundleItems && product.bundleItems.length > 0 ? (
          <div className="text-[10px] text-gray-500 leading-tight mb-2.5 border-t border-gray-800/50 pt-2">
            <span className="font-semibold block text-emerald-400/80 mb-1">Bundling:</span>
            {product.bundleItems.slice(0, 2).map((bi) => (
              <div key={bi.id} className="truncate">
                • {bi.product?.name} ({bi.qty}x)
              </div>
            ))}
            {product.bundleItems.length > 2 && (
              <span className="text-[9px] text-gray-600 italic block mt-0.5">+{product.bundleItems.length - 2} produk lainnya</span>
            )}
          </div>
        ) : (
          <div className="h-4" />
        )}

        {/* Price & Action area */}
        <div className="flex items-center justify-between border-t border-gray-850 pt-2.5">
          <span className="text-emerald-400 font-bold text-sm">{formatRupiah(product.price)}</span>
          {!isOutOfStock && (
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500 flex items-center justify-center text-emerald-400 group-hover:text-white transition-all duration-200 shadow-sm">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
