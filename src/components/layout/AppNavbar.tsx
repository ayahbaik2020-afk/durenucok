'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSessionStore } from '@/store/sessionStore'
import { useCartStore } from '@/store/cartStore'

const navItems = [
  { href: '/pos', label: 'Kasir', icon: '🍧' },
  { href: '/history', label: 'Riwayat', icon: '📋' },
  { href: '/stok', label: 'Stok Produk', icon: '📦' },
  { href: '/stok/masuk', label: 'Stok Masuk', icon: '📥' },
  { href: '/stok/opname', label: 'Opname', icon: '🔍' },
  { href: '/supplier', label: 'Supplier', icon: '🤝' },
  { href: '/gudang', label: 'Gudang', icon: '🏢' },
  { href: '/laporan', label: 'Laporan', icon: '📊' },
  { href: '/pengaturan', label: 'Pengaturan', icon: '⚙️' },
]

export default function AppNavbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { cashier, session, clearSession } = useSessionStore()
  const { getItemCount } = useCartStore()
  const cartCount = getItemCount()

  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
        useSessionStore.setState({ cashier: data.cashier })
        
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
    
    const userInput = prompt('Tutup shift dan keluar?\n\nBerapa jumlah uang fisik (Cash) di laci kasir saat ini?')
    if (userInput === null) return

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
      <nav className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        
        {/* LOGO & MENU HAMBURGER (MOBILE) */}
        <div className="flex items-center gap-3">
          {/* Hamburger button for mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden touch-btn w-10 h-10 rounded-xl bg-gray-850 hover:bg-gray-800 text-gray-300 hover:text-white flex items-center justify-center border border-gray-800 cursor-pointer"
            aria-label="Buka Menu"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-sm shadow-sm select-none">
              🍧
            </div>
            <div>
              <span className="font-bold text-gray-50 text-base leading-none tracking-tight block">DurenUcok</span>
              <span className="hidden sm:block text-[10px] text-gray-500 font-medium">POS Terminal v1.1</span>
            </div>
          </div>
        </div>

        {/* NAVIGATION BAR (DESKTOP ONLY) */}
        <div className="hidden lg:flex items-center gap-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const showBadge = item.href === '/pos' && cartCount > 0
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative touch-btn flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/20'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
                {showBadge && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold font-mono">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* CONTROLS (THEME, QUICK ACTION / LOGOUT) */}
        <div className="flex items-center gap-2">
          {/* Quick Access to Cashier for mobile (if not currently on POS page) */}
          {pathname !== '/pos' && (
            <Link
              href="/pos"
              className="lg:hidden touch-btn flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600 hover:text-white"
              title="Kembali ke POS"
            >
              🍧
            </Link>
          )}

          {/* Theme switcher */}
          <button
            onClick={toggleTheme}
            className="touch-btn w-10 h-10 rounded-xl bg-gray-850 hover:bg-gray-800 text-gray-300 hover:text-white flex items-center justify-center border border-gray-800 cursor-pointer"
            title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* Cashier Info - Click to Change PIN */}
          {cashier && (
            <button
              onClick={() => setIsPinModalOpen(true)}
              className="touch-btn flex items-center gap-2 text-left p-1 px-2.5 rounded-xl hover:bg-gray-800 border border-gray-850 hover:border-gray-700 cursor-pointer h-10"
              title="Ganti PIN Kasir"
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                👤
              </div>
              <div className="hidden md:block text-[11px] leading-tight">
                <p className="text-gray-100 font-semibold">{cashier.name}</p>
                <p className="text-gray-500">Ubah PIN</p>
              </div>
            </button>
          )}

          {/* Close Shift (Logout) Button */}
          <button
            onClick={handleCloseSession}
            className="touch-btn flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-sm font-medium border border-red-500/20 cursor-pointer h-10"
            title="Tutup Shift & Keluar"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </nav>

      {/* MOBILE MENU SIDEBAR (SLIDE OUT DRAWER) */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-gray-950/80 backdrop-blur-xs z-50 lg:hidden animate-fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          {/* Sidebar Drawer */}
          <div className="fixed top-0 left-0 h-full w-[280px] bg-gray-900 border-r border-gray-800 z-50 shadow-2xl flex flex-col justify-between animate-scale-in lg:hidden">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between p-4.5 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🍧</span>
                  <span className="font-bold text-gray-50 text-base">Menu Navigasi</span>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="touch-btn w-9 h-9 rounded-xl bg-gray-805 flex items-center justify-center text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Navigation Items (Touch friendly Vertically) */}
              <div className="p-3 space-y-1.5 overflow-y-auto max-h-[75vh]">
                {navItems.map((item) => {
                  const isActive = pathname === item.href
                  const showBadge = item.href === '/pos' && cartCount > 0
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-medium transition-all border ${
                        isActive
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-950/20'
                          : 'bg-transparent border-transparent text-gray-400 hover:text-white hover:bg-gray-800/60 hover:border-gray-800'
                      }`}
                      style={{ minHeight: '48px' }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      {showBadge && (
                        <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold font-mono">
                          {cartCount}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Cashier profile summary in sidebar footer */}
            {cashier && (
              <div className="p-4 border-t border-gray-800 bg-gray-950/40 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-bold text-white shadow-sm">
                  {cashier.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-gray-150 font-bold text-sm leading-tight">{cashier.name}</p>
                  <p className="text-gray-500 text-xs mt-0.5">Kasir Sedang Aktif</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* PIN Change Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/80 backdrop-blur-sm animate-fade-in p-4">
          <div className="glass-card w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-scale-in relative border border-gray-800 bg-gray-900/90 text-gray-100">
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
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-100 text-sm focus:outline-none focus:border-emerald-500 transition-all text-center tracking-widest font-mono"
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
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-100 text-sm focus:outline-none focus:border-emerald-500 transition-all text-center tracking-widest font-mono"
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
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-gray-100 text-sm focus:outline-none focus:border-emerald-500 transition-all text-center tracking-widest font-mono"
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
                className="touch-btn w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white py-2.5 rounded-xl text-sm font-bold transition-all mt-2 flex items-center justify-center gap-1.5 cursor-pointer"
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
