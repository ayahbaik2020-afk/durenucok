import type { Metadata } from 'next'
import { Poppins } from 'next/font/google'
import './globals.css'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-poppins',
})

export const metadata: Metadata = {
  title: 'DurenUcok POS — Kasir Olahan Durian',
  description: 'Sistem Point of Sale untuk UMKM penjual olahan durian: pancake, es durian, juice, dessert, frozen, dan paket bundling.',
  keywords: 'pos, kasir, durian, pancake durian, es durian, UMKM',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className={`${poppins.variable} h-full`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme');
                if (theme === 'light') {
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.add('dark');
                }
              })()
            `,
          }}
        />
      </head>
      <body className="min-h-full bg-gray-950 text-gray-100 font-poppins">
        {children}
      </body>
    </html>
  )
}
