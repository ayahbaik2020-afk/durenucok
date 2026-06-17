'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionStore } from '@/store/sessionStore'
import { DailyReport } from '@/types'
import { formatRupiah, formatDateShort } from '@/lib/utils'
import AppNavbar from '@/components/layout/AppNavbar'
import * as XLSX from 'xlsx'

const METHOD_ICONS: Record<string, string> = { CASH: '💵', QRIS: '📱', TRANSFER: '🏦' }

export default function LaporanPage() {
  const router = useRouter()
  const { isLoggedIn } = useSessionStore()

  const [report, setReport] = useState<DailyReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))

  // Send Report States
  const [emailDest, setEmailDest] = useState('')
  const [waDest, setWaDest] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSentStatus, setEmailSentStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE')
  const [emailSimulated, setEmailSimulated] = useState(false)

  // Seed Demo States
  const [seedingDemo, setSeedingDemo] = useState(false)
  const [seedMessage, setSeedMessage] = useState('')

  async function handleSeedDemo() {
    setSeedingDemo(true)
    setSeedMessage('')
    try {
      const res = await fetch(`/api/reports/seed-dummy?date=${selectedDate}`, {
        method: 'POST',
      })
      const data = await res.json()
      if (res.ok) {
        setSeedMessage('✅ ' + data.message)
        fetchReport() // Refresh report data!
      } else {
        setSeedMessage('❌ ' + (data.error || 'Gagal membuat data demo'))
      }
    } catch {
      setSeedMessage('❌ Terjadi kesalahan saat membuat data demo')
    } finally {
      setSeedingDemo(false)
      // Auto clear message after 5 seconds
      setTimeout(() => {
        setSeedMessage('')
      }, 5000)
    }
  }

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

  const handleExportXLSX = () => {
    if (!report) return

    // 1. Sheet Ringkasan
    const ringkasanData = [
      { Kategori: 'Tanggal Laporan', Nilai: formatDateShort(selectedDate) },
      { Kategori: 'Total Pendapatan (Rp)', Nilai: report.totalRevenue },
      { Kategori: 'Total Transaksi', Nilai: report.totalTransactions },
      { Kategori: 'Rata-rata Pendapatan / Transaksi (Rp)', Nilai: report.totalTransactions ? report.totalRevenue / report.totalTransactions : 0 },
      { Kategori: 'Jumlah Kasir Aktif', Nilai: report.perCashier.length },
    ]
    const wsRingkasan = XLSX.utils.json_to_sheet(ringkasanData)

    // 2. Sheet Produk Terlaris
    const produkData = report.topProducts.map((p, idx) => ({
      Peringkat: idx + 1,
      'Nama Produk': p.name,
      'Jumlah Terjual (Qty)': p.totalQty,
      'Total Pendapatan (Rp)': p.totalRevenue,
    }))
    const wsProduk = XLSX.utils.json_to_sheet(produkData)

    // 3. Sheet Pembayaran
    const pembayaranData = report.paymentBreakdown.map((pb) => ({
      'Metode Pembayaran': pb.method,
      'Jumlah Transaksi': pb.count,
      'Total Nominal (Rp)': pb.total,
    }))
    const wsPembayaran = XLSX.utils.json_to_sheet(pembayaranData)

    // 4. Sheet Kinerja Kasir
    const kasirData = report.perCashier.map((c) => ({
      'Nama Kasir': c.cashierName,
      'Jumlah Transaksi': c.totalTransactions,
      'Total Nominal (Rp)': c.totalRevenue,
    }))
    const wsKasir = XLSX.utils.json_to_sheet(kasirData)

    // Create workbook and append sheets
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsRingkasan, 'Ringkasan')
    XLSX.utils.book_append_sheet(wb, wsProduk, 'Produk Terlaris')
    XLSX.utils.book_append_sheet(wb, wsPembayaran, 'Metode Pembayaran')
    XLSX.utils.book_append_sheet(wb, wsKasir, 'Kinerja Kasir')

    // Write file
    XLSX.writeFile(wb, `Laporan_Harian_DurenUcok_${selectedDate}.xlsx`)
  }

  const handleExportPDF = () => {
    window.print()
  }

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!report || !emailDest.trim()) return

    setSendingEmail(true)
    setEmailSentStatus('IDLE')
    try {
      const res = await fetch('/api/reports/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailDest,
          reportData: report,
          date: formatDateShort(selectedDate),
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setEmailSentStatus('SUCCESS')
        setEmailSimulated(data.simulated)
      } else {
        setEmailSentStatus('ERROR')
      }
    } catch {
      setEmailSentStatus('ERROR')
    } finally {
      setSendingEmail(false)
      // Auto reset status feedback after 6 seconds
      setTimeout(() => {
        setEmailSentStatus('IDLE')
      }, 6000)
    }
  }

  const handleSendWhatsApp = (e: React.FormEvent) => {
    e.preventDefault()
    if (!report || !waDest.trim()) return

    // Clean phone number (remove +, spaces, leading 0 to 62)
    let phone = waDest.replace(/\D/g, '')
    if (phone.startsWith('0')) {
      phone = '62' + phone.slice(1)
    }
    if (!phone.startsWith('62') && phone.length > 5) {
      phone = '62' + phone
    }

    const reportText = `*LAPORAN HARIAN DURENUCOK*\nTanggal: ${formatDateShort(selectedDate)}\n\n*Ringkasan Penjualan:*\n• Total Omset: ${formatRupiah(report.totalRevenue)}\n• Total Transaksi: ${report.totalTransactions}\n• Rata-rata / Transaksi: ${formatRupiah(report.totalTransactions ? report.totalRevenue / report.totalTransactions : 0)}\n\n*Metode Pembayaran:*\n${report.paymentBreakdown.map(pb => `• ${pb.method}: ${pb.count}x (${formatRupiah(pb.total)})`).join('\n')}\n\n*Kinerja Kasir:*\n${report.perCashier.map(c => `• ${c.cashierName}: ${c.totalTransactions}x (${formatRupiah(c.totalRevenue)})`).join('\n')}\n\n*Produk Terlaris:*\n${report.topProducts.map((p, idx) => `${idx + 1}. ${p.name} (${p.totalQty}x)`).join('\n')}\n\n_Dikirim otomatis dari POS DurenUcok._`

    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(reportText)}`
    window.open(url, '_blank')
  }

  const maxQty = report?.topProducts?.[0]?.totalQty || 1

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      <AppNavbar />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 space-y-5">

          {/* Print Only Header */}
          <div className="hidden print:block mb-6 pb-4 border-b border-gray-300 text-black">
            <h1 className="text-2xl font-bold">🍧 DurenUcok POS System</h1>
            <p className="text-sm font-semibold">Laporan Omset Penjualan Harian</p>
            <p className="text-xs text-gray-500 mt-1">
              Tanggal Laporan: {formatDateShort(selectedDate)} | Waktu Cetak: {new Date().toLocaleString('id-ID')}
            </p>
          </div>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 no-print">
            <div>
              <h1 className="text-2xl font-bold text-gray-50">Laporan Harian</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-gray-400 text-sm">{formatDateShort(selectedDate)}</p>
                {seedMessage && (
                  <span className="text-xs text-amber-400 animate-fade-in font-medium">{seedMessage}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSeedDemo}
                disabled={seedingDemo}
                className="touch-btn bg-gray-900 hover:bg-gray-850 disabled:opacity-50 text-amber-400 hover:text-amber-300 border border-gray-800 hover:border-gray-700 rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5"
                title="Buat Transaksi Simulasi"
              >
                {seedingDemo ? '⌛ Membuat...' : '⚡ Demo Data'}
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-gray-100 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-4">
              {Array.from({length:4}).map((_,i)=>(
                <div key={i} className="h-28 rounded-xl bg-gray-900 animate-pulse border border-gray-800" />
              ))}
            </div>
          ) : !report ? null : (
            <>
              {/* If no transactions, show a banner to generate demo data */}
              {report.totalTransactions === 0 && (
                <div className="no-print glass-card border-amber-500/20 bg-amber-500/5 rounded-xl p-6 text-center space-y-3">
                  <div className="text-3xl">📊</div>
                  <h3 className="text-gray-100 font-bold text-sm">Belum Ada Transaksi</h3>
                  <p className="text-gray-400 text-xs max-w-md mx-auto leading-relaxed">
                    Belum ada transaksi tercatat pada tanggal {formatDateShort(selectedDate)}. Anda bisa memasukkan data transaksi simulasi (dummy) untuk menguji tampilan laporan dan fitur ekspor.
                  </p>
                  <button
                    onClick={handleSeedDemo}
                    disabled={seedingDemo}
                    className="touch-btn px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5"
                  >
                    {seedingDemo ? '⌛ Memproses...' : '⚡ Buat Data Demo Transaksi'}
                  </button>
                </div>
              )}
              {/* Export & share actions (Hide on print) */}
              <div className="no-print grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Download Actions Card */}
                <div className="glass-card rounded-xl p-5 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-gray-50 font-semibold text-sm mb-1.5 flex items-center gap-1.5">
                      💾 Ekspor Laporan
                    </h3>
                    <p className="text-gray-400 text-xs">Unduh laporan hari ini ke format berkas Excel atau cetak langsung ke PDF.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleExportXLSX}
                      className="touch-btn flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-750 text-gray-100 hover:text-white border border-gray-700 flex items-center justify-center gap-1.5 text-sm font-semibold transition-colors"
                    >
                      🟢 Excel (.xlsx)
                    </button>
                    <button
                      onClick={handleExportPDF}
                      className="touch-btn flex-1 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-750 text-gray-100 hover:text-white border border-gray-700 flex items-center justify-center gap-1.5 text-sm font-semibold transition-colors"
                    >
                      🔴 Cetak / PDF
                    </button>
                  </div>
                </div>

                {/* Share Actions Card */}
                <div className="glass-card rounded-xl p-5">
                  <h3 className="text-gray-50 font-semibold text-sm mb-3 flex items-center gap-1.5">
                    🚀 Kirim Laporan
                  </h3>
                  
                  <div className="space-y-4">
                    {/* Send Email Form */}
                    <div className="space-y-1">
                      <label className="text-gray-400 text-xs font-medium">
                        Kirim laporan ke email:
                      </label>
                      <form onSubmit={handleSendEmail} className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">📧</span>
                          <input
                            type="email"
                            required
                            placeholder="nama@email.com"
                            value={emailDest}
                            onChange={(e) => setEmailDest(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-8 pr-3 py-2 text-gray-100 text-xs focus:outline-none focus:border-amber-500 transition-colors"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={sendingEmail || !emailDest}
                          className="touch-btn bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0"
                        >
                          {sendingEmail ? 'Mengirim...' : 'Kirim'}
                        </button>
                      </form>
                    </div>

                    <div className="flex items-center my-1.5">
                      <div className="flex-1 h-px bg-gray-800"></div>
                      <span className="px-2.5 text-[10px] text-gray-500 uppercase tracking-wider font-semibold">atau</span>
                      <div className="flex-1 h-px bg-gray-800"></div>
                    </div>

                    {/* Send WhatsApp Form */}
                    <div className="space-y-1">
                      <label className="text-gray-400 text-xs font-medium">
                        Nomor WhatsApp:
                      </label>
                      <form onSubmit={handleSendWhatsApp} className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">💬</span>
                          <input
                            type="text"
                            required
                            placeholder="Contoh: 08123456789"
                            value={waDest}
                            onChange={(e) => setWaDest(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-8 pr-3 py-2 text-gray-100 text-xs focus:outline-none focus:border-amber-500 transition-colors"
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={!waDest}
                          className="touch-btn bg-green-500 hover:bg-green-400 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0"
                        >
                          Kirim WA
                        </button>
                      </form>
                    </div>

                    {/* Status feedback alerts */}
                    {emailSentStatus === 'SUCCESS' && (
                      <p className="text-[11px] text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1.5 rounded-lg animate-fade-in leading-relaxed">
                        {emailSimulated 
                          ? '✅ Berhasil disimulasikan! Laporan dicetak di log server karena SMTP belum dikonfigurasi di file env.' 
                          : '✅ Laporan sukses dikirim ke email!'}
                      </p>
                    )}
                    {emailSentStatus === 'ERROR' && (
                      <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 rounded-lg animate-fade-in">
                        ❌ Gagal mengirim laporan ke email. Silakan periksa koneksi.
                      </p>
                    )}
                  </div>
                </div>
              </div>

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
                              <span className="text-gray-505 text-xs ml-2">{formatRupiah(p.totalRevenue)}</span>
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
                                <p className="text-gray-505 text-xs">{pb.count} transaksi</p>
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
                                <p className="text-gray-550 text-xs">{c.totalTransactions} transaksi</p>
                              </div>
                            </div>
                            <p className="text-amber-400 font-bold text-sm">{formatRupiah(c.totalRevenue)}</p>
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
