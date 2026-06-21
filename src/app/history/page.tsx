'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionStore } from '@/store/sessionStore'
import { Transaction } from '@/types'
import { formatRupiah, formatDate } from '@/lib/utils'
import AppNavbar from '@/components/layout/AppNavbar'

const METHOD_ICONS: Record<string, string> = {
  CASH: '💵',
  QRIS: '📱',
  TRANSFER: '🏦',
}

export default function HistoryPage() {
  const router = useRouter()
  const { isLoggedIn } = useSessionStore()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/kasir'); return }
    fetchTransactions()
  }, [selectedDate])

  async function fetchTransactions() {
    setLoading(true)
    try {
      const res = await fetch(`/api/transactions?date=${selectedDate}`)
      setTransactions(await res.json())
    } finally {
      setLoading(false)
    }
  }

  const totalRevenue = transactions.reduce((s: number, t: any) => s + t.total, 0)

  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden text-gray-150">
      <AppNavbar />
      
      <div className="flex-1 overflow-y-auto scroll-smooth">
        <div className="max-w-4xl mx-auto p-5 space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 pb-1">
            <div>
              <h1 className="text-2xl font-bold text-gray-50 tracking-tight">Riwayat Transaksi</h1>
              <p className="text-gray-500 text-sm mt-0.5 font-mono">
                {transactions.length} Transaksi terdata hari ini
              </p>
            </div>
            
            {/* Date Picker Container */}
            <div className="relative">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-gray-100 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium cursor-pointer"
                style={{ minHeight: '44px' }}
              />
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="glass-card rounded-2xl p-4.5 border border-gray-800 shadow-sm">
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Total Transaksi</p>
              <p className="text-2xl font-bold text-gray-50 font-mono">{transactions.length}</p>
            </div>
            
            <div className="glass-card rounded-2xl p-4.5 border border-gray-800 shadow-sm">
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Total Pendapatan</p>
              <p className="text-2xl font-bold text-emerald-400 font-mono">{formatRupiah(totalRevenue)}</p>
            </div>
            
            <div className="glass-card rounded-2xl p-4.5 border border-gray-800 shadow-sm col-span-2 sm:col-span-1">
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1.5">Rata-rata / Transaksi</p>
              <p className="text-2xl font-bold text-emerald-500 font-mono">
                {formatRupiah(transactions.length ? totalRevenue / transactions.length : 0)}
              </p>
            </div>
          </div>

          {/* Transactions List */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({length: 4}).map((_, i) => (
                <div key={i} className="h-20 rounded-2xl bg-gray-900 border border-gray-800/60 animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20 bg-gray-900/20 border border-dashed border-gray-800 rounded-3xl p-6 animate-fade-in">
              <span className="text-5xl mb-4 filter grayscale-xs">📋</span>
              <h3 className="text-gray-300 font-semibold text-base">Tidak ada transaksi</h3>
              <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">
                Silakan lakukan transaksi baru pada menu kasir untuk merekam data penjualan hari ini.
              </p>
            </div>
          ) : (
            <div className="space-y-3.5 animate-slide-up">
              {transactions.map((tx) => {
                const isExpanded = expandedId === tx.id
                return (
                  <div 
                    key={tx.id} 
                    className={`rounded-2xl overflow-hidden border transition-all duration-200 ${
                      isExpanded 
                        ? 'bg-gray-900 border-emerald-500/30 shadow-md shadow-emerald-950/5' 
                        : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <button
                      className="w-full flex items-center justify-between p-4.5 hover:bg-gray-800/40 transition-colors text-left touch-btn cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                      style={{ minHeight: '48px' }}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-750 flex items-center justify-center text-lg shadow-sm">
                          {METHOD_ICONS[tx.paymentMethod] || '💳'}
                        </div>
                        <div>
                          <p className="text-gray-100 font-bold text-sm tracking-tight">{tx.invoiceNumber}</p>
                          <p className="text-gray-500 text-xs mt-0.5 font-medium">
                            {formatDate(tx.createdAt)} • Kasir: {tx.cashier?.name}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-emerald-400 font-bold text-sm font-mono">{formatRupiah(tx.total)}</p>
                          <p className="text-gray-500 text-xs mt-0.5 font-semibold font-mono">{tx.items.length} item</p>
                        </div>
                        <div className={`w-8 h-8 rounded-lg bg-gray-800 border border-gray-750 flex items-center justify-center text-gray-500 transition-all ${isExpanded ? 'rotate-180 text-emerald-400' : ''}`}>
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                    </button>

                    {/* Expanded Detail Panel */}
                    {isExpanded && (
                      <div className="border-t border-gray-800 bg-gray-950/40 p-5 space-y-4 animate-slide-up">
                        {/* Items List */}
                        <div className="space-y-3.5">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Rincian Item</h4>
                          <div className="space-y-2">
                            {tx.items.map((item) => (
                              <div key={item.id} className="flex justify-between items-center text-sm py-1 border-b border-gray-900 last:border-b-0">
                                <span className="text-gray-300 font-medium">
                                  {item.productName} <span className="text-gray-500 font-mono ml-1.5">×{item.qty}</span>
                                </span>
                                <span className="text-gray-100 font-semibold font-mono">{formatRupiah(item.subtotal)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Metrik Pembayaran */}
                        <div className="border-t border-gray-800/80 pt-4.5 grid grid-cols-2 gap-4 text-xs text-gray-500 font-medium">
                          <div className="flex items-center gap-1.5">
                            <span>Metode:</span>
                            <span className="text-gray-200 font-bold bg-gray-800 px-2 py-0.5 rounded-md border border-gray-700">
                              {METHOD_ICONS[tx.paymentMethod]} {tx.paymentMethod}
                            </span>
                          </div>
                          
                          {tx.discountAmount > 0 && (
                            <div className="text-right">
                              <span>Diskon:</span>
                              <span className="text-red-400 font-bold ml-1.5 font-mono">-{formatRupiah(tx.discountAmount)}</span>
                            </div>
                          )}
                          
                          {tx.paymentMethod === 'CASH' && (
                            <>
                              <div className="col-span-2 grid grid-cols-2 gap-4 border-t border-gray-900 pt-3">
                                <div>
                                  <span>Uang Diterima:</span>
                                  <span className="text-gray-200 font-bold ml-1.5 font-mono">{formatRupiah(tx.amountPaid)}</span>
                                </div>
                                <div className="text-right">
                                  <span>Kembalian:</span>
                                  <span className="text-emerald-400 font-bold ml-1.5 font-mono">{formatRupiah(tx.change)}</span>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
