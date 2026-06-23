'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionStore } from '@/store/sessionStore'
import { DailyReport, StoreSetting } from '@/types'
import { formatRupiah, formatDateShort } from '@/lib/utils'
import AppNavbar from '@/components/layout/AppNavbar'
import * as XLSX from 'xlsx'

const METHOD_ICONS: Record<string, string> = { CASH: '💵', QRIS: '📱', TRANSFER: '🏦' }

export default function LaporanPage() {
  const router = useRouter()
  const { isLoggedIn } = useSessionStore()

  const [report, setReport] = useState<DailyReport | null>(null)
  const [storeSetting, setStoreSetting] = useState<StoreSetting | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  // Send Report States
  const [emailDest, setEmailDest] = useState('')
  const [waDest, setWaDest] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSentStatus, setEmailSentStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE')
  const [emailSimulated, setEmailSimulated] = useState(false)
  const [stockReport, setStockReport] = useState<any>(null)
  const [backupStatus, setBackupStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE')
  const [backupLink, setBackupLink] = useState('')
  const receiptCost = (report as any)?.receiptCost || 0
  const receiptQty = (report as any)?.receiptQty || 0

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/kasir'); return }
    fetchReport()
  }, [selectedDate, period])

  async function fetchReport() {
    setLoading(true)
    try {
      const [reportRes, settingRes, stockRes] = await Promise.all([
        fetch(`/api/reports?date=${selectedDate}&period=${period}`),
        fetch('/api/store-settings'),
        fetch(`/api/reports/stock-receipts?date=${selectedDate}&period=${period}`),
      ])
      setReport(await reportRes.json())
      setStoreSetting(await settingRes.json())
      setStockReport(await stockRes.json())
    } finally {
      setLoading(false)
    }
  }

  const handleExportXLSX = () => {
    if (!report) return

    const dateLabel = report.dateLabel || formatDateShort(selectedDate)
    const reportPeriodLabel = period === 'weekly' ? 'Mingguan' : period === 'monthly' ? 'Bulanan' : 'Harian'

    const aoa = [
      ['🍧 DURENUCOK POS SYSTEM'],
      [`Laporan Penjualan ${reportPeriodLabel}`],
      [`Periode: ${dateLabel}`],
      [`Waktu Cetak: ${new Date().toLocaleString('id-ID')}`],
      [], // Empty separator
      
      ['💰 RINGKASAN PENJUALAN'],
      ['Total Pendapatan (Omset)', report.totalRevenue],
      ['Total Transaksi', report.totalTransactions],
      ['Rata-rata Pendapatan / Transaksi', report.totalTransactions ? report.totalRevenue / report.totalTransactions : 0],
      ['Jumlah Kasir Aktif', report.perCashier.length],
      [], // Empty separator
      
      ['🏆 PRODUK TERLARIS'],
      ['Peringkat', 'Nama Produk', 'Jumlah Terjual (Qty)', 'Total Pendapatan (Rp)'],
    ]

    report.topProducts.forEach((p, idx) => {
      aoa.push([
        idx + 1,
        p.name,
        p.totalQty,
        p.totalRevenue
      ])
    })
    if (report.topProducts.length === 0) {
      aoa.push(['-', 'Belum ada data', '-', '-'])
    }
    
    aoa.push([]) // Empty separator
    aoa.push(['💳 METODE PEMBAYARAN'])
    aoa.push(['Metode Pembayaran', 'Jumlah Transaksi', 'Total Nominal (Rp)'])
    
    report.paymentBreakdown.forEach((pb) => {
      aoa.push([
        pb.method,
        pb.count,
        pb.total
      ])
    })
    if (report.paymentBreakdown.length === 0) {
      aoa.push(['Belum ada data', '-', '-'])
    }

    aoa.push([]) // Empty separator
    aoa.push(['👤 KINERJA KASIR'])
    aoa.push(['Nama Kasir', 'Jumlah Transaksi', 'Total Omset (Rp)'])

    report.perCashier.forEach((c) => {
      aoa.push([
        c.cashierName,
        c.totalTransactions,
        c.totalRevenue
      ])
    })
    if (report.perCashier.length === 0) {
      aoa.push(['Belum ada data', '-', '-'])
    }

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(aoa)

    // Set column widths to prevent truncation
    ws['!cols'] = [
      { wch: 32 }, // Column A
      { wch: 24 }, // Column B
      { wch: 20 }, // Column C
      { wch: 22 }  // Column D
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Penjualan')

    XLSX.writeFile(wb, `Laporan_${reportPeriodLabel}_DurenUcok_${selectedDate}.xlsx`)
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
          date: report.dateLabel || formatDateShort(selectedDate),
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

  async function handleBackup() {
    setBackupStatus('LOADING')
    setBackupLink('')
    try {
      const res = await fetch('/api/backup', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Download the SQL file
      const blob = new Blob([data.content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = data.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setBackupStatus('SUCCESS')
    } catch (e: any) {
      console.error('Backup error:', e)
      setBackupStatus('ERROR')
      setBackupLink(e.message || 'Gagal backup')
    }
    setTimeout(() => setBackupStatus('IDLE'), 6000)
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

    const reportLabel = period === 'weekly' ? 'MINGGUAN' : period === 'monthly' ? 'BULANAN' : 'HARIAN'
    const reportText = `*LAPORAN ${reportLabel} DURENUCOK*\nPeriode: ${report.dateLabel || formatDateShort(selectedDate)}\n\n*Ringkasan Penjualan:*\n• Total Omset: ${formatRupiah(report.totalRevenue)}\n• Total Transaksi: ${report.totalTransactions}\n• Rata-rata / Transaksi: ${formatRupiah(report.totalTransactions ? report.totalRevenue / report.totalTransactions : 0)}\n\n*Metode Pembayaran:*\n${report.paymentBreakdown.map(pb => `• ${pb.method}: ${pb.count}x (${formatRupiah(pb.total)})`).join('\n')}\n\n*Kinerja Kasir:*\n${report.perCashier.map(c => `• ${c.cashierName}: ${c.totalTransactions}x (${formatRupiah(c.totalRevenue)})`).join('\n')}\n\n*Produk Terlaris:*\n${report.topProducts.map((p, idx) => `${idx + 1}. ${p.name} (${p.totalQty}x)`).join('\n')}\n\n_Dikirim otomatis dari POS DurenUcok._`

    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(reportText)}`
    window.open(url, '_blank')
  }

  const maxQty = report?.topProducts?.[0]?.totalQty || 1

  const handleExportStockXLSX = () => {
    if (!stockReport) return
    const wb = XLSX.utils.book_new()

    const summarySheet = XLSX.utils.aoa_to_sheet([
      ['Laporan Stok Masuk'],
      ['Periode', stockReport.period],
      ['Tanggal', stockReport.date],
      ['Total Receipt', stockReport.totalReceipts],
      ['Total Qty', stockReport.totalQty],
      ['Total Modal Historis', stockReport.totalCost],
    ])
    summarySheet['!cols'] = [{ wch: 24 }, { wch: 28 }]
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Ringkasan')

    const supplierSheet = XLSX.utils.json_to_sheet(stockReport.bySupplier || [])
    const warehouseSheet = XLSX.utils.json_to_sheet(stockReport.byWarehouse || [])
    const productSheet = XLSX.utils.json_to_sheet(stockReport.byProduct || [])
    const receiptSheet = XLSX.utils.json_to_sheet((stockReport.receipts || []).map((r: any) => ({
      receiptNumber: r.receiptNumber,
      date: r.receiptDate,
      supplier: r.supplier?.name || '-',
      warehouse: r.warehouse?.name || '-',
      status: r.status,
      totalAmount: r.totalAmount,
    })))

    XLSX.utils.book_append_sheet(wb, supplierSheet, 'Supplier')
    XLSX.utils.book_append_sheet(wb, warehouseSheet, 'Gudang')
    XLSX.utils.book_append_sheet(wb, productSheet, 'Produk')
    XLSX.utils.book_append_sheet(wb, receiptSheet, 'Receipt')

    XLSX.writeFile(wb, `StokMasuk_${period}_${selectedDate}.xlsx`)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      <AppNavbar />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 space-y-5">

          {/* Print Only Header */}
          <div className="hidden print:block mb-6 pb-4 border-b border-gray-300 text-black">
            <h1 className="text-2xl font-bold">🍧 DurenUcok POS System</h1>
            <p className="text-sm font-semibold">Laporan Penjualan {period === 'weekly' ? 'Mingguan' : period === 'monthly' ? 'Bulanan' : 'Harian'}</p>
            <p className="text-xs text-gray-500 mt-1">
              Periode: {report?.dateLabel || formatDateShort(selectedDate)} | Waktu Cetak: {new Date().toLocaleString('id-ID')}
            </p>
            {storeSetting?.address && <p className="text-xs text-gray-500">{storeSetting.address}</p>}
            {storeSetting?.phone && <p className="text-xs text-gray-500">Telp: {storeSetting.phone}</p>}
            <p className="text-xs text-gray-500 mt-1">Laporan ini memakai harga modal historis dari receipt.</p>
          </div>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 no-print">
            <div>
              <h1 className="text-2xl font-bold text-gray-50">Laporan Penjualan</h1>
              <p className="text-gray-400 text-sm">{report?.dateLabel || formatDateShort(selectedDate)}</p>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              {/* Period Tabs */}
              <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1">
                {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`touch-btn py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all ${
                      period === p
                        ? 'bg-amber-500 text-white shadow'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {p === 'daily' ? 'Harian' : p === 'weekly' ? 'Mingguan' : 'Bulanan'}
                  </button>
                ))}
              </div>
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
              {/* If no transactions, show a clean banner without seeder */}
              {report.totalTransactions === 0 && (
                <div className="no-print glass-card border-gray-805 bg-gray-900/20 rounded-xl p-6 text-center space-y-1.5">
                  <div className="text-2xl">📊</div>
                  <h3 className="text-gray-100 font-semibold text-sm">Tidak Ada Transaksi</h3>
                  <p className="text-gray-400 text-xs max-w-md mx-auto leading-relaxed">
                    Belum ada transaksi tercatat pada periode laporan ini.
                  </p>
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

                {/* Backup Card */}
                <div className="glass-card rounded-xl p-5 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-gray-50 font-semibold text-sm mb-1.5 flex items-center gap-1.5">
                      💾 Backup Database
                    </h3>
                    <p className="text-gray-400 text-xs">Download seluruh data sebagai SQL. Bisa di-restore ke database mana pun.</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={handleBackup}
                      disabled={backupStatus === 'LOADING'}
                      className="touch-btn w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-750 text-gray-100 hover:text-white border border-gray-700 flex items-center justify-center gap-1.5 text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {backupStatus === 'LOADING' ? (
                        <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Memproses...</>
                      ) : '💾 Backup & Download (.sql)'}
                    </button>
                    {backupStatus === 'SUCCESS' && (
                      <p className="text-[11px] text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1.5 rounded-lg animate-fade-in">✅ Backup berhasil! File terunduh.</p>
                    )}
                    {backupStatus === 'ERROR' && (
                      <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 rounded-lg animate-fade-in">❌ Gagal: {backupLink}</p>
                    )}
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="glass-card rounded-xl p-4">
                  <div className="text-gray-400 text-xs">Receipt Masuk</div>
                  <div className="text-xl font-bold text-amber-400 mt-2">{stockReport?.totalReceipts || 0}</div>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <div className="text-gray-400 text-xs">Qty Masuk</div>
                  <div className="text-xl font-bold text-green-400 mt-2">{stockReport?.totalQty || 0}</div>
                </div>
                <div className="glass-card rounded-xl p-4">
                  <div className="text-gray-400 text-xs">Modal Historis</div>
                  <div className="text-xl font-bold text-orange-400 mt-2">{formatRupiah(stockReport?.totalCost || 0)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="glass-card rounded-xl p-5">
                  <h2 className="text-gray-50 font-bold mb-4 flex items-center gap-2">?? Stok Masuk per Supplier</h2>
                  {stockReport?.bySupplier?.length ? (
                    <div className="space-y-3">
                      {stockReport.bySupplier.map((row: any) => (
                        <div key={row.supplier} className="flex items-center justify-between text-sm">
                          <span className="text-gray-200">{row.supplier}</span>
                          <span className="text-amber-400 font-semibold">{formatRupiah(row.totalCost)}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-gray-400 text-sm">Belum ada data</p>}
                </div>
                <div className="glass-card rounded-xl p-5">
                  <h2 className="text-gray-50 font-bold mb-4 flex items-center gap-2">?? Stok Masuk per Gudang</h2>
                  {stockReport?.byWarehouse?.length ? (
                    <div className="space-y-3">
                      {stockReport.byWarehouse.map((row: any) => (
                        <div key={row.warehouse} className="flex items-center justify-between text-sm">
                          <span className="text-gray-200">{row.warehouse}</span>
                          <span className="text-green-400 font-semibold">{formatRupiah(row.totalCost)}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-gray-400 text-sm">Belum ada data</p>}
                </div>
              </div>

              <div className="glass-card rounded-xl p-5">
                <h2 className="text-gray-50 font-bold mb-4 flex items-center gap-2">?? Stok Masuk per Produk</h2>
                {stockReport?.byProduct?.length ? (
                  <div className="space-y-3">
                    {stockReport.byProduct.map((row: any) => (
                      <div key={row.product} className="grid grid-cols-3 gap-3 text-sm">
                        <div className="text-gray-200 truncate">{row.product}</div>
                        <div className="text-gray-400 text-right">Qty: {row.totalQty}</div>
                        <div className="text-orange-400 font-semibold text-right">{formatRupiah(row.totalCost)}</div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-gray-400 text-sm">Belum ada data</p>}
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
