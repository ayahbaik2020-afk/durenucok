'use client'

import { useEffect, useMemo, useState } from 'react'
import AppNavbar from '@/components/layout/AppNavbar'

interface Product { id: number; name: string; stock?: number | null }
interface Warehouse { id: number; name: string }
interface OpnameItem { id: number; opnameNumber: string; opnameDate: string; status: string; warehouse?: { name: string } | null; items: { difference: number }[] }

export default function StokOpnamePage() {
  const [items, setItems] = useState<OpnameItem[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [openForm, setOpenForm] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState<any>({ opnameNumber: '', warehouseId: '', note: '', status: 'DRAFT', items: [{ productId: '', systemStock: 0, physicalStock: 0, reason: '' }] })

  useEffect(() => {
    Promise.all([fetch('/api/stock/opnames').then(r => r.json()), fetch('/api/products').then(r => r.json()), fetch('/api/warehouses').then(r => r.json())])
      .then(([rows, prods, whs]) => { setItems(rows); setProducts(prods); setWarehouses(whs) })
  }, [])

  const totalDiff = useMemo(() => items.reduce((s, x) => s + x.items.reduce((a, i) => a + i.difference, 0), 0), [items])

  const patchStatus = async (id: number, status: string) => {
    const res = await fetch(`/api/stock/opnames/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    if (res.ok) setItems(prev => prev.map(x => x.id === id ? { ...x, status } as any : x))
  }

  const save = async (overrideStatus?: string) => {
    const validItems = form.items.filter((i: any) => i.productId)
    if (!form.opnameNumber) { setFormError('Nomor opname wajib diisi.') ; return }
    if (validItems.length === 0) { setFormError('Minimal 1 item opname harus diisi.') ; return }
    setFormError('')
    const payload = {
      ...form,
      status: overrideStatus ?? form.status,
      warehouseId: form.warehouseId ? Number(form.warehouseId) : null,
      items: validItems.map((i: any) => ({ ...i, productId: Number(i.productId), systemStock: Number(i.systemStock), physicalStock: Number(i.physicalStock), difference: Number(i.physicalStock) - Number(i.systemStock) }))
    }
    const res = await fetch('/api/stock/opnames', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    if (res.ok) {
      setOpenForm(false)
      setFormError('')
      setItems(await fetch('/api/stock/opnames').then(r => r.json()))
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <AppNavbar />
      <main className="max-w-6xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Stok Opname</h1>
            <p className="text-gray-400 text-sm">Hitung fisik, bandingkan sistem, lalu finalisasi.</p>
          </div>
          <button onClick={() => setOpenForm(v => !v)} className="px-4 py-2 rounded-xl bg-amber-500 text-white font-semibold">+ Buat Opname</button>
        </div>

        {openForm && (
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4 space-y-4">
            {formError && <div className="rounded-xl border border-red-700 bg-red-950/60 text-red-200 px-4 py-3 text-sm">{formError}</div>}
            <div className="grid md:grid-cols-2 gap-3">
              <input value={form.opnameNumber} onChange={e => setForm({...form, opnameNumber: e.target.value})} placeholder="Nomor opname" className="bg-gray-800 rounded-xl px-4 py-3" />
              <select value={form.warehouseId} onChange={e => setForm({...form, warehouseId: e.target.value})} className="bg-gray-800 rounded-xl px-4 py-3">
                <option value="">Pilih gudang</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="space-y-3">
              {form.items.map((it: any, idx: number) => (
                <div key={idx} className="grid md:grid-cols-5 gap-3">
                  <select value={it.productId} onChange={e => { const arr=[...form.items]; arr[idx].productId=e.target.value; arr[idx].systemStock = products.find(p => String(p.id)===e.target.value)?.stock || 0; setForm({...form, items: arr}) }} className="bg-gray-800 rounded-xl px-4 py-3">
                    <option value="">Pilih produk</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <input type="number" value={it.systemStock} onChange={e => { const arr=[...form.items]; arr[idx].systemStock=e.target.value; setForm({...form, items: arr}) }} placeholder="Stok sistem" className="bg-gray-800 rounded-xl px-4 py-3" />
                  <input type="number" value={it.physicalStock} onChange={e => { const arr=[...form.items]; arr[idx].physicalStock=e.target.value; setForm({...form, items: arr}) }} placeholder="Stok fisik" className="bg-gray-800 rounded-xl px-4 py-3" />
                  <input value={it.reason} onChange={e => { const arr=[...form.items]; arr[idx].reason=e.target.value; setForm({...form, items: arr}) }} placeholder="Alasan selisih" className="bg-gray-800 rounded-xl px-4 py-3 md:col-span-2" />
                  <button onClick={() => setForm({...form, items: form.items.filter((_: any, i: number) => i !== idx)})} className="bg-red-600 rounded-xl px-4 py-3">Hapus</button>
                </div>
              ))}
            </div>
            <button onClick={() => setForm({...form, items: [...form.items, { productId: '', systemStock: 0, physicalStock: 0, reason: '' }]})} className="text-sm px-3 py-2 rounded-lg bg-gray-800">+ Item</button>
            <div className="flex gap-2">
              <button onClick={() => save('DRAFT')} className="px-4 py-2 rounded-xl bg-green-600">Simpan Draft</button>
              <button onClick={() => save('APPROVED')} className="px-4 py-2 rounded-xl bg-amber-500">Simpan & Approve</button>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4"><div className="text-gray-400 text-sm">Total Opname</div><div className="text-2xl font-bold mt-2">{items.length}</div></div>
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4"><div className="text-gray-400 text-sm">Selisih Total</div><div className="text-2xl font-bold mt-2">{totalDiff}</div></div>
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4"><div className="text-gray-400 text-sm">Approved</div><div className="text-2xl font-bold mt-2">{items.filter(x => x.status === 'APPROVED').length}</div></div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
          <div className="p-4 border-b border-gray-800 font-semibold">Riwayat Opname</div>
          <div className="divide-y divide-gray-800">
            {items.map(item => (
              <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{item.opnameNumber}</div>
                  <div className="text-sm text-gray-400">{new Date(item.opnameDate).toLocaleDateString('id-ID')} ? {item.warehouse?.name || '-'} ? Selisih {item.items.reduce((a, i) => a + i.difference, 0)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm px-3 py-1 rounded-full bg-gray-800">{item.status}</span>
                  {item.status !== 'APPROVED' ? <button onClick={() => patchStatus(item.id, 'APPROVED')} className="text-xs px-3 py-1.5 rounded-lg bg-green-600">Approve</button> : <button onClick={() => patchStatus(item.id, 'DRAFT')} className="text-xs px-3 py-1.5 rounded-lg bg-gray-700">Reopen</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
