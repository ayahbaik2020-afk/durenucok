'use client'

import { useState } from 'react'
import { useCartStore } from '@/store/cartStore'
import { useSessionStore } from '@/store/sessionStore'
import { formatRupiah } from '@/lib/utils'

interface CheckoutModalProps {
  onClose: () => void
  onSuccess: () => void
}

type PaymentMethod = 'CASH' | 'QRIS' | 'TRANSFER'

const QUICK_AMOUNTS = [10000, 20000, 50000, 100000, 50000]

export default function CheckoutModal({ onClose, onSuccess }: CheckoutModalProps) {
  const { items, getSubtotal, getTotalDiscount, getTotal, clearCart } = useCartStore()
  const { session, cashier } = useSessionStore()

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')
  const [amountPaid, setAmountPaid] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'payment' | 'success'>('payment')
  const [lastChange, setLastChange] = useState(0)
  const [invoiceNumber, setInvoiceNumber] = useState('')

  const subtotal = getSubtotal()
  const totalDiscount = getTotalDiscount()
  const total = getTotal()
  const paid = parseFloat(amountPaid) || 0
  const change = paymentMethod === 'CASH' ? Math.max(0, paid - total) : 0
  const isPaymentValid =
    paymentMethod !== 'CASH' ? true : paid >= total

  async function handleCheckout() {
    if (!session || !cashier) return
    setLoading(true)
    try {
      const body = {
        cashierId: cashier.id,
        sessionId: session.id,
        paymentMethod,
        amountPaid: paymentMethod === 'CASH' ? paid : total,
        discountAmount: totalDiscount,
        items: items.map((i) => ({
          productId: i.product.id,
          productName: i.product.name,
          productPrice: i.product.price,
          qty: i.qty,
          discount: i.discount,
          subtotal: i.subtotal,
        })),
      }
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const tx = await res.json()
      setLastChange(change)
      setInvoiceNumber(tx.invoiceNumber)
      clearCart()
      setStep('success')
    } catch {
      alert('Transaksi gagal. Coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  const paymentMethods: { id: PaymentMethod; label: string; icon: string; desc: string }[] = [
    { id: 'CASH', label: 'Tunai', icon: '💵', desc: 'Bayar dengan uang tunai' },
    { id: 'QRIS', label: 'QRIS', icon: '📱', desc: 'Scan QR code' },
    { id: 'TRANSFER', label: 'Transfer', icon: '🏦', desc: 'Transfer bank' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-lg bg-gray-900 border border-gray-800 rounded-t-3xl sm:rounded-2xl shadow-2xl animate-scale-in max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {step === 'payment' ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-800 sticky top-0 bg-gray-900 rounded-t-3xl sm:rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-gray-50">Checkout</h2>
                <p className="text-gray-400 text-sm">{items.length} item — {formatRupiah(total)}</p>
              </div>
              <button onClick={onClose} className="touch-btn w-9 h-9 rounded-xl bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-gray-100 transition-all">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Order summary */}
              <div className="bg-gray-800/60 rounded-xl p-4 space-y-2">
                {items.map((item) => (
                  <div key={item.product.id} className="flex justify-between items-center text-sm gap-4">
                    <span className="text-gray-300 flex items-center gap-1.5 min-w-0">
                      {item.product.image ? (
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          className="w-5 h-5 object-cover rounded bg-gray-800 flex-shrink-0"
                        />
                      ) : (
                        <span className="flex-shrink-0">{item.product.emoji}</span>
                      )}
                      <span className="truncate">{item.product.name} ×{item.qty}</span>
                    </span>
                    <span className="text-gray-100 font-medium">{formatRupiah(item.subtotal)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-700 pt-2 mt-2">
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Subtotal</span>
                      <span className="text-gray-300">{formatRupiah(subtotal)}</span>
                    </div>
                  )}
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-400">Diskon</span>
                      <span className="text-green-400">-{formatRupiah(totalDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg mt-1">
                    <span className="text-gray-50">Total</span>
                    <span className="text-amber-400">{formatRupiah(total)}</span>
                  </div>
                </div>
              </div>

              {/* Payment method */}
              <div>
                <p className="text-gray-400 text-sm font-medium mb-3">Metode Pembayaran</p>
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map((pm) => (
                    <button
                      key={pm.id}
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`touch-btn flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 ${
                        paymentMethod === pm.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                      }`}
                    >
                      <span className="text-2xl">{pm.icon}</span>
                      <span className="text-xs font-semibold">{pm.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* QRIS display */}
              {paymentMethod === 'QRIS' && (
                <div className="bg-white rounded-xl p-4 text-center animate-fade-in">
                  <div className="w-32 h-32 mx-auto bg-gray-200 rounded-lg flex items-center justify-center mb-2">
                    <div className="grid grid-cols-3 gap-1">
                      {Array.from({length:9}).map((_,i)=>(
                        <div key={i} className={`w-6 h-6 rounded-sm ${i===0||i===2||i===6||i===4?'bg-gray-800':'bg-gray-400'}`}/>
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-700 text-sm font-medium">Scan QRIS</p>
                  <p className="text-gray-500 text-xs mt-1">DurenUcok — {formatRupiah(total)}</p>
                </div>
              )}

              {/* Transfer info */}
              {paymentMethod === 'TRANSFER' && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 animate-fade-in">
                  <p className="text-blue-400 font-semibold text-sm">Rekening Transfer</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-gray-200 text-sm">BCA: <span className="font-mono font-bold">1234567890</span></p>
                    <p className="text-gray-200 text-sm">a.n. <span className="font-medium">Toko DurenUcok</span></p>
                    <p className="text-amber-400 font-bold">{formatRupiah(total)}</p>
                  </div>
                </div>
              )}

              {/* Cash input */}
              {paymentMethod === 'CASH' && (
                <div className="animate-fade-in">
                  <p className="text-gray-400 text-sm font-medium mb-2">Uang Diterima</p>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-sm">Rp</span>
                    <input
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder="0"
                      autoFocus
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl pl-12 pr-4 py-3.5 text-gray-100 text-lg font-bold focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                    />
                  </div>

                  {/* Quick amounts */}
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {[total, ...QUICK_AMOUNTS].map((amt, idx) => (
                      <button
                        key={idx}
                        onClick={() => setAmountPaid(String(idx === 0 ? Math.ceil(total / 1000) * 1000 : amt))}
                        className={`touch-btn flex-1 min-w-[70px] py-2 rounded-lg border text-xs font-medium transition-all ${
                          idx === 0
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                            : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-amber-500/50 hover:text-amber-400'
                        }`}
                      >
                        {idx === 0 ? 'Pas' : formatRupiah(amt)}
                      </button>
                    ))}
                  </div>

                  {/* Change */}
                  {paid > 0 && (
                    <div className={`mt-3 p-3 rounded-xl flex items-center justify-between ${
                      paid >= total ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
                    }`}>
                      <span className="text-sm font-medium text-gray-300">
                        {paid >= total ? '💰 Kembalian' : '⚠️ Kurang'}
                      </span>
                      <span className={`text-lg font-bold ${paid >= total ? 'text-green-400' : 'text-red-400'}`}>
                        {paid >= total ? formatRupiah(change) : formatRupiah(total - paid)}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Checkout button */}
            <div className="p-5 pt-0">
              <button
                onClick={handleCheckout}
                disabled={!isPaymentValid || loading}
                className="touch-btn w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-bold text-lg shadow-lg glow-amber-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Memproses...
                  </span>
                ) : (
                  `✅ Selesaikan — ${formatRupiah(total)}`
                )}
              </button>
            </div>
          </>
        ) : (
          /* SUCCESS STATE */
          <div className="p-8 text-center animate-scale-in">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-5xl mx-auto mb-4 shadow-xl">
              ✅
            </div>
            <h2 className="text-2xl font-bold text-gray-50 mb-1">Transaksi Berhasil!</h2>
            <p className="text-gray-400 text-sm mb-6">{invoiceNumber}</p>

            {paymentMethod === 'CASH' && lastChange > 0 && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 mb-6">
                <p className="text-green-400/80 text-sm font-medium">Kembalian</p>
                <p className="text-green-400 text-4xl font-bold mt-1">{formatRupiah(lastChange)}</p>
              </div>
            )}

            <button
              onClick={() => { onSuccess(); onClose() }}
              className="touch-btn w-full py-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-lg shadow-lg glow-amber-sm"
            >
              🛍️ Transaksi Baru
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
