'use client'

import { useState, useEffect } from 'react'
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
  const { isLoggedIn } = useSessionStore()
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

  // Declare fetch function first before useEffect to prevent React/ESLint hoisting warning
  async function fetchData() {
    setLoading(true)
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories'),
      ])
      setProducts(await prodRes.json())
      setCategories(await catRes.json())
    } catch (err) {
      console.error('Gagal memuat produk/kategori:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/kasir')
      return
    }
    fetchData()
  }, [])

  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === null || p.categoryId === selectedCategory
    const matchSearch = search === '' || p.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden text-gray-150">
      <AppNavbar />

      <div className="flex flex-1 overflow-hidden relative">
        {/* === LEFT: Products Panel === */}
        <div className="flex flex-col flex-1 overflow-hidden bg-gray-950">

          {/* Search + Category Filter Header with clean aesthetics */}
          <div className="bg-gray-900 border-b border-gray-800/80 px-5 py-4 space-y-3.5 shadow-sm relative z-10">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" width="18" height="18" fill="none" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2.5"/>
                <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari olahan durian premium..."
                className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-11 pr-10 py-3 text-gray-100 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-gray-600"
                style={{ minHeight: '44px' }}
              />
              {search && (
                <button 
                  onClick={() => setSearch('')} 
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-200 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category filter slide row */}
            <CategoryFilter
              categories={categories}
              selectedId={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </div>

          {/* Products Grid (Optimized responsive breakpoints for standard mobile & tablet displays) */}
          <div className="flex-1 overflow-y-auto p-5 scroll-smooth">
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({length: 8}).map((_, i) => (
                  <div key={i} className="h-48 rounded-2xl bg-gray-900 border border-gray-800 animate-pulse" />
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-20 animate-fade-in">
                <span className="text-6xl mb-4 filter grayscale-xs">🔍</span>
                <h3 className="text-gray-300 font-semibold text-base">Produk tidak ditemukan</h3>
                <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">Coba kata kunci lain atau silakan pilih kategori yang berbeda</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-slide-up">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>

          {/* Mobile: Bottom drawer summary button for Cart */}
          {itemCount > 0 && (
            <div className="lg:hidden p-4.5 bg-gray-900 border-t border-gray-850">
              <button
                onClick={() => setShowCart(true)}
                className="touch-btn w-full py-4.5 rounded-xl bg-emerald-600 text-white font-bold flex items-center justify-between px-5 shadow-lg shadow-emerald-950/20 active:scale-[0.98]"
              >
                <div className="flex items-center gap-2">
                  <span className="bg-white/20 rounded-lg px-2.5 py-0.5 text-xs font-bold font-mono">{itemCount}</span>
                  <span className="text-sm tracking-wide">Lihat Keranjang</span>
                </div>
                <span className="font-bold text-sm">{formatRupiah(total)}</span>
              </button>
            </div>
          )}
        </div>

        {/* === RIGHT: Cart Panel === */}
        {/* Mobile Backdrop overlay */}
        {showCart && (
          <div 
            className="fixed inset-0 bg-gray-950/80 backdrop-blur-xs z-40 lg:hidden animate-fade-in"
            onClick={() => setShowCart(false)}
          />
        )}
        <div 
          className={`fixed lg:relative top-0 right-0 h-full lg:h-auto z-50 lg:z-0 w-[88%] sm:w-[420px] lg:w-96 flex-shrink-0 flex flex-col bg-gray-905 border-l border-gray-800 shadow-2xl lg:shadow-none transition-transform duration-300 ease-out ${
            showCart ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
          }`}
        >
          {/* Cart Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <div>
              <h2 className="font-bold text-gray-50 text-base">Keranjang Belanja</h2>
              {itemCount > 0 && <p className="text-gray-500 text-xs font-mono mt-0.5">{itemCount} item terpilih</p>}
            </div>
            <div className="flex items-center gap-2">
              {itemCount > 0 && (
                <button
                  onClick={() => { if(confirm('Kosongkan semua keranjang belanja Anda?')) clearCart() }}
                  className="touch-btn text-xs font-semibold text-red-400 hover:text-red-300 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 transition-all cursor-pointer"
                >
                  Kosongkan
                </button>
              )}
              <button
                onClick={() => setShowCart(false)}
                className="lg:hidden touch-btn w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-150 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Cart Items list */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12 animate-fade-in">
                <span className="text-5xl mb-3 opacity-40 filter grayscale-xs">🛒</span>
                <h4 className="text-gray-400 font-medium text-sm">Keranjang Anda kosong</h4>
                <p className="text-gray-600 text-xs mt-1.5 max-w-[200px]">Silakan pilih olahan durian di samping untuk ditambahkan</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-850 space-y-3.5">
                {items.map((item) => (
                  <div key={item.product.id} className="first:pt-0 pt-3.5">
                    <CartItemRow item={item} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Footer */}
          {items.length > 0 && (
            <div className="p-5 border-t border-gray-800 bg-gray-900/60 backdrop-blur-md">
              {/* Total calculations */}
              <div className="bg-gray-950/40 rounded-2xl p-4 border border-gray-800 mb-4.5 space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Subtotal ({itemCount} item)</span>
                  <span className="text-gray-300 font-mono">{formatRupiah(getTotal())}</span>
                </div>
                <div className="flex justify-between text-base font-bold mt-2 pt-2 border-t border-gray-800/80">
                  <span className="text-gray-200">Total Tagihan</span>
                  <span className="text-emerald-400 font-mono text-lg">{formatRupiah(total)}</span>
                </div>
              </div>

              {/* Checkout CTA button (Enhanced targets & visual priority) */}
              <button
                onClick={() => setShowCheckout(true)}
                className="touch-btn w-full py-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-base shadow-lg shadow-emerald-950/20 transition-all duration-200 animate-pulse-emerald cursor-pointer"
                style={{ minHeight: '48px' }}
              >
                Bayar & Selesaikan ({formatRupiah(total)})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Modal Overlay */}
      {showCheckout && (
        <CheckoutModal
          onClose={() => setShowCheckout(false)}
          onSuccess={() => {
            setShowCheckout(false)
            setShowCart(false)
          }}
        />
      )}
    </div>
  )
}
