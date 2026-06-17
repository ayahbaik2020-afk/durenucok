'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Product, Category } from '@/types'
import { useCartStore } from '@/store/cartStore'
import { useSessionStore } from '@/store/sessionStore'
import { formatRupiah } from '@/lib/utils'
import AppNavbar from '@/components/layout/AppNavbar'
import CategoryFilter from '@/components/pos/CategoryFilter'
import ProductCard from '@/components/pos/ProductCard'
import CartItemRow from '@/components/pos/CartItem'
import CheckoutModal from '@/components/pos/CheckoutModal'

export default function POSPage() {
  const router = useRouter()
  const { isLoggedIn, session } = useSessionStore()
  const { items, clearCart, getTotal, getItemCount } = useCartStore()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showCheckout, setShowCheckout] = useState(false)
  const [showCart, setShowCart] = useState(false) // mobile cart toggle

  const total = getTotal()
  const itemCount = getItemCount()

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/kasir')
      return
    }
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories'),
      ])
      setProducts(await prodRes.json())
      setCategories(await catRes.json())
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === null || p.categoryId === selectedCategory
    const matchSearch = search === '' || p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden">
      <AppNavbar />

      <div className="flex flex-1 overflow-hidden">
        {/* === LEFT: Products Panel === */}
        <div className={`flex flex-col flex-1 overflow-hidden ${showCart ? 'hidden lg:flex' : 'flex'}`}>

          {/* Search + Category */}
          <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 space-y-3">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" width="18" height="18" fill="none" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari produk..."
                className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-10 pr-4 py-2.5 text-gray-100 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-100">✕</button>
              )}
            </div>

            {/* Category filter */}
            <CategoryFilter
              categories={categories}
              selectedId={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {Array.from({length: 8}).map((_,i) => (
                  <div key={i} className="h-44 rounded-2xl bg-gray-900 animate-pulse border border-gray-800" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <span className="text-6xl mb-4">🔍</span>
                <p className="text-gray-400 font-medium">Produk tidak ditemukan</p>
                <p className="text-gray-600 text-sm mt-1">Coba kata kunci lain atau pilih kategori berbeda</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>

          {/* Mobile: floating cart button */}
          {itemCount > 0 && (
            <div className="lg:hidden p-4 bg-gray-900 border-t border-gray-800">
              <button
                onClick={() => setShowCart(true)}
                className="touch-btn w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold flex items-center justify-between px-5 shadow-lg glow-amber-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="bg-white/20 rounded-lg px-2 py-0.5 text-sm font-bold">{itemCount}</span>
                  <span>Lihat Keranjang</span>
                </div>
                <span className="font-bold">{formatRupiah(total)}</span>
              </button>
            </div>
          )}
        </div>

        {/* === RIGHT: Cart Panel === */}
        <div className={`w-full lg:w-96 flex-shrink-0 flex flex-col border-l border-gray-800 bg-gray-900 ${showCart ? 'flex' : 'hidden lg:flex'}`}>

          {/* Cart Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
            <div>
              <h2 className="font-bold text-gray-50 text-lg">Keranjang</h2>
              {itemCount > 0 && <p className="text-gray-400 text-xs">{itemCount} item</p>}
            </div>
            <div className="flex items-center gap-2">
              {itemCount > 0 && (
                <button
                  onClick={() => { if(confirm('Kosongkan keranjang?')) clearCart() }}
                  className="touch-btn text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-all"
                >
                  Kosongkan
                </button>
              )}
              <button
                onClick={() => setShowCart(false)}
                 className="lg:hidden touch-btn w-8 h-8 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-100"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <span className="text-5xl mb-3 opacity-50">🛒</span>
                <p className="text-gray-500 font-medium text-sm">Keranjang kosong</p>
                <p className="text-gray-600 text-xs mt-1">Klik produk untuk menambahkan</p>
              </div>
            ) : (
              items.map((item) => <CartItemRow key={item.product.id} item={item} />)
            )}
          </div>

          {/* Cart Footer */}
          {items.length > 0 && (
            <div className="p-4 border-t border-gray-800 bg-gray-900">
              {/* Total */}
              <div className="bg-gray-800/60 rounded-xl p-4 mb-4">
                <div className="flex justify-between text-sm text-gray-400 mb-1">
                  <span>Subtotal ({itemCount} item)</span>
                  <span className="text-gray-300">{formatRupiah(getTotal())}</span>
                </div>
                <div className="flex justify-between text-xl font-bold mt-2 pt-2 border-t border-gray-700">
                   <span className="text-gray-50">Total</span>
                  <span className="text-amber-400">{formatRupiah(total)}</span>
                </div>
              </div>

              {/* Checkout button */}
              <button
                onClick={() => setShowCheckout(true)}
                className="touch-btn w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold text-lg shadow-lg glow-amber-sm transition-all duration-200 animate-pulse-amber"
              >
                💳 Checkout — {formatRupiah(total)}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <CheckoutModal
          onClose={() => setShowCheckout(false)}
          onSuccess={() => setShowCheckout(false)}
        />
      )}
    </div>
  )
}
