'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSessionStore } from '@/store/sessionStore'
import { useCartStore } from '@/store/cartStore'

const navItems = [
  { href: '/pos', label: 'Kasir', icon: '🏪' },
  { href: '/history', label: 'Riwayat', icon: '📋' },
  { href: '/stok', label: 'Stok', icon: '📦' },
  { href: '/laporan', label: 'Laporan', icon: '📊' },
]

export default function AppNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { cashier, session, clearSession } = useSessionStore()
  const { getItemCount } = useCartStore()
  const cartCount = getItemCount()

  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  // PIN Change States
  const [isPinModalOpen, setIsPinModalOpen] = useState(false)
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [pinSuccess, setPinSuccess] = useState('')
  const [pinLoading, setPinLoading] = useState(false)

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setTheme(isDark ? 'dark' : 'light')
  }, [])

  const toggleTheme = () => {
    if (theme === 'dark') {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setTheme('light')
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setTheme('dark')
    }
  }

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cashier) return
    
    setPinError('')
    setPinSuccess('')
    
    if (newPin !== confirmPin) {
      setPinError('Konfirmasi PIN baru tidak cocok!')
      return
    }
    
    if (!/^\d+$/.test(newPin) || newPin.length < 4) {
      setPinError('PIN baru harus berupa angka minimal 4 digit!')
      return
    }

    setPinLoading(true)
    try {
      const res = await fetch('/api/cashiers/change-pin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashierId: cashier.id,
          oldPin,
          newPin,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setPinSuccess('✅ PIN berhasil diperbarui!')
        // Update local session storage cashier details
        useSessionStore.setState({ cashier: data.cashier })
        
        // Reset fields after delay
        setTimeout(() => {
          setIsPinModalOpen(false)
          setOldPin('')
          setNewPin('')
          setConfirmPin('')
          setPinSuccess('')
        }, 1500)
      } else {
        setPinError(data.error || 'Gagal mengubah PIN')
      }
    } catch {
      setPinError('Terjadi kesalahan jaringan')
    } finally {
      setPinLoading(false)
    }
  }

  async function handleCloseSession() {
    if (!session) return
    
    // Tanyakan jumlah uang fisik di laci kasir saat ini
    const userInput = prompt('Tutup shift dan keluar?\n\nBerapa jumlah uang fisik (Cash) di laci kasir saat ini?')
    if (userInput === null) return // Jika klik Batal, hentikan proses keluar

    // Bersihkan nilai input dari karakter non-numerik (seperti titik pemisah ribuan atau huruf)
    const cleanValue = userInput.replace(/\D/g, '')
    const endCash = parseFloat(cleanValue) || 0

    try {
      await fetch(`/api/sessions/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endCash }),
      })
    } catch {}
    clearSession()
    router.push('/kasir')
  }

  return (
    <>
      <nav className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-lg shadow-md">
            🍧
          </div>
          <div>
            <span className="font-bold text-gray-50 text-lg leading-none">DurenUcok</span>
            <span className="hidden sm:block text-gray-500 text-xs">POS System</span>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const showBadge = item.href === '/pos' && cartCount > 0
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative touch-btn flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-amber-500 text-white shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span>{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
                {showBadge && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Cashier info */}
        <div className="flex items-center gap-2.5">
          {cashier && (
            <button
              onClick={() => setIsPinModalOpen(true)}
              className="hidden md:flex items-center gap-2 touch-btn text-left p-1 px-2 rounded-xl hover:bg-gray-800 transition-colors border border-gray-850 hover:border-gray-700"
              title="Ganti PIN Kasir"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xs font-bold text-white">
                🔑
              </div>
              <div className="text-[11px] leading-tight">
                <p className="text-gray-100 font-semibold">{cashier.name}</p>
                <p className="text-gray-500">Ganti PIN</p>
              </div>
            </button>
          )}
          {cashier && (
            <button
              onClick={() => setIsPinModalOpen(true)}
              className="touch-btn md:hidden w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white flex items-center justify-center border border-gray-700 transition-colors"
              title="Ganti PIN Kasir"
            >
              🔑
            </button>
          )}
          <button
            onClick={toggleTheme}
            className="touch-btn w-9 h-9 rounded-lg bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white flex items-center justify-center border border-gray-700 transition-colors"
            title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            onClick={handleCloseSession}
            className="touch-btn flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-sm font-medium border border-red-500/20 transition-all"
            title="Tutup Shift"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </nav>

      {/* PIN Change Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/80 backdrop-blur-sm animate-fade-in p-4">
          <div className="glass-card w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-scale-in relative border border-gray-800 bg-gray-900/90 text-gray-100">
            {/* Close button */}
            <button
              onClick={() => {
                setIsPinModalOpen(false)
                setOldPin('')
                setNewPin('')
                setConfirmPin('')
                setPinError('')
                setPinSuccess('')
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-lg w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors"
            >
              ✕
            </button>
            
            <div className="text-center mb-5">
              <span className="text-3xl">🔑</span>
              <h3 className="text-lg font-bold text-gray-50 mt-2">Ganti PIN Kasir</h3>
              <p className="text-gray-400 text-xs mt-1">Ubah kode akses masuk untuk kasir <strong>{cashier?.name}</strong></p>
            </div>

            <form onSubmit={handleUpdatePin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-gray-400 text-xs font-medium">PIN Lama</label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  placeholder="Masukkan PIN saat ini"
                  value={oldPin}
                  onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors text-center tracking-widest font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 text-xs font-medium">PIN Baru (4-6 angka)</label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  placeholder="Masukkan PIN baru"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors text-center tracking-widest font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 text-xs font-medium">Konfirmasi PIN Baru</label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  placeholder="Ketik ulang PIN baru"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors text-center tracking-widest font-mono"
                />
              </div>

              {pinError && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center animate-slide-up">
                  {pinError}
                </div>
              )}

              {pinSuccess && (
                <div className="p-2.5 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-400 text-center animate-slide-up font-semibold">
                  {pinSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={pinLoading || !oldPin || !newPin || !confirmPin}
                className="touch-btn w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-bold transition-all mt-2 flex items-center justify-center gap-1.5"
              >
                {pinLoading ? '⌛ Memproses...' : 'Simpan PIN Baru'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
