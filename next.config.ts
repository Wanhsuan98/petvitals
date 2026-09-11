import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 本機測試 ECPay callback 時會用 localtunnel/ngrok 之類的工具把 dev server 暴露出去，
  // Next.js 開發模式預設只信任 localhost，其他來源的請求會被擋掉（防 DNS rebinding），
  // 這裡放行常見的免費 tunnel 網域，讓本機測試時能正常收到請求。
  allowedDevOrigins: ['*.loca.lt', '*.ngrok-free.app', '*.ngrok.io', '*.trycloudflare.com']
}

export default nextConfig
