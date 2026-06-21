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

  // Inline Stock Edit State (holds temporary stock values when user typing)
  const [editingStock, setEditingStock] = useState<{ [id: number]: string }>({})

  // Waste Modal State
  const [showWasteModal, setShowWasteModal] = useState(false)
  const [wasteForm, setWasteForm] = useState<WasteForm>({ productId: 0, qty: 1, reason: 'EXPIRED', note: '' })
  const [submittingWaste, setSubmittingWaste] = useState(false)

  // Product Modal (Add/Edit) State
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

  // Bundling configuration state: array of { productId: number, qty: number }
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

  // Quick Inline Stock Update (only for products with limited stock)
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
        // Optimistically update state to prevent flicker
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

  // Helper to compress and convert image to Base64 (max 400px, JPEG 70%)
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

  // Handle opening Product Modal for Add
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

  // Handle opening Product Modal for Edit
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

  // Handle Product Save
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
    
    // Find if the selected category is bundling (name 'Paket Bundling' or equivalent)
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

  // Handle Product Delete (Soft Delete)
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

  // Handle Waste Submit
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

  // Filtered Products Calculation
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
    <div className="h-screen flex flex-col bg-gray-950">
      <AppNavbar />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 space-y-4">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-50">Kelola Produk & Stok</h1>
              <p className="text-gray-400 text-xs sm:text-sm">Kelola informasi produk, persediaan, dan pencatatan produk rusak/kadaluarsa.</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={() => setShowWasteModal(true)}
                className="touch-btn flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 text-xs sm:text-sm font-medium transition-all"
              >
                🗑️ Catat Waste
              </button>
              <button
                onClick={openAddProductModal}
                className="touch-btn flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs sm:text-sm font-bold shadow-lg transition-all"
              >
                ➕ Tambah Produk
              </button>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-gray-900/40 p-3 rounded-2xl border border-gray-800">
            {/* Search */}
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
              <input
                type="text"
                placeholder="Cari nama produk..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            {/* Category */}
            <select
              value={selectedCatId}
              onChange={(e) => setSelectedCatId(e.target.value === 'ALL' ? 'ALL' : parseInt(e.target.value))}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors"
            >
              <option value="ALL">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoji} {cat.name}
                </option>
              ))}
            </select>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-gray-100 text-sm focus:outline-none focus:border-amber-500 transition-colors"
            >
              <option value="ALL">Semua Status (Aktif & Nonaktif)</option>
              <option value="ACTIVE">Hanya Status Aktif</option>
              <option value="INACTIVE">Hanya Status Nonaktif</option>
            </select>
          </div>

          {/* Product list */}
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-gray-900 animate-pulse border border-gray-800" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16 bg-gray-900/20 rounded-2xl border border-gray-900 border-dashed">
              <span className="text-5xl">📦</span>
              <p className="text-gray-400 mt-3 font-medium">Tidak ada produk yang cocok dengan filter</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((product) => {
                const status = getStockStatus(product.stock)
                const hasLimitedStock = product.stock !== null
                const isInactive = !product.isActive

                return (
                  <div
                    key={product.id}
                    className={`glass-card rounded-xl p-4 flex items-center justify-between gap-4 transition-all ${
                      isInactive ? 'opacity-60 border-red-500/10' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      {/* Image / Emoji */}
                      <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-xl bg-gray-900 border border-gray-800 overflow-hidden shadow-inner">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-3xl">{product.emoji}</span>
                        )}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-gray-100 font-semibold text-sm truncate">{product.name}</p>
                          {isInactive && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                              NONAKTIF
                            </span>
                          )}
                        </div>
                        <p className="text-gray-500 text-xs mt-0.5">
                          {product.category.emoji} {product.category.name} • {formatRupiah(product.price)}
                        </p>
                      </div>
                    </div>

                    {/* Stock & Actions */}
                    <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                      <div className="text-right hidden sm:block">
                        <span className={`inline-block text-xs font-medium px-2 py-1 rounded-lg border ${status.color}`}>
                          {status.label}
                        </span>
                        {hasLimitedStock && (
                          <p className="text-gray-400 text-xs mt-1">Stok: {product.stock}</p>
                        )}
                      </div>

                      {/* Component breakdown for mobile if any bundle items exist */}
                      {product.bundleItems && product.bundleItems.length > 0 && (
                        <div className="block sm:hidden text-right mr-1">
                          <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold">
                            🎁 BUNDLE
                          </span>
                        </div>
                      )}

                      {/* Inline Stock Adjustment buttons and direct input if limited stock */}
                      {hasLimitedStock ? (
                        <div className="flex items-center bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                          <button
                            onClick={() => handleInlineStockUpdate(product.id, Math.max(0, (product.stock || 0) - 1))}
                            className="px-2 py-1 hover:bg-gray-800 text-gray-400 hover:text-gray-100 transition-colors font-bold text-xs sm:text-sm"
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
                            className="w-8 sm:w-12 bg-transparent text-gray-100 text-xs sm:text-sm font-semibold text-center focus:outline-none focus:bg-gray-800/80 py-1"
                          />

                          <button
                            onClick={() => handleInlineStockUpdate(product.id, (product.stock || 0) + 1)}
                            className="px-2 py-1 hover:bg-gray-800 text-gray-400 hover:text-gray-100 transition-colors font-bold text-xs sm:text-sm"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-xs sm:text-sm italic mr-1 sm:mr-2">∞ Bebas</span>
                      )}

                      <button
                        onClick={() => openEditProductModal(product)}
                        className="touch-btn p-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:text-amber-400 hover:border-amber-500/50 transition-all text-xs sm:text-sm"
                        title="Edit Produk"
                      >
                        ✏️
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
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => !submittingProduct && setShowProductModal(false)} />
          <div className="relative w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden p-6 animate-scale-in max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-50 mb-5">
              {isEditMode ? '✏️ Edit Produk' : '➕ Tambah Produk'}
            </h2>

            <form onSubmit={handleProductSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Nama Produk</label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="Contoh: Pancake Durian Jumbo"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="text-gray-400 text-sm mb-1.5 block">Kategori</label>
                  <select
                    value={prodCategoryId}
                    onChange={(e) => setProdCategoryId(parseInt(e.target.value))}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 text-sm focus:outline-none focus:border-amber-500"
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
                  <label className="text-gray-400 text-sm mb-1.5 block">Harga Jual (Rp)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={prodPrice || ''}
                    onChange={(e) => setProdPrice(parseInt(e.target.value) || 0)}
                    placeholder="Harga"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Image Upload / Emoji Selection */}
              <div className="space-y-3">
                <label className="text-gray-400 text-sm mb-1.5 block">Gambar / Ikon Produk</label>
                
                <div className="flex gap-4 items-center bg-gray-950 border border-gray-850 p-4 rounded-xl">
                  {/* Selection Preview */}
                  <div className="w-16 h-16 rounded-xl bg-gray-900 flex items-center justify-center text-3xl border border-gray-800 overflow-hidden flex-shrink-0 shadow-inner">
                    {prodImage ? (
                      <img src={prodImage} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span>{prodEmoji}</span>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-gray-400 font-medium">Gunakan foto barang atau gunakan emoji sebagai ikon.</p>
                    <div className="flex gap-2">
                      {/* Image Input Label */}
                      <label className="touch-btn cursor-pointer bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors">
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
                          className="touch-btn bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        >
                          ✕ Hapus Foto
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Popular Emojis Selector (Only visible if no custom image is set) */}
                {!prodImage && (
                  <div className="space-y-2 animate-scale-in">
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        maxLength={2}
                        value={prodEmoji}
                        onChange={(e) => setProdEmoji(e.target.value)}
                        placeholder="Kustom..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-100 text-sm focus:outline-none focus:border-amber-500 text-center"
                      />
                    </div>
                    <div className="grid grid-cols-8 gap-2 bg-gray-950 p-3 rounded-xl border border-gray-800 max-h-[100px] overflow-y-auto">
                      {POPULAR_EMOJIS.map((emoji) => (
                        <button
                          type="button"
                          key={emoji}
                          onClick={() => setProdEmoji(emoji)}
                          className={`text-2xl p-1 rounded hover:bg-gray-800 transition-all ${
                            prodEmoji === emoji ? 'bg-amber-500/20 border border-amber-500/50' : ''
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Stock settings */}
              {(() => {
                const isBundlingCategory = categories.find(c => c.id === prodCategoryId)?.name.toLowerCase().includes('bundling')
                if (isBundlingCategory) {
                  return (
                    <div className="space-y-3 bg-gray-950 p-4 rounded-xl border border-gray-800 animate-scale-in">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-gray-200 text-sm font-semibold">Komponen Bundling</label>
                        <button
                          type="button"
                          onClick={() => setBundleItems([...bundleItems, { productId: products[0]?.id || 0, qty: 1 }])}
                          className="text-xs bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30 px-2.5 py-1.5 rounded-lg transition-colors font-bold"
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
                              {/* Product selector */}
                              <select
                                value={item.productId}
                                onChange={(e) => {
                                  const updated = [...bundleItems]
                                  updated[idx].productId = parseInt(e.target.value) || 0
                                  setBundleItems(updated)
                                }}
                                className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-amber-500"
                              >
                                <option value={0}>Pilih Produk...</option>
                                {products
                                  .filter(p => p.id !== selectedProductId) // Prevent self-referencing in bundles
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
                                className="w-16 bg-gray-900 border border-gray-700 rounded-lg px-2 py-2 text-white text-xs text-center focus:outline-none focus:border-amber-500 font-semibold"
                                placeholder="Qty"
                              />

                              {/* Delete button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setBundleItems(bundleItems.filter((_, i) => i !== idx))
                                }}
                                className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors text-xs font-bold"
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
                    <label className="text-gray-400 text-sm mb-2 block">Pengelolaan Stok</label>
                    <div className="grid grid-cols-2 gap-2 p-1 bg-gray-950 rounded-xl border border-gray-800 mb-3">
                      <button
                        type="button"
                        onClick={() => {
                          setIsLimitedStock(false)
                          setProdStock('')
                        }}
                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                          !isLimitedStock
                            ? 'bg-amber-500 text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Stok Tanpa Batas (∞)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsLimitedStock(true)
                          setProdStock(0)
                        }}
                        className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                          isLimitedStock
                            ? 'bg-amber-500 text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Stok Terbatas (Input)
                      </button>
                    </div>

                    {isLimitedStock && (
                      <div className="animate-scale-in">
                        <label className="text-gray-400 text-sm mb-1.5 block">Jumlah Stok Tersedia</label>
                        <input
                          type="number"
                          required
                          min={0}
                          value={prodStock}
                          onChange={(e) => setProdStock(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                          placeholder="Masukkan jumlah stok"
                          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Status Aktif (Hanya jika mode edit) */}
              {isEditMode && (
                <div className="flex items-center justify-between p-3 bg-gray-950/50 border border-gray-800 rounded-xl">
                  <div>
                    <p className="text-white text-sm font-semibold">Status Produk Aktif</p>
                    <p className="text-gray-500 text-xs">Nonaktifkan untuk menyembunyikan dari daftar menu kasir.</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prodActive}
                      onChange={(e) => setProdActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute top-[2px] left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              )}

              {/* Form buttons */}
              <div className="flex gap-3 pt-2">
                {isEditMode && (
                  <button
                    type="button"
                    onClick={handleProductDelete}
                    disabled={submittingProduct}
                    className="touch-btn px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 font-bold transition-all"
                  >
                    🗑️ Hapus
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  disabled={submittingProduct}
                  className="touch-btn flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingProduct}
                  className="touch-btn flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold transition-all disabled:opacity-50"
                >
                  {submittingProduct ? 'Menyimpan...' : '💾 Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Waste Modal */}
      {showWasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setShowWasteModal(false)} />
          <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-6 animate-scale-in">
            <h2 className="text-xl font-bold text-white mb-5">🗑️ Catat Waste</h2>

            <div className="space-y-4">
              {/* Product select */}
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Produk</label>
                <select
                  value={wasteForm.productId}
                  onChange={(e) => setWasteForm({...wasteForm, productId: parseInt(e.target.value)})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
                >
                  <option value={0}>Pilih produk...</option>
                  {products.filter(p => p.stock !== null).map((p) => (
                    <option key={p.id} value={p.id}>{p.emoji} {p.name} (Stok: {p.stock})</option>
                  ))}
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Alasan Waste</label>
                <div className="grid grid-cols-3 gap-2">
                  {WASTE_REASONS.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setWasteForm({...wasteForm, reason: r.id})}
                      className={`touch-btn flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-sm ${
                        wasteForm.reason === r.id
                          ? 'bg-red-500/20 border-red-500 text-red-400'
                          : 'bg-gray-800 border-gray-700 text-gray-400'
                      }`}
                    >
                      <span>{r.icon}</span>
                      <span className="text-xs">{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Qty */}
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Jumlah</label>
                <input
                  type="number"
                  min={1}
                  value={wasteForm.qty}
                  onChange={(e) => setWasteForm({...wasteForm, qty: parseInt(e.target.value) || 1})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Note */}
              <div>
                <label className="text-gray-400 text-sm mb-1.5 block">Catatan (opsional)</label>
                <input
                  type="text"
                  value={wasteForm.note}
                  onChange={(e) => setWasteForm({...wasteForm, note: e.target.value})}
                  placeholder="Keterangan tambahan..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowWasteModal(false)} className="touch-btn flex-1 py-3 rounded-xl bg-gray-800 text-gray-300 font-medium">Batal</button>
              <button
                onClick={handleWasteSubmit}
                disabled={!wasteForm.productId || submittingWaste}
                className="touch-btn flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-400 text-white font-bold transition-all disabled:opacity-50"
              >
                {submittingWaste ? 'Menyimpan...' : '🗑️ Catat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
