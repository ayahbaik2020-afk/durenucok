'use client'

import { useEffect, useState } from 'react'
import AppNavbar from '@/components/layout/AppNavbar'

export default function SupplierPage() {
  const [items, setItems] = useState<any[]>([])
  const [name, setName] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')

  const load = async () => setItems(await fetch('/api/suppliers').then(r => r.json()))
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!name.trim()) return
    await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
    setName('')
    load()
  }

  const update = async () => {
    if (!editingId || !editingName.trim()) return
    await fetch('/api/suppliers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, name: editingName }) })
    setEditingId(null)
    setEditingName('')
    load()
  }

  const remove = async (id: number) => {
    await fetch(`/api/suppliers?id=${id}`, { method: 'DELETE' })
    load()
  }

  return (<div className="min-h-screen bg-gray-950 text-gray-100"><AppNavbar /><main className="max-w-4xl mx-auto p-4 space-y-4"><h1 className="text-2xl font-bold">Master Supplier</h1><div className="flex gap-2"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Nama supplier" className="flex-1 bg-gray-800 rounded-xl px-4 py-3" /><button onClick={save} className="px-4 py-3 rounded-xl bg-amber-500">Simpan</button></div><div className="rounded-2xl border border-gray-800 bg-gray-900 divide-y divide-gray-800">{items.map(i=><div key={i.id} className="p-4 flex items-center justify-between gap-3">{editingId===i.id ? <input value={editingName} onChange={e=>setEditingName(e.target.value)} className="flex-1 bg-gray-800 rounded-lg px-3 py-2" /> : <div>{i.name}</div>}<div className="flex gap-2">{editingId===i.id ? <button onClick={update} className="px-3 py-2 rounded-lg bg-green-600">Simpan</button> : <button onClick={()=>{setEditingId(i.id); setEditingName(i.name)}} className="px-3 py-2 rounded-lg bg-gray-800">Edit</button>}<button onClick={()=>remove(i.id)} className="px-3 py-2 rounded-lg bg-red-600">Hapus</button></div></div>)}</div></main></div>)
}
