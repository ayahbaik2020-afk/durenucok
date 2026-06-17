export interface Category {
  id: number
  name: string
  emoji: string
  color: string
}

export interface Product {
  id: number
  name: string
  description?: string | null
  price: number
  emoji: string
  image?: string | null
  category: Category
  categoryId: number
  stock?: number | null
  isActive: boolean
}

export interface CartItem {
  product: Product
  qty: number
  discount: number
  subtotal: number
}

export interface CashierSession {
  id: number
  cashierId: number
  cashier: Cashier
  startCash: number
  endCash?: number | null
  status: 'OPEN' | 'CLOSED'
  openedAt: string
  closedAt?: string | null
}

export interface Cashier {
  id: number
  name: string
  pin: string
  isActive: boolean
}

export interface TransactionItem {
  id: number
  transactionId: number
  productId: number
  productName: string
  productPrice: number
  qty: number
  discount: number
  subtotal: number
}

export interface Transaction {
  id: number
  invoiceNumber: string
  cashierId: number
  cashier?: Cashier
  sessionId: number
  items: TransactionItem[]
  subtotal: number
  discountAmount: number
  total: number
  paymentMethod: 'CASH' | 'QRIS' | 'TRANSFER'
  amountPaid: number
  change: number
  status: 'COMPLETED' | 'VOID'
  note?: string | null
  createdAt: string
}

export interface DailyReport {
  date: string
  totalTransactions: number
  totalRevenue: number
  topProducts: { name: string; emoji: string; totalQty: number; totalRevenue: number }[]
  perCashier: { cashierName: string; totalTransactions: number; totalRevenue: number }[]
  paymentBreakdown: { method: string; count: number; total: number }[]
}
