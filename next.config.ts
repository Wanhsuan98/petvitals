import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 全站安全性標頭，取自 Next.js PWA 指南的 Securing your application 範例
  // （node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md）。
  // 完整的 CSP（限制 script 來源）要搭配 nonce 處理 Next.js 的 inline script，影響範圍大，
  // 這裡只先放 frame-ancestors 這一條：禁止其他網站用 iframe 嵌入登入頁做點擊劫持
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // 舊瀏覽器只認 X-Frame-Options，新瀏覽器以 CSP frame-ancestors 為準，兩個都放
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' }
        ]
      }
    ]
  }
}

export default nextConfig
