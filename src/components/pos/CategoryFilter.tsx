'use client'

import { Category } from '@/types'

interface CategoryFilterProps {
  categories: Category[]
  selectedId: number | null
  onSelect: (id: number | null) => void
}

export default function CategoryFilter({ categories, selectedId, onSelect }: CategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <button
        onClick={() => onSelect(null)}
        className={`touch-btn flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 border ${
          selectedId === null
            ? 'bg-amber-500 text-white border-amber-500 shadow-md'
            : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-amber-500/50 hover:text-amber-400'
        }`}
      >
        <span>🍽️</span>
        <span>Semua</span>
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          style={selectedId === cat.id ? { backgroundColor: cat.color, borderColor: cat.color } : {}}
          className={`touch-btn flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 border ${
            selectedId === cat.id
              ? 'text-white shadow-md'
              : 'bg-gray-800 text-gray-300 border-gray-700 hover:text-white'
          }`}
        >
          <span>{cat.emoji}</span>
          <span className="whitespace-nowrap">{cat.name}</span>
        </button>
      ))}
    </div>
  )
}
