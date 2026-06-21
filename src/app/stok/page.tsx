'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionStore } from '@/store/sessionStore'
import { Product, Category } from '@/types'
import { formatRupiah } from '@/lib/utils'
import AppNavbar from '@/components/layout/AppNavbar'

const WASTE_REASONS = [
  { id: 'EXPIRED', label: 'Kadaluarsa', icon: '⏰', color: 'text-red-400' },
  { id: 'DAMAGED', label: 'Rusak', icon: '💔', color: 'text-orange-400' },
  { id: 'UNSOLD', label: 'Tidak Laku', icon: '😔', color: 'text-yellow-400' },
]

const POPULAR_EMOJIS = [
  '🍧', '🥞', '🥤', '🍮', '🧊', '🎁', '🍨', '🍦', '🍰', '🍒', '🍓', '🥭', '🍉', '🍍', '🥥', '🍊', '🍋', '🍌', '🥝', '🍩', '🍪', '🍫'
]

interface WasteForm {
  productId: number
  qty: number
  reason: string
  note: string
}

export default function StokPage() {
  const router = useRouter()
  const { isLoggedIn } = useSessionStore()

  // Data States
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCatId, setSelectedCatId] = useState<number | 'ALL'>('ALL')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')

  // Inline Stock Edit State
  const [editingStock, setEditingStock] = useState<{ [id: number]: string }>({})

  // Waste Modal State
  const [showWasteModal, setShowWasteModal] = useState(false)
  const [wasteForm, setWasteForm] = useState<WasteForm>({ productId: 0, qty: 1, reason: 'EXPIRED', note: '' })
  const [submittingWaste, setSubmittingWaste] = useState(false)

  // Product Modal State
  const [showProductModal, setShowProductModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  
  // Product Form States
  const [prodName, setProdName] = useState('')
  const [prodCategoryId, setProdCategoryId] = useState<number>(0)
  const [prodPrice, setProdPrice] = useState<number>(0)
  const [isLimitedStock, setIsLimitedStock] = useState(false)
  const [prodStock, setProdStock] = useState<number | ''>('')
  const [prodEmoji, setProdEmoji] = useState('🍧')
  const [prodImage, setProdImage] = useState<string | null>(null)
  const [prodActive, setProdActive] = useState(true)
  const [submittingProduct, setSubmittingProduct] = useState(false)

  // Bundling configuration
  const [bundleItems, setBundleItems] = useState<{ productId: number; qty: number }[]>([])

  useEffect(() => {
    if (!isLoggedIn()) { router.replace('/kasir'); return }
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch('/api/products?includeInactive=true'),
        fetch('/api/categories')
      ])
      
      const prods = await prodRes.json()
      const cats = await catRes.json()
      
      setProducts(prods)
      setCategories(cats)
      if (cats.length > 0) {
        setProdCategoryId(cats[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Quick Inline Stock Update
  async function handleInlineStockUpdate(productId: number, stock: number) {
    try {
      const prod = products.find(p => p.id === productId)
      if (!prod) return
      
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...prod,
          stock
        }),
      })
      
      if (res.ok) {
        setProducts(prev =>
          prev.map(p => (p.id === productId ? { ...p, stock } : p))
        )
      } else {
        alert('Gagal update stok')
        fetchData()
      }
    } catch {
      alert('Gagal update stok')
      fetchData()
    }
  }

  // Convert image to Base64 (max 400px, JPEG 70%)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('File harus berupa gambar')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxDimensions = 400
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxDimensions) {
            height = Math.round((height * maxDimensions) / width)
            width = maxDimensions
          }
        } else {
          if (height > maxDimensions) {
            width = Math.round((width * maxDimensions) / height)
            height = maxDimensions
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7)
        setProdImage(compressedBase64)
      }
    }
    reader.readAsDataURL(file)
  }

  function openAddProductModal() {
    setIsEditMode(false)
    setSelectedProductId(null)
    setProdName('')
    if (categories.length > 0) {
      setProdCategoryId(categories[0].id)
    }
    setProdPrice(0)
    setIsLimitedStock(false)
    setProdStock('')
    setProdEmoji('🍧')
    setProdImage(null)
    setProdActive(true)
    setBundleItems([])
    setShowProductModal(true)
  }

  function openEditProductModal(product: Product) {
    setIsEditMode(true)
    setSelectedProductId(product.id)
    setProdName(product.name)
    setProdCategoryId(product.categoryId)
    setProdPrice(product.price)
    setIsLimitedStock(product.stock !== null)
    setProdStock(product.stock ?? '')
    setProdEmoji(product.emoji)
    setProdImage(product.image || null)
    setProdActive(product.isActive)
    setBundleItems(
      product.bundleItems?.map((item) => ({
        productId: item.productId,
        qty: item.qty,
      })) || []
    )
    setShowProductModal(true)
  }

  async function handleProductSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!prodName.trim()) {
      alert('Nama produk tidak boleh kosong')
      return
    }
    if (prodPrice <= 0) {
      alert('Harga produk harus lebih dari 0')
      return
    }
    if (isLimitedStock && (prodStock === '' || prodStock < 0)) {
      alert('Silakan masukkan jumlah stok yang valid (minimal 0)')
      return
    }

    setSubmittingProduct(true)
    const isBundlingCategory = categories.find(c => c.id === prodCategoryId)?.name.toLowerCase().includes('bundling')

    const payload = {
      name: prodName,
      price: prodPrice,
      categoryId: prodCategoryId,
      emoji: prodEmoji,
      image: prodImage,
      stock: isLimitedStock ? Number(prodStock) : null,
      isActive: prodActive,
      bundleItems: isBundlingCategory ? bundleItems : undefined
    }

    try {
      let res
      if (isEditMode && selectedProductId) {
        res = await fetch(`/api/products/${selectedProductId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      } else {
        res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
      }

      if (res.ok) {
        setShowProductModal(false)
        fetchData()
      } else {
        const errorData = await res.json()
        alert(`Gagal menyimpan produk: ${errorData.error || 'Terjadi kesalahan'}`)
      }
    } catch (err) {
      console.error('Error saving product:', err)
      alert('Gagal menyimpan produk karena masalah koneksi.')
    } finally {
      setSubmittingProduct(false)
    }
  }

  async function handleProductDelete() {
    if (!selectedProductId) return
    if (!confirm('Apakah Anda yakin ingin menonaktifkan produk ini? Produk tidak akan muncul lagi di POS.')) return

    setSubmittingProduct(true)
    try {
      const res = await fetch(`/api/products/${selectedProductId}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setShowProductModal(false)
        fetchData()
      } else {
        alert('Gagal menghapus produk')
      }
    } catch (err) {
      console.error('Error deleting product:', err)
      alert('Gagal menghapus produk karena masalah koneksi.')
    } finally {
      setSubmittingProduct(false)
    }
  }

  async function handleWasteSubmit() {
    setSubmittingWaste(true)
    try {
      const res = await fetch('/api/stock/waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wasteForm),
      })
      if (res.ok) {
        setShowWasteModal(false)
        setWasteForm({ productId: 0, qty: 1, reason: 'EXPIRED', note: '' })
        fetchData()
      } else {
        alert('Gagal mencatat waste')
      }
    } catch {
      alert('Gagal mencatat waste')
    } finally {
      setSubmittingWaste(false)
    }
  }

  const getStockStatus = (stock: number | null | undefined) => {
    if (stock === null || stock === undefined) return { label: 'Tanpa Batas', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' }
    if (stock === 0) return { label: 'Habis', color: 'text-red-400 bg-red-500/10 border-red-500/30' }
    if (stock <= 5) return { label: 'Menipis', color: 'text-orange-400 bg-orange-500/10 border-orange-500/30' }
    return { label: 'Aman', color: 'text-green-400 bg-green-500/10 border-green-500/30' }
  }

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCatId === 'ALL' || p.categoryId === selectedCatId
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && p.isActive) ||
      (statusFilter === 'INACTIVE' && !p.isActive)

    return matchesSearch && matchesCategory && matchesStatus
  })

  return (
    <div className="h-screen flex flex-col bg-gray-950 overflow-hidden text-gray-150">
      <AppNavbar />
      
      <div className="flex-1 overflow-y-auto scroll-smooth">
        <div className="max-w-4xl mx-auto p-5 space-y-5">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 pb-1">
            <div>
              <h1 className="text-2xl font-bold text-gray-50 tracking-tight">Kelola Produk & Stok</h1>
              <p className="text-gray-500 text-sm mt-0.5">Kelola informasi katalog, persediaan, dan pencatatan waste/barang rusak.</p>
            </div>
            
            <div className="flex gap-2.5 w-full sm:w-auto">
              <button
                onClick={() => setShowWasteModal(true)}
                className="touch-btn flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
                style={{ minHeight: '44px' }}
              >
                🗑️ Catat Waste
              </button>
              
              <button
                onClick={openAddProductModal}
                className="touch-btn flex-1 sm:flex-none flex items-center justify-center gap-2 px-4.5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-950/20 transition-all cursor-pointer"
                style={{ minHeight: '44px' }}
              >
                ➕ Tambah Produk
              </button>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-900 border border-gray-800 p-4 rounded-2xl shadow-sm">
            {/* Search */}
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
              <input
                type="text"
                placeholder="Cari nama produk..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-gray-100 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-gray-600"
              />
            </div>

            {/* Category selection */}
            <div>
              <select
                value={selectedCatId}
                onChange={(e) => setSelectedCatId(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value))}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-gray-100 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
              >
                <option value="ALL">Semua Kategori</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.emoji} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status selection */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-gray-100 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
              >
                <option value="ALL">Semua Status (Aktif & Nonaktif)</option>
                <option value="ACTIVE">Hanya Status Aktif</option>
                <option value="INACTIVE">Hanya Status Nonaktif</option>
              </select>
            </div>
          </div>

          {/* Product List */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-gray-900 border border-gray-800 animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 bg-gray-900/20 rounded-3xl border border-gray-800 border-dashed p-6 animate-fade-in">
              <span className="text-5xl mb-4 block">📦</span>
              <h3 className="text-gray-300 font-semibold text-base">Produk tidak ditemukan</h3>
              <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">
                Silakan ubah filter pencarian Anda atau tambah produk baru untuk mulai mengisi stok.
              </p>
            </div>
          ) : (
            <div className="space-y-3 animate-slide-up">
              {filteredProducts.map((product) => {
                const status = getStockStatus(product.stock)
                const hasLimitedStock = product.stock !== null
                const isInactive = !product.isActive

                return (
                  <div
                    key={product.id}
                    className={`glass-card rounded-2xl p-4 flex items-center justify-between gap-4 transition-all border ${
                      isInactive 
                        ? 'opacity-50 border-red-500/10 bg-gray-900/30' 
                        : 'bg-gray-900/60 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Image / Emoji */}
                      <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-gray-950 border border-gray-800 overflow-hidden shadow-inner select-none">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl">{product.emoji}</span>
                        )}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-gray-150 font-bold text-sm truncate">{product.name}</p>
                          {isInactive && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/20">
                              NONAKTIF
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 text-xs mt-0.5 font-medium">
                          {product.category.emoji} {product.category.name} • <span className="text-emerald-400 font-semibold font-mono">{formatRupiah(product.price)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Stock status & Quick actions */}
                    <div className="flex items-center gap-3.5 flex-shrink-0">
                      
                      {/* Status stock badge (Desktop only) */}
                      <div className="text-right hidden sm:block">
                        <span className={`inline-block text-[10px] tracking-wide font-bold px-2.5 py-1 rounded-full border uppercase ${status.color}`}>
                          {status.label}
                        </span>
                        {hasLimitedStock && (
                          <p className="text-gray-500 text-[10px] font-semibold mt-1 font-mono">Stok: {product.stock}</p>
                        )}
                      </div>

                      {/* Bundling Badge for mobile devices */}
                      {product.bundleItems && product.bundleItems.length > 0 && (
                        <div className="block sm:hidden text-right mr-1">
                          <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-full font-bold uppercase">
                            🎁 Paket
                          </span>
                        </div>
                      )}

                      {/* Inline Stock Increment / Decrement controls */}
                      {hasLimitedStock ? (
                        <div className="flex items-center bg-gray-950 border border-gray-800 rounded-xl overflow-hidden h-9">
                          <button
                            onClick={() => handleInlineStockUpdate(product.id, Math.max(0, (product.stock || 0) - 1))}
                            className="w-8 h-full hover:bg-gray-800 text-gray-500 hover:text-gray-150 transition-colors font-bold text-base cursor-pointer"
                          >
                            -
                          </button>
                          
                          <input
                            type="number"
                            min={0}
                            value={editingStock[product.id] !== undefined ? editingStock[product.id] : (product.stock || 0)}
                            onChange={(e) => setEditingStock({ ...editingStock, [product.id]: e.target.value })}
                            onBlur={() => {
                              const newVal = editingStock[product.id]
                              if (newVal !== undefined && newVal !== '') {
                                handleInlineStockUpdate(product.id, Math.max(0, parseInt(newVal) || 0))
                              }
                              const copy = { ...editingStock }
                              delete copy[product.id]
                              setEditingStock(copy)
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const newVal = editingStock[product.id]
                                if (newVal !== undefined && newVal !== '') {
                                  handleInlineStockUpdate(product.id, Math.max(0, parseInt(newVal) || 0))
                                }
                                const copy = { ...editingStock }
                                delete copy[product.id]
                                setEditingStock(copy)
                                e.currentTarget.blur()
                              }
                            }}
                            className="w-10 bg-transparent text-gray-100 text-xs font-bold text-center focus:outline-none focus:bg-gray-800/50 py-1 font-mono"
                          />

                          <button
                            onClick={() => handleInlineStockUpdate(product.id, (product.stock || 0) + 1)}
                            className="w-8 h-full hover:bg-gray-800 text-gray-500 hover:text-gray-150 transition-colors font-bold text-base cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs italic font-medium mr-1.5 select-none">∞ Bebas</span>
                      )}

                      {/* Edit product button */}
                      <button
                        onClick={() => openEditProductModal(product)}
                        className="touch-btn w-9 h-9 rounded-xl bg-gray-850 hover:bg-gray-800 border border-gray-800 hover:border-emerald-500/50 text-gray-400 hover:text-emerald-400 flex items-center justify-center transition-all cursor-pointer"
                        title="Edit Produk"
                      >
                        <svg width="15" height="15" fill="none" viewBox="0 0 24 24">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Product Add/Edit Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-950/75 backdrop-blur-sm" onClick={() => !submittingProduct && setShowProductModal(false)} />
          <div className="relative w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-50 mb-5">
              {isEditMode ? '✏️ Edit Informasi Produk' : '➕ Tambah Produk Baru'}
            </h2>

            <form onSubmit={handleProductSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-gray-450 text-xs font-semibold block mb-1.5">Nama Produk</label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Contoh: Pancake Durian Jumbo"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-gray-100 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-gray-600"
                  style={{ minHeight: '44px' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category selection */}
                <div>
                  <label className="text-gray-455 text-xs font-semibold block mb-1.5">Kategori</label>
                  <select
                    value={prodCategoryId}
                    onChange={(e) => setProdCategoryId(parseInt(e.target.value))}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-gray-100 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
                    style={{ minHeight: '44px' }}
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.emoji} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price */}
                <div>
                  <label className="text-gray-455 text-xs font-semibold block mb-1.5">Harga Jual (Rp)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={prodPrice || ''}
                    onChange={(e) => setProdPrice(parseInt(e.target.value) || 0)}
                    placeholder="Harga"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-gray-100 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                    style={{ minHeight: '44px' }}
                  />
                </div>
              </div>

              {/* Image Upload / Emoji Selection preview */}
              <div className="space-y-3">
                <label className="text-gray-455 text-xs font-semibold block">Gambar / Ikon Produk</label>
                
                <div className="flex gap-4 items-center bg-gray-950 border border-gray-850 p-4 rounded-xl">
                  {/* Selection Preview */}
                  <div className="w-16 h-16 rounded-xl bg-gray-900 flex items-center justify-center text-3xl border border-gray-800 overflow-hidden flex-shrink-0 shadow-inner select-none">
                    {prodImage ? (
                      <img src={prodImage} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span>{prodEmoji}</span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <p className="text-[11px] text-gray-500 font-medium">Unggah foto menu atau gunakan emoji standar sebagai ikon visual.</p>
                    <div className="flex gap-2">
                      {/* Image Input Label */}
                      <label className="touch-btn cursor-pointer bg-gray-850 hover:bg-gray-800 text-white border border-gray-800 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors">
                        📸 Upload Foto
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                      
                      {/* Clear Image Button */}
                      {prodImage && (
                        <button
                          type="button"
                          onClick={() => setProdImage(null)}
                          className="touch-btn bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors"
                        >
                          ✕ Hapus Foto
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Popular Emojis Selector */}
                {!prodImage && (
                  <div className="space-y-2.5 animate-scale-in">
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        maxLength={2}
                        value={prodEmoji}
                        onChange={(e) => setProdEmoji(e.target.value)}
                        placeholder="Kustom..."
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-gray-100 text-sm focus:outline-none focus:border-emerald-500 text-center font-bold"
                        style={{ minHeight: '40px' }}
                      />
                    </div>
                    <div className="grid grid-cols-8 gap-2 bg-gray-950 p-3 rounded-xl border border-gray-800 max-h-[100px] overflow-y-auto">
                      {POPULAR_EMOJIS.map((emoji) => (
                        <button
                          type="button"
                          key={emoji}
                          onClick={() => setProdEmoji(emoji)}
                          className={`text-xl p-1.5 rounded hover:bg-gray-800 transition-all cursor-pointer ${
                            prodEmoji === emoji ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400' : ''
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Stock Settings / Bundling Components */}
              {(() => {
                const isBundlingCategory = categories.find(c => c.id === prodCategoryId)?.name.toLowerCase().includes('bundling')
                if (isBundlingCategory) {
                  return (
                    <div className="space-y-3.5 bg-gray-950 p-4 rounded-xl border border-gray-800 animate-scale-in">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-gray-150 text-sm font-bold">Komponen Paket Bundling</label>
                        <button
                          type="button"
                          onClick={() => setBundleItems([...bundleItems, { productId: products[0]?.id || 0, qty: 1 }])}
                          className="text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors font-bold cursor-pointer"
                        >
                          ➕ Tambah Item
                        </button>
                      </div>

                      {bundleItems.length === 0 ? (
                        <p className="text-gray-500 text-xs italic text-center py-2">Belum ada item dalam bundling ini.</p>
                      ) : (
                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                          {bundleItems.map((item, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                              {/* Product select */}
                              <select
                                value={item.productId}
                                onChange={(e) => {
                                  const updated = [...bundleItems]
                                  updated[idx].productId = parseInt(e.target.value) || 0
                                  setBundleItems(updated)
                                }}
                                className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                              >
                                <option value={0}>Pilih Produk...</option>
                                {products
                                  .filter(p => p.id !== selectedProductId) 
                                  .map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.emoji} {p.name}
                                    </option>
                                  ))}
                              </select>

                              {/* Quantity */}
                              <input
                                type="number"
                                min={1}
                                value={item.qty}
                                onChange={(e) => {
                                  const updated = [...bundleItems]
                                  updated[idx].qty = Math.max(1, parseInt(e.target.value) || 1)
                                  setBundleItems(updated)
                                }}
                                className="w-16 bg-gray-900 border border-gray-800 rounded-lg px-2 py-2 text-white text-xs text-center focus:outline-none focus:border-emerald-500 font-semibold font-mono"
                                placeholder="Qty"
                              />

                              {/* Remove item */}
                              <button
                                type="button"
                                onClick={() => {
                                  setBundleItems(bundleItems.filter((_, i) => i !== idx))
                                }}
                                className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors text-xs font-bold cursor-pointer"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }

                return (
                  <div>
                    <label className="text-gray-455 text-xs font-semibold block mb-2">Pengelolaan Stok</label>
                    <div className="grid grid-cols-2 gap-2.5 p-1 bg-gray-950 rounded-xl border border-gray-800 mb-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsLimitedStock(false)
                          setProdStock('')
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          !isLimitedStock
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Stok Bebas (∞)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsLimitedStock(true)
                          setProdStock(0)
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isLimitedStock
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Stok Terbatas (Input)
                      </button>
                    </div>

                    {isLimitedStock && (
                      <div className="animate-scale-in">
                        <label className="text-gray-455 text-xs font-semibold block mb-1.5">Jumlah Stok Tersedia</label>
                        <input
                          type="number"
                          required
                          min={0}
                          value={prodStock}
                          onChange={(e) => setProdStock(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                          placeholder="Masukkan jumlah stok"
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                          style={{ minHeight: '44px' }}
                        />
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Status Aktif toggles (Edit Mode Only) */}
              {isEditMode && (
                <div className="flex items-center justify-between p-3.5 bg-gray-950 border border-gray-800 rounded-xl">
                  <div>
                    <p className="text-white text-sm font-bold">Status Produk Aktif</p>
                    <p className="text-gray-500 text-xs mt-0.5">Nonaktifkan untuk menyembunyikan produk ini dari kasir.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={prodActive}
                      onChange={(e) => setProdActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute top-[2px] left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>
              )}

              {/* Action Form buttons */}
              <div className="flex gap-3 pt-2">
                {isEditMode && (
                  <button
                    type="button"
                    onClick={handleProductDelete}
                    disabled={submittingProduct}
                    className="touch-btn px-4.5 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 font-bold transition-all cursor-pointer"
                  >
                    Hapus
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  disabled={submittingProduct}
                  className="touch-btn flex-1 py-3 rounded-xl bg-gray-850 hover:bg-gray-800 border border-gray-800 text-gray-300 font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingProduct}
                  className="touch-btn flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submittingProduct ? 'Menyimpan...' : 'Simpan Produk'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Waste Modal */}
      {showWasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-950/75 backdrop-blur-sm" onClick={() => setShowWasteModal(false)} />
          <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6 animate-scale-in">
            <h2 className="text-lg font-bold text-white mb-5">🗑️ Pencatatan Waste Produk</h2>

            <div className="space-y-4">
              {/* Product select */}
              <div>
                <label className="text-gray-455 text-xs font-semibold block mb-1.5">Pilih Produk</label>
                <select
                  value={wasteForm.productId}
                  onChange={(e) => setWasteForm({...wasteForm, productId: parseInt(e.target.value)})}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer"
                  style={{ minHeight: '44px' }}
                >
                  <option value={0}>Pilih produk...</option>
                  {products.filter(p => p.stock !== null).map((p) => (
                    <option key={p.id} value={p.id}>{p.emoji} {p.name} (Stok: {p.stock})</option>
                  ))}
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="text-gray-455 text-xs font-semibold block mb-1.5">Alasan Kerusakan / Kadaluarsa</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {WASTE_REASONS.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setWasteForm({...wasteForm, reason: r.id})}
                      className={`touch-btn flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all text-sm cursor-pointer ${
                        wasteForm.reason === r.id
                          ? 'bg-red-500/10 border-red-500/40 text-red-400 font-bold'
                          : 'bg-gray-950 border-gray-850 text-gray-500 hover:text-gray-300 hover:border-gray-800'
                      }`}
                    >
                      <span className="text-lg">{r.icon}</span>
                      <span className="text-[10px] tracking-wide font-bold uppercase">{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Qty */}
              <div>
                <label className="text-gray-455 text-xs font-semibold block mb-1.5">Jumlah Barang</label>
                <input
                  type="number"
                  min={1}
                  value={wasteForm.qty}
                  onChange={(e) => setWasteForm({...wasteForm, qty: parseInt(e.target.value) || 1})}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
                  style={{ minHeight: '44px' }}
                />
              </div>

              {/* Note */}
              <div>
                <label className="text-gray-455 text-xs font-semibold block mb-1.5">Catatan Tambahan (opsional)</label>
                <input
                  type="text"
                  value={wasteForm.note}
                  onChange={(e) => setWasteForm({...wasteForm, note: e.target.value})}
                  placeholder="Contoh: Kemasan sobek / rusak saat bongkar muat..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-gray-600"
                  style={{ minHeight: '44px' }}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setShowWasteModal(false)} 
                className="touch-btn flex-1 py-3 rounded-xl bg-gray-850 hover:bg-gray-800 border border-gray-800 text-gray-300 font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleWasteSubmit}
                disabled={!wasteForm.productId || submittingWaste}
                className="touch-btn flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold transition-all disabled:opacity-50 cursor-pointer"
              >
                {submittingWaste ? 'Menyimpan...' : 'Catat Waste'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
