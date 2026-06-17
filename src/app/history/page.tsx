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
    <div className="h-screen flex flex-col bg-gray-950">
      <AppNavbar />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 space-y-4">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div>
              <h1 className="text-2xl font-bold text-white">Riwayat Transaksi</h1>
              <p className="text-gray-400 text-sm">{transactions.length} transaksi • {formatRupiah(totalRevenue)}</p>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="glass-card rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-1">Total Transaksi</p>
              <p className="text-2xl font-bold text-white">{transactions.length}</p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <p className="text-gray-400 text-xs mb-1">Total Pendapatan</p>
              <p className="text-xl font-bold text-amber-400">{formatRupiah(totalRevenue)}</p>
            </div>
            <div className="glass-card rounded-xl p-4 col-span-2 sm:col-span-1">
              <p className="text-gray-400 text-xs mb-1">Rata-rata / Transaksi</p>
              <p className="text-xl font-bold text-green-400">
                {formatRupiah(transactions.length ? totalRevenue / transactions.length : 0)}
              </p>
            </div>
          </div>

          {/* Transactions list */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({length:5}).map((_,i)=>(
                <div key={i} className="h-20 rounded-xl bg-gray-900 animate-pulse border border-gray-800" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-5xl">📋</span>
              <p className="text-gray-400 mt-3 font-medium">Tidak ada transaksi hari ini</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div key={tx.id} className="glass-card rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                    onClick={() => setExpandedId(expandedId === tx.id ? null : tx.id)}
                  >
                    <div className="flex items-center gap-3 text-left">
                      <span className="text-2xl">{METHOD_ICONS[tx.paymentMethod] || '💳'}</span>
                      <div>
                        <p className="text-white font-semibold text-sm">{tx.invoiceNumber}</p>
                        <p className="text-gray-400 text-xs">{formatDate(tx.createdAt)} • {tx.cashier?.name}</p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="text-amber-400 font-bold">{formatRupiah(tx.total)}</p>
                        <p className="text-gray-500 text-xs">{tx.items.length} item</p>
                      </div>
                      <svg className={`text-gray-500 transition-transform ${expandedId === tx.id ? 'rotate-180' : ''}`} width="16" height="16" fill="none" viewBox="0 0 24 24">
                        <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {expandedId === tx.id && (
                    <div className="border-t border-gray-800 p-4 animate-slide-up bg-gray-800/30">
                      <div className="space-y-2 mb-3">
                        {tx.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-gray-300">{item.productName} ×{item.qty}</span>
                            <span className="text-white">{formatRupiah(item.subtotal)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-gray-700 pt-3 grid grid-cols-2 gap-2 text-xs text-gray-400">
                        <div>
                          <span>Pembayaran: </span>
                          <span className="text-white font-medium">{METHOD_ICONS[tx.paymentMethod]} {tx.paymentMethod}</span>
                        </div>
                        {tx.paymentMethod === 'CASH' && (
                          <>
                            <div>
                              <span>Dibayar: </span>
                              <span className="text-white font-medium">{formatRupiah(tx.amountPaid)}</span>
                            </div>
                            <div>
                              <span>Kembalian: </span>
                              <span className="text-green-400 font-medium">{formatRupiah(tx.change)}</span>
                            </div>
                          </>
                        )}
                        {tx.discountAmount > 0 && (
                          <div>
                            <span>Diskon: </span>
                            <span className="text-green-400 font-medium">-{formatRupiah(tx.discountAmount)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
