'use client'

import { useEffect, useMemo, useState } from 'react'
import AppNavbar from '@/components/layout/AppNavbar'

interface Product { id: number; name: string; price: number }
interface Supplier { id: number; name: string }
interface Warehouse { id: number; name: string }
interface ReceiptItem { id: number; receiptNumber: string; receiptDate: string; status: string; supplier?: { name: string } | null; warehouse?: { name: string } | null; totalAmount: number }

export default function StokMasukPage() {
  const [items, setItems] = useState<ReceiptItem[]>([])
  const [summary, setSummary] = useState<{ totalReceipts: number; totalQty: number; totalCost: number } | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [openForm, setOpenForm] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState<any>({ receiptNumber: '', supplierId: '', warehouseId: '', documentNo: '', note: '', status: 'DRAFT', items: [{ productId: '', qty: 1, unitPrice: 0 }] })

  useEffect(() => {
    Promise.all([
      fetch('/api/stock/receipts').then(r => r.json()),
      fetch('/api/stock/receipts/summary').then(r => r.json()),
      fetch('/api/products').then(r => r.json()),
      fetch('/api/suppliers').then(r => r.json()),
      fetch('/api/warehouses').then(r => r.json()),
    ]).then(([rows, sum, prods, sups, whs]) => {
      setItems(rows)
      setSummary(sum)
      setProducts(prods)
      setSuppliers(sups)
      setWarehouses(whs)
    })
  }, [])

  const totalForm = useMemo(() => form.items.reduce((s: number, i: any) => s + (Number(i.qty || 0) * Number(i.unitPrice || 0)), 0), [form.items])

  const patchStatus = async (id: number, status: string) => {
    const res = await fetch(`/api/stock/receipts/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    if (res.ok) setItems(prev => prev.map(x => x.id === id ? { ...x, status } as any : x))
  }

  const save = async (overrideStatus?: string) => {
    const validItems = form.items.filter((i: any) => i.productId && Number(i.qty) > 0 && Number(i.unitPrice) >= 0)
    if (!form.receiptNumber) { setFormError('Nomor receipt wajib diisi.') ; return }
    if (validItems.length === 0) { setFormError('Minimal 1 item valid harus diisi.') ; return }
    setFormError('')
    const payload = {
      ...form,
      status: overrideStatus ?? form.status,
      supplierId: form.supplierId ? Number(form.supplierId) : null,
      warehouseId: form.warehouseId ? Number(form.warehouseId) : null,
      totalAmount: totalForm,
      items: validItems.map((i: any) => ({ ...i, productId: Number(i.productId), qty: Number(i.qty), unitPrice: Number(i.unitPrice), subtotal: Number(i.qty) * Number(i.unitPrice) })),
    }
    const res = await fetch('/api/stock/receipts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) {
      setOpenForm(false)
      setFormError('')
      const updated = await fetch('/api/stock/receipts').then(r => r.json())
      const sum = await fetch('/api/stock/receipts/summary').then(r => r.json())
      setItems(updated)
      setSummary(sum)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <AppNavbar />
      <main className="max-w-6xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Stok Masuk</h1>
            <p className="text-gray-400 text-sm">Penerimaan barang, supplier, gudang, dan historis modal.</p>
          </div>
          <button onClick={() => setOpenForm(v => !v)} className="px-4 py-2 rounded-xl bg-amber-500 text-white font-semibold">+ Tambah Stok Masuk</button>
        </div>

        {openForm && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 space-y-4">
            {formError && <div className="rounded-xl border border-red-700 bg-red-950/60 text-red-200 px-4 py-3 text-sm">{formError}</div>}
            <div className="grid md:grid-cols-3 gap-3">
              <input value={form.receiptNumber} onChange={e => setForm({...form, receiptNumber: e.target.value})} placeholder="Nomor receipt" className="bg-gray-800 rounded-xl px-4 py-3" />
              <select value={form.supplierId} onChange={e => setForm({...form, supplierId: e.target.value})} className="bg-gray-800 rounded-xl px-4 py-3">
                <option value="">Pilih supplier</option>{suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={form.warehouseId} onChange={e => setForm({...form, warehouseId: e.target.value})} className="bg-gray-800 rounded-xl px-4 py-3">
                <option value="">Pilih gudang</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              {form.items.map((it: any, idx: number) => (
                <div key={idx} className="grid md:grid-cols-4 gap-3">
                  <select value={it.productId} onChange={e => { const arr=[...form.items]; arr[idx].productId=e.target.value; setForm({...form, items: arr}) }} className="bg-gray-800 rounded-xl px-4 py-3">
                    <option value="">Pilih produk</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input type="number" value={it.qty} onChange={e => { const arr=[...form.items]; arr[idx].qty=e.target.value; setForm({...form, items: arr}) }} placeholder="Qty" className="bg-gray-800 rounded-xl px-4 py-3" />
                  <input type="number" value={it.unitPrice} onChange={e => { const arr=[...form.items]; arr[idx].unitPrice=e.target.value; setForm({...form, items: arr}) }} placeholder="Harga beli" className="bg-gray-800 rounded-xl px-4 py-3" />
                  <button onClick={() => setForm({...form, items: form.items.filter((_: any, i: number) => i !== idx)})} className="bg-red-600 rounded-xl px-4 py-3">Hapus</button>
                </div>
              ))}
            </div>
            <button onClick={() => setForm({...form, items: [...form.items, { productId: '', qty: 1, unitPrice: 0 }]})} className="text-sm px-3 py-2 rounded-lg bg-gray-800">+ Item</button>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-300">Total modal: Rp {totalForm.toLocaleString('id-ID')}</div>
              <div className="flex gap-2">
                <button onClick={() => save('DRAFT')} className="px-4 py-2 rounded-xl bg-green-600">Simpan Draft</button>
                <button onClick={() => save('POSTED')} className="px-4 py-2 rounded-xl bg-amber-500">Simpan & Post</button>
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4"><div className="text-gray-400 text-sm">Total Receipt</div><div className="text-2xl font-bold mt-2">{summary?.totalReceipts ?? 0}</div></div>
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4"><div className="text-gray-400 text-sm">Total Qty Masuk</div><div className="text-2xl font-bold mt-2">{summary?.totalQty ?? 0}</div></div>
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4"><div className="text-gray-400 text-sm">Total Modal Historis</div><div className="text-2xl font-bold mt-2">Rp {Number(summary?.totalCost ?? 0).toLocaleString('id-ID')}</div></div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
          <div className="p-4 border-b border-gray-800 font-semibold">Riwayat Stok Masuk</div>
          <div className="divide-y divide-gray-800">
            {items.map(item => (
              <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{item.receiptNumber}</div>
                  <div className="text-sm text-gray-400">{new Date(item.receiptDate).toLocaleDateString('id-ID')} ? {item.supplier?.name || '-'} ? {item.warehouse?.name || '-'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm px-3 py-1 rounded-full bg-gray-800">{item.status}</span>
                  {item.status !== 'POSTED' ? <button onClick={() => patchStatus(item.id, 'POSTED')} className="text-xs px-3 py-1.5 rounded-lg bg-green-600">Post</button> : <button onClick={() => patchStatus(item.id, 'DRAFT')} className="text-xs px-3 py-1.5 rounded-lg bg-gray-700">Unpost</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
