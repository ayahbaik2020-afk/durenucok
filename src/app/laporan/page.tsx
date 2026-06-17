'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionStore } from '@/store/sessionStore'
import { DailyReport } from '@/types'
import { formatRupiah, formatDateShort } from '@/lib/utils'
import AppNavbar from '@/components/layout/AppNavbar'

const METHOD_ICONS: Record<string, string> = { CASH: '💵', QRIS: '📱', TRANSFER: '🏦' }

export default function LaporanPage() {
  const router = useRouter()
  const { isLoggedIn } = useSessionStore()

  const [report, setReport] = useState<DailyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/kasir'); return }
    fetchReport()
  }, [selectedDate])

  async function fetchReport() {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/daily?date=${selectedDate}`)
      setReport(await res.json())
    } finally {
      setLoading(false)
    }
  }

  const maxQty = report?.topProducts?.[0]?.totalQty || 1

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      <AppNavbar />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 space-y-5">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div>
              <h1 className="text-2xl font-bold text-gray-50">Laporan Harian</h1>
              <p className="text-gray-400 text-sm">{formatDateShort(selectedDate)}</p>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({length:4}).map((_,i)=>(
                <div key={i} className="h-28 rounded-xl bg-gray-900 animate-pulse border border-gray-800" />
              ))}
            </div>
          ) : !report ? null : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass-card rounded-xl p-4 col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">💰</span>
                    <span className="text-gray-400 text-xs font-medium">Total Penjualan</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-400">{formatRupiah(report.totalRevenue)}</p>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">🧾</span>
                    <span className="text-gray-400 text-xs font-medium">Transaksi</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-50">{report.totalTransactions}</p>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">📈</span>
                    <span className="text-gray-400 text-xs font-medium">Rata-rata</span>
                  </div>
                  <p className="text-xl font-bold text-green-400">
                    {formatRupiah(report.totalTransactions ? report.totalRevenue / report.totalTransactions : 0)}
                  </p>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">👤</span>
                    <span className="text-gray-400 text-xs font-medium">Kasir Aktif</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-400">{report.perCashier.length}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Top Products */}
                <div className="glass-card rounded-xl p-5">
                  <h2 className="text-gray-50 font-bold mb-4 flex items-center gap-2">
                    🏆 Produk Terlaris
                  </h2>
                  {report.topProducts.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-6">Belum ada data</p>
                  ) : (
                    <div className="space-y-3">
                      {report.topProducts.map((p, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-gray-200">
                              <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '⭐'}</span>
                              <span className="truncate max-w-[140px]">{p.name}</span>
                            </span>
                            <div className="text-right flex-shrink-0">
                              <span className="text-amber-400 font-bold">{p.totalQty}x</span>
                              <span className="text-gray-500 text-xs ml-2">{formatRupiah(p.totalRevenue)}</span>
                            </div>
                          </div>
                          {/* Progress bar */}
                          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
                              style={{ width: `${(p.totalQty / maxQty) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right column */}
                <div className="space-y-4">
                  {/* Payment breakdown */}
                  <div className="glass-card rounded-xl p-5">
                    <h2 className="text-gray-50 font-bold mb-4 flex items-center gap-2">
                      💳 Metode Pembayaran
                    </h2>
                    {report.paymentBreakdown.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-4">Belum ada data</p>
                    ) : (
                      <div className="space-y-3">
                        {report.paymentBreakdown.map((pb) => (
                          <div key={pb.method} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{METHOD_ICONS[pb.method] || '💳'}</span>
                              <div>
                                <p className="text-gray-100 text-sm font-medium">{pb.method}</p>
                                <p className="text-gray-500 text-xs">{pb.count} transaksi</p>
                              </div>
                            </div>
                            <p className="text-amber-400 font-bold text-sm">{formatRupiah(pb.total)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Per cashier */}
                  <div className="glass-card rounded-xl p-5">
                    <h2 className="text-gray-50 font-bold mb-4 flex items-center gap-2">
                      👤 Per Kasir
                    </h2>
                    {report.perCashier.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-4">Belum ada data</p>
                    ) : (
                      <div className="space-y-3">
                        {report.perCashier.map((c, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xs font-bold text-white">
                                {c.cashierName.charAt(0)}
                              </div>
                              <div>
                                <p className="text-gray-100 text-sm font-medium">{c.cashierName}</p>
                                <p className="text-gray-500 text-xs">{c.totalTransactions} transaksi</p>
                              </div>
                            </div>
                            <p className="text-green-400 font-bold text-sm">{formatRupiah(c.totalRevenue)}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
