# 架構總覽

Status: Living document
Last Updated: v1.2.0

## 技術棧

- **前端框架**：Next.js 16 (App Router)，注意這個版本有多項 breaking changes（`proxy.ts` 取代 `middleware.ts`、async `cookies()`/`headers()`/`params` 等），動工前需查閱 `node_modules/next/dist/docs/`。
- **樣式**：Tailwind CSS v4 + Shadcn UI (base-nova style)
- **驗證**：Zod Runtime 防禦（見 [../02-data-contract/](../02-data-contract/)）
- **資料抓取**：TanStack Query
- **後端/資料庫**：Supabase (PostgreSQL + Auth + RLS)
- **圖表**：Chart.js
- **金流**：綠界 ECPay 定期定額訂閱（信用卡）
- **推播（規劃中，v1.2）**：web-push (VAPID)

## 子文件

- [frontend.md](./frontend.md)：路由設計
- [backend.md](./backend.md)：Supabase、RLS、ECPay、推播基礎設施
- [pwa.md](./pwa.md)：Manifest、Service Worker、離線行為
