import { prisma } from '@/lib/prisma'

function esc(v: any): string {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return String(v)
  return `'${String(v).replace(/'/g, "''")}'`
}

function insertSQL(table: string, rows: any[]): string {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0]).filter(k => k !== 'id')
  const lines = rows.map(r => {
    const vals = cols.map(c => esc(r[c]))
    return `  (${vals.join(', ')})`
  })
  return `INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES\n${lines.join(',\n')};\n\n`
}

export async function POST() {
  try {
    const [
      cashiers, categories, products, bundleItems,
      transactions, transactionItems, cashierSessions,
      suppliers, warehouses, stockReceipts, stockReceiptItems,
      stockOpnames, stockOpnameItems, stockWastes, stockMovements,
      storeSettings,
    ] = await Promise.all([
      prisma.cashier.findMany({ orderBy: { id: 'asc' } }),
      prisma.category.findMany({ orderBy: { id: 'asc' } }),
      prisma.product.findMany({ orderBy: { id: 'asc' } }),
      prisma.bundleItem.findMany({ orderBy: { id: 'asc' } }),
      prisma.transaction.findMany({ orderBy: { id: 'asc' } }),
      prisma.transactionItem.findMany({ orderBy: { id: 'asc' } }),
      prisma.cashierSession.findMany({ orderBy: { id: 'asc' } }),
      prisma.supplier.findMany({ orderBy: { id: 'asc' } }),
      prisma.warehouse.findMany({ orderBy: { id: 'asc' } }),
      prisma.stockReceipt.findMany({ orderBy: { id: 'asc' } }),
      prisma.stockReceiptItem.findMany({ orderBy: { id: 'asc' } }),
      prisma.stockOpname.findMany({ orderBy: { id: 'asc' } }),
      prisma.stockOpnameItem.findMany({ orderBy: { id: 'asc' } }),
      prisma.stockWaste.findMany({ orderBy: { id: 'asc' } }),
      prisma.stockMovement.findMany({ orderBy: { id: 'asc' } }),
      prisma.storeSetting.findMany({ orderBy: { id: 'asc' } }),
    ])

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    let sql = `-- DurenUcok POS - Database Backup\n`
    sql += `-- Generated: ${new Date().toLocaleString('id-ID')}\n`
    sql += `-- Source: PostgreSQL (Neon)\n\n`
    sql += `BEGIN;\n\n`

    // Disable triggers for clean restore
    sql += `SET session_replication_role = 'replica';\n\n`

    // Truncate all tables before restore (order matters for FK)
    const truncateOrder = [
      'StockMovement', 'StockOpnameItem', 'StockOpname', 'StockReceiptItem',
      'StockReceipt', 'StockWaste', 'BundleItem', 'TransactionItem',
      'Transaction', 'CashierSession', 'Product', 'Category',
      'Supplier', 'Warehouse', 'Cashier', 'StoreSetting',
    ]
    for (const t of truncateOrder) {
      sql += `TRUNCATE TABLE "${t}" RESTART IDENTITY CASCADE;\n`
    }
    sql += '\n'

    // Reset sequences
    for (const t of truncateOrder) {
      sql += `SELECT setval(pg_get_serial_sequence('${t}', 'id'), COALESCE((SELECT MAX(id) FROM "${t}"), 0) + 1, false);\n`
    }
    sql += '\n'

    // Write inserts (parent-first order)
    // 1. Standalone tables
    sql += insertSQL('Cashier', cashiers)
    sql += insertSQL('Category', categories)
    sql += insertSQL('Supplier', suppliers)
    sql += insertSQL('Warehouse', warehouses)
    sql += insertSQL('StoreSetting', storeSettings)

    // 2. Product (depends on Category)
    sql += insertSQL('Product', products)

    // 3. BundleItem (depends on Product)
    sql += insertSQL('BundleItem', bundleItems)

    // 4. CashierSession (depends on Cashier)
    sql += insertSQL('CashierSession', cashierSessions)

    // 5. Transaction (depends on Cashier, CashierSession)
    sql += insertSQL('Transaction', transactions)

    // 6. TransactionItem (depends on Transaction, Product)
    sql += insertSQL('TransactionItem', transactionItems)

    // 7. StockWaste (depends on Product)
    sql += insertSQL('StockWaste', stockWastes)

    // 8. StockReceipt (depends on Supplier, Warehouse)
    sql += insertSQL('StockReceipt', stockReceipts)

    // 9. StockReceiptItem (depends on StockReceipt, Product)
    sql += insertSQL('StockReceiptItem', stockReceiptItems)

    // 10. StockOpname (depends on Warehouse)
    sql += insertSQL('StockOpname', stockOpnames)

    // 11. StockOpnameItem (depends on StockOpname, Product)
    sql += insertSQL('StockOpnameItem', stockOpnameItems)

    // 12. StockMovement (depends on Product, Warehouse)
    sql += insertSQL('StockMovement', stockMovements)

    // Re-enable triggers
    sql += `SET session_replication_role = 'origin';\n\n`
    sql += `COMMIT;\n`

    const filename = `backup-durenucok-${timestamp}.sql`

    return Response.json({
      success: true,
      filename,
      content: sql,
      size: sql.length,
    })
  } catch (error: any) {
    console.error('Backup failed:', error)
    return Response.json(
      { error: 'Gagal membuat backup: ' + (error.message || error) },
      { status: 500 }
    )
  }
}
