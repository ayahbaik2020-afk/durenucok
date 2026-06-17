'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionStore } from '@/store/sessionStore'
import { Product } from '@/types'
import { formatRupiah } from '@/lib/utils'
import AppNavbar from '@/components/layout/AppNavbar'

const WASTE_REASONS = [
  { id: 'EXPIRED', label: 'Kadaluarsa', icon: '⏰', color: 'text-red-400' },
  { id: 'DAMAGED', label: 'Rusak', icon: '💔', color: 'text-orange-400' },
  { id: 'UNSOLD', label: 'Tidak Laku', icon: '😔', color: 'text-yellow-400' },
]

interface WasteForm {
  productId: number
  qty: number
  reason: string
  note: string
}

export default function StokPage() {
  const router = useRouter()
  const { isLoggedIn } = useSessionStore()

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showWasteModal, setShowWasteModal] = useState(false)
  const [wasteForm, setWasteForm] = useState<WasteForm>({ productId: 0, qty: 1, reason: 'EXPIRED', note: '' })
  const [submitting, setSubmitting] = useState(false)
  const [editingStock, setEditingStock] = useState<{id: number; stock: string} | null>(null)

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/kasir'); return }
    fetchProducts()
  }, [])

  async function fetchProducts() {
    setLoading(true)
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      setProducts(data.filter((p: Product) => p.stock !== null))
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdateStock(productId: number, stock: number) {
    try {
      await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock }),
      })
      setEditingStock(null)
      fetchProducts()
    } catch {
      alert('Gagal update stok')
    }
  }

  async function handleWasteSubmit() {
    setSubmitting(true)
    try {
      await fetch('/api/stock/waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wasteForm),
      })
      setShowWasteModal(false)
      fetchProducts()
    } catch {
      alert('Gagal mencatat waste')
    } finally {
      setSubmitting(false)
    }
  }

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Habis', color: 'text-red-400 bg-red-500/10 border-red-500/30' }
    if (stock <= 5) return { label: 'Menipis', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' }
    return { label: 'Aman', color: 'text-green-400 bg-green-500/10 border-green-500/30' }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      <AppNavbar />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 space-y-4">

          {/* Header */}
          <div className="flex items-center justify-between pt-2">
            <div>
              <h1 className="text-2xl font-bold text-white">Manajemen Stok</h1>
              <p className="text-gray-400 text-sm">Produk dengan stok terbatas</p>
            </div>
            <button
              onClick={() => setShowWasteModal(true)}
              className="touch-btn flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 text-sm font-medium transition-all"
            >
              🗑️ Catat Waste
            </button>
          </div>

          {/* Stock table */}
          {loading ? (
            <div className="space-y-2">
              {Array.from({length:6}).map((_,i)=>(
                <div key={i} className="h-16 rounded-xl bg-gray-900 animate-pulse border border-gray-800" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-5xl">📦</span>
              <p className="text-gray-400 mt-3 font-medium">Semua produk adalah unlimited stock</p>
            </div>
          ) : (
            <div className="space-y-2">
              {products.map((product) => {
                const status = getStockStatus(product.stock!)
                const isEditing = editingStock?.id === product.id

                return (
                  <div key={product.id} className="glass-card rounded-xl p-4">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{product.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{product.name}</p>
                        <p className="text-gray-500 text-xs">{product.category.emoji} {product.category.name} • {formatRupiah(product.price)}</p>
                      </div>

                      {/* Stock display / edit */}
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-lg border ${status.color}`}>
                          {status.label}
                        </span>

                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={editingStock?.stock}
                              onChange={(e) => setEditingStock({ id: product.id, stock: e.target.value })}
                              className="w-20 bg-gray-800 border border-amber-500 rounded-lg px-2 py-1.5 text-white text-sm text-center focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdateStock(product.id, parseInt(editingStock?.stock || '0'))}
                              className="touch-btn px-3 py-1.5 bg-amber-500 text-white rounded-lg text-sm font-medium"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingStock(null)}
                              className="touch-btn px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg text-sm"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setEditingStock({ id: product.id, stock: String(product.stock) })}
                            className="touch-btn flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-all"
                          >
                            <span className="text-white font-bold text-sm">{product.stock}</span>
                            <svg className="text-gray-500" width="12" height="12" fill="none" viewBox="0 0 24 24">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Low stock warning */}
                    {product.stock !== null && product.stock <= 5 && product.stock > 0 && (
                      <div className="mt-2 flex items-center gap-2 text-orange-400 text-xs bg-orange-500/10 rounded-lg px-3 py-2">
                        ⚠️ Stok menipis! Segera lakukan restok.
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Waste Modal */}
      {showWasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowWasteModal(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-white mb-5">🗑️ Catat Waste</h2>

            <div className="space-y-4">
              {/* Product select */}
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Produk</label>
                <select
                  value={wasteForm.productId}
                  onChange={(e) => setWasteForm({...wasteForm, productId: parseInt(e.target.value)})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value={0}>Pilih produk...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.emoji} {p.name} (Stok: {p.stock})</option>
                  ))}
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Alasan Waste</label>
                <div className="grid grid-cols-3 gap-2">
                  {WASTE_REASONS.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setWasteForm({...wasteForm, reason: r.id})}
                      className={`touch-btn flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-sm ${
                        wasteForm.reason === r.id
                          ? 'bg-red-500/20 border-red-500 text-red-400'
                          : 'bg-gray-800 border-gray-700 text-gray-400'
                      }`}
                    >
                      <span>{r.icon}</span>
                      <span className="text-xs">{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Qty */}
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Jumlah</label>
                <input
                  type="number"
                  min={1}
                  value={wasteForm.qty}
                  onChange={(e) => setWasteForm({...wasteForm, qty: parseInt(e.target.value) || 1})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Note */}
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Catatan (opsional)</label>
                <input
                  type="text"
                  value={wasteForm.note}
                  onChange={(e) => setWasteForm({...wasteForm, note: e.target.value})}
                  placeholder="Keterangan tambahan..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowWasteModal(false)} className="touch-btn flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 font-medium">Batal</button>
              <button
                onClick={handleWasteSubmit}
                disabled={!wasteForm.productId || submitting}
                className="touch-btn flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold transition-all disabled:opacity-50"
              >
                {submitting ? 'Menyimpan...' : '🗑️ Catat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
