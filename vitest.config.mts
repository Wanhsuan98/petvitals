import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': import.meta.dirname,
      // server-only 只在 react-server 環境會載入空模組，其他環境直接拋錯。
      // 測試不是 react-server 環境，指向空模組，才能測試伺服器端專用的檔案
      'server-only': `${import.meta.dirname}/node_modules/server-only/empty.js`
    }
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts']
  }
})
