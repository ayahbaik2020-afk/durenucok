import { NextRequest } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const { email, reportData, date } = await request.json()

    if (!email || !reportData || !date) {
      return Response.json({ error: 'Data tidak lengkap' }, { status: 400 })
    }

    const { totalRevenue, totalTransactions, topProducts, paymentBreakdown, perCashier } = reportData

    // Format Rupiah helper
    const formatRupiah = (val: number) => {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(val)
    }

    // Build HTML content for email
    const topProductsHtml = topProducts.length === 0
      ? '<p style="color: #6b7280; font-size: 14px; text-align: center;">Belum ada data</p>'
      : `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background-color: #f3f4f6; text-align: left;">
              <th style="padding: 10px; font-size: 14px; color: #374151; border-bottom: 1px solid #e5e7eb;">Produk</th>
              <th style="padding: 10px; font-size: 14px; color: #374151; border-bottom: 1px solid #e5e7eb; text-align: center;">Qty</th>
              <th style="padding: 10px; font-size: 14px; color: #374151; border-bottom: 1px solid #e5e7eb; text-align: right;">Total Jual</th>
            </tr>
          </thead>
          <tbody>
            ${topProducts.map((p: any) => `
              <tr>
                <td style="padding: 10px; font-size: 14px; color: #4b5563; border-bottom: 1px solid #e5e7eb;">${p.name}</td>
                <td style="padding: 10px; font-size: 14px; color: #4b5563; border-bottom: 1px solid #e5e7eb; text-align: center;">${p.totalQty}</td>
                <td style="padding: 10px; font-size: 14px; color: #4b5563; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #d97706;">${formatRupiah(p.totalRevenue)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `

    const paymentHtml = paymentBreakdown.length === 0
      ? '<p style="color: #6b7280; font-size: 14px; text-align: center;">Belum ada data</p>'
      : `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background-color: #f3f4f6; text-align: left;">
              <th style="padding: 10px; font-size: 14px; color: #374151; border-bottom: 1px solid #e5e7eb;">Metode</th>
              <th style="padding: 10px; font-size: 14px; color: #374151; border-bottom: 1px solid #e5e7eb; text-align: center;">Transaksi</th>
              <th style="padding: 10px; font-size: 14px; color: #374151; border-bottom: 1px solid #e5e7eb; text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${paymentBreakdown.map((pb: any) => `
              <tr>
                <td style="padding: 10px; font-size: 14px; color: #4b5563; border-bottom: 1px solid #e5e7eb;">${pb.method}</td>
                <td style="padding: 10px; font-size: 14px; color: #4b5563; border-bottom: 1px solid #e5e7eb; text-align: center;">${pb.count}</td>
                <td style="padding: 10px; font-size: 14px; color: #4b5563; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #d97706;">${formatRupiah(pb.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `

    const cashierHtml = perCashier.length === 0
      ? '<p style="color: #6b7280; font-size: 14px; text-align: center;">Belum ada data</p>'
      : `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background-color: #f3f4f6; text-align: left;">
              <th style="padding: 10px; font-size: 14px; color: #374151; border-bottom: 1px solid #e5e7eb;">Kasir</th>
              <th style="padding: 10px; font-size: 14px; color: #374151; border-bottom: 1px solid #e5e7eb; text-align: center;">Transaksi</th>
              <th style="padding: 10px; font-size: 14px; color: #374151; border-bottom: 1px solid #e5e7eb; text-align: right;">Total Omset</th>
            </tr>
          </thead>
          <tbody>
            ${perCashier.map((c: any) => `
              <tr>
                <td style="padding: 10px; font-size: 14px; color: #4b5563; border-bottom: 1px solid #e5e7eb;">${c.cashierName}</td>
                <td style="padding: 10px; font-size: 14px; color: #4b5563; border-bottom: 1px solid #e5e7eb; text-align: center;">${c.totalTransactions}</td>
                <td style="padding: 10px; font-size: 14px; color: #4b5563; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #d97706;">${formatRupiah(c.totalRevenue)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <div style="text-align: center; border-bottom: 2px solid #fbbf24; padding-bottom: 15px; margin-bottom: 20px;">
          <h2 style="color: #b45309; margin: 0;">🍧 DurenUcok POS System</h2>
          <p style="color: #6b7280; margin: 5px 0 0 0;">Laporan Penjualan Harian</p>
        </div>
        
        <p style="font-size: 16px; color: #374151;">Berikut adalah laporan penjualan harian untuk tanggal <strong>${date}</strong>.</p>
        
        <!-- Ringkasan KPI -->
        <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
          <h3 style="color: #b45309; margin: 0 0 10px 0; border-bottom: 1px solid #fde68a; padding-bottom: 5px; font-size: 16px;">Ringkasan Pendapatan</h3>
          <table style="width: 100%;">
            <tr>
              <td style="padding: 4px 0; font-size: 14px; color: #4b5563;">Total Pendapatan:</td>
              <td style="padding: 4px 0; font-size: 16px; font-weight: bold; color: #b45309; text-align: right;">${formatRupiah(totalRevenue)}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-size: 14px; color: #4b5563;">Total Transaksi:</td>
              <td style="padding: 4px 0; font-size: 14px; font-weight: bold; color: #374151; text-align: right;">${totalTransactions}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; font-size: 14px; color: #4b5563;">Rata-rata / Transaksi:</td>
              <td style="padding: 4px 0; font-size: 14px; font-weight: bold; color: #374151; text-align: right;">${formatRupiah(totalTransactions ? totalRevenue / totalTransactions : 0)}</td>
            </tr>
          </table>
        </div>

        <!-- Section 1: Produk Terlaris -->
        <div style="margin-bottom: 20px;">
          <h3 style="color: #111827; margin: 0 0 5px 0; font-size: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">🏆 Produk Terlaris</h3>
          ${topProductsHtml}
        </div>

        <!-- Section 2: Metode Pembayaran -->
        <div style="margin-bottom: 20px;">
          <h3 style="color: #111827; margin: 0 0 5px 0; font-size: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">💳 Metode Pembayaran</h3>
          ${paymentHtml}
        </div>

        <!-- Section 3: Performa Kasir -->
        <div style="margin-bottom: 20px;">
          <h3 style="color: #111827; margin: 0 0 5px 0; font-size: 15px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px;">👤 Kinerja Kasir</h3>
          ${cashierHtml}
        </div>

        <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 15px;">
          <p style="margin: 0;">Laporan dikirim otomatis dari aplikasi DurenUcok POS.</p>
          <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} DurenUcok UMKM.</p>
        </div>
      </div>
    `

    // SMTP Credentials from Env
    const smtpHost = process.env.SMTP_HOST
    const smtpPort = process.env.SMTP_PORT
    const smtpUser = process.env.SMTP_USER
    const smtpPass = process.env.SMTP_PASS

    if (smtpHost && smtpUser && smtpPass) {
      // Setup real transporter
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort || '587'),
        secure: smtpPort === '465', // true for port 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      })

      // Send mail
      await transporter.sendMail({
        from: `"DurenUcok POS" <${smtpUser}>`,
        to: email,
        subject: `[DurenUcok POS] Laporan Harian - Tanggal ${date}`,
        html: htmlBody,
      })

      return Response.json({ success: true, simulated: false })
    } else {
      // SMTP not configured. Log and simulate success
      console.log('--- SIMULATED EMAIL REPORT ---')
      console.log(`To: ${email}`)
      console.log(`Subject: Laporan Harian DurenUcok - Tanggal ${date}`)
      console.log(`Content length: ${htmlBody.length} characters`)
      console.log('------------------------------')
      
      // Artificial delay to mimic server response
      await new Promise(resolve => setTimeout(resolve, 800))

      return Response.json({ success: true, simulated: true })
    }
  } catch (error: any) {
    console.error('Failed to send email:', error)
    return Response.json({ error: 'Gagal mengirim email: ' + (error.message || error) }, { status: 500 })
  }
}
