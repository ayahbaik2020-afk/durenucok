'use client'

import { Category } from '@/types'

interface CategoryFilterProps {
  categories: Category[]
  selectedId: number | null
  onSelect: (id: number | null) => void
}

export default function CategoryFilter({ categories, selectedId, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-hide scroll-smooth">
      {/* "Semua" Filter Button */}
      <button
        onClick={() => onSelect(null)}
        className={`touch-btn flex-shrink-0 flex items-center gap-2 px-4.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 border cursor-pointer ${
          selectedId === null
            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-950/20'
            : 'bg-gray-800 text-gray-300 border-gray-705 hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-gray-800/80'
        }`}
        style={{ minHeight: '44px' }}
      >
        <span className="text-base">🍽️</span>
        <span>Semua</span>
      </button>

      {/* Categories loop */}
      {categories.map((cat) => {
        const isSelected = selectedId === cat.id
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            style={isSelected ? { backgroundColor: cat.color, borderColor: cat.color, minHeight: '44px' } : { minHeight: '44px' }}
            className={`touch-btn flex-shrink-0 flex items-center gap-2 px-4.5 py-3 rounded-xl font-medium text-sm transition-all duration-200 border cursor-pointer ${
              isSelected
                ? 'text-white shadow-md shadow-emerald-950/10'
                : 'bg-gray-800 text-gray-300 border-gray-705 hover:text-white hover:border-gray-600 hover:bg-gray-800/80'
            }`}
          >
            <span className="text-base">{cat.emoji}</span>
            <span className="whitespace-nowrap">{cat.name}</span>
          </button>
        )
      })}
    </div>
  )
}
