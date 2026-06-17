'use client'

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

  async function handleCloseSession() {
    if (!session) return
    if (!confirm('Tutup shift dan keluar?')) return
    try {
      await fetch(`/api/sessions/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endCash: 0 }),
      })
    } catch {}
    clearSession()
    router.push('/kasir')
  }

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
      {/* Logo */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-lg shadow-md">
          🍧
        </div>
        <div>
          <span className="font-bold text-white text-lg leading-none">DurenUcok</span>
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
      <div className="flex items-center gap-3">
        {cashier && (
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-sm font-bold text-white">
              {cashier.name.charAt(0)}
            </div>
            <div className="text-xs">
              <p className="text-white font-medium">{cashier.name}</p>
              <p className="text-gray-500">Kasir Aktif</p>
            </div>
          </div>
        )}
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
  )
}
