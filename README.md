# DurenUcok POS

Aplikasi Point of Sale berbasis web untuk UMKM penjual olahan durian.

## Teknologi
- Next.js 16 (App Router)
- Tailwind CSS v4
- Prisma v7 + SQLite (libsql adapter)
- Zustand (cart & session state)
- TypeScript

## Cara Menjalankan Lokal

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma client
npm run db:generate

# 3. Jalankan migrasi database
npm run db:migrate

# 4. Isi data awal (19 produk, 2 kasir)
npm run db:seed

# 5. Jalankan development server
npm run dev
```

Buka http://localhost:3000

## Login Default

| Kasir | PIN  |
|-------|------|
| Admin | 1234 |
| Sari  | 5678 |

## Fitur

- ✅ Login kasir dengan PIN
- ✅ Dashboard POS touch-friendly (grid produk + cart)
- ✅ Filter kategori: Pancake, Minuman, Dessert, Frozen, Bundling
- ✅ Search produk real-time
- ✅ Keranjang dengan qty +/- dan diskon per item
- ✅ Checkout: Cash (hitung kembalian), QRIS, Transfer
- ✅ Riwayat transaksi per tanggal
- ✅ Manajemen stok + catat waste
- ✅ Laporan harian (pendapatan, produk terlaris, per kasir)

## Struktur Folder

```
src/
├── app/           # Next.js App Router pages & API routes
├── components/    # React components
├── store/         # Zustand state management
├── lib/           # Utilities (Prisma, formatRupiah, dll)
└── types/         # TypeScript type definitions
```

## Deploy ke Vercel

Untuk deploy ke Vercel, ganti SQLite dengan database cloud:
- [Turso](https://turso.tech) — LibSQL cloud (adapter yang sama, tinggal ganti URL!)
- [Neon](https://neon.tech) — PostgreSQL gratis (ganti adapter ke @prisma/adapter-neon)

Set `DATABASE_URL` di environment variables Vercel.
