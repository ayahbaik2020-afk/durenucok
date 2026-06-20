'use client'

import { useEffect, useState } from 'react'
import AppNavbar from '@/components/layout/AppNavbar'

export default function PengaturanPage() {
  const [name, setName] = useState('DurenUcok')
  const [logo, setLogo] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    fetch('/api/store-settings').then(r => r.json()).then(data => {
      if (data) {
        setName(data.name || '')
        setLogo(data.logo || '')
        setAddress(data.address || '')
        setPhone(data.phone || '')
      }
    })
  }, [])

  const save = async () => {
    await fetch('/api/store-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, logo, address, phone }),
    })
    alert('Pengaturan toko tersimpan')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <AppNavbar />
      <main className="max-w-3xl mx-auto p-4 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Pengaturan Toko</h1>
          <p className="text-gray-400 text-sm">Nama toko, logo, alamat, dan nomor telepon.</p>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 space-y-4">
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Nama toko" className="w-full bg-gray-800 rounded-xl px-4 py-3" />
          <input value={logo} onChange={e=>setLogo(e.target.value)} placeholder="URL logo / path logo" className="w-full bg-gray-800 rounded-xl px-4 py-3" />
          <textarea value={address} onChange={e=>setAddress(e.target.value)} placeholder="Alamat toko" className="w-full bg-gray-800 rounded-xl px-4 py-3 min-h-28" />
          <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="Nomor telepon" className="w-full bg-gray-800 rounded-xl px-4 py-3" />
          <button onClick={save} className="px-4 py-2 rounded-xl bg-amber-500 text-white font-semibold">Simpan</button>
        </div>
      </main>
    </div>
  )
}
