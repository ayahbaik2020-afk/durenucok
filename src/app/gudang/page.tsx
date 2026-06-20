'use client'

import { useEffect, useState } from 'react'
import AppNavbar from '@/components/layout/AppNavbar'

export default function GudangPage() {
  const [items, setItems] = useState<any[]>([])
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingName, setEditingName] = useState('')
  const [editingCode, setEditingCode] = useState('')

  const load = async () => setItems(await fetch('/api/warehouses').then(r => r.json()))
  useEffect(() => { load() }, [])

  const save = async () => {
    if (!name.trim() || !code.trim()) return
    await fetch('/api/warehouses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, code }) })
    setName(''); setCode('')
    load()
  }

  const update = async () => {
    if (!editingId || !editingName.trim() || !editingCode.trim()) return
    await fetch('/api/warehouses', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, name: editingName, code: editingCode }) })
    setEditingId(null)
    setEditingName('')
    setEditingCode('')
    load()
  }

  const remove = async (id: number) => {
    await fetch(`/api/warehouses?id=${id}`, { method: 'DELETE' })
    load()
  }

  return (<div className="min-h-screen bg-gray-950 text-gray-100"><AppNavbar /><main className="max-w-4xl mx-auto p-4 space-y-4"><h1 className="text-2xl font-bold">Master Gudang</h1><div className="grid md:grid-cols-3 gap-2"><input value={name} onChange={e=>setName(e.target.value)} placeholder="Nama gudang" className="bg-gray-800 rounded-xl px-4 py-3" /><input value={code} onChange={e=>setCode(e.target.value)} placeholder="Kode gudang" className="bg-gray-800 rounded-xl px-4 py-3" /><button onClick={save} className="px-4 py-3 rounded-xl bg-amber-500">Simpan</button></div><div className="rounded-2xl border border-gray-800 bg-gray-900 divide-y divide-gray-800">{items.map(i=><div key={i.id} className="p-4 flex items-center justify-between gap-3">{editingId===i.id ? <div className="grid md:grid-cols-2 gap-2 flex-1"><input value={editingCode} onChange={e=>setEditingCode(e.target.value)} className="bg-gray-800 rounded-lg px-3 py-2" /><input value={editingName} onChange={e=>setEditingName(e.target.value)} className="bg-gray-800 rounded-lg px-3 py-2" /></div> : <div>{i.code} ? {i.name}</div>}<div className="flex gap-2">{editingId===i.id ? <button onClick={update} className="px-3 py-2 rounded-lg bg-green-600">Simpan</button> : <button onClick={()=>{setEditingId(i.id); setEditingName(i.name); setEditingCode(i.code)}} className="px-3 py-2 rounded-lg bg-gray-800">Edit</button>}<button onClick={()=>remove(i.id)} className="px-3 py-2 rounded-lg bg-red-600">Hapus</button></div></div>)}</div></main></div>)
}
