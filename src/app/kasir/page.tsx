'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionStore } from '@/store/sessionStore'
import { Cashier } from '@/types'
import { formatRupiah } from '@/lib/utils'

export default function KasirPage() {
  const router = useRouter()
  const { setSession, isLoggedIn } = useSessionStore()

  const [cashiers, setCashiers] = useState<Cashier[]>([])
  const [selectedCashier, setSelectedCashier] = useState<Cashier | null>(null)
  const [pin, setPin] = useState('')
  const [startCash, setStartCash] = useState('') // Menampung nilai terformat (misal: "100.000")
  const [step, setStep] = useState<'select' | 'pin' | 'cash'>('select')
  const [pinError, setPinError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  // Fungsi memformat input string menjadi format ribuan dengan titik
  function formatInputRibuan(value: string): string {
    const cleanNumber = value.replace(/\D/g, '')
    if (!cleanNumber) return ''
    return new Intl.NumberFormat('id-ID').format(parseInt(cleanNumber))
  }

  function handleStartCashChange(val: string) {
    setStartCash(formatInputRibuan(val))
  }

  useEffect(() => {
    if (isLoggedIn()) {
      router.replace('/pos')
      return
    }
    fetchCashiers()
  }, [])

  async function fetchCashiers() {
    try {
      const res = await fetch('/api/cashiers')
      const data = await res.json()
      setCashiers(data)
    } catch {
      console.error('Failed to fetch cashiers')
    } finally {
      setPageLoading(false)
    }
  }

  function handleSelectCashier(c: Cashier) {
    setSelectedCashier(c)
    setPin('')
    setPinError('')
    setStep('pin')
  }

  function handlePinInput(digit: string) {
    if (pin.length >= 6) return
    const newPin = pin + digit
    setPin(newPin)
    if (newPin.length >= 4) {
      setTimeout(() => validatePin(newPin), 150)
    }
  }

  function handlePinBackspace() {
    setPin((p) => p.slice(0, -1))
    setPinError('')
  }

  async function validatePin(enteredPin: string) {
    if (!selectedCashier) return
    setLoading(true)
    try {
      const res = await fetch('/api/cashiers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cashierId: selectedCashier.id, pin: enteredPin }),
      })
      if (res.ok) {
        const data = await res.json()
        setSelectedCashier(data)
        setPin('')
        setPinError('')
        setStep('cash')
      } else {
        setPinError('PIN salah. Coba lagi.')
        setPin('')
      }
    } catch {
      setPinError('Gagal terhubung ke server.')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  // Helper untuk membersihkan titik pemisah ribuan agar siap diparse ke float
  function cleanFormattedNumber(val: string): number {
    const cleanString = val.replace(/\./g, '')
    return parseFloat(cleanString) || 0
  }

  async function handleStartShift() {
    if (!selectedCashier) return
    setLoading(true)
    try {
      const cleanCash = cleanFormattedNumber(startCash)
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cashierId: selectedCashier.id,
          startCash: cleanCash,
        }),
      })
      const session = await res.json()
      setSession(session, selectedCashier)
      router.push('/pos')
    } catch {
      alert('Gagal membuka sesi. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
          <p className="text-amber-400 font-medium">Memuat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md animate-fade-in relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 mb-4 shadow-xl glow-amber">
            <span className="text-4xl">🍧</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-50">DurenUcok</h1>
          <p className="text-amber-400/80 text-sm mt-1">Point of Sale — Olahan Durian</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-6 shadow-2xl">

          {/* STEP 1: Pilih Kasir */}
          {step === 'select' && (
            <div className="animate-scale-in">
              <h2 className="text-lg font-semibold text-gray-50 mb-1">Pilih Kasir</h2>
              <p className="text-gray-400 text-sm mb-5">Siapa yang bertugas hari ini?</p>
              <div className="space-y-3">
                {cashiers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSelectCashier(c)}
                    className="touch-btn w-full flex items-center gap-4 p-4 rounded-xl bg-gray-800 hover:bg-amber-500/20 hover:border-amber-500/50 border border-gray-700 transition-all duration-200 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xl font-bold text-white shadow-lg group-hover:scale-110 transition-transform">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-100">{c.name}</p>
                      <p className="text-gray-400 text-xs">Kasir</p>
                    </div>
                    <svg className="ml-auto text-gray-500 group-hover:text-amber-400 transition-colors" width="20" height="20" fill="none" viewBox="0 0 24 24">
                      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                ))}
              </div>
              {cashiers.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  <p>Belum ada kasir terdaftar.</p>
                  <p className="text-sm mt-1">Jalankan <code className="text-amber-400">npm run db:seed</code> terlebih dahulu.</p>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Input PIN */}
          {step === 'pin' && selectedCashier && (
            <div className="animate-scale-in">
              <button onClick={() => setStep('select')} className="flex items-center gap-2 text-gray-400 hover:text-gray-100 transition-colors mb-5 text-sm">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Ganti Kasir
              </button>

              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-2xl font-bold text-white mx-auto mb-3 shadow-lg">
                  {selectedCashier.name.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-lg font-semibold text-gray-50">Halo, {selectedCashier.name}!</h2>
                <p className="text-gray-400 text-sm">Masukkan PIN kamu</p>
              </div>

              {/* PIN dots — 4 dots, PIN 4 digit */}
              <div className="flex justify-center gap-3 mb-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full transition-all duration-200 ${
                      i < pin.length
                        ? 'bg-amber-400 scale-110'
                        : 'bg-gray-700 border border-gray-600'
                    }`}
                  />
                ))}
              </div>

              {pinError && (
                <p className="text-red-400 text-sm text-center mb-3 animate-slide-up">{pinError}</p>
              )}

              {/* PIN Keypad */}
              <div className="grid grid-cols-3 gap-2 mt-5">
                {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((k, idx) => (
                  <button
                    key={idx}
                    disabled={k === ''}
                    onClick={() => k === '⌫' ? handlePinBackspace() : k !== '' && handlePinInput(k)}
                    className={`touch-btn h-14 rounded-xl text-xl font-semibold transition-all duration-150 ${
                      k === ''
                        ? 'invisible'
                        : k === '⌫'
                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        : 'bg-gray-800 hover:bg-amber-500/30 hover:text-amber-400 text-gray-100 border border-gray-700 hover:border-amber-500/50'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: Modal awal */}
          {step === 'cash' && selectedCashier && (
            <div className="animate-scale-in">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg">
                  💰
                </div>
                <h2 className="text-lg font-semibold text-gray-50">Modal Awal Cash</h2>
                <p className="text-gray-400 text-sm">Berapa uang di laci kasir saat ini?</p>
              </div>

              <div className="mb-5">
                <label className="text-gray-400 text-sm font-medium block mb-2">Jumlah Modal (Rp)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">Rp</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={startCash}
                    onChange={(e) => handleStartCashChange(e.target.value)}
                    placeholder="0"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-12 pr-4 py-4 text-gray-100 text-lg font-semibold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    onKeyDown={(e) => e.key === 'Enter' && handleStartShift()}
                  />
                </div>
                {startCash && (
                  <p className="text-amber-400 text-sm mt-2 text-right font-medium">
                    {formatRupiah(cleanFormattedNumber(startCash))}
                  </p>
                )}
              </div>

              {/* Quick amounts */}
              <div className="flex gap-2 mb-6 flex-wrap">
                {[100000, 200000, 300000, 500000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => handleStartCashChange(String(amt))}
                    className="touch-btn flex-1 min-w-[80px] py-2 rounded-lg bg-gray-800 hover:bg-amber-500/20 hover:border-amber-500/50 border border-gray-700 text-sm text-gray-300 hover:text-amber-400 transition-all"
                  >
                    {formatRupiah(amt)}
                  </button>
                ))}
              </div>

              <button
                onClick={handleStartShift}
                disabled={loading}
                className="touch-btn w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold text-lg shadow-lg glow-amber-sm transition-all duration-200 disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Membuka Kasir...
                  </span>
                ) : (
                  '🚀 Mulai Shift'
                )}
              </button>

              <button
                onClick={() => { setStep('pin'); setPin('') }}
                className="w-full mt-3 py-2 text-gray-400 hover:text-white text-sm transition-colors"
              >
                ← Kembali
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          DurenUcok POS v1.0 • 2025
        </p>
      </div>
    </div>
  )
}
